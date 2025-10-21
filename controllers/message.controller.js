
// controllers/message.controller.js
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const Notification = require("../models/Notification");
const path = require('path'); // ✅ AJOUT EN HAUT DU FICHIER

// ✅ FONCTION POUR CRÉER LES NOTIFICATIONS
async function createMessageNotifications(conversation, message, senderId) {
    try {
        console.log('🟢 Creating notifications for message:', message._id);
        
        const notificationPromises = conversation.participants.map(async (participant) => {
            // Ne pas créer de notification pour l'expéditeur
            if (participant._id.toString() === senderId.toString()) {
                return null;
            }

            const title = conversation.conversation_type === 'private' 
                ? `Nouveau message de ${message.sender_id.name}` 
                : `Nouveau message dans ${conversation.group_name}`;

            const messagePreview = message.message_type === 'text' 
                ? message.message_text 
                : `📎 ${message.message_type}`;

            // Vérifier si une notification non lue existe déjà
            const existingNotification = await Notification.findOne({
                user_id: participant._id,
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
                console.log('✅ Notification updated for user:', participant._id);
                return existingNotification;
            }

            // Créer une nouvelle notification
            const notification = new Notification({
                user_id: participant._id,
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
            console.log('✅ Notification created for user:', participant._id);
            return notification;
        });

        const results = await Promise.all(notificationPromises);
        const createdCount = results.filter(result => result !== null).length;
        console.log(`✅ ${createdCount} notifications created/updated successfully`);

    } catch (error) {
        console.error('❌ Create notifications error:', error);
    }
}

// Envoyer un message
exports.sendMessage = async (req, res) => {
    try {
        const { conversation_id, message_type, message_text, media_url, reply_to_message_id, tempId } = req.body;

        console.log('🟢 sendMessage called:', { 
            conversation_id, 
            message_type, 
            sender: req.user.id,
            text: message_text,
            tempId: tempId // ✅ AJOUT: ID temporaire du frontend
        });

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await Conversation.findOne({
            _id: conversation_id,
            participants: req.user.id
        }).populate('participants', 'name email_address profile_picture');

        if (!conversation) {
            console.log('❌ User not in conversation or conversation not found');
            return res.status(403).json({
                success: false,
                errors: [{msg: "Accès non autorisé à cette conversation"}]
            });
        }

        // Créer le nouveau message
        const newMessage = new Message({
            conversation_id,
            sender_id: req.user.id,
            message_type: message_type || 'text',
            message_text,
            media_url,
            reply_to_message_id,
            message_status: 'sent'
        });

        await newMessage.save();
        console.log('✅ Message saved:', newMessage._id);

        // Mettre à jour le dernier message de la conversation
        await Conversation.findByIdAndUpdate(conversation_id, {
            last_message: newMessage._id,
            updated_at: new Date()
        });

        // Populer le message pour la réponse
        const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender_id', 'name profile_picture')
            .populate('reply_to_message_id');

        console.log('✅ Message populated successfully');

        // ✅ CRÉER LES NOTIFICATIONS
        await createMessageNotifications(conversation, populatedMessage, req.user.id);

        // ✅ CORRECTION CRITIQUE: Émettre les événements socket AVANT la réponse
        if (global.io) {
            console.log('🔌 Émission des événements Socket.IO');

            // ✅ ÉVÉNEMENT 1: Confirmation d'envoi à l'expéditeur (avec tempId)
            global.io.to(`user_${req.user.id}`).emit('message_sent', {
                tempId: tempId,
                message: populatedMessage,
                conversationId: conversation_id
            });

            console.log('✅ Événement message_sent émis à l\'expéditeur:', req.user.id);

            // ✅ ÉVÉNEMENT 2: Nouveau message aux autres participants
            conversation.participants.forEach(participant => {
                if (participant._id.toString() !== req.user.id.toString()) {
                    // Émettre le nouveau message
                    global.io.to(`user_${participant._id}`).emit('new_message', {
                        message: populatedMessage,
                        conversationId: conversation_id
                    });

                    // Émettre la notification
                    global.io.to(`user_${participant._id}`).emit('new_notification', {
                        type: 'new_message',
                        conversationId: conversation_id,
                        message: populatedMessage,
                        timestamp: new Date()
                    });

                    // Son de notification
                    global.io.to(`user_${participant._id}`).emit('play_notification_sound');

                    console.log('✅ Événements émis au participant:', participant._id);
                }
            });

            // ✅ ÉVÉNEMENT 3: Émettre à la room de conversation
            global.io.to(`conversation_${conversation_id}`).emit('new_message', {
                message: populatedMessage,
                conversationId: conversation_id
            });

            console.log('✅ Événement new_message émis à la conversation:', conversation_id);
        }

        // ✅ CORRECTION: Réponse API avec tempId pour synchronisation
        res.status(201).json({
            success: true,
            message: "Message envoyé avec succès",
            data: populatedMessage,
            tempId: tempId // ✅ INCLURE l'ID temporaire dans la réponse
        });

        console.log('✅ Réponse API envoyée avec tempId:', tempId);

    } catch (error) {
        console.error("❌ Send message error:", error);
        
        // ✅ CORRECTION: Émettre un événement d'erreur en cas d'échec
        if (global.io && req.body.tempId) {
            global.io.to(`user_${req.user.id}`).emit('message_error', {
                tempId: req.body.tempId,
                error: error.message
            });
        }

        res.status(400).json({
            success: false,
            errors: [{msg: "Impossible d'envoyer le message"}],
            error: error.message
        });
    }
};

// ✅ NOUVELLE FONCTION: Synchroniser les messages temporaires
exports.syncTempMessage = async (req, res) => {
    try {
        const { tempId, realMessageId } = req.body;

        console.log('🔄 syncTempMessage called:', { tempId, realMessageId });

        if (!tempId || !realMessageId) {
            return res.status(400).json({
                success: false,
                error: "tempId et realMessageId sont requis"
            });
        }

        // Trouver le message réel
        const realMessage = await Message.findById(realMessageId)
            .populate('sender_id', 'name profile_picture')
            .populate('reply_to_message_id');

        if (!realMessage) {
            return res.status(404).json({
                success: false,
                error: "Message réel non trouvé"
            });
        }

        // Émettre l'événement de synchronisation
        if (global.io) {
            global.io.to(`user_${req.user.id}`).emit('message_synced', {
                tempId: tempId,
                realMessage: realMessage
            });
        }

        res.status(200).json({
            success: true,
            message: "Message synchronisé avec succès",
            data: realMessage
        });

    } catch (error) {
        console.error("❌ syncTempMessage error:", error);
        res.status(400).json({
            success: false,
            error: "Erreur lors de la synchronisation du message"
        });
    }
};

// ✅ NOUVELLE FONCTION: Récupérer les messages d'une conversation avec pagination
exports.getConversationMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const { page = 1, limit = 50 } = req.query;

        console.log('🟢 getConversationMessages called:', { conversationId, page, limit });

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user.id
        });

        if (!conversation) {
            return res.status(403).json({
                success: false,
                error: "Accès non autorisé à cette conversation"
            });
        }

        // Calculer la pagination
        const skip = (page - 1) * limit;

        // Récupérer les messages avec pagination
        const messages = await Message.find({ 
            conversation_id: conversationId,
            deleted_by_users: { $ne: req.user.id } // Exclure les messages supprimés par l'utilisateur
        })
        .populate('sender_id', 'name profile_picture')
        .populate('reply_to_message_id')
        .sort({ created_at: -1 }) // Plus récents en premier
        .skip(skip)
        .limit(parseInt(limit));

        // Compter le total des messages
        const totalMessages = await Message.countDocuments({ 
            conversation_id: conversationId,
            deleted_by_users: { $ne: req.user.id }
        });

        // Inverser l'ordre pour avoir les plus anciens en premier dans l'affichage
        const orderedMessages = messages.reverse();

        console.log(`✅ Found ${orderedMessages.length} messages for conversation ${conversationId}`);

        res.status(200).json({
            success: true,
            data: {
                messages: orderedMessages,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: totalMessages,
                    pages: Math.ceil(totalMessages / limit)
                }
            }
        });

    } catch (error) {
        console.error("❌ getConversationMessages error:", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la récupération des messages"
        });
    }
};

