
// routes/message.route.js

const express = require('express');
const { 
    sendMessage,
    markAsRead,
    deleteMessage,
    syncTempMessage, // ✅ NOUVELLE ROUTE
    getConversationMessages, // ✅ NOUVELLE ROUTE
    markMessageAsDelivered, // ✅ NOUVELLE ROUTE
    getMessageStats // ✅ NOUVELLE ROUTE
} = require('../controllers/message.controller');
const isAuth = require('../middleware/isAuth');

const router = express.Router();

// Routes existantes
router.post('/', isAuth, sendMessage);
router.put('/mark-read', isAuth, markAsRead);
router.delete('/:id', isAuth, deleteMessage);

// ✅ NOUVELLES ROUTES POUR LA SYNCHRONISATION
router.post('/sync-temp', isAuth, syncTempMessage);
router.get('/conversation/:conversationId', isAuth, getConversationMessages);
router.put('/mark-delivered', isAuth, markMessageAsDelivered);
router.get('/stats/:conversationId', isAuth, getMessageStats);

module.exports = router;