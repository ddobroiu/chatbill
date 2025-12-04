const prisma = require('../db/prismaWrapper');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { 
  sendWelcomeEmail, 
  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendPasswordChangedEmail 
} = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'chatbill-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '7d'; // Token valid 7 zile

// Helper pentru generare JWT token
function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// POST /api/auth/register - Înregistrare utilizator nou
async function register(req, res) {
  try {
    const { name, email, password, company, cui, phone } = req.body;
    
    // Validare
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Nume, email și parolă sunt obligatorii'
      });
    }
    
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Parola trebuie să aibă minim 6 caractere'
      });
    }
    
    // Verifică dacă emailul există deja
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Emailul este deja înregistrat'
      });
    }
    
    // Hash parolă
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generează token verificare email
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Creează utilizator
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        company: company || null,
        cui: cui || null,
        phone: phone || null,
        verificationToken,
        emailVerified: false // În producție trimite email de verificare
      }
    });
    
    // Generează JWT token
    const token = generateToken(user);
    
    console.log('✅ Utilizator nou înregistrat:', user.email);
    
    // Trimite email de bun venit și verificare
    try {
      await sendWelcomeEmail(user.email, user.name);
      await sendVerificationEmail(user.email, user.name, verificationToken);
      console.log('📧 Emailuri de bun venit și verificare trimise');
    } catch (emailError) {
      console.error('⚠️ Eroare trimitere emailuri:', emailError);
      // Nu oprim înregistrarea dacă emailul dă eroare
    }
    
    res.status(201).json({
      success: true,
      message: 'Cont creat cu succes! Verifică-ți emailul pentru activare.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        cui: user.cui,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
    
  } catch (error) {
    console.error('❌ Eroare înregistrare:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la crearea contului'
    });
  }
}

// POST /api/auth/login - Autentificare
async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email și parolă sunt obligatorii'
      });
    }
    
    // Găsește utilizatorul
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email sau parolă greșită'
      });
    }
    
    // Verifică dacă contul e activ
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Contul este dezactivat'
      });
    }
    
    // Verifică parola
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Email sau parolă greșită'
      });
    }
    
    // Actualizează lastLogin
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });
    
    // Generează token
    const token = generateToken(user);
    
    console.log('✅ Utilizator autentificat:', user.email);
    
    res.json({
      success: true,
      message: 'Autentificare reușită',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company,
        cui: user.cui,
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
    
  } catch (error) {
    console.error('❌ Eroare autentificare:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la autentificare'
    });
  }
}

// POST /api/auth/forgot-password - Resetare parolă (trimite email)
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email-ul este obligatoriu'
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    // Nu dezvălui dacă emailul există sau nu (securitate)
    if (!user) {
      return res.json({
        success: true,
        message: 'Dacă emailul există, vei primi instrucțiuni de resetare'
      });
    }
    
    // Generează token resetare
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 oră
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry
      }
    });
    
    console.log('🔑 Token resetare generat pentru:', user.email);
    
    // Trimite email cu link resetare
    try {
      await sendPasswordResetEmail(user.email, user.name, resetToken);
      console.log('📧 Email resetare parolă trimis');
    } catch (emailError) {
      console.error('⚠️ Eroare trimitere email resetare:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Dacă emailul există, vei primi instrucțiuni de resetare',
      // Pentru development
      ...(process.env.NODE_ENV === 'development' && {
        resetToken,
        resetLink: `${process.env.BASE_URL}/reset-password?token=${resetToken}`
      })
    });
    
  } catch (error) {
    console.error('❌ Eroare forgot password:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la procesarea cererii'
    });
  }
}

// POST /api/auth/reset-password - Resetează parola cu token
async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Token și parolă nouă sunt obligatorii'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Parola trebuie să aibă minim 6 caractere'
      });
    }
    
    // Găsește utilizatorul cu token-ul valid
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date() // Token-ul nu a expirat
        }
      }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token invalid sau expirat'
      });
    }
    
    // Hash noua parolă
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Actualizează parola și șterge token-ul
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    
    console.log('✅ Parolă resetată pentru:', user.email);
    
    // Trimite email de confirmare
    try {
      await sendPasswordChangedEmail(user.email, user.name);
      console.log('📧 Email confirmare parolă trimis');
    } catch (emailError) {
      console.error('⚠️ Eroare trimitere email confirmare:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Parola a fost resetată cu succes'
    });
    
  } catch (error) {
    console.error('❌ Eroare reset password:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la resetarea parolei'
    });
  }
}

