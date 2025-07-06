const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  // Check for x-access-token header first (frontend format)
  let token = req.headers["x-access-token"];
  
  // If not found, check for Authorization Bearer token (backend format)
  if (!token) {
    const authHeader = req.headers["authorization"];
    token = authHeader && authHeader.split(" ")[1];
  }
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

module.exports = {
  authenticateToken
}; 