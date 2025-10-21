// socket/callHandlers.js
const Call = require('../models/Call');

module.exports = (io, socket) => {
  
  // Initier un appel
  socket.on('initiate_call', async (data) => {
    try {
      const { conversationId, callType, sdpOffer } = data;
      
      const call = new Call({
        conversation_id: conversationId,
        initiator_id: socket.userId,
        call_type: callType,
        sdp_offer: sdpOffer,
        participants: [{
          user_id: socket.userId,
          status: 'calling'
        }]
      });
      
      await call.save();
      
      // Notifier les autres participants
      socket.to(`conversation_${conversationId}`).emit('incoming_call', {
        callId: call._id,
        callerId: socket.userId,
        callType,
        sdpOffer
      });
      
    } catch (error) {
      socket.emit('call_error', { message: 'Failed to initiate call' });
    }
  });
  
  // Accepter un appel
  socket.on('accept_call', async (data) => {
    try {
      const { callId, sdpAnswer } = data;
      
      const call = await Call.findById(callId);
      call.participants.push({
        user_id: socket.userId,
        status: 'joined',
        joined_at: new Date()
      });
      call.sdp_answer = sdpAnswer;
      call.call_status = 'ongoing';
      
      await call.save();
      
      // Notifier l'initiateur
      io.to(`user_${call.initiator_id}`).emit('call_accepted', {
        callId,
        sdpAnswer,
        participantId: socket.userId
      });
      
    } catch (error) {
      socket.emit('call_error', { message: 'Failed to accept call' });
    }
  });
  
  // Échanger les ICE candidates
  socket.on('ice_candidate', (data) => {
    const { callId, candidate, targetUserId } = data;
    
    // Transmettre le candidat ICE au destinataire
    io.to(`user_${targetUserId}`).emit('ice_candidate', {
      callId,
      candidate
    });
  });
  
  // Terminer un appel
  socket.on('end_call', async (callId) => {
    try {
      const call = await Call.findById(callId);
      call.call_status = 'ended';
      call.end_time = new Date();
      call.total_duration = Math.floor((call.end_time - call.start_time) / 1000);
      
      await call.save();
      
      // Notifier tous les participants
      io.to(`conversation_${call.conversation_id}`).emit('call_ended', {
        callId,
        duration: call.total_duration
      });
      
    } catch (error) {
      console.error('Error ending call:', error);
    }
  });
};