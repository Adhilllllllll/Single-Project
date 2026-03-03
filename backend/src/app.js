

// Last deployed: 2026-03-03 - CORS update for localhost origins
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");

/**
 * Load dotenv ONLY in local development
 * (Vercel injects env vars automatically)
 */
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

/**
 *  CONNECT DATABASE HERE (IMPORTANT FOR VERCEL)
 */
const connectDB = require("./config/database");
connectDB();

/* =======================
   STATIC ROUTE IMPORTS
   (Required for Vercel NCC bundler to trace dependencies)
======================= */
const adminRoutes = require("./modules/admin/adminRoutes");
const authRoutes = require("./modules/auth/authRoutes");
const userRoutes = require("./modules/users/userRoutes");
const availabilityRoutes = require("./modules/reviewerAvailability/availabilityRoutes");
const reviewRoutes = require("./modules/reviews/reviewRoutes");
const advisorRoutes = require("./modules/advisor/advisorRoutes");
const taskRoutes = require("./modules/tasks/taskRoutes");
const materialsRoutes = require("./modules/materials/materialsRoutes");
const notificationRoutes = require("./modules/notifications/notificationRoutes");
const studentRoutes = require("./modules/students/studentRoutes");
const chatRoutes = require("./modules/chat/chatRoutes");
const issueRoutes = require("./modules/issues/issueRoutes");

const app = express();

/* =======================
   GLOBAL MIDDLEWARES
======================= */

/**
 *  CORS – Vercel safe
 * Allows requests from both localhost (dev) and deployed frontend (prod)
 */
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  process.env.FRONTEND_URL,
  "https://edunexus.adhilp.in",
  "https://edunexus.adhilp.in/login",
  "https://edunexus-client-one.vercel.app",
  "https://adhilp.in",
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (server-to-server, mobile apps, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ADD THIS BLOCK
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

/**
 * Security headers
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  })
);

/**
 * Request logging
 */
app.use(morgan("dev"));

/**
 * Body parsers
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Cookies
 */
app.use(cookieParser());

/**
 * Static uploads (READ-ONLY on Vercel)
 */
app.use(
  "/uploads",
  (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "../uploads"))
);

/* =======================
   ROUTE REGISTRATION
   (Using statically imported routes for Vercel compatibility)
======================= */

app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviewer/availability", availabilityRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/advisor", advisorRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/issues", issueRoutes);

console.log("✅ All routes registered successfully");

/* =======================
   HEALTH CHECK
======================= */

app.get("/", (req, res) => {
  res.status(200).send("RMS Backend Running");
});

/* =======================
   HEALTH CHECK (API)
======================= */

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: Date.now(),
  });
});

/* =======================
   404 HANDLER
======================= */

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

/* =======================
   GLOBAL ERROR HANDLER
======================= */

app.use((err, req, res, next) => {
  console.error("Global Error:", err);

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

/**
 * IMPORTANT:
 * No app.listen()
 * Export app for Vercel serverless
 */
module.exports = app;
