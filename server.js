// backend/server.js
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const http = require("http");
const server = http.createServer(app);

// ======================================================
// 🔧 CORS dynamique
// ======================================================
const allowedOrigins = [
  "http://localhost:3000", // dev local
  "https://gorgeous-pika-b5e61c.netlify.app", // ✅ ton vrai domaine Netlify
  "https://backen-h.onrender.com", // ton backend Render
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") return res.status(200).end();
  next();
});

// ======================================================
// Middleware
// ======================================================
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));
app.use((req, res, next) => {
  console.log(
    `📍 ${new Date().toISOString()} | ${req.method} ${req.originalUrl}`
  );
  next();
});

// ======================================================
// DB
// ======================================================
const connectDB = require("./config/connectDB");
connectDB();

// ======================================================
// Static
// ======================================================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ======================================================
// Socket.IO via module externe
// ======================================================
const configureSocket = require("./socket/socket");
configureSocket(server);

// ======================================================
// Routes
// ======================================================
app.get("/", (req, res) =>
  res.status(200).json("✅ Server is running correctly")
);

app.use("/api/user", require("./routes/auth.route"));
app.use("/api/job", require("./routes/job.route"));
app.use("/api/admin", require("./routes/admin.route"));
app.use("/api/chat/conversations", require("./routes/conversation.route"));
app.use("/api/chat/messages", require("./routes/message.route"));
app.use("/api/chat/calls", require("./routes/call.route"));
app.use("/api/chat/notifications", require("./routes/notification.route"));
app.use("/api/activity", require("./routes/activity.route"));
app.use(
  "/api/notification-activity",
  require("./routes/notificationActivity.route")
);
app.use("/api/activity-view", require("./routes/activityView.route"));

app.use((req, res) => {
  res.send("API is running!!");
});

// ======================================================
// 🚀 Start
// ======================================================
const PORT = process.env.PORT || 9843;
server.listen(PORT, () => console.log(`🟢 Server running on port ${PORT}`));
