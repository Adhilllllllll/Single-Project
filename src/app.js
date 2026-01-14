// const express = require("express");
// const cors = require("cors");
// const cookieParser = require("cookie-parser");
// const helmet = require("helmet");
// const morgan = require("morgan");
// const path = require("path");
// require("dotenv").config();

// const app = express();

// /* =======================
//    GLOBAL MIDDLEWARES
// ======================= */

// // CORS - must be first for preflight requests
// const allowedOrigins = [
//   // "http://localhost:5173",
//   // "http://localhost:5174",
//   // "http://localhost:5175",
//   // process.env.FRONTEND_URL,
//   "https://edunexus-client-one.vercel.app",
// ].filter(Boolean);
// console.log(process.env.FRONTEND_URL);

// app.use(
//   cors({
//     origin: [
//       "https://edunexus-client-one.vercel.app",
//       "http://localhost:5173",
//     ],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );

// // app.use(
// //   cors({
// //     origin: function (origin, callback) {
// //       // Allow requests with no origin (like mobile apps or curl)
// //       if (!origin) return callback(null, true);
// //       if (allowedOrigins.includes(origin)) {
// //         return callback(null, true);
// //       }
// //       return callback(new Error("Not allowed by CORS"));
// //     },
// //     credentials: true,
// //   })
// // );

// // Security headers (with cross-origin resource policy disabled for static files)
// app.use(
//   helmet({
//     crossOriginResourcePolicy: { policy: "cross-origin" },
//     crossOriginEmbedderPolicy: false,
//   })
// );

// // Request logging
// app.use(morgan("dev"));

// // Body parsers
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // Cookies
// app.use(cookieParser());

// // Serve static files (uploads) with CORS headers
// app.use(
//   "/uploads",
//   (req, res, next) => {
//     res.setHeader("Access-Control-Allow-Origin", "*");
//     res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
//     next();
//   },
//   express.static(path.join(__dirname, "../uploads"))
// );

// /* =======================
//    SAFE ROUTE LOADER
// ======================= */

// const safeUse = (path, modulePath) => {
//   try {
//     const route = require(modulePath);

//     if (typeof route !== "function") {
//       throw new Error(
//         `Route at ${modulePath} does not export an Express router`
//       );
//     }

//     app.use(path, route);
//     console.log(`  Loaded route: ${path}`);
//   } catch (err) {
//     console.error(`  Failed to load route ${path}`);
//     console.error(err.message);
//   }
// };

// /* =======================
//    ROUTES
// ======================= */

// safeUse("/api/admin", "./modules/admin/adminRoutes");
// safeUse("/api/auth", "./modules/auth/authRoutes");
// safeUse("/api/users", "./modules/users/userRoutes");
// safeUse(
//   "/api/reviewer/availability",
//   "./modules/reviewerAvailability/availabilityRoutes"
// );
// safeUse("/api/reviews", "./modules/reviews/reviewRoutes");
// safeUse("/api/advisor", "./modules/advisor/advisorRoutes");
// safeUse("/api/tasks", "./modules/tasks/taskRoutes");
// safeUse("/api/materials", "./modules/materials/materialsRoutes");
// safeUse("/api/notifications", "./modules/notifications/notificationRoutes");
// safeUse("/api/students", "./modules/students/studentRoutes");
// safeUse("/api/chat", "./modules/chat/chatRoutes");
// safeUse("/api/issues", "./modules/issues/issueRoutes");

// /* =======================
//    HEALTH CHECK
// ======================= */

// app.get("/", (req, res) => {
//   res.status(200).send("RMS Backend Running");
// });

// /* =======================
//    404 HANDLER
// ======================= */

// app.use((req, res) => {
//   res.status(404).json({
//     message: "Route not found",
//   });
// });

// /* =======================
//    GLOBAL ERROR HANDLER
// ======================= */

// app.use((err, req, res, next) => {
//   console.error("Global Error:", err);

//   res.status(err.status || 500).json({
//     message: err.message || "Internal Server Error",
//   });
// });

// module.exports = app;

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
 * ✅ CONNECT DATABASE HERE (IMPORTANT FOR VERCEL)
 */
const connectDB = require("./config/database");
connectDB();

const app = express();

/* =======================
   GLOBAL MIDDLEWARES
======================= */

/**
 * ✅ CORS – Vercel safe
 */
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ ADD THIS BLOCK
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
    res.setHeader(
      "Access-Control-Allow-Origin",
      process.env.FRONTEND_URL
    );
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(__dirname, "../uploads"))
);

/* =======================
   SAFE ROUTE LOADER
======================= */

const safeUse = (routePath, modulePath) => {
  try {
    const route = require(modulePath);

    if (typeof route !== "function") {
      throw new Error(
        `Route at ${modulePath} does not export an Express router`
      );
    }

    app.use(routePath, route);
    console.log(`✅ Loaded route: ${routePath}`);
  } catch (err) {
    console.error(`❌ Failed to load route: ${routePath}`);
    console.error(err.message);
  }
};

/* =======================
   ROUTES
======================= */

safeUse("/api/admin", "./modules/admin/adminRoutes");
safeUse("/api/auth", "./modules/auth/authRoutes");
safeUse("/api/users", "./modules/users/userRoutes");
safeUse(
  "/api/reviewer/availability",
  "./modules/reviewerAvailability/availabilityRoutes"
);
safeUse("/api/reviews", "./modules/reviews/reviewRoutes");
safeUse("/api/advisor", "./modules/advisor/advisorRoutes");
safeUse("/api/tasks", "./modules/tasks/taskRoutes");
safeUse("/api/materials", "./modules/materials/materialsRoutes");
safeUse("/api/notifications", "./modules/notifications/notificationRoutes");
safeUse("/api/students", "./modules/students/studentRoutes");
safeUse("/api/chat", "./modules/chat/chatRoutes");
safeUse("/api/issues", "./modules/issues/issueRoutes");

/* =======================
   HEALTH CHECK
======================= */

app.get("/", (req, res) => {
  res.status(200).send("RMS Backend Running");
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
 * ✅ IMPORTANT:
 * No app.listen()
 * Export app for Vercel serverless
 */
module.exports = app;
