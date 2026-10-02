const jwt = require('jsonwebtoken');

function auth(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'bharat-sevak-dev-secret');
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

const allowRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Access denied' });
  next();
};

module.exports = { auth, allowRoles };
