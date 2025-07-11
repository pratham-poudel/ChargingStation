const express = require('express');
const router = express.Router();
const { validateTurnstileToken } = require('../services/TurnstileService');

/**
 * GET /api/turnstile/test
 * Test endpoint to verify the route is working
 */
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Turnstile route is working',
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/turnstile/validate
 * Body: { token: string, action?: string, cData?: string }
 */
router.post('/validate', async (req, res) => {
  const { token, action, cData } = req.body;
  const remoteip = req.ip;

  console.log('Turnstile validation request:', { 
    token: token ? `${token.substring(0, 10)}...` : 'missing', 
    action, 
    cData, 
    remoteip 
  });

  if (!token) {
    return res.status(400).json({ success: false, message: 'Missing token' });
  }

  const result = await validateTurnstileToken(token, remoteip);

  console.log('Turnstile validation result:', { 
    success: result.success, 
    error: result.error,
    details: result.details 
  });

  if (result.success) {
    return res.json({ success: true, ...result });
  } else {
    return res.status(400).json({ success: false, message: result.error || 'Validation failed', details: result.details });
  }
});

module.exports = router; 