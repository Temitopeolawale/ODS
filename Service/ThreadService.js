import OpenAI from "openai"
import dotenv from "dotenv"
import ThreadSchema from "../Models/ThreadModel.js"
import MessageSchema from "../Models/MessageModel.js"
dotenv.config()

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

export const createThread = async (userId) => {
    try {
        // Validate that userId is provided
        if (!userId) {
            return {
                success: false,
                message: "User ID is required to create a thread"
            }
        }

        // Create a new thread in OpenAI
        const AnalysisThread = await openai.beta.threads.create()

        // Create a record in the database with required userId
        const thread = await ThreadSchema.create({
            threadId: AnalysisThread.id,
            userId: userId,
            created_at: AnalysisThread.created_at,
            isActive: true
        })

        return {
            success: true,
            threadId: AnalysisThread.id,
            created_at: AnalysisThread.created_at
        }
    } catch (error) {
        console.error("Thread creation error:", error)
        return {
            success: false,
            message: error.message || "Failed to create thread"
        }
    }
}
export const validateThread = async (threadId, userId = null) => {
    try {
        // If no threadId provided, consider it a new thread
        if (!threadId) {
            return {
                success: true,
                message: "No thread ID provided, will create new thread"
            };
        }

        // Modified to work with or without userId
        let filter = { threadId };
        if (userId) {
            filter.userId = userId;
        }

        const thread = await ThreadSchema.findOne(filter);

        if (!thread) {
            return {
                success: false,
                message: "Thread not found"
            };
        }

        return {
            success: true,
            thread
        };
    } catch (error) {
        console.error("Thread validation error:", error);
        return {
            success: false,
            message: error.message || "Failed to validate thread"
        };
    }
};


export const endSession = async (threadId, userId) => {
    try {
        // Always require userId
        if (!userId) {
            return {
                success: false,
                message: "User ID is required to end session"
            }
        }

        // Mark the thread as inactive in the database
        const updatedThread = await ThreadSchema.findOneAndUpdate(
            { threadId, userId },
            { 
                isActive: false,
                ended_at: new Date()
            },
            { new: true }
        )

        if (!updatedThread) {
            return {
                success: false,
                message: "Thread not found or not authorized"
            }
        }

        // Optional: Delete the thread from OpenAI if needed
        await openai.beta.threads.del(threadId)

        return {
            success: true,
            message: "Session ended successfully"
        }
    } catch (error) {
        console.error("Session end error:", error)
        return {
            success: false,
            message: error.message || "Failed to end session"
        }
    }
}


export const getAllSessions = async (userId) => {
    try {
        // Require userId to be provided
        if (!userId) {
            return {
                success: false,
                message: "User ID is required to fetch sessions"
            }
        }
        
        console.log("Fetching sessions for userId:", userId); // Add this for debugging
        
        // Fetch threads from the database for this specific user
        const threads = await ThreadSchema.find({ userId: userId })
            .sort({ created_at: -1 }) // Sort by creation date, newest first
            .select('threadId created_at ended_at isActive'); // Select specific fields
        
        console.log(`Found ${threads.length} threads for user ${userId}`); // Add this for debugging
        
        return {
            success: true,
            sessions: threads
        };
    } catch (error) {
        console.error("Get sessions error:", error);
        return {
            success: false,
            message: error.message || "Failed to fetch sessions"
        };
    }
};

export const deleteThread = async (threadId, userId = null) => {
    try {
        // Prepare filter object
        let filter = { threadId };
        
        // If userId is provided, ensure the thread belongs to this user
        if (userId) {
            filter.userId = userId;
        }

        // Delete associated messages first
        await MessageSchema.deleteMany({ threadId });
        
        // Remove the thread from the database
        const deletedThread = await ThreadSchema.findOneAndDelete(filter);
        
        if (!deletedThread) {
            return {
                success: false,
                message: "Thread not found or not authorized"
            };
        }
        
        // Delete the thread from OpenAI
        try {
            await openai.beta.threads.del(threadId);
        } catch (openAIError) {
            console.warn(`Could not delete thread from OpenAI: ${openAIError.message}`);
            // We still consider this a success since the database record is deleted
        }
        
        return {
            success: true,
            message: "Thread deleted successfully"
        };
    } catch (error) {
        console.error("Thread deletion error:", error);
        return {
            success: false,
            message: error.message || "Failed to delete thread"
        };
    }
};

export const saveMessage = async (threadId, role, content, messageId, metadata = {}) => {
    try {
        // Check if message already exists
        const existingMessage = await MessageSchema.findOne({ messageId });
        
        if (existingMessage) {
            return {
                success: true,
                message: "Message already exists",
                isExisting: true
            };
        }
        
        // Create new message if it doesn't exist
        const message = await MessageSchema.create({
            threadId,
            role,
            content,
            messageId,
            created_at: new Date(),
            metadata
        });
        
        return {
            success: true,
            message
        };
    } catch (error) {
        console.error("Save message error:", error);
        return {
            success: false,
            message: error.message || "Failed to save message"
        };
    }
}

