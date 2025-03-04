import OpenAI from "openai"
import asyncHandler from "express-async-handler"
import dotenv from "dotenv"
import ThreadSchema from "../Models/ThreadModel.js"
import cloudinary from "../Utils/Cloudinary.js"

dotenv.config()

const ASSISTANT_ID = process.env.ASSISTANT_ID

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

const createThread = async () => {
    const AnalysisThread = await openai.beta.threads.create()

    const thread = await ThreadSchema.create({
        threadId: AnalysisThread.id,
        created_at: AnalysisThread.created_at
    })

    return AnalysisThread.id
}

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
        if(!req.file || !req.file.path){
            return res.status(404).json({message:"Image not found"})
        }
        
        const imageUrl = await uploadImageToCloudinary(req.file.path)
        console.log("FILE UPLOADED:", imageUrl)
    
        if (!imageUrl) {
            return res.status(404).json({ "message": "Image upload failed" })
        }
    
        const testThreadId = await createThread()
        console.log("Created thread:", testThreadId)
    
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



export async function userQuestions (ws,data,context){

    if(!data.threadId){
        return sendMessage(ws,'error','thread not found ')
    }
    if (!data.message){
        return sendMessage(ws,'error','Message is required ')
    }
   
    const thread = await ThreadSchema.findOne({threadId:data.threadId})
    
    if(!thread){
        return sendMessage(ws,'error','invalid threadId')
    }

    const threadid = thread.threadId
    
   
    try {
        await openai.beta.threads.messages.create(threadid,{
            role:"user",
            content:data.message
        })

        let run = await openai.beta.threads.runs.create(threadid,{
            assistant_id:ASSISTANT_ID
        })

        while (shouldContinuePolling(run.status)) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            run = await openai.beta.threads.runs.retrieve(threadid, run.id);
            sendMessage(ws, 'status', run.status);
        }
        
        if (run.status !== 'completed') {
            throw new Error(`Run failed with status: ${run.status}`);
        }

        const messages = await openai.beta.threads.messages.list(threadid);
        const assistantMessage = findAssistantMessage(messages.data);

        console.log('Assistant Message:', assistantMessage?.content[0]?.text?.value)

        //most recen messages 
        const mostRecenMessage =  JSON.stringify(messages.data.reverse()[0].content[0].text.value)

        console.log('Assistant Message:', mostRecenMessage)

        sendMessage(ws, 'response', {
            content: mostRecenMessage,
            history: messages.data.reverse().map(m => ({
              role: m.role,
              content: m.content[0].text.value
            })),
            threadId: context.threadId
          });

       
        
        
    } catch (error) {
        console.error('Message handling error:', error);
    sendMessage(ws, 'error', error.message);
    }
}

function shouldContinuePolling(status) {
    return ['queued', 'in_progress'].includes(status);
  }
  
  function findAssistantMessage(messages) {
    return messages.reverse().find(m => m.role === 'assistant');
  }
  
  export function sendMessage(ws, type, content) {
    ws.send(JSON.stringify({ type, content }));
  }
