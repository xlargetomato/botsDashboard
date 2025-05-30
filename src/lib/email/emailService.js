import nodemailer from 'nodemailer';

// Create a transporter object using SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

// Function to send verification email
export async function sendVerificationEmail(to, token, name) {
  const transporter = createTransporter();
  
  // Base URL from environment variable or default
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  const mailOptions = {
    from: `"Variable" <${process.env.SMTP_USER}>`,
    to,
    subject: `Verify Your ${process.env.NEXT_PUBLIC_PROJECT_NAME} Account`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4a6cf7;">${process.env.NEXT_PUBLIC_PROJECT_NAME}</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <h2 style="color: #333;">Hello ${name},</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            Thank you for registering with ${process.env.NEXT_PUBLIC_PROJECT_NAME}. To complete your registration and activate your account, please use the verification code below:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; font-size: 32px; letter-spacing: 5px; font-weight: bold; color: #4a6cf7; display: inline-block;">${token}</div>
          </div>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            Enter this code in the verification page to activate your account.
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            If you didn't create an account with ${process.env.NEXT_PUBLIC_PROJECT_NAME}, you can safely ignore this email.
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            This verification code will expire in 24 hours.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #777; font-size: 14px;">
          <p>&copy; ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_PROJECT_NAME}. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
}

// Function to send password reset email
export async function sendPasswordResetEmail(to, token, name) {
  const transporter = createTransporter();
  
  // Base URL from environment variable or default
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const resetLink = `${baseUrl}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: `"Variable" <${process.env.SMTP_USER}>`,
    to,
    subject: `Reset Your ${process.env.NEXT_PUBLIC_PROJECT_NAME} Password`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4a6cf7;">${process.env.NEXT_PUBLIC_PROJECT_NAME}</h1>
        </div>
        <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <h2 style="color: #333;">Hello ${name},</h2>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            We received a request to reset your password for your ${process.env.NEXT_PUBLIC_PROJECT_NAME} account. Click the button below to reset your password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #4a6cf7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
          <p style="font-size: 16px; line-height: 1.5; color: #555;">
            This password reset link will expire in 1 hour.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #777; font-size: 14px;">
          <p>&copy; ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_PROJECT_NAME}. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

// Function to send subscription-related emails
export async function sendSubscriptionEmail(options) {
  const { type, email, name, subscription } = options;
  const transporter = createTransporter();
  
  // Base URL from environment variable or default
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  
  let subject, template;
  
  switch (type) {
    case 'payment_confirmation':
      subject = `${process.env.NEXT_PUBLIC_PROJECT_NAME} Payment Confirmation`;
      template = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4a6cf7;">${process.env.NEXT_PUBLIC_PROJECT_NAME}</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
            <h2 style="color: #333;">Hello ${name},</h2>
            <p style="font-size: 16px; line-height: 1.5; color: #555;">
              Thank you for your payment. Your subscription has been successfully activated.
            </p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Payment Details</h3>
              <p style="margin: 5px 0; font-size: 15px;"><strong>Plan:</strong> ${subscription.planName}</p>
              <p style="margin: 5px 0; font-size: 15px;"><strong>Amount:</strong> SAR ${subscription.amount.toFixed(2)}</p>
              <p style="margin: 5px 0; font-size: 15px;"><strong>Transaction ID:</strong> ${subscription.transactionId}</p>
              <p style="margin: 5px 0; font-size: 15px;"><strong>Start Date:</strong> ${new Date(subscription.startDate).toLocaleDateString()}</p>
              <p style="margin: 5px 0; font-size: 15px;"><strong>Expiry Date:</strong> ${new Date(subscription.expiryDate).toLocaleDateString()}</p>
            </div>
            <p style="font-size: 16px; line-height: 1.5; color: #555;">
              You can view your subscription details in your dashboard.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/dashboard/client/subscriptions" style="background-color: #4a6cf7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">View My Subscriptions</a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #777; font-size: 14px;">
            <p>&copy; ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_PROJECT_NAME}. All rights reserved.</p>
          </div>
        </div>
      `;
      break;
      
    case 'subscription_expiring':
      subject = `${process.env.NEXT_PUBLIC_PROJECT_NAME} Subscription Expiring Soon`;
      template = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4a6cf7;">${process.env.NEXT_PUBLIC_PROJECT_NAME}</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
            <h2 style="color: #333;">Hello ${name},</h2>
            <p style="font-size: 16px; line-height: 1.5; color: #555;">
              This is a reminder that your subscription will expire soon.
            </p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Subscription Details</h3>
              <p style="margin: 5px 0; font-size: 15px;"><strong>Plan:</strong> ${subscription.planName}</p>
              <p style="margin: 5px 0; font-size: 15px;"><strong>Expiry Date:</strong> ${new Date(subscription.expiryDate).toLocaleDateString()}</p>
            </div>
            <p style="font-size: 16px; line-height: 1.5; color: #555;">
              To continue enjoying our services without interruption, please renew your subscription.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/dashboard/client/subscriptions" style="background-color: #4a6cf7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">Renew Subscription</a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #777; font-size: 14px;">
            <p>&copy; ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_PROJECT_NAME}. All rights reserved.</p>
          </div>
        </div>
      `;
      break;
      
    default:
      subject = `${process.env.NEXT_PUBLIC_PROJECT_NAME} Subscription Update`;
      template = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #4a6cf7;">${process.env.NEXT_PUBLIC_PROJECT_NAME}</h1>
          </div>
          <div style="padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
            <h2 style="color: #333;">Hello ${name},</h2>
            <p style="font-size: 16px; line-height: 1.5; color: #555;">
              There has been an update to your subscription.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/dashboard/client/subscriptions" style="background-color: #4a6cf7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; display: inline-block;">View Details</a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #777; font-size: 14px;">
            <p>&copy; ${new Date().getFullYear()} ${process.env.NEXT_PUBLIC_PROJECT_NAME}. All rights reserved.</p>
          </div>
        </div>
      `;
  }
  
  const mailOptions = {
    from: `"${process.env.NEXT_PUBLIC_PROJECT_NAME}" <${process.env.SMTP_USER}>`,
    to: email,
    subject: subject,
    html: template
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`${type} email sent:`, info.messageId);
    return true;
  } catch (error) {
    console.error(`Error sending ${type} email:`, error);
    throw error;
  }
}
