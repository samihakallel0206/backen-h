
//routes/notificationRoutes.js 

const express = require('express');
const { 
    getNotifications,
    markAsRead,
    deleteNotification,
    markConversationAsRead, // ✅ NOUVELLE ROUTE
    createNotification // ✅ NOUVELLE ROUTE (pour usage interne)
} = require('../controllers/notification.controller');
const isAuth = require('../middleware/isAuth');

const router = express.Router();

console.log('🟢 notification.route loaded');

router.get('/', isAuth, getNotifications);
router.patch('/mark-read', isAuth, markAsRead);
router.patch('/mark-conversation-read', isAuth, markConversationAsRead); // ✅ NOUVELLE ROUTE
router.delete('/:id', isAuth, deleteNotification);

// Route interne pour créer des notifications (utilisée par message.controller)
router.post('/internal/create', isAuth, (req, res) => {
    const { userId, conversationId, messageId, notificationType } = req.body;
    createNotification(userId, conversationId, messageId, notificationType)
        .then(notification => {
            res.status(201).json({ success: true, notification });
        })
        .catch(error => {
            res.status(400).json({ success: false, error: error.message });
        });
});

module.exports = router; 