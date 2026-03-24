/**
 * ============================================================
 * LUMENIC DATA — Configuration
 * ============================================================
 * 
 * SET YOUR TELEGRAM BOT CREDENTIALS:
 * 
 * 1. Open Telegram and search for @BotFather
 * 2. Send /newbot and follow the instructions
 * 3. Copy your BOT_TOKEN
 * 4. To get CHAT_ID, send a test message to your bot,
 *    then visit: https://api.telegram.org/botBOT_TOKEN/getUpdates
 *    Look for "chat":{"id":123456789} in the response
 * 
 * ============================================================
 */

/**
 * CREDENTIALS NOW HANDLED SERVER-SIDE
 * 
 * Client no longer stores credentials for security.
 * All submissions go through /api/submit-application endpoint
 * which uses environment variables (TG_BOT_TOKEN, TG_CHAT_ID)
 */

// Optional: Webhook endpoint for advanced submissions
window.WEBHOOK_URL = '';