export const getThreadHistory = async (threadId, userId) => {
    try {
        // Always require userId
        if (!userId) {
            return {
                success: false,
                message: "User ID is required to fetch thread history"
            }
        }
        
        // Validate thread ownership
        const thread = await ThreadSchema.findOne({ threadId, userId });
        if (!thread) {
            return {
                success: false,
                message: "Thread not found or not authorized"
            };
        }
        
        const messages = await MessageSchema.find({ threadId })
            .sort({ created_at: 1 }) // Sort by creation date, oldest first
            .select('role content created_at messageId metadata');
        
        return {
            success: true,
            messages: messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                created_at: msg.created_at,
                messageId: msg.messageId,
                metadata: msg.metadata
            }))
        };
    } catch (error) {
        console.error("Get thread history error:", error);
        return {
            success: false,
            message: error.message || "Failed to fetch thread history"
        };
    }
}


export const saveDetectionToThread = async (threadId, detectionData, userId = null) => {
    try {
        // Prepare filter object
        let filter = { threadId };
        
        // If userId is provided, ensure the thread belongs to this user
        if (userId) {
            filter.userId = userId;
        }
        
        // Update the thread with the new detection data
        const updatedThread = await ThreadSchema.findOneAndUpdate(
            filter,
            { 
                $push: { detectionData: detectionData }
            },
            { new: true }
        );

        if (!updatedThread) {
            return {
                success: false,
                message: "Thread not found or not authorized"
            };
        }

        return {
            success: true,
            message: "Detection data saved successfully"
        };
    } catch (error) {
        console.error("Save detection error:", error);
        return {
            success: false,
            message: error.message || "Failed to save detection data"
        };
    }
};

export const getThreadWithDetections = async (threadId, userId) => {
    try {
        // Always require userId
        if (!userId) {
            return {
                success: false,
                message: "User ID is required to fetch thread with detections"
            }
        }
        
        // Find the thread
        const thread = await ThreadSchema.findOne({ threadId, userId });
        
        if (!thread) {
          return {
            success: false,
            message: "Thread not found or not authorized"
          };
        }
        
        // Get all messages for the thread
        const messages = await MessageSchema.find({ threadId })
          .sort({ created_at: 1 })
          .select('role content created_at messageId metadata');
        
        // Get the first user message to use as a title
        const firstUserMessage = messages.find(msg => msg.role === 'user');
        
        // Create a title from the first user message or use a default
        const sessionTitle = firstUserMessage 
          ? (firstUserMessage.content.length > 50 
              ? firstUserMessage.content.substring(0, 50) + '...' 
              : firstUserMessage.content)
          : `Session ${new Date(thread.created_at).toLocaleString()}`;
        
        // Extract image URL if present in detection data
        let imageUrl = null;
        // First check messages for image URLs in metadata
        const imageMessage = messages.find(msg => msg.metadata && msg.metadata.imageUrl);
        if (imageMessage && imageMessage.metadata.imageUrl) {
            imageUrl = imageMessage.metadata.imageUrl;
        } else {
            // Fall back to detection data
            if (thread.detectionData && thread.detectionData.length > 0) {
                const imageData = thread.detectionData.find(d => d.imageUrl);
                if (imageData) {
                    imageUrl = imageData.imageUrl;
                }
            }
        }
        
        return {
          success: true,
          thread: {
            ...thread.toObject(),
            title: sessionTitle,
            imageUrl: imageUrl,
            isActive: thread.isActive,
          },
          messages: messages
        };
      } catch (error) {
        console.error("Error getting thread with detections:", error);
        return {
          success: false,
          message: error.message
        };
      }
};
export const reactivateThread = async (threadId, userId = null) => {
    try {
        // Prepare filter object
        let filter = { threadId };
        
        // If userId is provided, ensure the thread belongs to this user
        if (userId) {
            filter.userId = userId;
        }
        
        // Check if the thread exists
        const thread = await ThreadSchema.findOne(filter);
        
        if (!thread) {
            return {
                success: false,
                message: "Thread not found or not authorized"
            };
        }
        
        // If thread is already active, no need to update
        if (thread.isActive) {
            return {
                success: true,
                message: "Thread is already active",
                thread
            };
        }
        
        // Reactivate the thread
        const updatedThread = await ThreadSchema.findOneAndUpdate(
            filter,
            { 
                isActive: true,
                ended_at: null // Clear the ended_at field
            },
            { new: true }
        );
        
        return {
            success: true,
            message: "Thread reactivated successfully",
            thread: updatedThread
        };
    } catch (error) {
        console.error("Thread reactivation error:", error);
        return {
            success: false,
            message: error.message || "Failed to reactivate thread"
        };
    }
};