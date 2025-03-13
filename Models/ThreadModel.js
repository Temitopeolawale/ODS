import mongoose from "mongoose";

const ThreadSchema = new mongoose.Schema({
    threadId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true // Make optional if you want to support anonymous threads
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    ended_at: {
        type: Date,
        default: null
    },
    isActive: {
        type: Boolean,
        default: true
    },
    title: {
        type: String,
        default: "New Session"
    },
    metadata: {
        type: Object,
        default: {}
    },
    detectionData: {
        type: Array,
        default: []
    }
}, { timestamps: true });

// Add indexes for frequent queries
ThreadSchema.index({ userId: 1, isActive: 1 });
ThreadSchema.index({ created_at: -1 });

// Add a virtual property for session duration
ThreadSchema.virtual('duration').get(function() {
    if (!this.ended_at) return null;
    return (this.ended_at - this.created_at) / 1000; // Duration in seconds
});

// Define a method to check if a thread is active
ThreadSchema.methods.isThreadActive = function() {
    return this.isActive === true;
};

const Thread = mongoose.model("Thread", ThreadSchema);

export default Thread;