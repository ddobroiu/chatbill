const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// Template pentru email de bun venit
const getWelcomeEmailHTML = (userName) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bun venit la ChatBill!</h1>
    </div>
    <div class="content">
      <p>Salut ${userName},</p>
      <p>Contul tău ChatBill a fost creat cu succes! 🚀</p>
      <p>Acum poți:</p>
      <ul>
        <li>📄 Genera facturi prin chat conversațional AI</li>
        <li>🏢 Valida automat companii prin ANAF</li>
        <li>📧 Trimite facturi în e-Factura ANAF</li>
        <li>💬 Folosi asistentul GPT pentru întrebări fiscale</li>
      </ul>
      <a href="${process.env.BASE_URL}" class="button">Începe să folosești ChatBill</a>
      <p>Dacă ai întrebări, echipa noastră este aici să te ajute!</p>
    </div>
    <div class="footer">
      <p>© 2025 ChatBill - Sistem inteligent de facturare</p>
      <p>📧 ${process.env.SUPPORT_EMAIL} | 🌐 ${process.env.BASE_URL}</p>
    </div>
  </div>
</body>
</html>
`;

// Template pentru verificare email
const getVerificationEmailHTML = (userName, verificationLink) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Verifică-ți adresa de email</h1>
    </div>
    <div class="content">
      <p>Salut ${userName},</p>
      <p>Mulțumim că te-ai înregistrat la ChatBill! 🎉</p>
      <p>Pentru a-ți activa contul, te rugăm să verifici adresa de email făcând click pe butonul de mai jos:</p>
      <a href="${verificationLink}" class="button">Verifică Email-ul</a>
      <p>Sau copiază acest link în browser:</p>
      <p style="word-break: break-all; color: #667eea;">${verificationLink}</p>
      <div class="warning">
        <strong>⚠️ Important:</strong> Acest link expiră în 24 de ore.
      </div>
      <p>Dacă nu ai creat un cont ChatBill, poți ignora acest email.</p>
    </div>
    <div class="footer">
      <p>© 2025 ChatBill - Sistem inteligent de facturare</p>
      <p>📧 ${process.env.SUPPORT_EMAIL} | 🌐 ${process.env.BASE_URL}</p>
    </div>
  </div>
</body>
</html>
`;