// ✅ NOUVELLE FONCTION: Marquer un message comme livré
exports.markMessageAsDelivered = async (req, res) => {
    try {
        const { messageId } = req.body;

        console.log('🟢 markMessageAsDelivered called:', { messageId, user: req.user.id });

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({
                success: false,
                error: "Message non trouvé"
            });
        }

        // Vérifier que l'utilisateur est le destinataire
        const conversation = await Conversation.findOne({
            _id: message.conversation_id,
            participants: req.user.id
        });

        if (!conversation) {
            return res.status(403).json({
                success: false,
                error: "Accès non autorisé à ce message"
            });
        }

        // Marquer comme livré seulement si l'utilisateur n'est pas l'expéditeur
        if (message.sender_id.toString() !== req.user.id.toString()) {
            message.message_status = 'delivered';
            await message.save();

            // Émettre l'événement socket
            if (global.io) {
                global.io.to(`user_${message.sender_id}`).emit('message_delivered', {
                    messageId: messageId,
                    conversationId: message.conversation_id
                });
            }

            console.log('✅ Message marqué comme livré:', messageId);
        }

        res.status(200).json({
            success: true,
            message: "Message marqué comme livré"
        });

    } catch (error) {
        console.error("❌ markMessageAsDelivered error:", error);
        res.status(400).json({
            success: false,
            error: "Erreur lors du marquage du message comme livré"
        });
    }
};

