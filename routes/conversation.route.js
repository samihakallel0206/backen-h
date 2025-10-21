//routes/conversation.route.js

const express = require('express');
const { 
    createConversation, 
    getUserConversations, 
    getConversationMessages,
    addParticipant,
    removeParticipant
} = require('../controllers/conversation.controller');
const isAuth = require('../middleware/isAuth');

const router = express.Router();

// ✅ AJOUT TEMPORAIRE POUR DEBUG
console.log('🟢 conversation.route loaded');
console.log('🟢 getUserConversations function:', typeof getUserConversations);

router.post('/', isAuth, createConversation);
router.get('/', isAuth, (req, res, next) => {
    console.log('🟢 conversation.route: GET / called - before controller');
    next();
}, getUserConversations);
router.get('/:id/messages', isAuth, getConversationMessages);
router.post('/:id/participants', isAuth, addParticipant);
router.delete('/:id/participants/:userId', isAuth, removeParticipant);

module.exports = router; 

