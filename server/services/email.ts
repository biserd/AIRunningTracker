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

  // ============== REVERSE TRIAL EMAILS ==============

  async sendTrialWelcomeEmail(email: string, firstName?: string): Promise<void> {
    const name = firstName || 'there';
    const subject = 'Your 7-Day Pro Trial Has Started! - RunAnalytics';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">🏃‍♂️ RunAnalytics</h1>
          <p style="color: #666; margin: 5px 0;">Your AI-Powered Running Coach</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">🎉 Your 7-Day Pro Trial is Active!</h2>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">No credit card required</p>
        </div>
        
        <p>Hey ${name}!</p>
        
        <p>Welcome to RunAnalytics! For the next <strong>7 days</strong>, you have full access to all Pro features - absolutely free, no credit card needed.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #27ae60; margin-top: 0;">✨ What's Unlocked in Your Trial:</h3>
          <ul style="color: #2c3e50; line-height: 1.8;">
            <li><strong>Unlimited AI Insights</strong> - Get personalized coaching recommendations</li>
            <li><strong>Race Predictions</strong> - See your predicted times for 5K, 10K, Half & Full Marathon</li>
            <li><strong>Training Plans</strong> - AI-generated plans tailored to your goals</li>
            <li><strong>Injury Risk Analysis</strong> - Stay healthy with proactive alerts</li>
            <li><strong>Fitness/Fatigue Charts</strong> - Track your training load over time</li>
            <li><strong>Unlimited Data History</strong> - Analyze all your Strava activities</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://aitracker.run/dashboard" style="background: #e74c3c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Explore Your Pro Features →</a>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404;"><strong>💡 Pro tip:</strong> Connect your Strava account first to unlock AI-powered insights based on your real running data!</p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Your trial ends in 7 days. We'll remind you before it expires.</p>
          <p>Happy running!<br>The RunAnalytics Team</p>
        </div>
      </div>
    `;
    
    const text = `
Your 7-Day Pro Trial Has Started! - RunAnalytics

Hey ${name}!

Welcome to RunAnalytics! For the next 7 days, you have full access to all Pro features - absolutely free, no credit card needed.

What's Unlocked in Your Trial:
• Unlimited AI Insights - Get personalized coaching recommendations
• Race Predictions - See your predicted times for 5K, 10K, Half & Full Marathon
• Training Plans - AI-generated plans tailored to your goals
• Injury Risk Analysis - Stay healthy with proactive alerts
• Fitness/Fatigue Charts - Track your training load over time
• Unlimited Data History - Analyze all your Strava activities

Start exploring: https://aitracker.run/dashboard

Pro tip: Connect your Strava account first to unlock AI-powered insights based on your real running data!

Your trial ends in 7 days. We'll remind you before it expires.

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

  async sendTrialReminderEmail(email: string, firstName?: string, daysRemaining: number = 2): Promise<void> {
    const name = firstName || 'there';
    const subject = `Only ${daysRemaining} Days Left on Your Pro Trial! - RunAnalytics`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">🏃‍♂️ RunAnalytics</h1>
          <p style="color: #666; margin: 5px 0;">Your AI-Powered Running Coach</p>
        </div>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px; border-left: 4px solid #ffc107;">
          <h2 style="margin: 0; color: #856404;">⏰ ${daysRemaining} Days Left on Your Pro Trial</h2>
        </div>
        
        <p>Hey ${name}!</p>
        
        <p>Just a quick heads up - your Pro trial expires in <strong>${daysRemaining} days</strong>. After that, you'll be downgraded to the Free plan.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #e74c3c; margin-top: 0;">🔒 What You'll Lose:</h3>
          <ul style="color: #2c3e50; line-height: 1.8;">
            <li>Unlimited AI insights (Free: 3/month)</li>
            <li>Race predictions and training plans</li>
            <li>Injury risk analysis</li>
            <li>Fitness/Fatigue charts</li>
            <li>Unlimited data history (Free: 30 days only)</li>
          </ul>
        </div>
        
        <p>Don't lose your progress! Upgrade now to keep all your Pro features.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://aitracker.run/pricing" style="background: #27ae60; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Upgrade to Pro - $3.99/mo →</a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Questions? Just reply to this email - we're here to help!</p>
          <p>Happy running!<br>The RunAnalytics Team</p>
        </div>
      </div>
    `;
    
    const text = `
Only ${daysRemaining} Days Left on Your Pro Trial! - RunAnalytics

Hey ${name}!

Just a quick heads up - your Pro trial expires in ${daysRemaining} days. After that, you'll be downgraded to the Free plan.

What You'll Lose:
• Unlimited AI insights (Free: 3/month)
• Race predictions and training plans
• Injury risk analysis
• Fitness/Fatigue charts
• Unlimited data history (Free: 30 days only)

Don't lose your progress! Upgrade now: https://aitracker.run/pricing

Upgrade to Pro - Just $3.99/mo

Questions? Just reply to this email - we're here to help!

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

  async sendTrialExpiredEmail(email: string, firstName?: string): Promise<void> {
    const name = firstName || 'there';
    const subject = 'Your Pro Trial Has Ended - Upgrade to Keep Your Features! - RunAnalytics';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">🏃‍♂️ RunAnalytics</h1>
          <p style="color: #666; margin: 5px 0;">Your AI-Powered Running Coach</p>
        </div>
        
        <div style="background: #f8d7da; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px; border-left: 4px solid #dc3545;">
          <h2 style="margin: 0; color: #721c24;">Your Pro Trial Has Ended</h2>
          <p style="margin: 10px 0 0 0; color: #721c24;">You're now on the Free plan</p>
        </div>
        
        <p>Hey ${name}!</p>
        
        <p>Your 7-day Pro trial has come to an end. Your account has been downgraded to the Free plan.</p>
        
        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #27ae60; margin-top: 0;">🎯 What You Still Get (Free):</h3>
          <ul style="color: #2c3e50; line-height: 1.6;">
            <li>Runner Score calculation</li>
            <li>Basic analytics dashboard</li>
            <li>3 AI insights per month</li>
            <li>30 days of data history</li>
          </ul>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #e74c3c; margin-top: 0;">🚀 Ready to Go Pro?</h3>
          <p style="margin: 10px 0;">For just <strong>$3.99/month</strong>, you can unlock:</p>
          <ul style="color: #2c3e50; line-height: 1.6;">
            <li>Unlimited AI insights and coaching</li>
            <li>Personalized training plans</li>
            <li>Race time predictions</li>
            <li>Injury risk analysis</li>
            <li>Unlimited data history</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://aitracker.run/pricing" style="background: #e74c3c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Upgrade to Pro Now →</a>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center;">Or go Premium at $7.99/mo for AI Coach Chat and Form Analysis!</p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>We hope you enjoyed your trial! If you have any feedback, just reply to this email.</p>
          <p>Keep running strong!<br>The RunAnalytics Team</p>
        </div>
      </div>
    `;
    
    const text = `
Your Pro Trial Has Ended - Upgrade to Keep Your Features!

Hey ${name}!

Your 7-day Pro trial has come to an end. Your account has been downgraded to the Free plan.

What You Still Get (Free):
• Runner Score calculation
• Basic analytics dashboard
• 3 AI insights per month
• 30 days of data history

Ready to Go Pro? For just $3.99/month, you can unlock:
• Unlimited AI insights and coaching
• Personalized training plans
• Race time predictions
• Injury risk analysis
• Unlimited data history

Upgrade now: https://aitracker.run/pricing

Or go Premium at $7.99/mo for AI Coach Chat and Form Analysis!

We hope you enjoyed your trial! If you have any feedback, just reply to this email.

Keep running strong!
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