//models/Conversation.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  conversation_type: {
    type: String,
    enum: ['private', 'group'],
    required: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  }],
  
  group_name: {
    type: String,
    required: function() { return this.conversation_type === 'group'; }
  },
  group_description: String,
  group_avatar: String,
  group_created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: function() { return this.conversation_type === 'group'; }
  },
  
  last_message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  
  private_conversation_hash: String
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

conversationSchema.index({ participants: 1, conversation_type: 1 });
conversationSchema.index({ private_conversation_hash: 1 }, { unique: true, sparse: true });

// ✅ CORRECTION : conversationSchema au lieu de jobSchema
const Conversation = mongoose.model("Conversation", conversationSchema);
module.exports = Conversation;