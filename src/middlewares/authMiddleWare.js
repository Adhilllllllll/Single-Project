const jwt = require("jsonwebtoken");

const authMiddleware = (requiredRole = null) => {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;

    //  Check header exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token missing or malformed",
      });
    }

    //  Extract token
    const token = authHeader.split(" ")[1];

    try {
      //   Verify token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

      req.user = decoded; // { id, role }

      //  Role-based access control
      if (requiredRole && decoded.role !== requiredRole) {
        return res.status(403).json({
          message: `Access denied: ${requiredRole} only`,
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }
  };
};

module.exports = authMiddleware;
