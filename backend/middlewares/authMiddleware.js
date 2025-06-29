const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  try {
    // Get the Authorization header
    const authHeader = req.header('Authorization');
    
    // Check if Authorization header exists and has proper format
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access Denied: No token provided or invalid format' });
    }
    
    // Extract the token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Access Denied: No token provided' });
    }
    
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // Add debug information
    console.log('Token verified successfully for user:', decoded.email);
    
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, (err) => {
    // If verifyToken failed, the error response has already been sent
    if (err) return;
    
    if (req.user.role !== 'admin') {
      console.log('Admin access denied for user:', req.user.email);
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    console.log('Admin access granted for user:', req.user.email);
    next();
  });
};

module.exports = { verifyToken, verifyAdmin };