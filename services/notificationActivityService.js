// services/notificationActivityService.js

const NotificationActivity = require("../models/NotificationActivity");
const User = require("../models/User");

class NotificationActivityService {
    
    // ✅ NOTIFIER TOUS LES UTILISATEURS POUR UNE ACTIVITÉ PUBLIQUE
    static async notifyPublicActivity(activity, creator) {
        try {
            console.log(`📢 Notification activité publique: ${activity._id}`);
            
            // Récupérer tous les utilisateurs sauf le créateur
            const users = await User.find({ 
                _id: { $ne: creator._id } 
            }).select('_id name');
            
            console.log(`👥 Envoi à ${users.length} utilisateurs`);

            const notifications = users.map(user => ({
                recipient: user._id,
                sender: creator._id,
                activity: activity._id,
                type: 'activity_created_public',
                title: 'نشاط جديد',
                message: `${creator.name} نشر نشاطًا جديدًا: "${activity.activity_subject}"`,
                metadata: {
                    activity_subject: activity.activity_subject,
                    creator_name: creator.name,
                    activity_type: activity.general_activity
                }
            }));

            // Insérer en lot
            if (notifications.length > 0) {
                await NotificationActivity.insertMany(notifications);
                console.log(`✅ ${notifications.length} notifications publiques créées`);
            }

            return notifications.length;
        } catch (error) {
            console.error('❌ Erreur notification publique:', error);
            throw error;
        }
    }

    // ✅ NOTIFIER LES UTILISATEURS IDENTIFIÉS
    static async notifyIdentifiedUsers(activity, creator, identifiedUsers) {
        try {
            console.log(`🎯 Notification utilisateurs identifiés: ${activity._id}`);
            
            const notifications = identifiedUsers.map(identifiedUser => ({
                recipient: identifiedUser.user,
                sender: creator._id,
                activity: activity._id,
                type: 'activity_created_identified',
                title: 'تم تحديدك في نشاط',
                message: `${creator.name} حددك في نشاط: "${activity.activity_subject}"`,
                metadata: {
                    activity_subject: activity.activity_subject,
                    creator_name: creator.name,
                    activity_type: activity.general_activity
                }
            }));

            if (notifications.length > 0) {
                await NotificationActivity.insertMany(notifications);
                console.log(`✅ ${notifications.length} notifications utilisateurs identifiés créées`);
            }

            return notifications.length;
        } catch (error) {
            console.error('❌ Erreur notification utilisateurs identifiés:', error);
            throw error;
        }
    }

// ✅ NOTIFIER LES UTILISATEURS IDENTIFIÉS
    static async notifyIdentifiedUsers(activity, creator, identifiedUsers) {
        try {
            console.log(`🎯 Notification utilisateurs identifiés: ${activity._id}`);
            
            const notifications = identifiedUsers.map(identifiedUser => ({
                recipient: identifiedUser.user,
                sender: creator._id,
                activity: activity._id,
                type: 'activity_created_identified',
                title: 'تم تحديدك في نشاط',
                message: `${creator.name} حددك في نشاط: "${activity.activity_subject}"`,
                metadata: {
                    activity_subject: activity.activity_subject,
                    creator_name: creator.name,
                    activity_type: activity.general_activity
                }
            }));

            if (notifications.length > 0) {
                await NotificationActivity.insertMany(notifications);
                console.log(`✅ ${notifications.length} notifications utilisateurs identifiés créées`);
            }

            return notifications.length;
        } catch (error) {
            console.error('❌ Erreur notification utilisateurs identifiés:', error);
            throw error;
        }
    }

    // ✅ NOTIFICATION POUR LIKE D'ACTIVITÉ
    static async notifyActivityLike(activity, liker, activityOwner) {
        try {
            // Ne pas notifier si l'utilisateur like sa propre activité
            if (liker._id.toString() === activityOwner._id.toString()) {
                return null;
            }

            const notification = new NotificationActivity({
                recipient: activityOwner._id,
                sender: liker._id,
                activity: activity._id,
                type: 'activity_like',
                title: 'إعجاب جديد',
                message: `${liker.name} أعجب بنشاطك: "${activity.activity_subject}"`,
                metadata: {
                    activity_subject: activity.activity_subject,
                    liker_name: liker.name
                }
            });

            await notification.save();
            console.log(`❤️ Notification like envoyée à ${activityOwner.name}`);

            return notification;
        } catch (error) {
            console.error('❌ Erreur notification like:', error);
            throw error;
        }
    }

