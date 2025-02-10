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


// export const ImageAnalysis = asyncHandler(

const createThread = async () => {
    const AnalysisThread = await openai.beta.threads.create()

    const thread = await ThreadSchema.create({
        threadId: AnalysisThread.id,
        created_at: AnalysisThread.created_at
    })

    return AnalysisThread.id
}



// handling image upload to cloudianary
const uploadImageToCloudinary = async (filePath) => {
    
    console.log("File seen and ready for upload")
    const image = await cloudinary.uploader.upload(filePath, {
        resource_type: "image"
    })

    return image.secure_url
}


export const analyzeImage = async (req, res) => {

    if(!req.file.path){
        res.status(404).json({message:"Image not found"})
    }
    const imageUrl = await uploadImageToCloudinary(req.file.path)

    console.log("FILE UPLOADED")

    if (!imageUrl) {
        return res.status(404).json({ "message": "image not provided" })
    }

    const testThreadId = await createThread()


    //using chat completion to start the analyzing of the object detection 

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "What's in this image?" },
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
      
      console.log("Response content", response.choices[0].message.content);


      //TODO: store the analysis of the image 

      //the reponse of the chat completion as then converted to open ai assistant 

    const _ = await openai.beta.threads.messages.create(
        testThreadId,
        { role: "user", content: response.choices[0].message.content }
    );

    let run = await openai.beta.threads.runs.create(
        testThreadId,
        { assistant_id: ASSISTANT_ID }
    );

    run = await openai.beta.threads.runs.retrieve(
        testThreadId,
        run.id
    );

    while (run.status === "in_progress") {
        if (run.status === "completed") {
            const updatedMessages = await openai.beta.threads.messages.list(
                testThreadId
            );


            console.log("open ai response :", updatedMessages)
            res.status(201).json({
                data: updatedMessages
            })
        }

        run = await openai.beta.threads.runs.retrieve(
            testThreadId,
            run.id
        );
    }
    console.log("run status : ", run.status)
    const updatedMessages = await openai.beta.threads.messages.list(
        testThreadId
    );



    console.log("open ai response :", updatedMessages)
    res.status(201).json({
        data: updatedMessages,
        threadId:testThreadId,
        url:imageUrl
    })


    console.log( testThreadId)
    //  res.json({ "message": "not processed finished" })
    // start processing to open ai 
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

        console.log('Assistant Message:', assistantMessage?.content[0]?.text?.value)

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
