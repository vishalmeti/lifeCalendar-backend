const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // 1. Get token from Authorization header
  const authHeader = req.header('Authorization');

  // 2. Check if Authorization header exists and is in Bearer scheme
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If no header, or not Bearer scheme
    return res.status(401).json({ msg: 'No token or token is not Bearer type, authorization denied' });
  }

  // 3. Extract the token string
  // The token is after "Bearer ", so we split the string and take the second part
  const token = authHeader.split(' ')[1];

  // 4. Check if token exists after splitting (handles cases like "Bearer" with no token)
  if (!token) {
      return res.status(401).json({ msg: 'Token malformed, authorization denied' });
  }

  // 5. Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};