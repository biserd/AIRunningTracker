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
          <a href="https://aitracker.run/dashboard" style="background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Start Your Journey →</a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Need help getting started? Check out our <a href="https://aitracker.run/faq" style="color: #e74c3c;">FAQ page</a> or reply to this email.</p>
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

Start your journey: https://aitracker.run/dashboard

Need help? Check our FAQ: https://aitracker.run/faq

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

  async sendFeedbackNotification(type: string, title: string, description: string, userEmail: string): Promise<void> {
    const feedbackType = type === 'bug' ? 'Bug Report' : 'Feature Suggestion';
    const subject = `[RunAnalytics] New ${feedbackType}: ${title}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${type === 'bug' ? '#e74c3c' : '#3498db'};">New ${feedbackType}</h2>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Type:</strong> ${feedbackType}</p>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>User Email:</strong> ${userEmail}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <div style="background: white; border: 1px solid #ddd; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Description:</h3>
          <p style="white-space: pre-wrap;">${description}</p>
        </div>
      </div>
    `;
    
    const text = `
New ${feedbackType}

Type: ${feedbackType}
Title: ${title}
User Email: ${userEmail}
Date: ${new Date().toLocaleString()}

Description:
${description}
    `;
    
    await this.sendEmail({
      to: 'hello@bigappledigital.nyc',
      subject,
      html,
      text
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000'}/reset-password?token=${resetToken}`;
    const subject = 'Reset Your RunAnalytics Password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">🏃‍♂️ RunAnalytics</h1>
          <p style="color: #666; margin: 5px 0;">Password Reset Request</p>
        </div>
        
        <h2 style="color: #2c3e50;">Reset Your Password</h2>
        
        <p>We received a request to reset your RunAnalytics password. Click the button below to create a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background: #e74c3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404;"><strong>⏱️ This link expires in 1 hour</strong></p>
        </div>
        
        <p style="color: #666; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
        <p style="color: #3498db; word-break: break-all; font-size: 14px;">${resetUrl}</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #666; font-size: 14px;"><strong>Didn't request this?</strong> You can safely ignore this email. Your password will remain unchanged.</p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>For security, never share this link with anyone.</p>
          <p>Happy running!<br>The RunAnalytics Team</p>
        </div>
      </div>
    `;
    
    const text = `
Reset Your RunAnalytics Password

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

⏱️ This link expires in 1 hour.

Didn't request this? You can safely ignore this email. Your password will remain unchanged.

For security, never share this link with anyone.

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

  async sendAccountDeletionConfirmation(email: string): Promise<void> {
    const subject = 'Your RunAnalytics Account Has Been Deleted';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">🏃‍♂️ RunAnalytics</h1>
          <p style="color: #666; margin: 5px 0;">Account Deletion Confirmation</p>
        </div>
        
        <h2 style="color: #2c3e50;">Your Data Has Been Successfully Deleted</h2>
        
        <p>This email confirms that your RunAnalytics account and all associated data have been permanently deleted from our systems in compliance with GDPR regulations.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #e74c3c; margin-top: 0;">🗑️ What Was Deleted:</h3>
          <ul style="color: #2c3e50; line-height: 1.6;">
            <li>Your user profile and account information</li>
            <li>All Strava activity data and connections</li>
            <li>AI-generated insights and training plans</li>
            <li>Goals and progress tracking</li>
            <li>Feedback submissions</li>
            <li>All other personal data</li>
          </ul>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404;"><strong>⚠️ This action is permanent and cannot be undone</strong></p>
        </div>
        
        <p>If you deleted your account by mistake or change your mind, you're welcome to create a new account at any time. However, your previous data cannot be recovered.</p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Thank you for using RunAnalytics. We're sorry to see you go, but we respect your decision and your right to data privacy.</p>
          <p>If you have any questions about this deletion, please reply to this email.</p>
          <p>Wishing you the best in your running journey!<br>The RunAnalytics Team</p>
        </div>
      </div>
    `;
    
    const text = `
Your RunAnalytics Account Has Been Deleted

This email confirms that your RunAnalytics account and all associated data have been permanently deleted from our systems in compliance with GDPR regulations.

What Was Deleted:
• Your user profile and account information
• All Strava activity data and connections
• AI-generated insights and training plans
• Goals and progress tracking
• Feedback submissions
• All other personal data

⚠️ This action is permanent and cannot be undone.

If you deleted your account by mistake or change your mind, you're welcome to create a new account at any time. However, your previous data cannot be recovered.

Thank you for using RunAnalytics. We're sorry to see you go, but we respect your decision and your right to data privacy.

If you have any questions about this deletion, please reply to this email.

Wishing you the best in your running journey!
The RunAnalytics Team
    `;
    
    await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  async sendAccountDeletionNotification(email: string, userId: number): Promise<void> {
    const subject = 'User Account Deleted - RunAnalytics';
    const html = `
      <h2>User Account Deleted</h2>
      <p>A user has deleted their RunAnalytics account:</p>
      <ul>
        <li><strong>User ID:</strong> ${userId}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      <p>All associated data has been permanently deleted from the system in compliance with GDPR.</p>
    `;
    
    await this.sendEmail({
      to: 'hello@bigappledigital.nyc',
      subject,
      html,
      text: `User Account Deleted\n\nUser ID: ${userId}\nEmail: ${email}\nDate: ${new Date().toLocaleString()}\n\nAll associated data has been permanently deleted from the system in compliance with GDPR.`
    });
  }
}

export const emailService = new EmailService();