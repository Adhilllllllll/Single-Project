require("dotenv").config();
const { createServer } = require("http");
const app = require("./app");
const connectDB = require("./config/database");
const seedAdmin = require("./config/seedAdmin");
const { initializeSocket } = require("./socket");

const PORT = process.env.PORT || 5000;

connectDB().then(async () => {
  await seedAdmin();

  // Create HTTP server
  const httpServer = createServer(app);

  // Initialize Socket.IO
  initializeSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 WebSocket ready for connections`);
  });
});
