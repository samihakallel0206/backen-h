// socket/socket.js
const socketIO = require("socket.io");

let io;

const configureSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: [
        process.env.CLIENT_URL || "http://localhost:3000", // local dev
        "https://ton-app.netlify.app", // 🔁 remplace par ton vrai domaine frontend Netlify
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"], // ✅ évite les erreurs Render/Netlify
  });

  // Stocker io globalement
  global.io = io;
  console.log("🟢 Socket.IO server initialized");

  // ✅ Auth middleware
  io.use(require("../middleware/socketAuth"));

  io.on("connection", (socket) => {
    console.log("✅ User connected via socket:", socket.userId);

    // Rejoindre les rooms principales
    socket.join(`user_${socket.userId}`);
    socket.join(`notifications_${socket.userId}`);
    console.log(`✅ User ${socket.userId} joined personal rooms`);

    // Gestionnaires d’événements
    require("./messageHandlers")(io, socket);
    require("./notificationHandlers")(io, socket);

    // Rejoindre une conversation spécifique
    socket.on("join_conversation", (conversationId) => {
      socket.join(`conversation_${conversationId}`);
      console.log(
        `✅ User ${socket.userId} joined conversation ${conversationId}`
      );
    });

    // Quitter une conversation
    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
      console.log(
        `✅ User ${socket.userId} left conversation ${conversationId}`
      );
    });

    // Rejoindre plusieurs conversations
    socket.on("join_conversations", (conversationIds) => {
      conversationIds.forEach((conversationId) =>
        socket.join(`conversation_${conversationId}`)
      );
      console.log(
        `✅ User ${socket.userId} joined ${conversationIds.length} conversations`
      );
    });

    // Déconnexion
    socket.on("disconnect", (reason) => {
      console.log("❌ User disconnected:", socket.userId, "Reason:", reason);
    });

    // Gestion erreurs
    socket.on("error", (error) => {
      console.error("❌ Socket error for user", socket.userId, ":", error);
    });
  });

  return io;
};

module.exports = configureSocket;
