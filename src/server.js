// require("dotenv").config();
// const { createServer } = require("http");
// const app = require("./app");
// const connectDB = require("./config/database");
// const seedAdmin = require("./config/seedAdmin");
// const { initializeSocket } = require("./socket");

// const PORT = process.env.PORT || 5000;

// connectDB().then(async () => {
//   await seedAdmin();

//   // Create HTTP server
//   const httpServer = createServer(app);

//   // Initialize Socket.IO
//   initializeSocket(httpServer);

//   httpServer.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
//     console.log(`📡 WebSocket ready for connections`);
//   });

//   // Graceful error handling for port conflicts
//   httpServer.on('error', (err) => {
//     if (err.code === 'EADDRINUSE') {
//       console.error(`\n❌ Port ${PORT} is already in use!\n`);
//       console.error(`To find the process using this port, run:`);
//       console.error(`   netstat -ano | findstr :${PORT}\n`);
//       console.error(`To kill the process, run (as Administrator):`);
//       console.error(`   taskkill /PID <PID> /F\n`);
//       process.exit(1);
//     }
//     throw err;
//   });
// });

require("dotenv").config();

if (process.env.VERCEL) {
  // ❌ Do nothing on Vercel
  // Vercel will use app.js directly
  console.log("🚫 server.js skipped on Vercel");
  return;
}

const { createServer } = require("http");
const app = require("./app");
const connectDB = require("./config/database");
const seedAdmin = require("./config/seedAdmin");
const { initializeSocket } = require("./socket");

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    await seedAdmin();

    // Initialize Firebase for push notifications
    const { initializeFirebase } = require("./config/firebase");
    initializeFirebase();

    const httpServer = createServer(app);
    initializeSocket(httpServer);

    // === DEV STABILITY: Handle port conflicts gracefully ===
    httpServer.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`\n❌ Port ${PORT} is already in use!`);
        console.error(`   Run: taskkill /F /IM node.exe  (Windows)`);
        console.error(`   Or change PORT in .env\n`);
        process.exit(1);
      }
      throw err;
    });

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 WebSocket ready`);
    });
  } catch (err) {
    console.error("❌ Server startup failed:", err);
    process.exit(1);
  }
})();
