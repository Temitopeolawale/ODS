import { createThread, endSession, getAllSessions, deleteThread, getThreadHistory, saveDetectionToThread, getThreadWithDetections } from "../Service/ThreadService.js"
import MessageSchema from "../Models/MessageModel.js";
import ThreadSchema from "../Models/ThreadModel.js"

// @desc    Start a new session (create a new thread)
// @route   POST /api/sessions/start
// @access  Public
export const startNewSession = async (req, res) => {
    try {

        if (!req.userAuth) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to create a new thread"
            });
        }
        // Get user ID from authenticated request if available
        const userId = typeof req.userAuth === 'object' && req.userAuth.id 
        ? req.userAuth.id 
        : req.userAuth;

        // const activeSession = await ThreadSchema.findOne({ 
        //     userId: userId,
        //     isActive: true 
        //   });
          
        //   if (activeSession) {
        //     // Option 1: Return the existing session with a 409 status
        //     return res.status(409).json({
        //       success: false,
        //       message: "Active session already exists",
        //       existingThreadId: activeSession.threadId
        //     });
            
            
        //   }
        
        // Create a new thread with the user ID
        const newThreadResult = await createThread(userId)
        
        if (newThreadResult.success) {
            res.status(201).json({
                success: true,
                threadId: newThreadResult.threadId, 
                created_at: newThreadResult.created_at
            })
        } else {
            res.status(500).json({
                success: false,
                message: newThreadResult.message
            })
        }
    } catch (error) {
        console.error("Session start error:", error)
        res.status(500).json({
            success: false,
            message: error.message || "Failed to start new session"
        })
    }
}

// @desc    End current session
// @route   POST /api/sessions/end
// @access  Public
export const endCurrentSession = async (req, res) => {
    try {
        const { threadId } = req.body

        if (!threadId) {
            return res.status(400).json({ 
                success: false,
                message: "Thread ID is required" 
            })
        }

        // End the session
        const endResult = await endSession(threadId)
        
        if (endResult.success) {
            res.status(200).json({
                success: true,
                message: "Session ended successfully"
            })
        } else {
            res.status(500).json({
                success: false,
                message: endResult.message
            })
        }
    } catch (error) {
        console.error("Session end error:", error)
        res.status(500).json({
            success: false,
            message: error.message || "Failed to end session"
        })
    }
}

// @desc    Get all sessions for a user
// @route   GET /api/sessions/list
// @access  Public (or Protected if you implement authentication)
export const getAllUserSessions = async (req, res) => {
    try {
        // Get user ID from authenticated request if available
        if (!req.userAuth) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to list sessions"
            });
        }

        // Extract userId from the authentication object and log it
        const userId = typeof req.userAuth === 'object' && req.userAuth.id 
            ? req.userAuth.id 
            : req.userAuth;
        
        console.log("Controller - userId from auth:", userId); // Debug log
        console.log("Controller - req.userAuth type:", typeof req.userAuth); // Check the type
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID in authentication"
            });
        }

        // Get all sessions for this specific user
        const sessionsResult = await getAllSessions(userId);
        
        if (sessionsResult.success) {
            res.status(200).json({
                success: true,
                sessions: sessionsResult.sessions
            });
        } else {
            res.status(500).json({
                success: false,
                message: sessionsResult.message
            });
        }
    } catch (error) {
        console.error("Get sessions error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve sessions"
        });
    }
};
// @desc    Delete a specific thread
// @route   DELETE /api/sessions/delete
// @access  Public
export const deleteSpecificThread = async (req, res) => {
    try {

        if (!req.userAuth) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to delete a thread"
            });
        }


        const { threadId } = req.body;

        const userId = typeof req.userAuth === 'object' && req.userAuth.id 
            ? req.userAuth.id 
            : req.userAuth;

        
        if (!threadId) {
            return res.status(400).json({ 
                success: false,
                message: "Thread ID is required" 
            });
        }
        
        // Delete the thread
        const deletionResult = await deleteThread(threadId);
        
        if (deletionResult.success) {
            res.status(200).json({
                success: true,
                message: "Thread deleted successfully"
            });
        } else {
            const statusCode = deletionResult.message.includes("authorized") ? 403 : 404;
            res.status(statusCode).json({
                success: false,
                message: deletionResult.message
            });
        }
    } catch (error) {
        console.error("Thread deletion error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to delete thread"
        });
    }
};