    // ✅ NOTIFICATION POUR NOUVEAU COMMENTAIRE
    static async notifyNewComment(activity, commenter, activityOwner, commentContent) {
        try {
            // Ne pas notifier si l'utilisateur commente sa propre activité
            if (commenter._id.toString() === activityOwner._id.toString()) {
                return null;
            }

            const truncatedComment = commentContent.length > 50 
                ? commentContent.substring(0, 50) + '...' 
                : commentContent;

            const notification = new NotificationActivity({
                recipient: activityOwner._id,
                sender: commenter._id,
                activity: activity._id,
                type: 'activity_comment',
                title: 'تعليق جديد',
                message: `${commenter.name} علق على نشاطك: "${truncatedComment}"`,
                metadata: {
                    activity_subject: activity.activity_subject,
                    commenter_name: commenter.name,
                    comment_preview: truncatedComment
                }
            });

            await notification.save();
            console.log(`💬 Notification commentaire envoyée à ${activityOwner.name}`);

            return notification;
        } catch (error) {
            console.error('❌ Erreur notification commentaire:', error);
            throw error;
        }
    }

    // ✅ NOTIFICATION POUR RÉPONSE À COMMENTAIRE
    static async notifyCommentReply(activity, replier, commentOwner, replyContent, originalComment) {
        try {
            // Ne pas notifier si l'utilisateur répond à son propre commentaire
            if (replier._id.toString() === commentOwner._id.toString()) {
                return null;
            }

            const truncatedReply = replyContent.length > 50 
                ? replyContent.substring(0, 50) + '...' 
                : replyContent;

            const notification = new NotificationActivity({
                recipient: commentOwner._id,
                sender: replier._id,
                activity: activity._id,
                type: 'comment_reply',
                title: 'رد على تعليقك',
                message: `${replier.name} رد على تعليقك: "${truncatedReply}"`,
                metadata: {
                    activity_subject: activity.activity_subject,
                    replier_name: replier.name,
                    reply_preview: truncatedReply,
                    original_comment: originalComment
                }
            });

            await notification.save();
            console.log(`↩️ Notification réponse envoyée à ${commentOwner.name}`);

            return notification;
        } catch (error) {
            console.error('❌ Erreur notification réponse:', error);
            throw error;
        }
    }

    // ✅ RÉCUPÉRER LES ACTIVITÉS NON CONSULTÉES
    static async getUnviewedActivities(userId) {
        try {
            const notifications = await NotificationActivity.find({
                recipient: userId,
                activity_viewed: false,
                type: { 
                    $in: [
                        'activity_created_public', 
                        'activity_created_identified', 
                        'identified_in_activity'
                    ] 
                }
            })
            .populate('sender', 'name profile_picture')
            .populate('activity', 'activity_subject general_activity')
            .sort({ createdAt: -1 });

            const activityIds = [...new Set(notifications.map(notif => notif.activity._id.toString()))];

            return {
                notifications,
                activityIds,
                count: activityIds.length
            };
        } catch (error) {
            console.error('❌ Erreur récupération activités non consultées:', error);
            throw error;
        }
    }

    // ✅ COMPTER LES ACTIVITÉS NON CONSULTÉES
    static async getUnviewedActivitiesCount(userId) {
        try {
            const count = await NotificationActivity.countDocuments({
                recipient: userId,
                activity_viewed: false,
                type: { 
                    $in: [
                        'activity_created_public', 
                        'activity_created_identified', 
                        'identified_in_activity'
                    ] 
                }
            });

            return count;
        } catch (error) {
            console.error('❌ Erreur comptage activités non consultées:', error);
            return 0;
        }
    }

    // ✅ AUTRES MÉTHODES EXISTANTES
    static async getUserNotifications(userId, page = 1, limit = 20) {
        try {
            const skip = (page - 1) * limit;
            
            const notifications = await NotificationActivity.find({
                recipient: userId
            })
            .populate('sender', 'name profile_picture')
            .populate('activity', 'activity_subject general_activity user visibility')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

            const total = await NotificationActivity.countDocuments({
                recipient: userId
            });

            return {
                notifications,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('❌ Erreur récupération notifications:', error);
            throw error;
        }
    }

    static async markAsRead(notificationIds, userId) {
        try {
            await NotificationActivity.updateMany(
                {
                    _id: { $in: notificationIds },
                    recipient: userId
                },
                {
                    $set: { is_read: true }
                }
            );
            
            return true;
        } catch (error) {
            console.error('❌ Erreur marquage notifications lues:', error);
            throw error;
        }
    }

    static async markAllAsRead(userId) {
        try {
            await NotificationActivity.updateMany(
                {
                    recipient: userId,
                    is_read: false
                },
                {
                    $set: { is_read: true }
                }
            );
            
            return true;
        } catch (error) {
            console.error('❌ Erreur marquage toutes notifications lues:', error);
            throw error;
        }
    }

    static async getUnreadCount(userId) {
        try {
            const unreadCount = await NotificationActivity.countDocuments({
                recipient: userId,
                is_read: false
            });
            
            return unreadCount;
        } catch (error) {
            console.error('❌ Erreur comptage notifications non lues:', error);
            return 0;
        }
    }

    static async deleteNotification(notificationId, userId) {
        try {
            const result = await NotificationActivity.findOneAndDelete({
                _id: notificationId,
                recipient: userId
            });

            return {
                success: !!result,
                deletedCount: result ? 1 : 0
            };
        } catch (error) {
            console.error('❌ Erreur suppression notification:', error);
            throw error;
        }
    }
}

module.exports = NotificationActivityService;