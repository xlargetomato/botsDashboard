// Test script for bufferUtil polyfill
const { applyBufferUtilPolyfill, createSimpleLogger } = require('../src/lib/whatsapp/buffer-polyfill');
const { default: makeWASocket } = require('@adiwajshing/baileys');
const fs = require('fs').promises;
const path = require('path');

// Apply the polyfill
applyBufferUtilPolyfill();

// Create a simple logger
const logger = createSimpleLogger();

async function main() {
  try {
    // Create auth directory
    const AUTH_DIR = path.join(process.cwd(), 'tmp', 'test-auth');
    await fs.mkdir(AUTH_DIR, { recursive: true });
    console.log(`Auth directory created at ${AUTH_DIR}`);
    
    // Create WhatsApp socket
    console.log('Creating WhatsApp socket...');
    const sock = makeWASocket({
      printQRInTerminal: true, // Print QR in terminal
      browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
      logger // Use our simple logger
    });
    
    // Handle connection updates
    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      console.log('Connection update:', { connection, qr: !!qr });
      
      if (qr) {
        console.log('QR code generated!');
        // Save QR code to file for testing
        fs.writeFile('qr-code.txt', qr);
      }
      
      if (connection === 'open') {
        console.log('Connected successfully!');
      }
    });
    
    console.log('Waiting for connection...');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the main function
main(); 