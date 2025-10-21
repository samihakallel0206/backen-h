
// controllers/notification.controller.js

const Notification = require("../models/Notification");

// Récupérer les notifications de l'utilisateur
exports.getNotifications = async (req, res) => {
    try {
        console.log('🟢 getNotifications called for user:', req.user.id);
        
        const { page = 1, limit = 50, unread_only } = req.query;

        // ✅ CORRECTION: Construction du filtre
        let filter = { user_id: req.user.id };
        
        if (unread_only === 'true') {
            filter.is_read = false;
        }

        console.log('🔍 Filtre notifications:', filter);

        const notifications = await Notification.find(filter)
            .populate({
                path: 'conversation_id',
                select: 'group_name participants conversation_type',
                populate: {
                    path: 'participants',
                    select: 'name profile_picture'
                }
            })
            .populate({
                path: 'message_id',
                select: 'message_text message_type sender_id created_at',
                populate: {
                    path: 'sender_id',
                    select: 'name profile_picture'
                }
            })
            .sort({ created_at: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Notification.countDocuments(filter);
        const unreadCount = await Notification.countDocuments({ 
            user_id: req.user.id, 
            is_read: false 
        });

        console.log(`📊 Found ${notifications.length} notifications, ${unreadCount} unread`);

        // ✅ CORRECTION: Structure de réponse cohérente
        res.status(200).json({
            success: true,
            data: {
                notifications: notifications,
                unreadCount: unreadCount,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });

    } catch (error) {
        console.error("❌ Get notifications error:", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la récupération des notifications",
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Marquer les notifications comme lues
exports.markAsRead = async (req, res) => {
    try {
        const { notificationIds } = req.body;

        console.log('🟢 markAsRead called:', { 
            user: req.user.id, 
            notificationIds 
        });

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return res.status(400).json({
                success: false,
                error: "notificationIds est requis et doit être un tableau"
            });
        }

        const result = await Notification.updateMany(
            { 
                _id: { $in: notificationIds },
                user_id: req.user.id
            },
            { 
                is_read: true, 
                updated_at: new Date() 
            }
        );

        console.log(`✅ Marked ${result.modifiedCount} notifications as read`);

        res.status(200).json({
            success: true,
            message: "Notifications marquées comme lues",
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error("❌ Mark as read error:", error);
        res.status(400).json({
            success: false,
            error: "Impossible de marquer les notifications comme lues"
        });
    }
};

// ✅ NOUVELLE FONCTION: Marquer les notifications d'une conversation comme lues
exports.markConversationAsRead = async (req, res) => {
    try {
        const { conversationId } = req.body;

        console.log('🟢 markConversationAsRead called:', { 
            conversationId, 
            user: req.user.id 
        });

        if (!conversationId) {
            return res.status(400).json({
                success: false,
                error: "conversationId est requis"
            });
        }

        const result = await Notification.updateMany(
            { 
                user_id: req.user.id,
                conversation_id: conversationId,
                is_read: false
            },
            { 
                is_read: true, 
                updated_at: new Date() 
            }
        );

        console.log(`✅ Marked ${result.modifiedCount} conversation notifications as read`);

        res.status(200).json({
            success: true,
            message: "Notifications de conversation marquées comme lues",
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error("❌ Mark conversation as read error:", error);
        res.status(400).json({
            success: false,
            error: "Impossible de marquer les notifications de conversation comme lues"
        });
    }
};

// Supprimer une notification
exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🟢 deleteNotification called:', { notificationId: id, user: req.user.id });

        const notification = await Notification.findOneAndDelete({
            _id: id,
            user_id: req.user.id
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: "Notification non trouvée"
            });
        }

        console.log('✅ Notification deleted:', id);

        res.status(200).json({
            success: true,
            message: "Notification supprimée avec succès"
        });

    } catch (error) {
        console.error("❌ Delete notification error:", error);
        res.status(400).json({
            success: false,
            error: "Impossible de supprimer la notification"
        });
    }
};

// ✅ NOUVELLE FONCTION: Créer une notification (utilisée par message.controller)
exports.createNotification = async (userId, conversationId, messageId, notificationType = 'new_message') => {
    try {
        console.log('🟢 createNotification called:', { userId, conversationId, messageId, notificationType });

        const conversation = await require("../models/Conversation").findById(conversationId)
            .populate('participants', 'name')
            .populate({
                path: 'last_message',
                populate: { path: 'sender_id', select: 'name' }
            });

        if (!conversation) {
            console.error('❌ Conversation non trouvée pour notification');
            return null;
        }

        const message = await require("../models/Message").findById(messageId)
            .populate('sender_id', 'name');

        if (!message) {
            console.error('❌ Message non trouvé pour notification');
            return null;
        }

        // Éviter les notifications pour l'expéditeur
        if (message.sender_id._id.toString() === userId.toString()) {
            return null;
        }

        const title = conversation.conversation_type === 'private' 
            ? `Nouveau message de ${message.sender_id.name}` 
            : `Nouveau message dans ${conversation.group_name}`;

        const messagePreview = message.message_type === 'text' 
            ? message.message_text 
            : `📎 ${message.message_type}`;

        const notification = new Notification({
            user_id: userId,
            conversation_id: conversationId,
            message_id: messageId,
            notification_type: notificationType,
            title: title,
            message_preview: messagePreview.length > 150 
                ? messagePreview.substring(0, 147) + '...' 
                : messagePreview,
            is_read: false
        });

        await notification.save();
        
        // Populer pour retour
        const populatedNotification = await Notification.findById(notification._id)
            .populate('conversation_id', 'group_name')
            .populate('message_id', 'message_text message_type');

        console.log('✅ Notification created:', populatedNotification._id);
        return populatedNotification;

    } catch (error) {
        console.error('❌ Create notification error:', error);
        return null;
    }
}; 