# Bot Expiration System

This document describes the bot expiration system implemented in the WhatsApp Bot Dashboard.

## Overview

The bot expiration system automatically marks bots as "expired" when their expiration date passes. It prevents expired bots from sending or receiving messages, and provides appropriate UI feedback to users when they attempt to use expired bots.

## Components

### 1. Cron Job

The system uses `node-cron` to run a scheduled task that checks for expired bots. The cron job:

- Runs every hour
- Updates any bot with `expires_at < NOW()` from "active" to "expired" status
- Logs the number of bots that were marked as expired

The cron job is defined in `src/scripts/expireBots.js` and is initialized when the server starts in `src/server.js`.

### 2. Bot Status Validation

A utility function `validateBotStatus` in `src/lib/utils/botUtils.js` checks if a bot:

- Exists
- Belongs to the requesting user
- Is active (not expired, suspended, etc.)
- Has not passed its expiration date

If a bot has passed its expiration date but is still marked as "active", the function will update its status to "expired" on the fly.

### 3. Middleware

A middleware function `checkBotExpiration` in `src/lib/middleware/botExpirationCheck.js` can be used in API routes to validate bot status before processing requests.

### 4. API Routes

All API routes that handle bot operations use the bot validation utility or middleware to check if a bot is expired before allowing operations.

### 5. UI Feedback

The UI displays appropriate messages when a bot is expired:

- On the bot connect page, an error message is shown with options to renew the subscription
- On the bot list page, expired bots are visually marked
- On bot detail pages, expiration information is displayed

## Implementation Details

### Bot Status Flow

1. When a bot is created, it is in "pending" status
2. When a user connects the bot to WhatsApp, it becomes "active" and an `expires_at` date is set
3. When `expires_at` passes, the bot becomes "expired"
4. Users can renew their subscription to extend the `expires_at` date

### Expiration Check Points

The system checks for expired bots at multiple points:

1. Hourly via the cron job
2. On-demand when API routes are called
3. When users interact with bot pages in the UI

## Usage

### API Status Endpoint

To check a bot's status, including expiration information:

```
GET /api/bots/{botId}/status
```

Response:
```json
{
  "id": "bot-123",
  "name": "My Bot",
  "status": "active",
  "expires_at": "2023-12-31T23:59:59.999Z",
  "remaining_days": 30
}
```

### Handling Expired Bots in Frontend

When a bot is expired, API calls will return a 403 status with an error message:

```json
{
  "error": "Bot has expired"
}
```

Frontend code should handle this error and provide appropriate UI feedback to users. 