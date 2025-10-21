
// socket/messageHandlers.js
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Notification = require('../models/Notification');

module.exports = (io, socket) => {
  
  // Rejoindre une conversation
  socket.on('join_conversation', async (conversationId) => {
    try {
      // Vérifier que l'utilisateur fait partie de la conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: socket.userId
      });

      if (conversation) {
        socket.join(`conversation_${conversationId}`);
        console.log(`✅ User ${socket.userId} joined conversation ${conversationId}`);
        
        // Confirmer la jointure
        socket.emit('conversation_joined', { conversationId });
      } else {
        socket.emit('error', { message: 'Accès non autorisé à cette conversation' });
      }
    } catch (error) {
      console.error('Error joining conversation:', error);
      socket.emit('error', { message: 'Erreur lors de la jointure à la conversation' });
    }
  });
  
  // Quitter une conversation
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`✅ User ${socket.userId} left conversation ${conversationId}`);
  });
  
  // ✅ NOUVEAU: Envoyer un message via socket
  socket.on('send_message', async (data) => {
    try {
      const { conversationId, messageType, content, replyTo, tempId } = data;
      
      console.log('🟢 Socket send_message received:', { 
        conversationId, 
        sender: socket.userId,
        tempId 
      });

      // Vérifier l'accès à la conversation
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: socket.userId
      }).populate('participants', 'name profile_picture');

      if (!conversation) {
        socket.emit('error', { 
          message: 'Accès non autorisé',
          tempId: tempId 
        });
        return;
      }

      // Créer le message
      const message = new Message({
        conversation_id: conversationId,
        sender_id: socket.userId,
        message_type: messageType || 'text',
        message_text: messageType === 'text' ? content : null,
        media_url: messageType !== 'text' ? content : null,
        reply_to_message_id: replyTo,
        message_status: 'sent'
      });

      await message.save();

      // Mettre à jour la conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        last_message: message._id,
        updated_at: new Date()
      });

      // Populer le message
      const populatedMessage = await Message.findById(message._id)
        .populate('sender_id', 'name profile_picture')
        .populate('reply_to_message_id');

      console.log('✅ Message created via socket:', populatedMessage._id);

      // ✅ ÉVÉNEMENT 1: Confirmation à l'expéditeur
      socket.emit('message_sent', {
        tempId: tempId,
        message: populatedMessage,
        conversationId: conversationId
      });

      // ✅ ÉVÉNEMENT 2: Nouveau message aux autres participants
      conversation.participants.forEach(participant => {
        if (participant._id.toString() !== socket.userId.toString()) {
          io.to(`user_${participant._id}`).emit('new_message', {
            message: populatedMessage,
            conversationId: conversationId
          });

          // Créer une notification
          createNotification(participant._id, conversation, populatedMessage);
        }
      });

      // ✅ ÉVÉNEMENT 3: Émettre à la room de conversation
      io.to(`conversation_${conversationId}`).emit('new_message', {
        message: populatedMessage,
        conversationId: conversationId
      });

    } catch (error) {
      console.error('❌ Socket send_message error:', error);
      socket.emit('error', { 
        message: 'Erreur lors de l\'envoi du message',
        tempId: data.tempId 
      });
    }
  });
  
  // Typing indicator
  socket.on('typing_start', (conversationId) => {
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      userId: socket.userId,
      conversationId: conversationId,
      typing: true
    });
  });
  
  socket.on('typing_stop', (conversationId) => {
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      userId: socket.userId,
      conversationId: conversationId,
      typing: false
    });
  });
  
  // Marquer les messages comme lus
  socket.on('mark_messages_read', async (conversationId) => {
    try {
      const result = await Message.updateMany(
        { 
          conversation_id: conversationId,
          sender_id: { $ne: socket.userId },
          message_status: { $in: ['sent', 'delivered'] }
        },
        { message_status: 'read' }
      );

      // Notifier les autres participants
      socket.to(`conversation_${conversationId}`).emit('messages_read', {
        conversationId: conversationId,
        userId: socket.userId,
        count: result.modifiedCount
      });

      console.log(`✅ User ${socket.userId} marked ${result.modifiedCount} messages as read in ${conversationId}`);
      
    } catch (error) {
      console.error('Error marking messages as read:', error);
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  });

  // ✅ NOUVEAU: Confirmation de réception de message
  socket.on('message_delivered', async (data) => {
    try {
      const { messageId } = data;
      console.log('📨 Message delivered:', messageId);
      
      // Marquer le message comme livré dans la base de données
      await Message.findByIdAndUpdate(messageId, { 
        message_status: 'delivered' 
      });
      
      // Notifier l'expéditeur
      const message = await Message.findById(messageId);
      if (message) {
        io.to(`user_${message.sender_id}`).emit('message_delivered', {
          messageId: messageId,
          conversationId: message.conversation_id
        });
      }
    } catch (error) {
      console.error('Error handling message_delivered:', error);
    }
  });

  // ✅ NOUVEAU: Marquer un message spécifique comme lu
  socket.on('mark_message_read', async (data) => {
    try {
      const { messageId } = data;
      
      const message = await Message.findById(messageId);
      if (!message) {
        socket.emit('error', { message: 'Message non trouvé' });
        return;
      }

      // Vérifier que l'utilisateur est le destinataire
      const conversation = await Conversation.findOne({
        _id: message.conversation_id,
        participants: socket.userId
      });

      if (!conversation) {
        socket.emit('error', { message: 'Accès non autorisé à ce message' });
        return;
      }

      // Marquer comme lu seulement si l'utilisateur n'est pas l'expéditeur
      if (message.sender_id.toString() !== socket.userId.toString()) {
        message.message_status = 'read';
        await message.save();

        // Notifier l'expéditeur
        io.to(`user_${message.sender_id}`).emit('message_read', {
          messageId: messageId,
          conversationId: message.conversation_id,
          readBy: socket.userId,
          readAt: new Date()
        });

        console.log(`✅ Message ${messageId} marked as read by ${socket.userId}`);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
      socket.emit('error', { message: 'Erreur lors du marquage du message comme lu' });
    }
  });

  // ✅ NOUVEAU: Rejoindre plusieurs conversations
  socket.on('join_conversations', async (conversationIds) => {
    try {
      for (const conversationId of conversationIds) {
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId
        });

        if (conversation) {
          socket.join(`conversation_${conversationId}`);
        }
      }
      console.log(`✅ User ${socket.userId} joined ${conversationIds.length} conversations`);
    } catch (error) {
      console.error('Error joining multiple conversations:', error);
    }
  });

  // ✅ NOUVEAU: Récupérer l'historique des messages
  socket.on('get_message_history', async (data) => {
    try {
      const { conversationId, page = 1, limit = 50 } = data;
      
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: socket.userId
      });

      if (!conversation) {
        socket.emit('error', { message: 'Accès non autorisé à cette conversation' });
        return;
      }

      const skip = (page - 1) * limit;

      const messages = await Message.find({ 
        conversation_id: conversationId,
        deleted_by_users: { $ne: socket.userId }
      })
      .populate('sender_id', 'name profile_picture')
      .populate('reply_to_message_id')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

      const totalMessages = await Message.countDocuments({ 
        conversation_id: conversationId,
        deleted_by_users: { $ne: socket.userId }
      });

      const orderedMessages = messages.reverse();

      socket.emit('message_history', {
        conversationId: conversationId,
        messages: orderedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalMessages,
          pages: Math.ceil(totalMessages / limit)
        }
      });

    } catch (error) {
      console.error('Error getting message history:', error);
      socket.emit('error', { message: 'Erreur lors de la récupération de l\'historique' });
    }
  });

  // ✅ NOUVEAU: Événement de présence
  socket.on('user_online', async () => {
    try {
      // Mettre à jour le statut de l'utilisateur
      const User = require('../models/User');
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: true,
        lastSeen: new Date()
      });

      // Notifier les contacts
      const userConversations = await Conversation.find({
        participants: socket.userId
      }).populate('participants');

      userConversations.forEach(conversation => {
        conversation.participants.forEach(participant => {
          if (participant._id.toString() !== socket.userId.toString()) {
            io.to(`user_${participant._id}`).emit('user_status_changed', {
              userId: socket.userId,
              isOnline: true,
              lastSeen: new Date()
            });
          }
        });
      });

      console.log(`✅ User ${socket.userId} is now online`);
    } catch (error) {
      console.error('Error handling user_online:', error);
    }
  });

  // ✅ NOUVEAU: Gestion de la déconnexion
  socket.on('user_away', async () => {
    try {
      const User = require('../models/User');
      await User.findByIdAndUpdate(socket.userId, {
        isOnline: false,
        lastSeen: new Date()
      });

      console.log(`✅ User ${socket.userId} is now away`);
    } catch (error) {
      console.error('Error handling user_away:', error);
    }
  });
};

