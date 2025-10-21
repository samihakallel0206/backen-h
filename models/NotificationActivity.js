// models/NotificationActivity.js

const mongoose = require("mongoose");

const notificationActivitySchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true
    },
    activity: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Activity",
        required: true
    },
    type: {
        type: String,
        enum: [
            'activity_created_public',
            'activity_created_identified', 
            'activity_like',
            'activity_comment',
            'comment_reply',
            'comment_like',
            'identified_in_activity'
        ],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    is_read: {
        type: Boolean,
        default: false
    },
    // ✅ INDICATEUR SI L'ACTIVITÉ A ÉTÉ CONSULTÉE
    activity_viewed: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Index pour les performances
notificationActivitySchema.index({ recipient: 1, is_read: 1, createdAt: -1 });
notificationActivitySchema.index({ activity: 1 });
notificationActivitySchema.index({ createdAt: -1 });
notificationActivitySchema.index({ recipient: 1, activity_viewed: 1 }); // ✅ NOUVEL INDEX

const NotificationActivity = mongoose.model("NotificationActivity", notificationActivitySchema);
module.exports = NotificationActivity;