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

  // Graceful error handling for port conflicts
  httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Port ${PORT} is already in use!\n`);
      console.error(`To find the process using this port, run:`);
      console.error(`   netstat -ano | findstr :${PORT}\n`);
      console.error(`To kill the process, run (as Administrator):`);
      console.error(`   taskkill /PID <PID> /F\n`);
      process.exit(1);
    }
    throw err;
  });
});
