const prisma = require('../db/prismaWrapper');
const axios = require('axios');
const crypto = require('crypto');

// Configurare ANAF OAuth (va fi citită din DB sau .env)
const ANAF_CONFIG = {
  clientId: process.env.ANAF_CLIENT_ID,
  clientSecret: process.env.ANAF_CLIENT_SECRET,
  redirectUri: process.env.ANAF_REDIRECT_URI || 'https://chatbill.ro/api/anaf/callback',
  authUrl: process.env.ANAF_AUTH_URL || 'https://logincert.anaf.ro/anaf-oauth2/v1/authorize',
  tokenUrl: process.env.ANAF_TOKEN_URL || 'https://logincert.anaf.ro/anaf-oauth2/v1/token',
  revokeUrl: process.env.ANAF_REVOKE_URL || 'https://logincert.anaf.ro/anaf-oauth2/v1/revoke',
  scope: 'openid'
};

// GET /api/anaf/connect - Inițiază procesul de autentificare
async function initiateAuth(req, res) {
  try {
    // Generează state pentru securitate (CSRF protection)
    const state = crypto.randomBytes(16).toString('hex');
    
    // Salvează state în sesiune sau DB pentru validare ulterioară
    req.session = req.session || {};
    req.session.anafOAuthState = state;
    
    // Construiește URL-ul de autorizare ANAF
    const authUrl = `${ANAF_CONFIG.authUrl}?` + 
      `client_id=${encodeURIComponent(ANAF_CONFIG.clientId)}&` +
      `redirect_uri=${encodeURIComponent(ANAF_CONFIG.redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(ANAF_CONFIG.scope)}&` +
      `state=${state}`;
    
    console.log('🔐 Redirect către ANAF pentru autentificare');
    
    res.json({
      success: true,
      authUrl,
      message: 'Redirect către ANAF pentru autentificare'
    });
    
  } catch (error) {
    console.error('❌ Eroare inițiere autentificare ANAF:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la inițierea autentificării'
    });
  }
}

// GET /api/anaf/callback - Callback după autentificare ANAF
async function handleCallback(req, res) {
  try {
    const { code, state, error, error_description } = req.query;
    
    // Verifică dacă ANAF a returnat eroare
    if (error) {
      console.error('❌ Eroare ANAF:', error, error_description);
      return res.redirect(`/?anaf_error=${encodeURIComponent(error_description || error)}`);
    }
    
    // Verifică state pentru protecție CSRF
    if (!state || state !== req.session?.anafOAuthState) {
      console.error('❌ State invalid - posibil atac CSRF');
      return res.redirect('/?anaf_error=invalid_state');
    }
    
    if (!code) {
      console.error('❌ Lipsește authorization code');
      return res.redirect('/?anaf_error=missing_code');
    }
    
    console.log('✅ Cod de autorizare primit, schimbare în access token...');
    
    // Schimbă authorization code în access token
    const tokenResponse = await axios.post(
      ANAF_CONFIG.tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ANAF_CONFIG.clientId,
        client_secret: ANAF_CONFIG.clientSecret,
        code: code,
        redirect_uri: ANAF_CONFIG.redirectUri
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const {
      access_token,
      refresh_token,
      expires_in,
      token_type
    } = tokenResponse.data;
    
    console.log('✅ Access token obținut, salvare în DB...');
    
    // Calculează data de expirare
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    
    // TODO: Asociază cu user-ul curent (pentru simplificare, folosim un user implicit)
    // În producție, trebuie să ai sistem de autentificare pentru useri
    let user = await prisma.user.findFirst();
    
    if (!user) {
      // Creează user implicit pentru demo
      user = await prisma.user.create({
        data: {
          email: 'admin@chatbill.ro',
          name: 'Administrator',
          password: 'demo', // În producție, folosește hash
          role: 'admin'
        }
      });
    }
    
    // Salvează sau actualizează token-urile ANAF
    await prisma.anafAuth.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenType: token_type || 'Bearer',
        expiresAt,
        isActive: true
      },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenType: token_type || 'Bearer',
        expiresAt,
        isActive: true,
        lastRefresh: new Date()
      }
    });
    
    console.log('✅ Token-uri ANAF salvate cu succes');
    
    // Redirect către frontend cu succes
    res.redirect('/?anaf_connected=true');
    
  } catch (error) {
    console.error('❌ Eroare procesare callback ANAF:', error.response?.data || error.message);
    res.redirect(`/?anaf_error=${encodeURIComponent(error.message)}`);
  }
}