// Marquer les messages comme lus
exports.markAsRead = async (req, res) => {
    try {
        const { conversation_id } = req.body;

        console.log('🟢 markAsRead called:', { conversation_id, user: req.user.id });

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await Conversation.findOne({
            _id: conversation_id,
            participants: req.user.id
        });

        if (!conversation) {
            return res.status(403).json({
                success: false,
                errors: [{msg: "Accès non autorisé à cette conversation"}]
            });
        }

        // Marquer tous les messages non lus comme "read"
        const result = await Message.updateMany(
            { 
                conversation_id: conversation_id,
                sender_id: { $ne: req.user.id },
                message_status: { $in: ['sent', 'delivered'] }
            },
            { message_status: 'read' }
        );

        console.log(`✅ Marked ${result.modifiedCount} messages as read`);

        // Émettre l'événement socket
        if (global.io) {
            global.io.to(`conversation_${conversation_id}`).emit('messages_read', {
                conversationId: conversation_id,
                userId: req.user.id,
                count: result.modifiedCount
            });

            // Notifier les expéditeurs que leurs messages ont été lus
            const readMessages = await Message.find({
                conversation_id: conversation_id,
                sender_id: { $ne: req.user.id },
                message_status: 'read'
            });

            readMessages.forEach(message => {
                global.io.to(`user_${message.sender_id}`).emit('message_read', {
                    messageId: message._id,
                    conversationId: conversation_id,
                    readBy: req.user.id,
                    readAt: new Date()
                });
            });
        }

        res.status(200).json({
            success: true,
            message: "Messages marqués comme lus",
            modifiedCount: result.modifiedCount
        });

    } catch (error) {
        console.error("❌ Mark as read error:", error);
        res.status(400).json({
            success: false,
            errors: [{msg: "Impossible de marquer les messages comme lus"}]
        });
    }
};

// Supprimer un message (soft delete)
exports.deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;

        console.log('🟢 deleteMessage called:', { messageId: id, user: req.user.id });

        const message = await Message.findById(id);

        if (!message) {
            return res.status(404).json({
                success: false,
                errors: [{msg: "Message non trouvé"}]
            });
        }

        // Vérifier que l'utilisateur est l'expéditeur ou fait partie de la conversation
        const conversation = await Conversation.findOne({
            _id: message.conversation_id,
            participants: req.user.id
        });

        if (!conversation) {
            return res.status(403).json({
                success: false,
                errors: [{msg: "Accès non autorisé à ce message"}]
            });
        }

        // Soft delete : ajouter l'utilisateur à la liste deleted_by_users
        await Message.findByIdAndUpdate(id, {
            $addToSet: { deleted_by_users: req.user.id }
        });

        console.log('✅ Message soft deleted');

        // Émettre l'événement socket
        if (global.io) {
            global.io.to(`conversation_${message.conversation_id}`).emit('message_deleted', {
                messageId: id,
                conversationId: message.conversation_id,
                deletedBy: req.user.id
            });
        }

        res.status(200).json({
            success: true,
            message: "Message supprimé avec succès"
        });

    } catch (error) {
        console.error("❌ Delete message error:", error);
        res.status(400).json({
            success: false,
            errors: [{msg: "Impossible de supprimer le message"}]
        });
    }
};

