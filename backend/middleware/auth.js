const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ message: 'Token is not valid' });

    // Prevent deactivated accounts from accessing the system (Security)
    if (!user.isActive) {
      return res.status(403).json({ message: 'Account has been deactivated. Please contact admin.' });
    }

    // Strip password from req.user to prevent accidental leaks in logs or downstream middleware (Security)
    const userObj = user.toObject();
    delete userObj.password;
    req.user = userObj;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied: insufficient permissions' });
    }
    next();
  };
};