// POST /api/anaf/refresh - Refresh access token
async function refreshToken(req, res) {
  try {
    // Găsește token-ul activ
    const anafAuth = await prisma.anafAuth.findFirst({
      where: { isActive: true }
    });
    
    if (!anafAuth) {
      return res.status(404).json({
        success: false,
        error: 'Nu există conexiune activă cu ANAF'
      });
    }
    
    console.log('🔄 Refresh access token ANAF...');
    
    const tokenResponse = await axios.post(
      ANAF_CONFIG.tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: ANAF_CONFIG.clientId,
        client_secret: ANAF_CONFIG.clientSecret,
        refresh_token: anafAuth.refreshToken
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const {
      access_token,
      refresh_token,
      expires_in,
      token_type
    } = tokenResponse.data;
    
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    
    // Actualizează token-urile
    await prisma.anafAuth.update({
      where: { id: anafAuth.id },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token || anafAuth.refreshToken,
        tokenType: token_type || 'Bearer',
        expiresAt,
        lastRefresh: new Date()
      }
    });
    
    console.log('✅ Token ANAF refreshed cu succes');
    
    res.json({
      success: true,
      message: 'Token refreshed cu succes',
      expiresAt
    });
    
  } catch (error) {
    console.error('❌ Eroare refresh token ANAF:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Eroare la refresh token'
    });
  }
}

// GET /api/anaf/status - Verifică status conexiune ANAF
async function getStatus(req, res) {
  try {
    const anafAuth = await prisma.anafAuth.findFirst({
      where: { isActive: true },
      select: {
        id: true,
        cui: true,
        companyName: true,
        expiresAt: true,
        lastRefresh: true,
        isActive: true,
        createdAt: true
      }
    });
    
    if (!anafAuth) {
      return res.json({
        success: true,
        connected: false,
        message: 'Nu există conexiune activă cu ANAF'
      });
    }
    
    const now = new Date();
    const isExpired = anafAuth.expiresAt < now;
    
    res.json({
      success: true,
      connected: true,
      isExpired,
      expiresAt: anafAuth.expiresAt,
      lastRefresh: anafAuth.lastRefresh,
      cui: anafAuth.cui,
      companyName: anafAuth.companyName
    });
    
  } catch (error) {
    console.error('❌ Eroare verificare status ANAF:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la verificarea statusului'
    });
  }
}

// POST /api/anaf/disconnect - Deconectare cont ANAF
async function disconnect(req, res) {
  try {
    await prisma.anafAuth.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });
    
    console.log('✅ Deconectat de la ANAF');
    
    res.json({
      success: true,
      message: 'Deconectat cu succes de la ANAF'
    });
    
  } catch (error) {
    console.error('❌ Eroare deconectare ANAF:', error);
    res.status(500).json({
      success: false,
      error: 'Eroare la deconectare'
    });
  }
}

// Funcție helper pentru a obține access token valid (cu refresh automat)
async function getValidAccessToken() {
  const anafAuth = await prisma.anafAuth.findFirst({
    where: { isActive: true }
  });
  
  if (!anafAuth) {
    throw new Error('Nu există conexiune activă cu ANAF');
  }
  
  const now = new Date();
  const bufferTime = 5 * 60 * 1000; // 5 minute buffer
  
  // Verifică dacă token-ul expiră în următoarele 5 minute
  if (anafAuth.expiresAt.getTime() - now.getTime() < bufferTime) {
    console.log('⚠️ Token-ul expiră în curând, se face refresh automat...');
    
    const tokenResponse = await axios.post(
      ANAF_CONFIG.tokenUrl,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: ANAF_CONFIG.clientId,
        client_secret: ANAF_CONFIG.clientSecret,
        refresh_token: anafAuth.refreshToken
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const {
      access_token,
      refresh_token,
      expires_in
    } = tokenResponse.data;
    
    const expiresAt = new Date(Date.now() + expires_in * 1000);
    
    await prisma.anafAuth.update({
      where: { id: anafAuth.id },
      data: {
        accessToken: access_token,
        refreshToken: refresh_token || anafAuth.refreshToken,
        expiresAt,
        lastRefresh: new Date()
      }
    });
    
    console.log('✅ Token refreshed automat');
    return access_token;
  }
  
  return anafAuth.accessToken;
}

module.exports = {
  initiateAuth,
  handleCallback,
  refreshToken,
  getStatus,
  disconnect,
  getValidAccessToken
};