// ✅ NOUVELLE FONCTION: Récupérer les statistiques des messages
exports.getMessageStats = async (req, res) => {
    try {
        const { conversationId } = req.params;

        console.log('🟢 getMessageStats called:', { conversationId, user: req.user.id });

        // Vérifier l'accès à la conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: req.user.id
        });

        if (!conversation) {
            return res.status(403).json({
                success: false,
                error: "Accès non autorisé à cette conversation"
            });
        }

        // Statistiques des messages
        const totalMessages = await Message.countDocuments({
            conversation_id: conversationId,
            deleted_by_users: { $ne: req.user.id }
        });

        const unreadMessages = await Message.countDocuments({
            conversation_id: conversationId,
            sender_id: { $ne: req.user.id },
            message_status: { $in: ['sent', 'delivered'] },
            deleted_by_users: { $ne: req.user.id }
        });

        const userMessageCount = await Message.countDocuments({
            conversation_id: conversationId,
            sender_id: req.user.id,
            deleted_by_users: { $ne: req.user.id }
        });

        res.status(200).json({
            success: true,
            data: {
                totalMessages,
                unreadMessages,
                userMessageCount,
                otherUserMessageCount: totalMessages - userMessageCount
            }
        });

    } catch (error) {
        console.error("❌ getMessageStats error:", error);
        res.status(500).json({
            success: false,
            error: "Erreur lors de la récupération des statistiques"
        });
    }
};



// controllers/messageController.js - Ajouter le support des fichiers
const sendMessage = async (req, res) => {
    try {
      const { conversation_id, message_text, message_type = 'text', attachments = [], temp_id } = req.body;
      const sender_id = req.user.id;
  
      console.log('📨 Envoi message - Données:', {
        conversation_id,
        message_text,
        message_type,
        attachments: attachments.length,
        temp_id
      });
  
      // Vérifier si la conversation existe
      const conversation = await Conversation.findById(conversation_id);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation non trouvée'
        });
      }
  
      // ✅ CORRECTION: Gérer les fichiers uploadés
      let finalAttachments = [];
      if (attachments && attachments.length > 0) {
        finalAttachments = attachments.map(file => ({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          url: file.url
        }));
      }
  
      // Déterminer le type de message
      const finalMessageType = finalAttachments.length > 0 ? 'file' : message_type;
  
      // Créer le message
      const newMessage = new Message({
        conversation_id,
        sender_id,
        message_type: finalMessageType,
        message_text: message_text || (finalAttachments.length > 0 ? 
          `A partagé ${finalAttachments.length} fichier${finalAttachments.length > 1 ? 's' : ''}` : ''),
        attachments: finalAttachments,
        temp_id,
        isTemp: false
      });
  
      await newMessage.save();
  
      // Populer les données de l'expéditeur
      await newMessage.populate('sender_id', 'name profile_picture');
  
      console.log('✅ Message créé avec succès:', newMessage._id);
  
      // Mettre à jour la dernière activité de la conversation
      await Conversation.findByIdAndUpdate(conversation_id, {
        last_message: newMessage._id,
        updated_at: new Date()
      });
  
      // Émettre l'événement Socket.IO
      const io = req.app.get('io');
      io.to(conversation_id.toString()).emit('new_message', {
        message: newMessage
      });
  
      // ✅ Émettre la confirmation d'envoi si c'est un message temporaire
      if (temp_id) {
        io.to(req.user.id.toString()).emit('message_sent', {
          tempId: temp_id,
          message: newMessage
        });
      }
  
      res.status(201).json({
        success: true,
        message: 'Message envoyé avec succès',
        data: newMessage
      });
  
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'envoi du message',
        error: error.message
      });
    }
  };



  
module.exports = exports;