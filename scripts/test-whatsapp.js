// Simple WhatsApp test script
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Create auth directory if it doesn't exist
const AUTH_FOLDER = path.join(__dirname, 'auth');
if (!fs.existsSync(AUTH_FOLDER)) {
  fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

async function connectToWhatsApp() {
  // Load auth state
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  
  // Create WhatsApp socket
  const sock = makeWASocket({
    printQRInTerminal: true, // Show QR in terminal
    auth: state,
    browser: ['WhatsApp Test Bot', 'Chrome', '1.0.0']
  });
  
  // Handle connection events
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    // If we got a QR code, log it
    if (qr) {
      console.log('QR Code received, scan it with your phone:');
      qrcode.generate(qr, { small: true });
    }
    
    // Handle connection state
    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
        : true;
        
      console.log('Connection closed due to ', lastDisconnect?.error?.message || 'unknown reason');
      
      // Reconnect if not logged out
      if (shouldReconnect) {
        console.log('Reconnecting...');
        connectToWhatsApp();
      } else {
        console.log('Logged out, not reconnecting.');
      }
    } else if (connection === 'open') {
      console.log('Connection established!');
      console.log('WhatsApp is now connected and ready to use!');
    }
  });
  
  // Save credentials whenever they are updated
  sock.ev.on('creds.update', saveCreds);
  
  // Handle messages
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type === 'notify') {
      for (const msg of m.messages) {
        if (!msg.key.fromMe && msg.message) {
          const sender = msg.key.remoteJid;
          const messageType = Object.keys(msg.message)[0];
          let messageText = '';
          
          // Extract message content based on type
          if (messageType === 'conversation') {
            messageText = msg.message.conversation;
          } else if (messageType === 'extendedTextMessage') {
            messageText = msg.message.extendedTextMessage.text;
          }
          
          // Log received message
          console.log(`New message from ${sender}: ${messageText}`);
          
          // Send a reply
          if (messageText) {
            await sock.sendMessage(
              sender, 
              { text: `You said: ${messageText}` }
            );
            console.log(`Reply sent to ${sender}`);
          }
        }
      }
    }
  });
  
  return sock;
}

// Start the connection
console.log('Starting WhatsApp connection...');
connectToWhatsApp()
  .then(() => console.log('WhatsApp connection initialized'))
  .catch(err => console.error('Error in WhatsApp connection:', err));

console.log('Waiting for QR code...');
console.log('Scan the QR code with your phone to connect'); 