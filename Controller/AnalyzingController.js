import OpenAI from "openai"
import asyncHandler from "express-async-handler"
import dotenv from "dotenv"
import ThreadSchema from "../Models/ThreadModel.js"
import MessageSchema from "../Models/MessageModel.js" // Added this import for loadAnalysisResults
import cloudinary from "../Utils/Cloudinary.js"
import { validateThread, saveMessage, getThreadHistory, saveDetectionToThread, getThreadWithDetections } from "../Service/ThreadService.js"
import { v4 as uuidv4 } from 'uuid';
dotenv.config()

const ASSISTANT_ID = process.env.ASSISTANT_ID

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

// handling image upload to cloudinary
const uploadImageToCloudinary = async (filePath) => {
    console.log("File seen and ready for upload")
    const image = await cloudinary.uploader.upload(filePath, {
        resource_type: "image"
    })

    return image.secure_url
}

export const analyzeImage = async (req, res) => {
    try {


         // Consistent naming with the rest of the codebase
         const threadId = req.body.threadId || req.body.threadID || "";
         // Remove any quotes that might be wrapped around the ID
         const cleanThreadId = threadId.replace(/^"|"$/g, '');
         
         console.log("Thread ID:", cleanThreadId);
 
         const userId = typeof req.userAuth === 'object' && req.userAuth.id 
             ? req.userAuth.id 
             : req.userAuth;
 
         const threadValidation = await validateThread(cleanThreadId, userId);
        
        if (!threadValidation.success) {
            return res.status(400).json({ 
                message: threadValidation.message 
            })
        }
        
        if(!req.file || !req.file.path){
            return res.status(404).json({message:"Image not found"})
        }
        
        const imageUrl = await uploadImageToCloudinary(req.file.path)
        console.log("FILE UPLOADED:", imageUrl)

        // Move this line up before using the variable
        const testThreadId = threadId
        console.log("Created thread:", testThreadId)

        await saveMessage(
            testThreadId,
            'user',
            'Image uploaded for analysis',
            uuidv4(), // Generate a unique ID for this message
            {
                imageUrl: imageUrl,
                messageType: 'image_upload'
            }
        );
    
        if (!imageUrl) {
            return res.status(404).json({ "message": "Image upload failed" })
        }
    
        // Using chat completion to analyze the image
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: "What's in this image? and  Make this readable" },
                  {
                    type: "image_url",
                    image_url: {
                      "url": imageUrl,
                    },
                  },
                ],
              },
            ],
            store: true,
        });
          
        console.log("Response content:", response.choices[0].message.content);
    
        // Send the analysis to the OpenAI assistant
        await openai.beta.threads.messages.create(
            testThreadId,
            { role: "user", content: response.choices[0].message.content }
        );
    
        let run = await openai.beta.threads.runs.create(
            testThreadId,
            { assistant_id: ASSISTANT_ID }
        );
    
        // Wait for run to complete
        while (run.status !== "completed") {
            // Add a small delay to avoid hitting rate limits
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            run = await openai.beta.threads.runs.retrieve(
                testThreadId,
                run.id
            );
            
            console.log("Run status:", run.status);
            
            // Check for terminal states other than "completed"
            if (["failed", "cancelled", "expired"].includes(run.status)) {
                throw new Error(`Run ended with status: ${run.status}`);
            }
        }
    
        const updatedMessages = await openai.beta.threads.messages.list(
            testThreadId
        );
    
        console.log("OpenAI response messages count:", updatedMessages.data.length);
        
        // Format messages for frontend consumption
        const formattedMessages = updatedMessages.data.map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content[0].text.value,
            created_at: msg.created_at
        }));
    
        res.status(201).json({
            success: true,
            data: formattedMessages,
            threadId: testThreadId,
            url: imageUrl
        });
    
    } catch (error) {
        console.error("Analysis error:", error);
        res.status(500).json({
          success: false,
          message: error.message || "Analysis failed"
        });
    }
}

