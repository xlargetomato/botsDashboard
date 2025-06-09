// Simple script to verify email connection

const nodemailer = require('nodemailer');

// Log SMTP settings for debugging
console.log('SMTP Configuration:', {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  user: process.env.SMTP_USER,
});

async function testEmailConnection() {
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      debug: true,
      logger: true
    });
    
    console.log('Testing SMTP connection...');
    
    // Verify connection configuration
    const verifyResult = await transporter.verify();
    console.log('SMTP Connection verified:', verifyResult);
    
    console.log('Sending test email...');
    
    // Send a test email
    const info = await transporter.sendMail({
      from: `"Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to self for testing
      subject: 'Test Email Connection',
      text: 'If you receive this email, your SMTP connection is working correctly.',
      html: '<p>If you receive this email, your SMTP connection is working correctly.</p>',
    });
    
    console.log('Test email sent:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    
    return true;
  } catch (error) {
    console.error('Email test failed:', error);
    
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Check your username and password.');
    } else if (error.code === 'ESOCKET') {
      console.error('Socket connection failed. Check your host and port settings.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Connection timed out. Server might be down or blocking connections.');
    }
    
    return false;
  }
}

// Run the test
testEmailConnection()
  .then(success => {
    console.log('Email test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 