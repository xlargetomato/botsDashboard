const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs').promises;
const path = require('path');

// Path for auth files
const AUTH_DIR = path.join(process.cwd(), 'tmp', 'test-auth');

async function main() {
  try {
    // Create auth directory
    await fs.mkdir(AUTH_DIR, { recursive: true });
    console.log(`Auth directory created at ${AUTH_DIR}`);
    
    // Initialize auth state
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    
    // Create WhatsApp socket
    console.log('Creating WhatsApp socket...');
    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: true, // Print QR in terminal
      browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
      version: [2, 2323, 4],
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000
    });
    
    // Handle connection updates
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      console.log('Connection update:', { connection, qr: qr ? 'QR received' : 'No QR' });
      
      if (qr) {
        console.log('QR code generated!', qr.length);
        // In a real app, you would save this QR code
      }
      
      if (connection === 'open') {
        console.log('Connected successfully!');
      }
      
      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom) && 
          lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;
        
        console.log(`Connection closed, should reconnect: ${shouldReconnect}`);
        
        if (shouldReconnect) {
          console.log('Reconnecting...');
          main();
        }
      }
    });
    
    // Save credentials on update
    sock.ev.on('creds.update', saveCreds);
    
    // Keep the process running
    console.log('Waiting for connection...');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the main function
main(); 