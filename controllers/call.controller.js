// controllers/call.controller.js
const Call = require("../models/Call");
const Conversation = require("../models/Conversation");

// Démarrer un appel
exports.startCall = async (req, res) => {
    try {
        const { conversation_id, call_type, sdp_offer } = req.body;

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await Conversation.findOne({
            _id: conversation_id,
            participants: req.user.id
        });

        if (!conversation) {
            return res.status(403).json({errors: [{msg: "Accès non autorisé à cette conversation"}]});
        }

        const newCall = new Call({
            conversation_id,
            initiator_id: req.user.id,
            call_type,
            sdp_offer,
            participants: [{
                user_id: req.user.id,
                status: 'calling'
            }]
        });

        await newCall.save();

        res.status(201).json({
            success: [{msg: "Appel démarré avec succès"}],
            call: newCall
        });

    } catch (error) {
        console.error("Start call error:", error);
        res.status(400).json({errors: [{msg: "Impossible de démarrer l'appel"}], error: error.message});
    }
};

// Mettre à jour le statut d'un appel
exports.updateCall = async (req, res) => {
    try {
        const { id } = req.params;
        const { call_status, sdp_answer, ice_candidates } = req.body;

        const call = await Call.findById(id);

        if (!call) {
            return res.status(404).json({errors: [{msg: "Appel non trouvé"}]});
        }

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await Conversation.findOne({
            _id: call.conversation_id,
            participants: req.user.id
        });

        if (!conversation) {
            return res.status(403).json({errors: [{msg: "Accès non autorisé à cet appel"}]});
        }

        const updateData = {};
        if (call_status) updateData.call_status = call_status;
        if (sdp_answer) updateData.sdp_answer = sdp_answer;
        if (ice_candidates) updateData.ice_candidates = ice_candidates;

        // Si l'appel se termine, calculer la durée
        if (call_status === 'ended') {
            updateData.end_time = new Date();
            updateData.total_duration = Math.floor((new Date() - call.start_time) / 1000);
        }

        const updatedCall = await Call.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        );

        res.status(200).json({
            success: [{msg: "Statut d'appel mis à jour"}],
            call: updatedCall
        });

    } catch (error) {
        console.error("Update call error:", error);
        res.status(400).json({errors: [{msg: "Impossible de mettre à jour l'appel"}]});
    }
};

// Historique des appels
exports.getCallHistory = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;

        // Trouver les conversations de l'utilisateur
        const userConversations = await Conversation.find({
            participants: req.user.id
        }).select('_id');

        const conversationIds = userConversations.map(conv => conv._id);

        const calls = await Call.find({
            conversation_id: { $in: conversationIds }
        })
        .populate('conversation_id', 'participants group_name')
        .populate('initiator_id', 'name profile_picture')
        .sort({ start_time: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

        const total = await Call.countDocuments({
            conversation_id: { $in: conversationIds }
        });

        res.status(200).json({
            success: true,
            calls: calls,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error("Get call history error:", error);
        res.status(500).json({errors: [{msg: "Erreur lors de la récupération de l'historique des appels"}]});
    }
};