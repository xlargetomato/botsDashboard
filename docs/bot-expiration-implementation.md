# Bot Expiration System Implementation

## Files Created/Modified

1. **src/scripts/expireBots.js**
   - Implemented a cron job that runs every hour
   - Automatically marks bots with `expires_at < NOW()` as "expired"
   - Runs an initial check on server startup

2. **src/lib/utils/botUtils.js**
   - Created utility functions to validate bot status
   - Implemented real-time expiration checks
   - Added function to calculate remaining days until expiration

3. **src/lib/middleware/botExpirationCheck.js**
   - Created middleware for API routes to check bot expiration
   - Returns appropriate error responses for expired bots

4. **src/app/api/bots/[botId]/qr/route.js**
   - Updated to use the bot validation utility
   - Prevents expired bots from generating QR codes

5. **src/app/api/bots/[botId]/status/route.js**
   - Added new API endpoint to check bot status
   - Returns expiration information and remaining days

6. **src/app/dashboard/client/bots/[botId]/connect/page.js**
   - Updated to handle expired bot errors
   - Added UI for expired bot notifications
   - Provides options to renew subscription

7. **src/server.js**
   - Created custom server file to initialize the cron job
   - Ensures the cron job starts when the server starts

8. **package.json**
   - Updated scripts to use the custom server

9. **docs/bot-expiration-system.md**
   - Added documentation for the bot expiration system

## Implementation Approach

1. **Scheduled Checks**
   - Used node-cron to run hourly checks for expired bots
   - Automatically updates bot status in the database

2. **Real-time Validation**
   - Implemented real-time checks in API routes
   - Prevents expired bots from sending/receiving messages

3. **User Experience**
   - Added clear UI feedback when bots expire
   - Provided renewal options for expired bots

4. **Performance Considerations**
   - Optimized database queries to minimize load
   - Used efficient SQL updates for batch processing

## Testing

To test the bot expiration system:

1. Create a bot and connect it to WhatsApp
2. Manually update the `expires_at` date in the database to a past date
3. Wait for the next hourly check or try to use the bot
4. Verify that the bot is marked as "expired"
5. Test the renewal flow by extending the subscription

## Next Steps

1. Add email notifications when bots are about to expire
2. Implement a grace period for expired bots
3. Add admin controls to manually extend bot expiration dates 