// handling the follow up questions 
export async function userQuestions(ws, data, context) {
    console.log('Processing user question:', data);

    const thread1 = data.threadId || data.sessionId;
    
    if (!thread1) {
        return sendMessage(ws, 'error', 'thread not found');
    }
    if (!data.message) {
        return sendMessage(ws, 'error', 'Message is required');
    }
   
    const thread = await ThreadSchema.findOne({ threadId: data.threadId });
    
    if (!thread) {
        return sendMessage(ws, 'error', 'invalid threadId');
    }


    if (!thread.isActive) {
        await ThreadSchema.findOneAndUpdate(
            { threadId },
            { isActive: true },
            { new: true }
        );
        console.log(`Reactivated thread ${threadId}`);
    }

    const threadId = thread.threadId;
    context.threadId = threadId;
    
    try {
        const userMessageId = data.messageId || uuidv4();
        
        // Save user message to database
        await saveMessage(
            threadId, 
            'user', 
            data.message, 
            userMessageId, 
            data.metadata || {}
        );
        
        console.log(`Sending to OpenAI thread ${threadId}:`, data.message);
        
        // Send message to OpenAI
        try {
            const openaiMessage = await openai.beta.threads.messages.create(threadId, {
                role: "user",
                content: data.message
            });
            console.log('OpenAI message created:', openaiMessage.id);
        } catch (openaiError) {
            console.error('Error creating OpenAI message:', openaiError);
            return sendMessage(ws, 'error', 'Failed to send message to OpenAI');
        }

        // Create and monitor the run
        let run;
        try {
            run = await openai.beta.threads.runs.create(threadId, {
                assistant_id: ASSISTANT_ID
            });
            console.log('Run created:', run.id);
        } catch (runError) {
            console.error('Error creating run:', runError);
            return sendMessage(ws, 'error', 'Failed to start processing with OpenAI');
        }

        // Poll for run completion
        while (shouldContinuePolling(run.status)) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
                run = await openai.beta.threads.runs.retrieve(threadId, run.id);
                console.log('Run status:', run.status);
                sendMessage(ws, 'status', run.status);
            } catch (pollError) {
                console.error('Error polling run status:', pollError);
                return sendMessage(ws, 'error', 'Failed to get processing status from OpenAI');
            }
        }
        
        if (run.status !== 'completed') {
            console.error('Run failed with status:', run.status);
            throw new Error(`Run failed with status: ${run.status}`);
        }

        // Get messages from the thread - get only the latest messages with descending order
        let messages;
        try {
            messages = await openai.beta.threads.messages.list(threadId, {
                order: 'desc',  // Get newest first
                limit: 10       // Limit to most recent messages
            });
            console.log('Messages retrieved:', messages.data.length);
        } catch (messagesError) {
            console.error('Error retrieving messages:', messagesError);
            return sendMessage(ws, 'error', 'Failed to get response from OpenAI');
        }

        // Find the most recent assistant message tied to this specific run
        const assistantMessage = findAssistantMessageForRun(messages.data, run.id);
        console.log('Assistant message found:', assistantMessage ? assistantMessage.id : 'none');
        
        if (!assistantMessage) {
            return sendMessage(ws, 'error', 'No assistant response found');
        }
        
        const assistantContent = assistantMessage?.content[0]?.text?.value || '';
        console.log('Assistant content:', assistantContent.substring(0, 50) + '...');
        
        // Save assistant message to database
        await saveMessage(
            threadId, 
            'assistant', 
            assistantContent, 
            assistantMessage.id,
            { 
                runId: run.id,
                assistantId: ASSISTANT_ID
            }
        );

        // Get thread history
        const threadHistory = await getThreadHistory(threadId);
        
        // Send response to client
        sendMessage(ws, 'response', {
            content: assistantContent,
            history: threadHistory.success ? threadHistory.messages : [],
            threadId: context.threadId
        });
        
        console.log('Response sent to client');
    } catch (error) {
        console.error('Message handling error:', error);
        sendMessage(ws, 'error', error.message);
    }
}

function shouldContinuePolling(status) {
    return ['queued', 'in_progress'].includes(status);
}
  
