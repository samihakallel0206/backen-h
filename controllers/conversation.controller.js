// controllers/conversation.controller.js
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

// Créer une conversation
exports.createConversation = async (req, res) => {
    try {
        const { conversation_type, participants, group_name, group_description } = req.body;

        // Vérifier si c'est une conversation privée existante
        if (conversation_type === 'private' && participants.length === 2) {
            const existingConversation = await Conversation.findOne({
                conversation_type: 'private',
                participants: { $all: participants, $size: 2 }
            });
            
            if (existingConversation) {
                return res.status(200).json({
                    success: [{msg: "Conversation privée existante récupérée"}],
                    conversation: existingConversation
                });
            }
        }

        // Créer une nouvelle conversation
        const newConversation = new Conversation({
            conversation_type,
            participants,
            group_name: conversation_type === 'group' ? group_name : undefined,
            group_description: conversation_type === 'group' ? group_description : undefined,
            group_created_by: conversation_type === 'group' ? req.user.id : undefined
        });

        await newConversation.save();
        
        // ✅ CORRECTION : email_address au lieu de email
        await newConversation.populate('participants', 'name email_address profile_picture');

        res.status(201).json({
            success: [{msg: "Conversation créée avec succès"}],
            conversation: newConversation
        });

    } catch (error) {
        console.error("Create conversation error:", error);
        res.status(400).json({errors: [{msg: "Impossible de créer la conversation"}], error: error.message});
    }
};

// Récupérer les conversations de l'utilisateur
exports.getUserConversations = async (req, res) => {
    try {
        console.log('🟢 getUserConversations called for user:', req.user.id);
        
        const conversations = await Conversation.find({
            participants: req.user.id
        })
        .populate('participants', 'name email_address profile_picture isOnline lastSeen')
        .populate({
            path: 'last_message',
            select: 'message_text message_type created_at sender_id',
            populate: {
                path: 'sender_id',
                select: 'name profile_picture'
            }
        })
        .sort({ updated_at: -1 });

        console.log(`📊 Found ${conversations.length} conversations`);

        res.status(200).json({
            success: true,
            conversations: conversations,
            count: conversations.length
        });

    } catch (error) {
        console.error("❌ Get conversations error:", error);
        res.status(500).json({
            success: false,
            errors: [{msg: "Erreur lors de la récupération des conversations"}],
            error: error.message // ✅ Afficher l'erreur exacte
        });
    }
};

// Récupérer les messages d'une conversation
exports.getConversationMessages = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await Conversation.findOne({
            _id: id,
            participants: req.user.id
        });

        if (!conversation) {
            return res.status(403).json({errors: [{msg: "Accès non autorisé à cette conversation"}]});
        }

        const messages = await Message.find({ conversation_id: id })
            .populate('sender_id', 'name profile_picture')
            .populate('reply_to_message_id')
            .sort({ created_at: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Message.countDocuments({ conversation_id: id });

        res.status(200).json({
            success: true,
            messages: messages.reverse(),
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Get messages error:", error);
        res.status(500).json({errors: [{msg: "Erreur lors de la récupération des messages"}]});
    }
};

// Ajouter un participant à un groupe
exports.addParticipant = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;

        const conversation = await Conversation.findOneAndUpdate(
            { 
                _id: id, 
                conversation_type: 'group',
                participants: req.user.id // Seul un participant peut ajouter
            },
            { $addToSet: { participants: userId } },
            { new: true }
        ).populate('participants', 'name email_address profile_picture'); // ✅ CORRECTION

        if (!conversation) {
            return res.status(404).json({errors: [{msg: "Conversation non trouvée ou accès non autorisé"}]});
        }

        res.status(200).json({
            success: [{msg: "Participant ajouté avec succès"}],
            conversation: conversation
        });

    } catch (error) {
        console.error("Add participant error:", error);
        res.status(400).json({errors: [{msg: "Impossible d'ajouter le participant"}]});
    }
};

// Retirer un participant d'un groupe
exports.removeParticipant = async (req, res) => {
    try {
        const { id, userId } = req.params;

        const conversation = await Conversation.findOneAndUpdate(
            { 
                _id: id, 
                conversation_type: 'group',
                participants: req.user.id // Seul un participant peut retirer
            },
            { $pull: { participants: userId } },
            { new: true }
        );

        if (!conversation) {
            return res.status(404).json({errors: [{msg: "Conversation non trouvée ou accès non autorisé"}]});
        }

        res.status(200).json({
            success: [{msg: "Participant retiré avec succès"}],
            conversation: conversation
        });

    } catch (error) {
        console.error("Remove participant error:", error);
        res.status(400).json({errors: [{msg: "Impossible de retirer le participant"}]});
    }
}; 

// Dans conversation.controller.js - AJOUTER cette fonction
exports.markConversationAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await Conversation.findOne({
            _id: id,
            participants: req.user.id
        });

        if (!conversation) {
            return res.status(403).json({errors: [{msg: "Accès non autorisé à cette conversation"}]});
        }

        // Marquer les messages comme lus
        const messageResult = await Message.updateMany(
            { 
                conversation_id: id,
                sender_id: { $ne: req.user.id },
                message_status: { $in: ['sent', 'delivered'] }
            },
            { message_status: 'read' }
        );

        // Marquer les notifications comme lues
        const notificationResult = await require("./notification.controller").markConversationAsRead(
            { user: req.user, body: { conversationId: id } },
            { status: () => ({ json: () => {} }) } // Response simulée
        );

        console.log(`✅ Marked ${messageResult.modifiedCount} messages and notifications as read`);

        res.status(200).json({
            success: true,
            message: "Conversation marquée comme lue",
            modifiedMessages: messageResult.modifiedCount
        });

    } catch (error) {
        console.error("Mark conversation as read error:", error);
        res.status(500).json({
            success: false,
            error: "Impossible de marquer la conversation comme lue"
        });
    }
};