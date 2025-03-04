import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true
    },
    threadId: {
        type: String,
        required: true,
        index: true
    },
    role: {
        type: String,
        enum: ['user', 'assistant', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Static method to find messages by thread
MessageSchema.statics.findByThreadId = async function(threadId) {
    return await this.find({ threadId }).sort({ created_at: 1 });
};

// Method to create a new message
MessageSchema.statics.createMessage = async function(messageData) {
    return await this.create(messageData);
};

export default mongoose.model('Message', MessageSchema);