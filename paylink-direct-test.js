/**
 * Direct Paylink API Test Script
 * 
 * This script makes direct API calls to the Paylink API to test authentication
 * and invoice creation without any abstractions or complex logic.
 * 
 * Run with: node paylink-direct-test.mjs
 */

// This file needs to be run with the .mjs extension or with "type": "module" in package.json
// due to node-fetch v3 being ESM-only

// Load environment variables from .env file
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Credentials from environment
const API_ID = process.env.PAYLINK_ID_TOKEN;
const SECRET_KEY = process.env.PAYLINK_SECRET;
const BASE_URL = process.env.PAYLINK_BASE_URL;
const CALLBACK_URL = process.env.PAYLINK_CALLBACK_URL;

console.log('=== Paylink API Direct Test ===');
console.log('Using credentials:');
console.log('API ID:', API_ID);
console.log('Secret Key:', SECRET_KEY ? '******' : 'NOT FOUND');
console.log('Base URL:', BASE_URL);
console.log('Callback URL:', CALLBACK_URL);
console.log('=============================');

async function testAuth() {
  console.log('\n=== Testing Authentication ===');
  
  try {
    // Try authentication
    const authUrl = `${BASE_URL}/api/auth`;
    console.log('Requesting auth token from:', authUrl);
    
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        apiId: API_ID,
        secretKey: SECRET_KEY
      })
    });
    
    console.log('Auth Status:', authResponse.status);
    console.log('Auth Headers:', Object.fromEntries([...authResponse.headers.entries()]));
    
    const authText = await authResponse.text();
    console.log('Auth Response:', authText);
    
    if (!authResponse.ok) {
      console.error('Authentication failed!');
      return null;
    }
    
    try {
      const authData = JSON.parse(authText);
      console.log('Token received:', authData.id_token ? 'YES' : 'NO');
      return authData.id_token || authData.token;
    } catch (e) {
      console.error('Failed to parse auth response as JSON:', e.message);
      return null;
    }
  } catch (error) {
    console.error('Auth request error:', error.message);
    return null;
  }
}

async function testInvoiceCreation(token) {
  console.log('\n=== Testing Invoice Creation ===');
  
  if (!token) {
    console.log('Skipping invoice test as authentication failed');
    return;
  }
  
  try {
    const invoiceUrl = `${BASE_URL}/api/addInvoice`;
    console.log('Creating invoice at:', invoiceUrl);
    
    // Create a test invoice payload
    const invoiceData = {
      orderNumber: `TEST-${Date.now()}`,
      amount: 10, // Minimum allowed amount is 5
      callBackUrl: CALLBACK_URL,
      clientName: 'Test User',
      clientEmail: 'test@example.com',
      clientMobile: '0512345678',
      currency: 'SAR',
      products: [
        {
          title: 'Test Product',
          price: 10,
          qty: 1,
          description: 'Test product description'
        }
      ]
    };
    
    console.log('Invoice payload:', JSON.stringify(invoiceData, null, 2));
    
    const invoiceResponse = await fetch(invoiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(invoiceData)
    });
    
    console.log('Invoice Status:', invoiceResponse.status);
    console.log('Invoice Headers:', Object.fromEntries([...invoiceResponse.headers.entries()]));
    
    const invoiceText = await invoiceResponse.text();
    console.log('Invoice Response:', invoiceText);
    
    if (!invoiceResponse.ok) {
      console.error('Invoice creation failed!');
      return;
    }
    
    try {
      const invoiceResult = JSON.parse(invoiceText);
      console.log('Invoice created successfully:', invoiceResult);
    } catch (e) {
      console.error('Failed to parse invoice response as JSON:', e.message);
    }
  } catch (error) {
    console.error('Invoice request error:', error.message);
  }
}

// Run the test
async function runTest() {
  const token = await testAuth();
  await testInvoiceCreation(token);
  console.log('\n=== Test Completed ===');
}

runTest().catch(err => {
  console.error('Test failed with error:', err);
});
