/* ok valider jusqua notification
// middleware/socketAuth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    console.log('🟢 Socket auth attempt, token:', token ? 'YES' : 'NO');
    
    if (!token) {
      console.log('❌ No token in socket handshake');
      return next(new Error('Authentication error: No token provided'));
    }

    // ✅ CORRECTION : Utiliser verify au lieu de decode
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    console.log('🟢 Token verified, user id:', decoded.id);
    
    const foundUser = await User.findById(decoded.id);
    if (!foundUser) {
      console.log('❌ User not found in socket auth');
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = foundUser._id;
    socket.user = foundUser;
    
    console.log('🟢 Socket authenticated successfully:', foundUser._id);
    next();
  } catch (error) {
    console.error("❌ Socket auth error:", error.message);
    next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = socketAuth;  */

const jwt = require("jsonwebtoken");
const User = require("../models/User");

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    console.log('🟢 Socket auth attempt, token:', token ? 'YES' : 'NO');
    
    if (!token) {
      console.log('❌ No token in socket handshake');
      return next(new Error('Authentication error: No token provided'));
    }

    // ✅ CORRECTION : Utiliser verify au lieu de decode
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    console.log('🟢 Token verified, user id:', decoded.id);
    
    const foundUser = await User.findById(decoded.id);
    if (!foundUser) {
      console.log('❌ User not found in socket auth');
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = foundUser._id;
    socket.user = foundUser;
    
    // ✅ AJOUT POUR LES ACTIVITÉS - Rejoindre la room personnelle
    socket.join(`user_${foundUser._id}`);
    console.log(`🟢 User ${foundUser._id} joined personal room for activities`);
    
    console.log('🟢 Socket authenticated successfully:', foundUser._id);
    next();
  } catch (error) {
    console.error("❌ Socket auth error:", error.message);
    next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = socketAuth;