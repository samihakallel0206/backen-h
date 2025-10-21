
// socket/notificationHandlers.js
const Notification = require('../models/Notification');

module.exports = (io, socket) => {
  
  // Rejoindre la room des notifications utilisateur
  socket.on('join_notifications', () => {
    socket.join(`notifications_${socket.userId}`);
    console.log(`✅ User ${socket.userId} joined notifications room`);
  });
  
  // Marquer les notifications comme lues
  socket.on('mark_notifications_read', async (notificationIds) => {
    try {
      await Notification.updateMany(
        { 
          _id: { $in: notificationIds },
          user_id: socket.userId
        },
        { 
          is_read: true, 
          updated_at: new Date() 
        }
      );
      
      socket.emit('notifications_marked_read', {
        success: true,
        count: notificationIds.length
      });
      
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      socket.emit('error', { message: 'Failed to mark notifications as read' });
    }
  });
  
  // Récupérer les notifications
  socket.on('get_notifications', async (data) => {
    try {
      const { page = 1, limit = 20 } = data;
      const skip = (page - 1) * limit;

      const notifications = await Notification.find({ user_id: socket.userId })
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
          select: 'message_text message_type sender_id',
          populate: {
            path: 'sender_id',
            select: 'name profile_picture'
          }
        })
        .sort({ created_at: -1 })
        .limit(limit)
        .skip(skip);

      const total = await Notification.countDocuments({ user_id: socket.userId });
      const unreadCount = await Notification.countDocuments({ 
        user_id: socket.userId, 
        is_read: false 
      });

      socket.emit('notifications_list', {
        notifications: notifications,
        unreadCount: unreadCount,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          pages: Math.ceil(total / limit)
        }
      });
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
      socket.emit('error', { message: 'Failed to fetch notifications' });
    }
  });
};