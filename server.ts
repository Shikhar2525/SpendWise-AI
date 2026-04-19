import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/notify', async (req, res) => {
    const { to, subject, templateName, data } = req.body;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('SMTP credentials are not set. Email not sent.');
      return res.status(200).json({ success: false, message: 'Email service not configured' });
    }

    try {
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
        from: process.env.SMTP_FROM || '"SpendWise AI" <notifications@spendwise.ai>',
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

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
