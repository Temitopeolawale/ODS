import mongoose from "mongoose"

const Schema = mongoose.Schema

const message = new Schema({
    content: {
        type: String,
        required: true
      },
      sender: {
        type: String,
        enum: ['user', 'ai'],
        required: true
      },
      timestamp: {
        type: Date,
        default: Date.now
      },
      type: {
        type: String,
        enum: ['text', 'image', 'analysis'],
        default: 'text'
      },
      imageUrl: {
        type: String,
        default: null
      }
},{
    timestamps:true
})

// const message = new Schema({
//     role:{
//         type:String,
//         enum:["user","assistant"],
//         required:true
//     },
//     content: {
//         type: [
//           {
//             type: {
//               type: String,
//               enum: ['text', 'image_url'],
//               required: true,
//             },
//             text: String,
//             image_url: {
//               url: String,
//             },
//           },
//         ],
//         required: true,
//     }
// },
// {
//     timestamps:true
// })

const MessageModel = mongoose.model("Message",message)

export default MessageModel
