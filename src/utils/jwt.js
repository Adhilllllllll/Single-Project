const jwt = require("jsonwebtoken");
const crypto = require("crypto");

// Validate and normalize env config
let ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
let REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES =
  process.env.ACCESS_TOKEN_EXPIRES ||
  process.env.JWT_ACCESS_TOKEN_EXPIRES ||
  "15m";
const REFRESH_EXPIRES =
  process.env.REFRESH_TOKEN_EXPIRES ||
  process.env.JWT_REFRESH_TOKEN_EXPIRES ||
  "7d";

// Fail fast in production; in development generate ephemeral secrets to avoid startup crash
const isProduction = process.env.NODE_ENV === "production";
if (!ACCESS_SECRET || !REFRESH_SECRET) {
  if (isProduction) {
    throw new Error(
      "Missing JWT secrets: please set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in your environment"
    );
  } else {
    // generate ephemeral secrets for local/dev use so app doesn't crash if .env is missing
    ACCESS_SECRET = ACCESS_SECRET || crypto.randomBytes(64).toString("hex");
    REFRESH_SECRET = REFRESH_SECRET || crypto.randomBytes(64).toString("hex");
    console.warn(
      "Warning: JWT_ACCESS_SECRET or JWT_REFRESH_SECRET not set. Using generated secrets for development. Set env vars for persistent tokens."
    );
  }
}

function signAccessToken(payload) {
  if (!payload) throw new Error("Payload required to sign access token");
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}
function signRefreshToken(payload) {
  if (!payload) throw new Error("Payload required to sign refresh token");
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}
// make verify functions safe: return decoded on success, null on failure
function verifyAccessToken(token) {
  try {
    return jwt.verify(token, ACCESS_SECRET);
  } catch (err) {
    return null;
  }
}
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, REFRESH_SECRET);
  } catch (err) {
    return null;
  }
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function generateRandomToken(bytes = 48) {
  return crypto.randomBytes(bytes).toString("hex");
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateRandomToken,
};
