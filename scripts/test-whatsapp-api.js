// Test script for WhatsApp API
const { initWhatsAppConnection, getConnectionStatus, getBotQrCode } = require('../src/lib/whatsapp/connection.js');
const qrcode = require('qrcode-terminal');

// Test bot ID
const TEST_BOT_ID = 'test-bot-1';

async function main() {
  console.log('Starting WhatsApp API test...');
  
  // Initialize a connection
  console.log(`Initializing connection for bot ${TEST_BOT_ID}...`);
  const initialized = await initWhatsAppConnection(TEST_BOT_ID);
  
  if (!initialized) {
    console.error('Failed to initialize connection');
    return;
  }
  
  console.log('Connection initialized. Waiting for QR code...');
  
  // Poll for QR code
  const qrInterval = setInterval(async () => {
    const status = getConnectionStatus(TEST_BOT_ID);
    
    if (status.qr) {
      console.log('QR code received:');
      
      // If QR is a data URL, extract the QR data
      if (status.qr.startsWith('data:image/png;base64,')) {
        console.log('QR code is a data URL. Scan it with your phone.');
      } else {
        // Generate QR code in terminal
        qrcode.generate(status.qr, { small: true });
      }
      
      console.log('Scan this QR code with your WhatsApp app');
      console.log('Waiting for connection...');
    }
    
    if (status.connected) {
      console.log('WhatsApp connected successfully!');
      clearInterval(qrInterval);
      
      // Keep the process running to maintain the connection
      console.log('Bot is now active. Press Ctrl+C to exit.');
    }
  }, 1000);
}

// Run the test
main().catch(err => {
  console.error('Error in test script:', err);
}); 