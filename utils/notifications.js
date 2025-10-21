// utils/notificationUtils.js
const Notification = require('../models/Notification');

class NotificationUtils {
  
  // Créer une notification de nouveau message
  static async createMessageNotification(conversationId, messageId, senderId, excludedUserId = null) {
    try {
      const conversation = await Conversation.findById(conversationId).populate('participants');
      const message = await Message.findById(messageId);
      
      const notifications = [];
      
      for (const participant of conversation.participants) {
        // Ne pas notifier l'expéditeur ni l'utilisateur exclu
        if (participant._id.toString() === senderId.toString() || 
            (excludedUserId && participant._id.toString() === excludedUserId.toString())) {
          continue;
        }
        
        const notification = new Notification({
          user_id: participant._id,
          conversation_id: conversationId,
          message_id: messageId,
          notification_type: 'new_message',
          title: this.getSenderName(senderId), // À implémenter
          message_preview: this.truncateMessage(message.message_text),
          is_read: false
        });
        
        notifications.push(notification.save());
      }
      
      await Promise.all(notifications);
      return notifications;
      
    } catch (error) {
      console.error('Error creating message notifications:', error);
    }
  }
  
  // Créer une notification d'appel manqué
  static async createMissedCallNotification(conversationId, callerId, callType) {
    try {
      const conversation = await Conversation.findById(conversationId);
      
      const notifications = conversation.participants.map(participantId => {
        if (participantId.toString() === callerId.toString()) return null;
        
        return new Notification({
          user_id: participantId,
          conversation_id: conversationId,
          notification_type: 'call_missed',
          title: 'Appel manqué',
          message_preview: `Appel ${callType} manqué`,
          metadata: {
            call_type: callType,
            caller_id: callerId
          }
        }).save();
      }).filter(Boolean);
      
      await Promise.all(notifications);
      return notifications;
      
    } catch (error) {
      console.error('Error creating missed call notifications:', error);
    }
  }
  
  // Marquer les notifications comme lues
  static async markAsRead(userId, notificationIds = null) {
    try {
      const filter = { user_id: userId, is_read: false };
      
      if (notificationIds) {
        filter._id = { $in: notificationIds };
      }
      
      const result = await Notification.updateMany(
        filter,
        { is_read: true, updated_at: new Date() }
      );
      
      return result.modifiedCount;
      
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }
  
  // Récupérer les notifications d'un utilisateur
  static async getUserNotifications(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;
      
      const notifications = await Notification.find({ user_id: userId })
        .populate('conversation_id', 'group_name participants')
        .populate('message_id', 'message_text message_type')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await Notification.countDocuments({ user_id: userId });
      
      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
      
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }
  
  // Supprimer les anciennes notifications
  static async cleanupExpiredNotifications() {
    try {
      const result = await Notification.deleteMany({
        expires_at: { $lt: new Date() }
      });
      
      console.log(`Cleaned up ${result.deletedCount} expired notifications`);
      return result.deletedCount;
      
    } catch (error) {
      console.error('Error cleaning up expired notifications:', error);
    }
  }
  
  // Méthodes helper
  static truncateMessage(message, length = 100) {
    if (!message) return 'Nouveau message';
    return message.length > length ? message.substring(0, length) + '...' : message;
  }
  
  static getSenderName(senderId) {
    // À implémenter selon ton modèle User
    return 'Utilisateur';
  }
}

module.exports = NotificationUtils;