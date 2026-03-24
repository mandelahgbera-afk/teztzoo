export default function handler(req, res) {
  const BOT_TOKEN = (process.env.TG_BOT_TOKEN || '').trim();
  const CHAT_ID = (process.env.TG_CHAT_ID || '').trim();
  
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: {
      TG_BOT_TOKEN: BOT_TOKEN ? '✓ SET' : '✗ MISSING',
      TG_CHAT_ID: CHAT_ID ? '✓ SET' : '✗ MISSING'
    },
    readyForSubmission: !!(BOT_TOKEN && CHAT_ID)
  };
  
  console.log('[HEALTH] Check:', status);
  return res.status(200).json(status);
}
