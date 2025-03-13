// Middleware to verify thread ownership
import ThreadSchema from "../Models/ThreadModel.js"
import { validateThread } from "../Service/ThreadService.js";

export const verifyThreadOwnership = async (req, res, next) => {
    try {
        // Get the thread ID from request parameters or body
        // Handle both formats and any quotes that might be wrapped around the ID
        const threadId = (req.params.threadId || req.body.threadId || req.body.threadID || "")
                         .replace(/^"|"$/g, '');
        
        if (!threadId) {
            return res.status(400).json({
                success: false,
                message: "Thread ID is required"
            });
        }
        
        // Ensure user is authenticated
        if (!req.userAuth) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }
        
        // Extract user ID
        const userId = typeof req.userAuth === 'object' && req.userAuth.id 
            ? req.userAuth.id 
            : req.userAuth;
        
        // Use the validateThread function from your ThreadService
        const threadValidation = await validateThread(threadId, userId);
        
        if (!threadValidation.success) {
            return res.status(403).json({
                success: false,
                message: "Thread not found or not authorized"
            });
        }
        
        // If thread exists and belongs to user, attach it to the request for later use
        req.thread = threadValidation.thread;
        
        // Continue to the next middleware or route handler
        next();
    } catch (error) {
        console.error("Thread ownership verification error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to verify thread ownership"
        });
    }
};