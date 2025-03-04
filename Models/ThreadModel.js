import mongoose from "mongoose"

const Schema = mongoose.Schema


const thread = new Schema ({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
      },
      messages: [
        {
          type: mongoose.Schema.Types.ObjectId, 
          ref: 'Message'
        }
      ],
      threadId:{
        type:"String",
        required:true
      },
      
      imageAnalysis: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      },
      created_at: {
        type: Number,
        required:true,
      },
      
})
const ThreadSchema = mongoose.model("Thread",thread)

export default ThreadSchema


