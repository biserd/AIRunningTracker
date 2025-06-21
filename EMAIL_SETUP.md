# Email Notification Setup

The app will automatically send emails to hello@bigappledigital.nyc when users register or join the waitlist.

## Option 1: Gmail (Recommended - Free)

1. Use your existing Gmail account or create a new one
2. Enable 2-factor authentication on your Google account
3. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
4. Add these environment variables to Replit:
   ```
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASSWORD=your-app-password
   ```

## Option 2: Outlook/Hotmail (Free)

Add these environment variables:
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

## Option 3: Yahoo Mail (Free)

Add these environment variables:
```
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
```

## Option 4: Other SMTP Services

Many hosting providers offer free SMTP. Use:
```
SMTP_HOST=your-smtp-server
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASSWORD=your-password
```

## Testing

The app will log email attempts to the console. If no email service is configured, it will show what emails would be sent.

Current status: Email service ready, just needs credentials configured.