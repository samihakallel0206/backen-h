//models/Call.js

const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  initiator_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  call_type: {
    type: String,
    enum: ['audio', 'video'],
    required: true
  },
  
  participants: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    joined_at: Date,
    left_at: Date,
    duration: Number,
    status: { type: String, enum: ['calling', 'joined', 'left', 'declined'] }
  }],
  
  sdp_offer: String,
  sdp_answer: String,
  ice_candidates: [String],
  
  call_status: {
    type: String,
    enum: ['calling', 'ongoing', 'ended', 'missed'],
    default: 'calling'
  },
  
  start_time: Date,
  end_time: Date,
  total_duration: Number
}, {
  timestamps: true
});

// ✅ CORRECTION : callSchema au lieu de jobSchema
const Call = mongoose.model("Call", callSchema);
module.exports = Call;