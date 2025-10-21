//models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  message_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  notification_type: {
    type: String,
    enum: ['new_message', 'call_missed', 'added_to_group', 'removed_from_group', 'new_admin'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message_preview: {
    type: String,
    maxlength: 150
  },
  is_read: {
    type: Boolean,
    default: false
  },
  // Pour les notifications de groupe
  metadata: {
    added_by: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    group_name: String,
    call_duration: Number
  },
  expires_at: {
    type: Date,
    default: function() {
      // Les notifications expirent après 30 jours
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// 🔥 INDEXES CRUCIAUX pour les performances
notificationSchema.index({ user_id: 1, is_read: 1 });
// Pour trouver rapidement les notifications non lues d'un utilisateur

notificationSchema.index({ user_id: 1, created_at: -1 });
// Pour récupérer les notifications récentes d'un utilisateur

notificationSchema.index({ conversation_id: 1 });
// Pour les nettoyages par conversation

notificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
// Pour la suppression automatique des notifications expirées

notificationSchema.index({ user_id: 1, notification_type: 1 });
// Pour les filtres par type de notification

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