// ✅ FONCTION UTILITAIRE: Créer une notification
async function createNotification(userId, conversation, message) {
  try {
    // Éviter les notifications pour l'expéditeur
    if (message.sender_id._id.toString() === userId.toString()) {
      return;
    }

    const title = conversation.conversation_type === 'private' 
      ? `Nouveau message de ${message.sender_id.name}` 
      : `Nouveau message dans ${conversation.group_name}`;

    const messagePreview = message.message_type === 'text' 
      ? message.message_text 
      : `📎 ${message.message_type}`;

    // Vérifier si une notification non lue existe déjà
    const existingNotification = await Notification.findOne({
      user_id: userId,
      conversation_id: conversation._id,
      is_read: false,
      notification_type: 'new_message'
    });

    if (existingNotification) {
      // Mettre à jour la notification existante
      existingNotification.message_id = message._id;
      existingNotification.message_preview = messagePreview;
      existingNotification.updated_at = new Date();
      existingNotification.title = title;
      await existingNotification.save();
      return;
    }

    // Créer une nouvelle notification
    const notification = new Notification({
      user_id: userId,
      conversation_id: conversation._id,
      message_id: message._id,
      notification_type: 'new_message',
      title: title,
      message_preview: messagePreview.length > 150 
        ? messagePreview.substring(0, 147) + '...' 
        : messagePreview,
      is_read: false
    });

    await notification.save();

    // Émettre l'événement de notification en temps réel
    const io = require('../socket/socket').io;
    io.to(`user_${userId}`).emit('new_notification', notification);
    io.to(`user_${userId}`).emit('play_notification_sound');

  } catch (error) {
    console.error('Error creating notification:', error);
  }
}