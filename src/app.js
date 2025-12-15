const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const app = express();

/* =======================
   GLOBAL MIDDLEWARES
======================= */

// Security headers
app.use(helmet());

// Request logging
app.use(morgan("dev"));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

/* =======================
   ROUTES
======================= */

app.use("/api/auth", require("./modules/auth/authRoutes"));
app.use("/api/users", require("./modules/users/userRoutes"));
app.use("/api/reviewer", require("./modules/reviewer/reviewerRoutes"));

// Admin routes (safe-load)
try {
  app.use("/api/admin", require("./modules/admin/adminRoutes"));
} catch (err) {
  console.warn("⚠️ Admin routes not loaded yet");
}

/* =======================
   HEALTH CHECK
======================= */

app.get("/", (req, res) => {
  res.status(200).send("RMS Backend Running 🚀");
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
  console.error("🔥 Global Error:", err);

  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

module.exports = app;
