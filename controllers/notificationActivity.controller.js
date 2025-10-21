//controllers/notificationActivity.controller.js

const NotificationActivityService = require("../services/notificationActivityService");

// ✅ RÉCUPÉRER LES NOTIFICATIONS DE L'UTILISATEUR
const getUserNotifications = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user.id;

        const result = await NotificationActivityService.getUserNotifications(userId, parseInt(page), parseInt(limit));

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("❌ Get user notifications error:", error);
        res.status(500).json({ 
            errors: [{ msg: "Erreur lors de la récupération des notifications" }] 
        });
    }
};

// ✅ MARQUER LES NOTIFICATIONS COMME LUES
const markNotificationsAsRead = async (req, res) => {
    try {
        const { notificationIds } = req.body;
        const userId = req.user.id;

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return res.status(400).json({
                errors: [{ msg: "Liste des IDs de notifications requise" }]
            });
        }

        await NotificationActivityService.markAsRead(notificationIds, userId);

        res.status(200).json({
            success: true,
            message: "Notifications marquées comme lues"
        });
    } catch (error) {
        console.error("❌ Mark notifications as read error:", error);
        res.status(500).json({ 
            errors: [{ msg: "Erreur lors du marquage des notifications" }] 
        });
    }
};

// ✅ MARQUER TOUTES LES NOTIFICATIONS COMME LUES
const markAllNotificationsAsRead = async (req, res) => {
    try {
        const userId = req.user.id;

        await NotificationActivityService.markAllAsRead(userId);

        res.status(200).json({
            success: true,
            message: "Toutes les notifications marquées comme lues"
        });
    } catch (error) {
        console.error("❌ Mark all notifications as read error:", error);
        res.status(500).json({ 
            errors: [{ msg: "Erreur lors du marquage des notifications" }] 
        });
    }
};

// ✅ SUPPRIMER UNE NOTIFICATION
const deleteNotification = async (req, res) => {
    try {
        const { notificationId } = req.params;
        const userId = req.user.id;

        const result = await NotificationActivityService.deleteNotification(notificationId, userId);

        if (!result.success) {
            return res.status(404).json({
                errors: [{ msg: "Notification non trouvée" }]
            });
        }

        res.status(200).json({
            success: true,
            message: "Notification supprimée avec succès",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error("❌ Delete notification error:", error);
        res.status(500).json({ 
            errors: [{ msg: "Erreur lors de la suppression de la notification" }] 
        });
    }
};

// ✅ COMPTER LES NOTIFICATIONS NON LUES
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const unreadCount = await NotificationActivityService.getUnreadCount(userId);

        res.status(200).json({
            success: true,
            unreadCount
        });
    } catch (error) {
        console.error("❌ Get unread count error:", error);
        res.status(500).json({ 
            success: false,
            unreadCount: 0
        });
    }
};

// ✅ COMPTER LES ACTIVITÉS NON CONSULTÉES
const getUnviewedActivitiesCount = async (req, res) => {
    try {
        const userId = req.user.id;

        const unviewedCount = await NotificationActivityService.getUnviewedActivitiesCount(userId);

        res.status(200).json({
            success: true,
            unviewedCount
        });
    } catch (error) {
        console.error("❌ Get unviewed activities count error:", error);
        res.status(500).json({ 
            success: false,
            unviewedCount: 0
        });
    }
};

module.exports = {
    getUserNotifications,
    markNotificationsAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getUnreadCount,
    getUnviewedActivitiesCount
};