// Updated to find assistant message for a specific run
function findAssistantMessageForRun(messages, runId) {
    // Find the most recent assistant message that was created by this specific run
    return messages.find(m => m.role === 'assistant' && m.run_id === runId);
}
  
export function sendMessage(ws, type, content) {
    ws.send(JSON.stringify({ type, content }));
}

// *** INTEGRATED FUNCTIONS FROM SECOND SNIPPET ***

// Handle object detection data from the client
export const handleObjectDetection = async (ws, data, context) => {
    try {
        const { threadId, detectionData } = data;
        
        // Ensure threadId exists
        if (!threadId) {
            return sendMessage(ws, 'error', 'Thread ID is required');
        }
        
        // Make sure detection data has a timestamp
        if (!detectionData.timestamp) {
            detectionData.timestamp = new Date().toISOString();
        }
        
        // Save detection to thread
        const saveResult = await saveDetectionToThread(threadId, detectionData);
        
        if (!saveResult.success) {
            return sendMessage(ws, 'error', saveResult.message);
        }
        
        // Add detection to context
        if (!context.detections) {
            context.detections = [];
        }
        context.detections.push(detectionData);
        
        // Update context threadId if not already set
        if (!context.threadId) {
            context.threadId = threadId;
        }
        
        // Notify client of successful save
        sendMessage(ws, 'detection_saved', {
            detectionId: detectionData.id || Date.now().toString(),
            timestamp: detectionData.timestamp
        });
        
    } catch (error) {
        console.error('Detection handling error:', error);
        sendMessage(ws, 'error', error.message);
    }
};

// Updated loadPreviousSession function that replaces the previous one
export async function loadPreviousSession(ws, data) {
    try {
        const { threadId } = data;
        
        if (!threadId) {
            return sendMessage(ws, 'error', 'Thread ID is required');
        }
        
        // Get thread data including messages and detections
        const threadResult = await getThreadWithDetections(threadId);
        
        if (!threadResult.success) {
            return sendMessage(ws, 'error', threadResult.message);
        }
        
        const thread = threadResult.thread;
        
        // Get message history
        const historyResult = await getThreadHistory(threadId);
        
        if (!historyResult.success) {
            return sendMessage(ws, 'error', historyResult.message);
        }
        
        // Combine messages and detections into a timeline
        const messages = historyResult.messages;
        const detections = thread.detectionData || [];
        
        const timeline = [
            ...messages.map(msg => ({
                type: 'message',
                data: msg,
                timestamp: new Date(msg.created_at).getTime()
            })),
            ...detections.map(det => ({
                type: 'detection',
                data: det,
                timestamp: new Date(det.timestamp || det.created_at).getTime()
            }))
        ].sort((a, b) => a.timestamp - b.timestamp);
        
        // Send session data to client
        sendMessage(ws, 'session_data', {
            threadId: thread.threadId,
            timeline: timeline,
            isActive: thread.isActive,
            created_at: thread.created_at,
            ended_at: thread.ended_at
        });
        
    } catch (error) {
        console.error('Load session error:', error);
        sendMessage(ws, 'error', error.message);
    }
}

// Function to handle image analysis restoration
export async function loadAnalysisResults(ws, data) {
    try {
        if (!data.threadId) {
            return sendMessage(ws, 'error', 'Thread ID is required');
        }
        
        // Get messages with image analysis results (from metadata)
        const messages = await MessageSchema.find({
            threadId: data.threadId,
            role: 'assistant',
            'metadata.analysisType': { $exists: true }
        }).sort({ created_at: 1 });
        
        if (messages.length === 0) {
            return sendMessage(ws, 'analysis_results', {
                threadId: data.threadId,
                results: [],
                message: 'No analysis results found for this session'
            });
        }
        
        // Extract analysis results from messages
        const analysisResults = messages.map(msg => ({
            messageId: msg.messageId,
            content: msg.content,
            created_at: msg.created_at,
            metadata: msg.metadata
        }));
        
        sendMessage(ws, 'analysis_results', {
            threadId: data.threadId,
            results: analysisResults
        });
    } catch (error) {
        console.error('Load analysis results error:', error);
        sendMessage(ws, 'error', error.message);
    }
}