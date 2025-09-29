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

  async sendWelcomeEmail(email: string): Promise<void> {
    const subject = 'Welcome to RunAnalytics - Your AI-Powered Running Coach';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">🏃‍♂️ RunAnalytics</h1>
          <p style="color: #666; margin: 5px 0;">Your AI-Powered Running Coach</p>
        </div>
        
        <h2 style="color: #2c3e50;">Welcome to your running journey!</h2>
        
        <p>Thank you for registering with RunAnalytics! We're excited to help you take your running to the next level with AI-powered insights and personalized coaching.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #e74c3c; margin-top: 0;">🚀 Get Started in 3 Easy Steps:</h3>
          <ol style="color: #2c3e50; line-height: 1.6;">
            <li><strong>Connect your Strava account</strong> to import your running data and get personalized insights</li>
            <li><strong>Explore your dashboard</strong> to see AI-powered performance analysis and recommendations</li>
            <li><strong>Upgrade to Pro</strong> for advanced features like training plans, race predictions, and unlimited data history</li>
          </ol>
        </div>
        
        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #27ae60; margin-top: 0;">✨ What You Get with RunAnalytics:</h4>
          <ul style="color: #2c3e50; line-height: 1.6; margin: 10px 0;">
            <li>AI-powered performance insights and coaching recommendations</li>
            <li>VO2 Max estimation and heart rate zone analysis</li>
            <li>Running efficiency metrics and improvement suggestions</li>
            <li>Race time predictions and goal tracking</li>
            <li>Comprehensive activity analysis and trends</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://runanalytics.ai/dashboard" style="background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Start Your Journey →</a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Need help getting started? Check out our <a href="https://runanalytics.ai/faq" style="color: #e74c3c;">FAQ page</a> or reply to this email.</p>
          <p>Happy running!<br>The RunAnalytics Team</p>
        </div>
      </div>
    `;
    
    const text = `
Welcome to RunAnalytics - Your AI-Powered Running Coach!

Thank you for registering! We're excited to help you take your running to the next level.

Get Started in 3 Easy Steps:
1. Connect your Strava account to import your running data
2. Explore your dashboard for AI-powered performance analysis
3. Upgrade to Pro for advanced features like training plans and race predictions

What You Get with RunAnalytics:
• AI-powered performance insights and coaching recommendations
• VO2 Max estimation and heart rate zone analysis
• Running efficiency metrics and improvement suggestions
• Race time predictions and goal tracking
• Comprehensive activity analysis and trends

Start your journey: https://runanalytics.ai/dashboard

Need help? Check our FAQ: https://runanalytics.ai/faq

Happy running!
The RunAnalytics Team
    `;
    
    await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }
}

export const emailService = new EmailService();