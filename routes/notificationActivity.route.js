//routes/notificationActivity.route.js

const express = require('express');
const {
    getUserNotifications,
    markNotificationsAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadCount,
    getUnviewedActivitiesCount
} = require('../controllers/notificationActivity.controller');
const isAuth = require('../middleware/isAuth');

const router = express.Router();

// Routes pour les notifications d'activités
router.get('/', isAuth, getUserNotifications);
router.post('/mark-read', isAuth, markNotificationsAsRead);
router.post('/mark-all-read', isAuth, markAllNotificationsAsRead);
router.delete('/:notificationId', isAuth, deleteNotification);
router.get('/unread-count', isAuth, getUnreadCount);
router.get('/unviewed-count', isAuth, getUnviewedActivitiesCount);

module.exports = router;