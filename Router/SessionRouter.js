import express from 'express';

import { 
    startNewSession, 
    endCurrentSession, 
    getAllUserSessions, 
    deleteSpecificThread,
    getSessionDetails,
    getSessionMessages,
    saveDetection,
    getFullSessionData
} from '../Controller/SessionController.js';
import { loggedIn } from '../Middleware/isLoggedIn.js';
import { verifyThreadOwnership } from '../Middleware/ThreadOwnership.js';

const router = express.Router();

// Routes that don't need thread ownership verification
router.post('/start', loggedIn, startNewSession);
router.get('/list', loggedIn, getAllUserSessions);

// Routes that need thread ownership verification
router.post('/end', loggedIn, verifyThreadOwnership, endCurrentSession);
router.delete('/delete', loggedIn, verifyThreadOwnership, deleteSpecificThread);
router.get('/details/:threadId', loggedIn, verifyThreadOwnership, getSessionDetails);
router.get('/messages/:threadId', loggedIn, verifyThreadOwnership, getSessionMessages);
router.post('/save-detection', loggedIn, verifyThreadOwnership, saveDetection);
router.get('/full-data/:threadId', loggedIn, verifyThreadOwnership, getFullSessionData);

export default router;