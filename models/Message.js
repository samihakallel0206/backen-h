//models/Message.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  
  message_type: {
    type: String,
    enum: ['text', 'image', 'audio', 'video', 'file', 'call'],
    required: true
  },
  
  message_text: String,
  media_url: String,
  file_name: String,
  file_size: Number,
  duration: Number,
  
  call_data: {
    call_type: { type: String, enum: ['audio', 'video'] },
    call_duration: Number,
    call_status: { type: String, enum: ['missed', 'answered', 'rejected'] },
    sdp_offer: String,
    sdp_answer: String,
    ice_candidates: [String]
  },
  
  message_status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  
  reply_to_message_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  deleted_by_users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }]
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

messageSchema.index({ conversation_id: 1, created_at: -1 });

// ✅ CORRECTION : messageSchema au lieu de jobSchema
const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
