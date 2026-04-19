import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import fs from 'fs';
import admin from 'firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const firebaseConfig = JSON.parse(fs.readFileSync(new URL('./firebase-applet-config.json', import.meta.url), 'utf8'));

dotenv.config();

console.log('--- SERVER STARTUP ---');
console.log('Project ID:', firebaseConfig.projectId);
console.log('NODE_ENV:', process.env.NODE_ENV);

// Initialize Firebase Admin
if (!admin.apps.length) {
  console.log('Initializing Firebase Admin for project:', firebaseConfig.projectId);
  admin.initializeApp({
    projectId: firebaseConfig.projectId
  });
}

console.log('Targeting Firestore Database ID:', firebaseConfig.firestoreDatabaseId);
const db = getFirestore(undefined, firebaseConfig.firestoreDatabaseId);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Fetches SMTP configuration conditionally.
 * 1. Checks environment variables first.
 * 2. If missing, attempts to fetch from Firestore config/mail.
 */
async function getSMTPConfig() {
  // Check Env first
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      from: process.env.SMTP_FROM || `"SpendWise AI" <${process.env.SMTP_USER}>`
    };
  }

  // Fallback to Firestore
  try {
    const configDoc = await db.collection('config').doc('mail').get();
    if (configDoc.exists) {
      const data = configDoc.data();
      if (data?.user && data?.pass) {
        return {
          host: data.host || 'smtp.gmail.com',
          port: parseInt(data.port || '587'),
          secure: data.secure === true,
          auth: {
            user: data.user,
            pass: data.pass,
          },
          from: data.from || `"SpendWise AI" <${data.user}>`
        };
      }
    }
  } catch (error) {
    console.error('Error fetching SMTP config from Firestore:', error);
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
    next();
  });

  // Health check - works for GET and POST
  app.all('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      method: req.method
    });
  });

  app.post('/api/admin/test-smtp', async (req, res) => {
    const { host, port, secure, user, pass } = req.body;
    
    if (!user || !pass) {
      return res.status(400).json({ error: 'User and Pass are required' });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: host || 'smtp.gmail.com',
        port: port || 587,
        secure: secure === true,
        auth: { user, pass }
      });

      await transporter.verify();
      res.json({ success: true, message: 'SMTP connection successful' });
    } catch (error) {
      console.error('SMTP Test Error:', error);
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'SMTP verification failed' });
    }
  });

  // API Routes
  app.post('/api/notify', async (req, res) => {
    const { to, subject, templateName, data } = req.body;

    const smtpConfig = await getSMTPConfig();

    if (!smtpConfig) {
      console.warn('SMTP configuration not found in Env or Firestore. Email not sent.');
      return res.status(200).json({ success: false, message: 'Email service not configured' });
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port,
        secure: smtpConfig.secure,
        auth: smtpConfig.auth
      });

      let html = '';
      const mainColor = '#4f46e5';
      const secondaryColor = '#8b5cf6';
      const bgColor = '#ffffff';
      const cardBg = '#f9fafb';
      const textColor = '#1f2937';
      const mutedColor = '#6b7280';

      const baseLayout = (content: string) => `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; }
              .container { max-width: 600px; margin: 40px auto; background-color: ${bgColor}; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; }
              .header { background: linear-gradient(135deg, ${mainColor}, ${secondaryColor}); padding: 40px 20px; text-align: center; }
              .logo { color: white; font-size: 28px; font-weight: 900; letter-spacing: -2px; font-style: italic; text-transform: uppercase; margin: 0; }
              .logo span { color: rgba(255, 255, 255, 0.7); }
              .content { padding: 40px; }
              .title { font-size: 24px; font-weight: 800; color: ${textColor}; margin-bottom: 20px; letter-spacing: -0.025em; }
              .text { font-size: 16px; color: ${textColor}; line-height: 1.6; margin-bottom: 20px; }
              .footer { padding: 30px 40px; background-color: ${cardBg}; border-top: 1px solid #e5e7eb; text-align: center; }
              .footer-text { font-size: 12px; color: ${mutedColor}; margin: 5px 0; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; }
              .card { background-color: ${cardBg}; padding: 24px; border-radius: 16px; border: 1px solid #e5e7eb; margin: 24px 0; }
              .label { font-size: 10px; font-weight: 900; color: ${mutedColor}; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 4px; display: block; }
              .value { font-size: 20px; font-weight: 800; color: ${textColor}; font-style: italic; tracking: -0.05em; }
              .accent-value { color: ${mainColor}; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 class="logo">SpendWise <span>AI</span></h1>
              </div>
              <div class="content">
                ${content}
              </div>
              <div class="footer">
                <p class="footer-text">SpendWise AI Inc.</p>
                <p class="footer-text" style="opacity: 0.5;">London &bull; New York &bull; San Francisco</p>
                <p class="footer-text" style="margin-top: 20px;">Manage preference in dashboard</p>
              </div>
            </div>
          </body>
        </html>
      `;
      
      switch (templateName) {
        case 'welcome':
          html = baseLayout(`
            <h2 class="title">Welcome to the Inner Circle.</h2>
            <p class="text">Hi ${data.name || 'User'},</p>
            <p class="text">We're officially redesigning your financial future. SpendWise AI is more than a budget tracker—it's your automated wealth intelligence partner.</p>
            <div class="card">
              <p class="label">Priority Access</p>
              <p class="text" style="font-weight: bold; margin-bottom: 0;">Everything is configured for your success.</p>
            </div>
            <p class="text">Start by linking your first transaction and experience the AI insights in action.</p>
          `);
          break;
        case 'transaction':
          const amountFormatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount);
          html = baseLayout(`
            <h2 class="title">Sync Successful.</h2>
            <p class="text">We've just recorded a new transaction on your timeline. Your budget intelligence has been updated automatically.</p>
            <div class="card">
              <div style="margin-bottom: 20px;">
                <span class="label">Amount</span>
                <span class="value accent-value">${amountFormatted}</span>
              </div>
              <div style="display: flex; gap: 40px;">
                <div style="flex: 1;">
                   <span class="label">Category</span>
                   <span class="value" style="font-size: 16px;">${data.category}</span>
                </div>
                <div style="flex: 1;">
                   <span class="label">Timeline</span>
                   <span class="value" style="font-size: 16px;">Today</span>
                </div>
              </div>
            </div>
            <p class="text" style="font-style: italic; font-weight: bold; color: ${mutedColor}; font-size: 14px;">"Your current burn rate is slightly higher than usual for food, but within budget thresholds." - AI Insight</p>
          `);
          break;
        case 'reminder':
          const amountRem = new Intl.NumberFormat('en-US', { style: 'currency', currency: data.currency || 'USD' }).format(data.amount);
          html = baseLayout(`
            <h2 class="title" style="color: #f59e0b;">Action Required: Upcoming Bill.</h2>
            <p class="text">Heads up. Our system detected an upcoming recurring payment that requires your attention.</p>
            <div class="card" style="border-left: 4px solid #f59e0b;">
              <span class="label">Description</span>
              <p class="value" style="margin-bottom: 20px;">${data.description}</p>
              <div style="display: flex; gap: 40px;">
                <div style="flex: 1;">
                   <span class="label">Due Date</span>
                   <span class="value" style="font-size: 16px;">${data.date}</span>
                </div>
                <div style="flex: 1;">
                   <span class="label">Amount</span>
                   <span class="value accent-value" style="font-size: 16px;">${amountRem}</span>
                </div>
              </div>
            </div>
            <p class="text">This has been reserved in your liquidity forecast.</p>
          `);
          break;
        default:
          html = baseLayout(`<p>${JSON.stringify(data)}</p>`);
      }

      await transporter.sendMail({
        from: smtpConfig.from,
        to: to,
        subject: subject,
        html: html,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Email sending error:', error);
      res.status(500).json({ success: false, error: 'Failed to send email' });
    }
  });

  // Handle 404 for API routes specifically
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = fileURLToPath(new URL('./dist', import.meta.url));
    console.log('Serving static files from:', distPath);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      // Correctly handle SPA routing, but only for GET requests
      if (req.url.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