// GET /api/auth/me - Obține informații utilizator curent
async function getCurrentUser(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        cui: true,
        phone: true,
        role: true,
        emailVerified: true,
        avatar: true,
        createdAt: true,
        lastLogin: true
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilizator negăsit'
      });
    }
    
    res.json({
      success: true,
      user
    });
    
  } catch (error) {
    console.error('❌ Eroare get current user:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la obținerea datelor'
    });
  }
}

// PUT /api/auth/profile - Actualizare profil
async function updateProfile(req, res) {
  try {
    const { name, company, cui, phone } = req.body;
    
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && { name }),
        ...(company && { company }),
        ...(cui && { cui }),
        ...(phone && { phone })
      },
      select: {
        id: true,
        name: true,
        email: true,
        company: true,
        cui: true,
        phone: true,
        role: true,
        emailVerified: true
      }
    });
    
    console.log('✅ Profil actualizat:', user.email);
    
    res.json({
      success: true,
      message: 'Profil actualizat cu succes',
      user
    });
    
  } catch (error) {
    console.error('❌ Eroare update profile:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la actualizarea profilului'
    });
  }
}

// POST /api/auth/change-password - Schimbare parolă (când ești autentificat)
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Parola curentă și noua parolă sunt obligatorii'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Parola nouă trebuie să aibă minim 6 caractere'
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    
    // Verifică parola curentă
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Parola curentă este greșită'
      });
    }
    
    // Hash noua parolă
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });
    
    console.log('✅ Parolă schimbată pentru:', user.email);
    
    // Trimite email de confirmare
    try {
      await sendPasswordChangedEmail(user.email, user.name);
      console.log('📧 Email confirmare schimbare parolă trimis');
    } catch (emailError) {
      console.error('⚠️ Eroare trimitere email confirmare:', emailError);
    }
    
    res.json({
      success: true,
      message: 'Parola a fost schimbată cu succes'
    });
    
  } catch (error) {
    console.error('❌ Eroare change password:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la schimbarea parolei'
    });
  }
}

// GET /api/auth/verify-email - Verifică emailul cu token
async function verifyEmail(req, res) {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Token lipsă'
      });
    }
    
    // Găsește utilizatorul cu token-ul
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        emailVerified: false
      }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token invalid sau email deja verificat'
      });
    }
    
    // Marchează emailul ca verificat
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null
      }
    });
    
    console.log('✅ Email verificat pentru:', user.email);
    
    res.json({
      success: true,
      message: 'Email verificat cu succes!'
    });
    
  } catch (error) {
    console.error('❌ Eroare verificare email:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la verificarea emailului'
    });
  }
}

// POST /api/auth/resend-verification - Retrimite email de verificare
async function resendVerification(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email-ul este obligatoriu'
      });
    }
    
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      return res.json({
        success: true,
        message: 'Dacă emailul există și nu e verificat, vei primi un nou link'
      });
    }
    
    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        error: 'Emailul este deja verificat'
      });
    }
    
    // Generează un token nou
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken }
    });
    
    // Trimite email
    try {
      await sendVerificationEmail(user.email, user.name, verificationToken);
      console.log('📧 Email verificare retrimis pentru:', user.email);
    } catch (emailError) {
      console.error('⚠️ Eroare trimitere email verificare:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Eroare la trimiterea emailului'
      });
    }
    
    res.json({
      success: true,
      message: 'Email de verificare retrimis'
    });
    
  } catch (error) {
    console.error('❌ Eroare resend verification:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la trimiterea emailului'
    });
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  updateProfile,
  changePassword,
  verifyEmail,
  resendVerification
};
