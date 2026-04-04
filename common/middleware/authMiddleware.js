

// module.exports = { protect, proOnly };
import jwt from 'jsonwebtoken';

const protect = async (req, res, next) => {
  try {
    let token;

    // Check header
    if(req.headers.authorization && 
       req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // No token found
    if(!token) {
      return res.status(401).json({ 
        success: false,
        message: '❌ Not authorized, no token' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request
    req.user = decoded;
    next();

  } catch (err) {
    res.status(401).json({ 
      success: false,
      message: '❌ Not authorized, invalid token', 
      error: err.message 
    });
  }
};

// ===== PRO USERS ONLY =====
const proOnly = (req, res, next) => {
  if(req.user && req.user.role === 'pro') {
    next();
  } else {
    res.status(403).json({ 
      success: false,
      message: '❌ Pro plan required for this feature' 
    });
  }
};

export { protect, proOnly };