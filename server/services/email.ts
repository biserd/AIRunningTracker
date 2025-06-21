import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: any;
  
  constructor() {
    // Check if email is configured
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      // Use Gmail SMTP (free) - requires app password
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      });
    } else if (process.env.SMTP_HOST) {
      // Alternative: use any SMTP service
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD
        }
      });
    } else {
      // No email configured - will log instead
      this.transporter = null;
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.log('📧 Email not configured - would send:', options.subject, 'to:', options.to);
        return false;
      }

      await this.transporter.sendMail({
        from: process.env.EMAIL_USER || process.env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text
      });
      
      console.log(`📧 Email sent successfully: ${options.subject} to ${options.to}`);
      return true;
    } catch (error) {
      console.error('📧 Email sending failed:', error);
      return false;
    }
  }

  async sendWaitlistNotification(email: string): Promise<void> {
    const subject = 'New Waitlist Signup - RunAnalytics';
    const html = `
      <h2>New Waitlist Signup</h2>
      <p>A new user has joined the RunAnalytics waitlist:</p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>
    `;
    
    await this.sendEmail({
      to: 'hello@bigappledigital.nyc',
      subject,
      html,
      text: `New waitlist signup: ${email} at ${new Date().toLocaleString()}`
    });
  }

  async sendRegistrationNotification(email: string): Promise<void> {
    const subject = 'New User Registration - RunAnalytics';
    const html = `
      <h2>New User Registration</h2>
      <p>A new user has registered for RunAnalytics:</p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>
    `;
    
    await this.sendEmail({
      to: 'hello@bigappledigital.nyc',
      subject,
      html,
      text: `New user registration: ${email} at ${new Date().toLocaleString()}`
    });
  }
}

export const emailService = new EmailService();