// apps/web/src/app/api/utils/sms.js
// SMS.ir Verify API Integration

/**
 * Normalizes Iranian phone number to standard format
 * @param {string} phone - Input phone number
 * @returns {string} Normalized phone number (98XXXXXXXXXX format)
 */
export function normalizeIranPhone(phone = "") {
  let p = String(phone).trim().replace(/[\s\-+]/g, "");
  
  // Convert to 98XXXXXXXXXX format (no leading +)
  if (p.startsWith("0098")) p = p.slice(2);
  if (p.startsWith("0")) p = "98" + p.slice(1);
  if (p.startsWith("+")) p = p.slice(1);
  
  return p;
}

/**
 * Sends SMS using SMS.ir Verify API (Template-based)
 * @param {string} receptor - Target phone number
 * @param {string} code - OTP code to send
 * @param {object} opts - Options (retries, etc.)
 * @returns {Promise<boolean>} True if sent successfully, false otherwise
 */
export async function sendSMS(receptor, code, opts = {}) {
  const retries = Number(opts.retries || 2);
  
  // Check if we're using SMS.ir driver
  const driver = process.env.SMS_DRIVER;
  if (driver !== 'smsir') {
    console.warn('[sendSMS] SMS_DRIVER is not set to "smsir". Current driver:', driver);
    // Fallback to echo mode if driver not set
    if (process.env.SMS_MOCK_MODE === 'true' || process.env.TEST_ECHO_OTP === 'true') {
      console.log(`[sendSMS][ECHO] to=${receptor} code=${code}`);
      return true;
    }
    throw new Error('SMS_DRIVER must be set to "smsir"');
  }

  // Mock/Test mode - don't call API
  if (process.env.SMS_MOCK_MODE === 'true' || process.env.TEST_ECHO_OTP === 'true') {
    console.log(`[sendSMS][MOCK] to=${receptor} code=${code}`);
    return true;
  }

  // Validate required environment variables
  const apiKey = process.env.SMS_API_KEY;
  const templateName = process.env.SMS_TEMPLATE_NAME;

  if (!apiKey) {
    console.error('[sendSMS] SMS_API_KEY is not defined');
    throw new Error('SMS_API_KEY is required');
  }

  if (!templateName) {
    console.error('[sendSMS] SMS_TEMPLATE_NAME is not defined');
    throw new Error('SMS_TEMPLATE_NAME is required');
  }

  // Normalize phone number
  const normalizedReceptor = normalizeIranPhone(receptor);
  
  // SMS.ir Verify API endpoint
  const url = 'https://ws.sms.ir/api/v1/send/verify';

  let lastError = null;

  // Retry loop
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const payload = {
        Mobile: normalizedReceptor,
        TemplateId: templateName,
        Parameters: [
          {
            Name: 'code',
            Value: String(code)
          }
        ]
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json().catch(() => null);

      // SMS.ir returns status code in response
      if (response.ok && result && result.status === 1) {
        console.log(`[sendSMS] SMS.ir success - sent to ${normalizedReceptor}`);
        return true;
      } else {
        const errorMsg = result?.message || `HTTP ${response.status}`;
        console.warn(`[sendSMS] SMS.ir error: ${errorMsg}`, result);
        lastError = new Error(`SMS.ir error: ${errorMsg}`);
        
        // Don't retry on certain errors
        if (response.status === 401 || response.status === 403) {
          throw lastError;
        }
      }
    } catch (err) {
      console.error(`[sendSMS] Attempt ${attempt} failed:`, err?.message || err);
      lastError = err;
      
      // Simple exponential backoff
      if (attempt <= retries) {
        const waitMs = attempt === 1 ? 500 : 1000 * attempt;
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
  }

  // Exhausted all retries
  console.error('[sendSMS] All retry attempts failed');
  throw lastError || new Error('SMS sending failed after all retries');
}

/**
 * Sends signup notification to admin (Mrs. Sangshekan)
 * Preserved for backward compatibility
 */
export async function notifySangshekanOnSignup(userPhoneNumber) {
  const adminMsisdn = process.env.SIGNUP_ALERT_MSISDN || '09923182082';
  const studentPhone = typeof userPhoneNumber === 'string' ? userPhoneNumber : '';
  
  try {
    // For admin notifications, we'll try to send
    // Note: This might need a different template or approach for SMS.ir
    console.log(`[notifySangshekanOnSignup] Would notify ${adminMsisdn} about ${studentPhone}`);
    
    // Since SMS.ir uses templates, admin notifications might need different handling
    // For now, we'll just log it
    console.warn('[notifySangshekanOnSignup] Admin notifications need separate template configuration');
    
    return true;
  } catch (err) {
    console.error('[notifySangshekanOnSignup] Failed:', err?.message || err);
    return false;
  }
}