export const getSessionDetails = async (req, res) => {
    try {

        if (!req.userAuth) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to view session details"
            });
        }

        
        const { threadId } = req.params;

        const userId = typeof req.userAuth === 'object' && req.userAuth.id 
            ? req.userAuth.id 
            : req.userAuth;
        
        
        if (!threadId) {
            return res.status(400).json({ 
                success: false,
                message: "Thread ID is required" 
            });
        } 
        
        // Get the thread
        const thread = await ThreadSchema.findOne({ threadId });
        
        if (!thread) {
            return res.status(404).json({
                success: false,
                message: "Thread not found"
            });
        }
        
        // Get message history (limited to first 5 messages for preview)
        const messages = await MessageSchema.find({ threadId })
            .sort({ created_at: 1 })
            .limit(5)
            .select('role content created_at messageId');
        
        // Get total message count
        const totalMessages = await MessageSchema.countDocuments({ threadId });
        
        // Get the first user message (if any) to use as a title/preview
        const firstUserMessage = await MessageSchema.findOne({ 
            threadId, 
            role: 'user' 
        }).sort({ created_at: 1 }).select('content');
        
        // Create a preview/title from the first user message
        const sessionTitle = firstUserMessage 
            ? (firstUserMessage.content.length > 50 
                ? firstUserMessage.content.substring(0, 50) + '...' 
                : firstUserMessage.content)
            : `Session ${new Date(thread.created_at).toLocaleString()}`;
        
        // Get total detection count
        const totalDetections = thread.detectionData ? thread.detectionData.length : 0;
        
        // Return session details and message preview
        res.status(200).json({
            success: true,
            session: {
                threadId: thread.threadId,
                created_at: thread.created_at,
                ended_at: thread.ended_at,
                isActive: thread.isActive,
                userId: thread.userId,
                title: sessionTitle,
                messageCount: totalMessages,
                detectionCount: totalDetections
            },
            preview: messages.map(msg => ({
                role: msg.role,
                content: msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content,
                created_at: msg.created_at,
                messageId: msg.messageId
            }))
        });
    } catch (error) {
        console.error("Get session details error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve session details"
        });
    }
};

// Updated function to get all messages for a session
export const getSessionMessages = async (req, res) => {
    try {
        if (!req.userAuth) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to view session messages"
            });
        }

        const { threadId } = req.params;
        
        const userId = typeof req.userAuth === 'object' && req.userAuth.id 
            ? req.userAuth.id 
            : req.userAuth;
        
        if (!threadId) {
            return res.status(400).json({ 
                success: false,
                message: "Thread ID is required" 
            });
        }
        
        // Get the thread and check ownership
        const thread = await ThreadSchema.findOne({ threadId, userId });
        
        if (!thread) {
            return res.status(404).json({
                success: false,
                message: "Thread not found or not authorized"
            });
        }
        
        // Get all messages
        const historyResult = await getThreadHistory(threadId, userId);
        
        if (!historyResult.success) {
            return res.status(500).json({
                success: false,
                message: historyResult.message
            });
        }
        
        res.status(200).json({
            success: true,
            threadId: thread.threadId,
            messages: historyResult.messages,
            detections: thread.detectionData || []
        });
    } catch (error) {
        console.error("Get session messages error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve session messages"
        });
    }
};


// @desc    Save detection data to a thread
// @route   POST /api/sessions/save-detection
// @access  Public
export const saveDetection = async (req, res) => {
    try {
        const { threadId, detectionData } = req.body;
        
        if (!threadId || !detectionData) {
            return res.status(400).json({ 
                success: false,
                message: "Thread ID and detection data are required" 
            });
        }
        
        // Save the detection data
        const saveResult = await saveDetectionToThread(threadId, detectionData);
        
        if (saveResult.success) {
            res.status(200).json({
                success: true,
                message: "Detection saved successfully"
            });
        } else {
            res.status(500).json({
                success: false,
                message: saveResult.message
            });
        }
    } catch (error) {
        console.error("Save detection error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to save detection"
        });
    }
};

// @desc    Get full session data including timeline of messages and detections
// @route   GET /api/sessions/full-data/:threadId
// @access  Public
export const getFullSessionData = async (req, res) => {
    try {
        if (!req.userAuth) {
            return res.status(401).json({
                success: false,
                message: "Authentication required to view full session data"
            });
        }

        const { threadId } = req.params;
        
        const userId = typeof req.userAuth === 'object' && req.userAuth.id 
            ? req.userAuth.id 
            : req.userAuth;
        
        if (!threadId) {
            return res.status(400).json({ 
                success: false,
                message: "Thread ID is required" 
            });
        }
        
        // Get the thread with all its data
        const threadResult = await getThreadWithDetections(threadId, userId);
        
        if (!threadResult.success) {
            return res.status(404).json({
                success: false,
                message: threadResult.message
            });
        }
        
        const thread = threadResult.thread;
        
        // Get all messages
        const historyResult = await getThreadHistory(threadId, userId);
        
        if (!historyResult.success) {
            return res.status(500).json({
                success: false,
                message: historyResult.message
            });
        }
        
        // Combine messages and detections chronologically
        const messages = historyResult.messages;
        const detections = thread.detectionData || [];
        
        // Sort everything by timestamp
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
        
        // Extract first image URL if available
        let imageUrl = null;
        const imageMessage = messages.find(msg => msg.metadata && msg.metadata.imageUrl);
        if (imageMessage && imageMessage.metadata.imageUrl) {
            imageUrl = imageMessage.metadata.imageUrl;
        } else {
            // Fall back to detection data if no image in messages
            const imageDetection = detections.find(det => det.imageUrl);
            if (imageDetection) {
                imageUrl = imageDetection.imageUrl;
            }
        }
        
        res.status(200).json({
            success: true,
            threadId: thread.threadId,
            created_at: thread.created_at,
            ended_at: thread.ended_at,
            isActive: thread.isActive,
            title: thread.title || "Session " + threadId.slice(0, 8),
            imageUrl: imageUrl,
            timeline: timeline,
            messages: messages,
            detections: detections
        });
    } catch (error) {
        console.error("Get full session data error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to retrieve session data"
        });
    }
};