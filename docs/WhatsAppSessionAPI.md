# WhatsApp Session API for Microservices

This document explains how to use the WhatsApp Session API to retrieve bot sessions for use in external microservices.

## Overview

The WhatsApp Session API provides a secure way for authorized microservices to retrieve the serialized WhatsApp session for a specific bot. This allows you to build distributed architectures where the WhatsApp connections can run on separate services.

## Authentication

The API supports two authentication methods:

1. **API Key Authentication**: For microservice-to-service communication using a pre-shared API key
2. **JWT Authentication**: For session token verification using a JWT token

## Endpoints

### Get Session

Retrieves the session data for a specific bot.

```
GET /api/bots/:botId/session
```

**Headers:**
- `x-api-key`: Your API key for authentication (required if not using JWT)
- `Authorization`: Bearer token for JWT authentication (format: `Bearer <token>`)

**Response:**
```json
{
  "botId": "bot-id-here",
  "session": {
    // Serialized session object with all WhatsApp credentials
  },
  "token": "jwt-token-here",
  "expires_at": "2023-07-09T14:47:29.000Z"
}
```

### Generate Token

Generates a new session token with custom expiration.

```
POST /api/bots/:botId/session
```

**Headers:**
- `x-api-key`: Your API key for authentication
- `Content-Type`: application/json

**Body:**
```json
{
  "expiresIn": "24h"  // Token expiration time (e.g. "1h", "2d", "7d")
}
```

**Response:**
```json
{
  "token": "jwt-token-here",
  "expires_at": "2023-07-09T14:47:29.000Z"
}
```

## Usage in Microservices

### Step 1: Install Required Packages

```bash
npm install jsonwebtoken node-fetch
```

### Step 2: Fetch the Session

```javascript
import fetch from 'node-fetch';

async function fetchBotSession(botId, apiKey, baseUrl) {
  const response = await fetch(`${baseUrl}/api/bots/${botId}/session`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch session: ${response.status}`);
  }
  
  return await response.json();
}
```

### Step 3: Use the Session to Initialize WhatsApp

```javascript
import { Baileys } from '@whiskeysockets/baileys';

async function initializeWhatsApp(botId, apiKey, baseUrl) {
  // Get session data
  const sessionData = await fetchBotSession(botId, apiKey, baseUrl);
  
  // Initialize WhatsApp with the session
  const sock = Baileys.makeWASocket({
    auth: sessionData.session,
    // other options...
  });
  
  // Set up event handlers, etc.
  return sock;
}
```

## Token Management

The system automatically handles token generation and renewal. The session token is typically valid for 1 hour by default, but you can request longer-lived tokens if needed.

### Checking Token Expiration

```javascript
import jwt from 'jsonwebtoken';

function isTokenExpired(token, bufferSeconds = 300) {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp <= now + bufferSeconds;
  } catch (error) {
    return true;
  }
}
```

### Requesting a New Token

```javascript
async function generateSessionToken(botId, apiKey, baseUrl, expiresIn = '1h') {
  const response = await fetch(`${baseUrl}/api/bots/${botId}/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    },
    body: JSON.stringify({ expiresIn })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to generate token: ${response.status}`);
  }
  
  return await response.json();
}
```

## Security Considerations

1. Store API keys and JWT secrets securely in environment variables.
2. Use HTTPS for all API communications.
3. Implement proper error handling and token refresh mechanisms.
4. Consider using IP restrictions or additional security layers in production.

## Complete Example

See `scripts/microservice-example.js` for a complete example of how to use the WhatsApp Session API in a microservice. 