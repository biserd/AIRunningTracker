// Custom Resend email service
// Uses RESEND_API_KEY secret and RESEND_FROM_EMAIL environment variable
import { Resend } from 'resend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.RESEND_FROM_EMAIL || 'RunAnalytics <noreply@aitracker.run>';
    
    if (apiKey) {
      this.resend = new Resend(apiKey);
      console.log('📧 Resend email service initialized');
    } else {
      console.log('📧 RESEND_API_KEY not configured - emails will be logged only');
    }
  }

  isConfigured(): boolean {
    return this.resend !== null;
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      if (!this.resend) {
        console.log('📧 Resend not configured - would send:', options.subject, 'to:', options.to);
        return false;
      }

      await this.resend.emails.send({
        from: this.fromEmail,
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

  async sendAccountDeletionWithFeedback(
    email: string, 
    userId: number, 
    reason: string, 
    details?: string,
    subscriptionPlan?: string,
    accountAgeInDays?: number
  ): Promise<void> {
    const reasonLabels: Record<string, string> = {
      too_expensive: "Too expensive for my budget",
      not_using: "I'm not using it enough",
      missing_features: "Missing features I need",
      found_alternative: "Found a better alternative",
      technical_issues: "Technical issues or bugs",
      privacy_concerns: "Privacy concerns",
      other: "Other reason",
    };

    const subject = '⚠️ User Account Deleted with Feedback - RunAnalytics';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #e74c3c;">User Account Deleted</h2>
        <p>A user has deleted their RunAnalytics account and provided feedback:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Account Details</h3>
          <ul style="list-style: none; padding: 0;">
            <li><strong>User ID:</strong> ${userId}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Subscription Plan:</strong> ${subscriptionPlan || 'Unknown'}</li>
            <li><strong>Account Age:</strong> ${accountAgeInDays || 0} days</li>
            <li><strong>Deletion Date:</strong> ${new Date().toLocaleString()}</li>
          </ul>
        </div>
        
        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #856404;">Deletion Reason</h3>
          <p style="font-size: 16px; color: #856404; margin-bottom: 5px;">
            <strong>${reasonLabels[reason] || reason}</strong>
          </p>
          ${details ? `<p style="color: #856404; margin: 0;"><em>Additional details: "${details}"</em></p>` : ''}
        </div>
        
        <p style="color: #666; font-size: 14px;">
          This feedback has been stored in the deletion_feedback table for analysis.
        </p>
      </div>
    `;

    const text = `User Account Deleted with Feedback

Account Details:
- User ID: ${userId}
- Email: ${email}
- Subscription Plan: ${subscriptionPlan || 'Unknown'}
- Account Age: ${accountAgeInDays || 0} days
- Deletion Date: ${new Date().toLocaleString()}

Deletion Reason: ${reasonLabels[reason] || reason}
${details ? `Additional details: "${details}"` : ''}

This feedback has been stored in the deletion_feedback table for analysis.`;
    
    await this.sendEmail({
      to: 'hello@bigappledigital.nyc',
      subject,
      html,
      text
    });
  }

  // ============== NEW USER WELCOME EMAIL ==============

  async sendWelcomeEmail(email: string, firstName?: string): Promise<void> {
    const name = firstName || 'there';
    const subject = 'Welcome to RunAnalytics! Your Training Audit is Ready';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">RunAnalytics</h1>
          <p style="color: #666; margin: 5px 0;">Your AI-Powered Running Coach</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 24px;">Welcome to RunAnalytics!</h2>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Let's find what's holding back your running</p>
        </div>
        
        <p>Hey ${name}!</p>
        
        <p>Thanks for signing up. We've already started analyzing your training data to find opportunities for improvement.</p>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404;"><strong>Your Training Audit is ready.</strong> Connect your Strava to see personalized insights about your running.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://aitracker.run/audit-report" style="background: #e74c3c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Your Training Audit</a>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #27ae60; margin-top: 0;">What Premium Runners Get:</h3>
          <ul style="color: #2c3e50; line-height: 1.8;">
            <li><strong>AI Running Coach Chat</strong> - Ask questions, get personalized advice anytime</li>
            <li><strong>Race Time Predictions</strong> - See your predicted 5K, 10K, Half, and Marathon times</li>
            <li><strong>Personalized Training Plans</strong> - AI-built plans that adapt to your schedule</li>
            <li><strong>Form Stability Analysis</strong> - Identify mechanical inefficiencies</li>
            <li><strong>Injury Risk Alerts</strong> - Stay healthy with proactive warnings</li>
            <li><strong>Unlimited Data History</strong> - Analyze years of your running</li>
          </ul>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center;">Start with a 14-day free trial. Cancel anytime.</p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Questions? Just reply to this email.</p>
          <p>Happy running!<br>The RunAnalytics Team</p>
        </div>
      </div>
    `;
    
    const text = `
Welcome to RunAnalytics! Your Training Audit is Ready

Hey ${name}!

Thanks for signing up. We've already started analyzing your training data to find opportunities for improvement.

Your Training Audit is ready. Connect your Strava to see personalized insights about your running.

View your audit: https://aitracker.run/audit-report

What Premium Runners Get:
- AI Running Coach Chat: Ask questions, get personalized advice anytime
- Race Time Predictions: See your predicted 5K, 10K, Half, and Marathon times
- Personalized Training Plans: AI-built plans that adapt to your schedule
- Form Stability Analysis: Identify mechanical inefficiencies
- Injury Risk Alerts: Stay healthy with proactive warnings
- Unlimited Data History: Analyze years of your running

Start with a 14-day free trial. Cancel anytime.

Questions? Just reply to this email.

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

  // Legacy method - redirects to new welcome email
  async sendTrialWelcomeEmail(email: string, firstName?: string): Promise<void> {
    return this.sendWelcomeEmail(email, firstName);
  }

  // Legacy methods - no longer used but kept for compatibility
  async sendTrialReminderEmail(email: string, firstName?: string, daysRemaining: number = 2): Promise<void> {
    // No longer sending trial reminders since we removed the reverse trial system
    console.log(`[Email] Skipping trial reminder for ${email} - reverse trial system removed`);
  }

  async sendTrialExpiredEmail(email: string, firstName?: string): Promise<void> {
    // No longer sending trial expired emails since we removed the reverse trial system
    console.log(`[Email] Skipping trial expired email for ${email} - reverse trial system removed`);
  }

  async sendLaunchAnnouncementEmail(email: string): Promise<boolean> {
    const subject = "We're Live! Get Your Free Training Audit - RunAnalytics";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">RunAnalytics</h1>
          <p style="color: #666; margin: 5px 0;">Your AI-Powered Running Coach</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); color: white; padding: 25px; border-radius: 10px; text-align: center; margin-bottom: 25px;">
          <h2 style="margin: 0; font-size: 28px;">We're Live!</h2>
          <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.95;">The wait is over. RunAnalytics is ready for you.</p>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6;">Hey there!</p>
        
        <p style="font-size: 16px; line-height: 1.6;">You signed up for our waitlist, and we're thrilled to let you know that <strong>RunAnalytics is now live!</strong></p>
        
        <p style="font-size: 16px; line-height: 1.6;">Sign up to get a <strong>free Training Audit</strong> that analyzes your running and finds opportunities for improvement.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #27ae60; margin-top: 0;">What Premium Runners Get:</h3>
          <ul style="color: #2c3e50; line-height: 1.8; font-size: 15px;">
            <li><strong>AI Running Coach Chat</strong> - Ask questions, get personalized advice</li>
            <li><strong>Race Predictions</strong> - Know your 5K, 10K, Half and Full Marathon times</li>
            <li><strong>Training Plans</strong> - AI-generated plans tailored to your goals</li>
            <li><strong>Runner Score</strong> - See how you rank and track your progress</li>
            <li><strong>Form Stability Analysis</strong> - Find mechanical inefficiencies</li>
            <li><strong>Injury Risk Alerts</strong> - Stay healthy with proactive warnings</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 35px 0;">
          <a href="https://aitracker.run" style="background: #e74c3c; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block;">Get Your Free Audit</a>
        </div>
        
        <p style="color: #666; font-size: 14px; text-align: center;">Start with a 14-day free trial of Premium. Cancel anytime.</p>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404; font-size: 14px;"><strong>Quick Setup:</strong> Just connect your Strava account and we'll do the rest. Your insights will be ready in minutes!</p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Questions? Just reply to this email.</p>
          <p>Happy running!<br>The RunAnalytics Team</p>
        </div>
      </div>
    `;
    
    const text = `
We're Live! Get Your Free Training Audit - RunAnalytics

Hey there!

You signed up for our waitlist, and we're thrilled to let you know that RunAnalytics is now live!

Sign up to get a free Training Audit that analyzes your running and finds opportunities for improvement.

What Premium Runners Get:
- AI Running Coach Chat: Ask questions, get personalized advice
- Race Predictions: Know your 5K, 10K, Half and Full Marathon times
- Training Plans: AI-generated plans tailored to your goals
- Runner Score: See how you rank and track your progress
- Form Stability Analysis: Find mechanical inefficiencies
- Injury Risk Alerts: Stay healthy with proactive warnings

Get your free audit: https://aitracker.run

Start with a 14-day free trial of Premium. Cancel anytime.

Quick Setup: Just connect your Strava account and we'll do the rest. Your insights will be ready in minutes!

Questions? Just reply to this email.

Happy running!
The RunAnalytics Team
    `;
    
    return await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  async sendCoachRecapEmail(
    email: string,
    name: string,
    data: {
      activityName: string;
      recapBullets?: string[];
      nextStep: string;
      recapId?: number;
      activityId?: number;
    }
  ): Promise<boolean> {
    const nextStepLabels: Record<string, string> = {
      rest: "🛌 Rest Day",
      easy: "🚶 Easy Run",
      workout: "⚡ Workout Day",
      long_run: "🏃 Long Run",
      recovery: "🧘 Active Recovery",
    };

    const nextStepLabel = nextStepLabels[data.nextStep] || "Easy Run";
    const bullets = data.recapBullets || [];
    const activityLink = data.activityId 
      ? `https://aitracker.run/activity/${data.activityId}`
      : "https://aitracker.run/dashboard";

    const subject = `🏃 Coach Recap: ${data.activityName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">🏃‍♂️ RunAnalytics</h1>
          <p style="color: #666; margin: 5px 0;">AI Agent Coach</p>
        </div>
        
        <div style="background: linear-gradient(135deg, #9333ea 0%, #3b82f6 100%); color: white; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
          <h2 style="margin: 0 0 5px 0; font-size: 14px; text-transform: uppercase; opacity: 0.9;">Post-Run Recap</h2>
          <h3 style="margin: 0; font-size: 24px;">${data.activityName}</h3>
        </div>
        
        <p style="font-size: 16px; line-height: 1.6;">Hey ${name}!</p>
        
        <p style="font-size: 16px; line-height: 1.6;">Your AI Coach has analyzed your latest run. Here's what stood out:</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #2c3e50; margin-top: 0; margin-bottom: 15px;">📝 Coach Observations</h4>
          <ul style="color: #2c3e50; line-height: 1.8; padding-left: 20px; margin: 0;">
            ${bullets.map(bullet => `<li style="margin-bottom: 8px;">${bullet}</li>`).join('')}
          </ul>
        </div>
        
        <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #27ae60;">
          <h4 style="color: #27ae60; margin: 0 0 10px 0;">👟 Next Step Recommendation</h4>
          <p style="font-size: 18px; font-weight: bold; color: #2c3e50; margin: 0;">${nextStepLabel}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${activityLink}" style="background: #e74c3c; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Full Recap →</a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Keep running strong!<br>Your AI Coach at RunAnalytics</p>
          <p style="font-size: 12px; color: #999;">You're receiving this because you have AI Agent Coach enabled. <a href="https://aitracker.run/coach/settings" style="color: #999;">Manage preferences</a></p>
        </div>
      </div>
    `;
    
    const text = `
Coach Recap: ${data.activityName}

Hey ${name}!

Your AI Coach has analyzed your latest run. Here's what stood out:

${bullets.map(bullet => `• ${bullet}`).join('\n')}

Next Step Recommendation: ${nextStepLabel}

View full recap: ${activityLink}

Keep running strong!
Your AI Coach at RunAnalytics
    `;
    
    return await this.sendEmail({
      to: email,
      subject,
      html,
      text
    });
  }

  async sendDripEmail(options: {
    to: string;
    subject: string;
    previewText: string;
    ctaText: string;
    ctaUrl: string;
    userName: string;
    step: string;
    campaign: string;
  }): Promise<boolean> {
    const { to, subject, previewText, ctaText, ctaUrl, userName, step, campaign } = options;
    
    const segmentLabels: Record<string, string> = {
      segment_a: "Get started with your running analysis",
      segment_b: "Unlock your running potential",
      segment_c: "Take your training to the next level",
      segment_d: "Welcome back to your training",
    };
    
    const headline = segmentLabels[campaign] || "Your running insights await";
    
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #eee;">
          <h1 style="color: #e74c3c; font-size: 24px; margin: 0;">RunAnalytics</h1>
        </div>
        
        <div style="padding: 30px 0;">
          <h2 style="color: #2c3e50; font-size: 22px; margin-bottom: 20px;">Hey ${userName}! 👋</h2>
          
          <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            ${headline}
          </p>
          
          <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            ${previewText}
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${ctaUrl}" style="background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">${ctaText}</a>
          </div>
          
          <p style="color: #7f8c8d; font-size: 14px; text-align: center; margin-top: 30px;">
            Or copy this link: <a href="${ctaUrl}" style="color: #e74c3c;">${ctaUrl}</a>
          </p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Happy running!<br>The RunAnalytics Team</p>
          <p style="font-size: 12px; color: #999;">
            You're receiving this because you signed up for RunAnalytics. 
            <a href="https://aitracker.run/settings?unsubscribe=marketing" style="color: #999;">Unsubscribe from marketing emails</a>
          </p>
        </div>
      </div>
    `;
    
    const text = `
Hey ${userName}!

${headline}

${previewText}

${ctaText}: ${ctaUrl}

Happy running!
The RunAnalytics Team

---
You're receiving this because you signed up for RunAnalytics.
Unsubscribe: https://aitracker.run/settings?unsubscribe=marketing
    `;
    
    console.log(`[Email] Sending drip email ${step} (${campaign}) to ${to}`);
    
    return await this.sendEmail({
      to,
      subject,
      html,
      text
    });
  }

  async sendActivityReadyEmail(options: {
    to: string;
    userName: string;
    activityName: string;
    activityId: number;
  }): Promise<boolean> {
    const { to, userName, activityName, activityId } = options;
    const activityUrl = `https://aitracker.run/activities/${activityId}?source=activity_ready`;
    
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; padding: 20px 0; border-bottom: 1px solid #eee;">
          <h1 style="color: #e74c3c; font-size: 24px; margin: 0;">RunAnalytics</h1>
        </div>
        
        <div style="padding: 30px 0;">
          <h2 style="color: #2c3e50; font-size: 22px; margin-bottom: 20px;">Your run analysis is ready! 🏃</h2>
          
          <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            Hey ${userName}, we just finished analyzing <strong>${activityName}</strong>.
          </p>
          
          <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            See your splits, pacing analysis, heart rate zones, and AI-powered insights.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${activityUrl}" style="background: linear-gradient(135deg, #27ae60, #2ecc71); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">View Run Analysis</a>
          </div>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px;">
          <p>Keep running strong!<br>The RunAnalytics Team</p>
        </div>
      </div>
    `;
    
    const text = `
Your run analysis is ready!

Hey ${userName}, we just finished analyzing "${activityName}".

See your splits, pacing analysis, heart rate zones, and AI-powered insights.

View Run Analysis: ${activityUrl}

Keep running strong!
The RunAnalytics Team
    `;
    
    return await this.sendEmail({
      to,
      subject: `Your run analysis is ready: ${activityName}`,
      html,
      text
    });
  }

  async sendFoundersWelcomeEmail(to: string): Promise<boolean> {
    const subject = 'Welcome to AITracker.run and thank you for being early';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.7;">
        <p>Hi everyone,</p>
        
        <p>Thank you for being part of our early journey.</p>
        
        <p>I've texted with many of you already, and I'm truly grateful for the feedback, what you like, what's confusing, and what you want next. That kind of early input is invaluable for a startup, and it's helping shape AITracker.run every week.</p>
        
        <p><strong>A quick intro and the "why" behind this project:</strong> I'm a runner too (<a href="https://www.strava.com/athletes/23786606" style="color: #fc4c02;">Strava: Biser</a>). While training for the NYC Marathon 2025, I realized I wasn't fully satisfied with the tools I was using. The training plan didn't feel right, routes weren't great, and even the suggested distances often felt off. Instead of complaining, I started building something small that solved my own problems. The idea was simple: if it genuinely helps me, it'll likely help other runners too. That's how AITracker.run was born.</p>
        
        <p><strong>A few features I'm especially proud of so far:</strong></p>
        <ul style="margin: 15px 0; padding-left: 25px;">
          <li>Coach Insights that explain what's happening in your training (and what to do next)</li>
          <li>A new rating system that makes progress easy to see</li>
          <li>Similar-run visualization so you can compare efforts over time</li>
          <li>Training plans that support a primary and secondary race and account for both in the plan</li>
        </ul>
        
        <p><strong>The main reason I'm emailing (beyond saying hello) is to invite you to our Early Founders Club.</strong></p>
        
        <p>As part of this group:</p>
        <ul style="margin: 15px 0; padding-left: 25px;">
          <li>You'll get early access to new tools and beta features before general release</li>
          <li>You can request features and get priority support</li>
          <li>I'll mark your account as an early adopter so you're always first in line as we ship</li>
        </ul>
        
        <p><strong>A few things coming soon:</strong></p>
        <ul style="margin: 15px 0; padding-left: 25px;">
          <li>Direct Garmin integration</li>
          <li>Smarter route suggestions</li>
          <li>iOS/Android apps (starting with the essentials)</li>
        </ul>
        
        <p><strong>Quick tip:</strong> to see the "WOW" fastest, connect Strava, sync, then open your most recent run and check the Story tab. That's the quickest way to see the verdict and what to do next.</p>
        
        <p style="margin: 25px 0;">
          <a href="https://aitracker.run/auth" style="background: #fc4c02; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Open AITracker.run →</a>
        </p>
        
        <p>Also, I'd love to learn a bit about you. If you hit reply, tell me what you're training for right now (race + date), and what your biggest running challenge is. I read every reply, and I use that feedback to prioritize what we build next.</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #fc4c02;">
          <p style="margin: 0 0 10px 0; font-weight: bold;">🎁 Exclusive Offer for Early Founders</p>
          <p style="margin: 0 0 15px 0;">To welcome you in, I'm offering <strong>25% off the Yearly Premium plan forever</strong>. Your discounted price will remain active as long as your subscription stays active.</p>
          <p style="margin: 0 0 15px 0;">
            <a href="https://aitracker.run/pricing" style="color: #fc4c02; font-weight: bold;">Claim it here: https://aitracker.run/pricing</a>
          </p>
          <p style="margin: 0; font-size: 14px; color: #666;">Use code <strong>AITRACKERFOUNDERS</strong> at Stripe checkout.</p>
        </div>
        
        <p>Thank you again for being here early. I'm excited to build this alongside you.</p>
        
        <p style="margin-top: 30px;">
          Kind regards,<br>
          <strong>Biser</strong>
        </p>
        
        <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 30px; font-size: 12px; color: #999;">
          <p>You're receiving this because you signed up for AITracker.run</p>
        </div>
      </div>
    `;

    const text = `Hi everyone,

Thank you for being part of our early journey.

I've texted with many of you already, and I'm truly grateful for the feedback, what you like, what's confusing, and what you want next. That kind of early input is invaluable for a startup, and it's helping shape AITracker.run every week.

A quick intro and the "why" behind this project: I'm a runner too (Strava: https://www.strava.com/athletes/23786606). While training for the NYC Marathon 2025, I realized I wasn't fully satisfied with the tools I was using. The training plan didn't feel right, routes weren't great, and even the suggested distances often felt off. Instead of complaining, I started building something small that solved my own problems. The idea was simple: if it genuinely helps me, it'll likely help other runners too. That's how AITracker.run was born.

A few features I'm especially proud of so far:
- Coach Insights that explain what's happening in your training (and what to do next)
- A new rating system that makes progress easy to see
- Similar-run visualization so you can compare efforts over time
- Training plans that support a primary and secondary race and account for both in the plan

The main reason I'm emailing (beyond saying hello) is to invite you to our Early Founders Club.

As part of this group:
- You'll get early access to new tools and beta features before general release
- You can request features and get priority support
- I'll mark your account as an early adopter so you're always first in line as we ship

A few things coming soon:
- Direct Garmin integration
- Smarter route suggestions
- iOS/Android apps (starting with the essentials)

Quick tip: to see the "WOW" fastest, connect Strava, sync, then open your most recent run and check the Story tab. That's the quickest way to see the verdict and what to do next.

Open AITracker.run here: https://aitracker.run/auth

Also, I'd love to learn a bit about you. If you hit reply, tell me what you're training for right now (race + date), and what your biggest running challenge is. I read every reply, and I use that feedback to prioritize what we build next.

To welcome you in, I'm offering 25% off the Yearly Premium plan forever. Your discounted price will remain active as long as your subscription stays active.

You can claim it here: https://aitracker.run/pricing
Use code AITRACKERFOUNDERS at Stripe checkout.

Thank you again for being here early. I'm excited to build this alongside you.

Kind regards,
Biser`;

    return await this.sendEmail({
      to,
      subject,
      html,
      text
    });
  }

  async sendPostRunAnalysis(options: {
    to: string;
    firstName: string;
    activityName: string;
    distance: string;
    duration: string;
    pace: string;
    heartRate: string | null;
    elevation: string | null;
    insights: { title: string; message: string }[];
    dashboardUrl: string;
  }): Promise<boolean> {
    const { to, firstName, activityName, distance, duration, pace, heartRate, elevation, insights, dashboardUrl } = options;
    
    const insightsHtml = insights.map(insight => `
      <div style="background: #f8f9fa; padding: 12px 16px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #e74c3c;">
        <strong style="color: #2c3e50;">${insight.title}</strong>
        <p style="margin: 5px 0 0; color: #666; font-size: 14px;">${insight.message}</p>
      </div>
    `).join("");

    const statsRow = [
      { label: "Distance", value: distance },
      { label: "Duration", value: duration },
      { label: "Pace", value: pace },
      ...(heartRate ? [{ label: "Avg HR", value: heartRate }] : []),
      ...(elevation ? [{ label: "Elevation", value: elevation }] : [])
    ];

    const statsHtml = statsRow.map(stat => `
      <div style="text-align: center; padding: 10px;">
        <div style="font-size: 20px; font-weight: bold; color: #e74c3c;">${stat.value}</div>
        <div style="font-size: 12px; color: #666; text-transform: uppercase;">${stat.label}</div>
      </div>
    `).join("");

    const subject = `Great run! ${activityName} - Your Analysis Ready`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #e74c3c; margin: 0;">RunAnalytics</h1>
          <p style="color: #666; margin: 5px 0;">Your Post-Run Analysis</p>
        </div>
        
        <h2 style="color: #2c3e50; margin-bottom: 5px;">Nice work, ${firstName}!</h2>
        <p style="color: #666; margin-top: 0;">Here's your quick analysis for <strong>${activityName}</strong></p>
        
        <div style="background: linear-gradient(135deg, #fef3f0 0%, #fff 100%); border-radius: 12px; padding: 20px; margin: 20px 0; display: flex; justify-content: space-around; flex-wrap: wrap;">
          ${statsHtml}
        </div>
        
        <h3 style="color: #2c3e50; margin-bottom: 15px;">Quick Insights</h3>
        ${insightsHtml}
        
        <div style="background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 30px 0;">
          <p style="color: rgba(255,255,255,0.9); margin: 0 0 15px; font-size: 16px;">See your full analysis, training trends, and AI recommendations</p>
          <a href="${dashboardUrl}" style="background: white; color: #e74c3c; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;">View Full Analysis</a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 13px; text-align: center;">
          <p style="margin: 5px 0;">Happy running!</p>
          <p style="margin: 5px 0;">The RunAnalytics Team</p>
          <p style="margin: 15px 0 0; font-size: 11px; color: #999;">
            <a href="${dashboardUrl.replace('/dashboard', '')}/settings" style="color: #999;">Manage email preferences</a>
          </p>
        </div>
      </div>
    `;

    const insightsText = insights.map(i => `${i.title}: ${i.message}`).join("\n");
    const text = `
Nice work, ${firstName}!

Here's your quick analysis for ${activityName}:

Distance: ${distance}
Duration: ${duration}
Pace: ${pace}
${heartRate ? `Avg HR: ${heartRate}` : ""}
${elevation ? `Elevation: ${elevation}` : ""}

Quick Insights:
${insightsText}

See your full analysis: ${dashboardUrl}

Happy running!
The RunAnalytics Team
    `;

    return await this.sendEmail({ to, subject, html, text });
  }
}

export const emailService = new EmailService();