// Template pentru resetare parolă
const getPasswordResetEmailHTML = (userName, resetLink) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .warning { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔑 Resetare parolă</h1>
    </div>
    <div class="content">
      <p>Salut ${userName},</p>
      <p>Am primit o cerere de resetare a parolei pentru contul tău ChatBill.</p>
      <p>Pentru a crea o parolă nouă, dă click pe butonul de mai jos:</p>
      <a href="${resetLink}" class="button">Resetează Parola</a>
      <p>Sau copiază acest link în browser:</p>
      <p style="word-break: break-all; color: #667eea;">${resetLink}</p>
      <div class="warning">
        <strong>⚠️ Important:</strong> Acest link expiră în 1 oră.
      </div>
      <p>Dacă nu ai solicitat resetarea parolei, poți ignora acest email în siguranță. Parola ta nu va fi schimbată.</p>
    </div>
    <div class="footer">
      <p>© 2025 ChatBill - Sistem inteligent de facturare</p>
      <p>📧 ${process.env.SUPPORT_EMAIL} | 🌐 ${process.env.BASE_URL}</p>
    </div>
  </div>
</body>
</html>
`;

// Template pentru confirmare resetare parolă
const getPasswordChangedEmailHTML = (userName) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    .success { background: #d4edda; padding: 15px; border-left: 4px solid #28a745; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Parolă schimbată cu succes</h1>
    </div>
    <div class="content">
      <p>Salut ${userName},</p>
      <div class="success">
        Parola ta ChatBill a fost schimbată cu succes! 🎉
      </div>
      <p>Acum te poți autentifica cu noua parolă.</p>
      <p>Dacă nu ai fost tu cel care a schimbat parola, te rugăm să ne contactezi imediat la ${process.env.SUPPORT_EMAIL}</p>
    </div>
    <div class="footer">
      <p>© 2025 ChatBill - Sistem inteligent de facturare</p>
      <p>📧 ${process.env.SUPPORT_EMAIL} | 🌐 ${process.env.BASE_URL}</p>
    </div>
  </div>
</body>
</html>
`;

// Template pentru newsletter
const getNewsletterEmailHTML = (content) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📰 ChatBill Newsletter</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>© 2025 ChatBill - Sistem inteligent de facturare</p>
      <p>📧 ${process.env.SUPPORT_EMAIL} | 🌐 ${process.env.BASE_URL}</p>
      <p><a href="${process.env.BASE_URL}/unsubscribe">Dezabonează-te</a></p>
    </div>
  </div>
</body>
</html>
`;

// Funcții de trimitere emailuri
async function sendWelcomeEmail(to, userName) {
  try {
    const { data, error } = await resend.emails.send({
      from: `ChatBill <${process.env.EMAIL_FROM}>`,
      to: [to],
      subject: '🎉 Bun venit la ChatBill!',
      html: getWelcomeEmailHTML(userName),
    });

    if (error) {
      console.error('❌ Eroare trimitere email bun venit:', error);
      return { success: false, error };
    }

    console.log('✅ Email bun venit trimis:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Excepție trimitere email bun venit:', error);
    return { success: false, error: error.message };
  }
}

async function sendVerificationEmail(to, userName, token) {
  try {
    const verificationLink = `${process.env.BASE_URL}/verify-email?token=${token}`;
    
    const { data, error } = await resend.emails.send({
      from: `ChatBill <${process.env.EMAIL_FROM}>`,
      to: [to],
      subject: '🔐 Verifică-ți adresa de email - ChatBill',
      html: getVerificationEmailHTML(userName, verificationLink),
    });

    if (error) {
      console.error('❌ Eroare trimitere email verificare:', error);
      return { success: false, error };
    }

    console.log('✅ Email verificare trimis:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Excepție trimitere email verificare:', error);
    return { success: false, error: error.message };
  }
}

async function sendPasswordResetEmail(to, userName, token) {
  try {
    const resetLink = `${process.env.BASE_URL}/reset-password?token=${token}`;
    
    const { data, error } = await resend.emails.send({
      from: `ChatBill <${process.env.EMAIL_FROM}>`,
      to: [to],
      subject: '🔑 Resetare parolă - ChatBill',
      html: getPasswordResetEmailHTML(userName, resetLink),
    });

    if (error) {
      console.error('❌ Eroare trimitere email resetare parolă:', error);
      return { success: false, error };
    }

    console.log('✅ Email resetare parolă trimis:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Excepție trimitere email resetare parolă:', error);
    return { success: false, error: error.message };
  }
}

async function sendPasswordChangedEmail(to, userName) {
  try {
    const { data, error } = await resend.emails.send({
      from: `ChatBill <${process.env.EMAIL_FROM}>`,
      to: [to],
      subject: '✅ Parolă schimbată - ChatBill',
      html: getPasswordChangedEmailHTML(userName),
    });

    if (error) {
      console.error('❌ Eroare trimitere email confirmare parolă:', error);
      return { success: false, error };
    }

    console.log('✅ Email confirmare parolă trimis:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Excepție trimitere email confirmare parolă:', error);
    return { success: false, error: error.message };
  }
}

async function sendNewsletterEmail(to, content) {
  try {
    const { data, error } = await resend.emails.send({
      from: `ChatBill Newsletter <${process.env.EMAIL_FROM}>`,
      to: Array.isArray(to) ? to : [to],
      subject: '📰 Noutăți ChatBill',
      html: getNewsletterEmailHTML(content),
    });

    if (error) {
      console.error('❌ Eroare trimitere newsletter:', error);
      return { success: false, error };
    }

    console.log('✅ Newsletter trimis:', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Excepție trimitere newsletter:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendWelcomeEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendNewsletterEmail
};
