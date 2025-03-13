import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    threadId: {
        type: String,
        required: true,
        index: true
    },
    content: {
        type: String,
        required: true
    },
    imageURl:{
      type:String,
    },
    role: {
        type: String,
        required: true,
        enum: ['user', 'assistant', 'system']
    },
    messageId: {
        type: String,
        required: true,
        unique: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: Object,
        default: {}
        // Can contain:
        // - detectionId: reference to the detection if this message is related to an object detection
        // - timestamp: when the detection occurred
        // - boundingBox: coordinates of detected objects
    }
});

// Create a compound index for efficient thread message retrieval
MessageSchema.index({ threadId: 1, created_at: 1 });

const Message = mongoose.model("Message", MessageSchema);

export default Message;