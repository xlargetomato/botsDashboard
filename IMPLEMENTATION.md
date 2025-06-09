# WhatsApp Session API Implementation

## Overview

We've implemented a secure API for external microservices to retrieve WhatsApp session data from the main application. This enables distributed architectures where WhatsApp connections can run on separate services while maintaining security and state.

## Components Implemented

1. **Session Endpoint**: `/api/bots/[botId]/session`
   - GET: Retrieves the session data for a specific bot
   - POST: Generates a new session token with custom expiration

2. **WhatsApp Connection Updates**: 
   - Modified the WhatsApp connection module to save session data to the database
   - Added functionality to encrypt and secure session data

3. **Utility Functions**:
   - Created a utility module for session token management
   - Implemented token verification, expiration checking, and renewal

4. **Example Implementation**:
   - Created a microservice example script to demonstrate usage
   - Documented the API usage in detail

5. **Documentation**:
   - Added comprehensive documentation on how to use the API

## Security Features

The implementation includes several security features:

1. **JWT-based Authentication**: Sessions are secured with short-lived JWT tokens
2. **API Key Authentication**: Alternative authentication for microservices
3. **Data Encryption**: Session data is encrypted before being encoded in tokens
4. **Expiration Handling**: Automatic token expiration and renewal mechanisms
5. **Authorization Checks**: Verification that the bot belongs to the authenticated user

## Technical Implementation Details

### Session Storage

Sessions are stored in two places:
- **File System**: For direct use by the WhatsApp connection
- **Database**: For retrieval by microservices

### Token Generation

When a session is requested:
1. The system verifies authentication
2. Retrieves the session from the database
3. Encrypts the session data
4. Generates a JWT token with the encrypted data
5. Returns both the session data and the token

### Microservice Integration

A microservice can:
1. Request the session data using an API key
2. Use the returned session to initialize its own WhatsApp connection
3. Monitor token expiration and request renewals as needed

## Next Steps

To fully deploy this feature:

1. **Environment Variables**: Set proper JWT secrets and API keys in production
2. **HTTPS Configuration**: Ensure all API traffic uses HTTPS
3. **IP Restrictions**: Consider adding IP-based restrictions for additional security
4. **Monitoring**: Implement monitoring for session token usage and expiration
5. **Rate Limiting**: Add rate limiting to prevent abuse

## Usage Example

See `scripts/microservice-example.js` for a complete example of how to use the WhatsApp Session API in a microservice.

## Call Blocking Feature

This feature adds the ability to automatically block unwanted calls in the WhatsApp bot.

### Features

1. **Auto-Reply for Calls**: When a user tries to call the bot and they are in a blocked state, the bot automatically rejects the call and sends a custom auto-reply message. This message is configurable by the admin.

2. **Call Rate Limiting**: If a user calls more than a certain number of times in a day (configurable), the bot automatically blocks them from making more calls. Blocking can be:
   - Temporary (24 hours)
   - Permanent

### Implementation Details

#### Database Structure

The feature uses three main tables:

1. **whatsapp_calls**: Stores call history information
   - Tracks caller ID, call timestamps, and call status

2. **whatsapp_blocked_contacts**: Tracks blocked contacts
   - Stores contact information, reason for blocking, and expiration time for temporary blocks

3. **call_blocking_settings**: Stores configuration settings
   - Allows admins to enable/disable the feature
   - Configure daily call limits
   - Set blocking type (temporary or permanent)
   - Customize auto-reply messages

#### API Endpoints

The following API endpoints were implemented:

1. `/api/bots/[botId]/call-blocking` - GET, PUT
   - Retrieve and update call blocking settings

2. `/api/bots/[botId]/blocked-contacts` - GET, POST
   - List blocked contacts
   - Block a new contact

3. `/api/bots/[botId]/blocked-contacts/[contactId]` - DELETE
   - Unblock a contact

4. `/api/bots/[botId]/calls` - GET
   - Retrieve call history and statistics

5. `/api/system/cron/cleanup-blocks` - GET
   - Scheduled job to clean up expired blocks

#### WhatsApp Connection Module

The WhatsApp connection module was extended to:

1. Listen for call events from WhatsApp
2. Automatically reject unwanted calls
3. Track call history
4. Apply blocking rules
5. Send auto-reply messages to blocked callers

#### User Interface

A new tab was added to the bot settings page that allows administrators to:

1. Configure call blocking settings
2. View and manage blocked contacts
3. View call history
4. Block contacts directly from the call history

### Security Considerations

1. **API Authentication**: All API endpoints require proper authentication
2. **Database Integrity**: Foreign key constraints ensure data integrity
3. **Rate Limiting**: Prevents abuse of the API

### Usage

1. Enable call blocking in the bot settings
2. Configure the daily call limit
3. Choose between temporary and permanent blocking
4. Customize the auto-reply message

When a call is received, the system will automatically:
1. Log the call in the database
2. Check if the caller is already blocked
3. If blocked, reject the call and send the auto-reply message
4. If not blocked, check if they've exceeded the daily limit
5. If limit exceeded, block them according to settings

### Scheduled Tasks

A cleanup task periodically removes expired blocks to ensure temporary blocks don't remain active indefinitely. 