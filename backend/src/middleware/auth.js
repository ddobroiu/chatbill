const jwt = require('jsonwebtoken');
const prisma = require('../db/prismaWrapper');

const JWT_SECRET = process.env.JWT_SECRET || 'chatbill-jwt-secret-change-in-production';

// Middleware pentru verificare JWT token
async function authenticateToken(req, res, next) {
  try {
    // Obține token din header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"
    
    if (!token) {
      // Dacă nu există token, folosește primul utilizator activ din baza de date
      const defaultUser = await prisma.user.findFirst({
        where: { isActive: true },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      });
      
      if (defaultUser) {
        req.user = defaultUser;
        return next();
      }
      
      return res.status(401).json({
        success: false,
        error: 'Token de autentificare lipsește și nu există utilizatori în sistem'
      });
    }
    
    // Verifică token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Verifică dacă utilizatorul mai există și este activ
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Utilizator negăsit'
      });
    }
    
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Cont dezactivat'
      });
    }
    
    // Atașează utilizatorul la request
    req.user = user;
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token invalid'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expirat'
      });
    }
    
    console.error('❌ Eroare autentificare:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la verificarea autentificării'
    });
  }
}

// Middleware pentru verificare rol (opțional)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Autentificare necesară'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Acces interzis'
      });
    }
    
    next();
  };
}

// Middleware opțional - verifică token dacă există, dar nu e obligatoriu
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      });
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Ignore errors, authentication is optional
    next();
  }
}

module.exports = {
  authenticateToken,
  requireRole,
  optionalAuth
};
