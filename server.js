const express = require('express');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Config ──────────────────────────────────────────────
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'stratia_verify_2026';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN || '';
const SITE_URL = process.env.SITE_URL || 'https://strat-ia.fr';
const TRIGGER_KEYWORD = (process.env.TRIGGER_KEYWORD || 'salut').toLowerCase();

// Track users who already received a DM (avoid spam)
const sentDMs = new Set();

// ── Middleware ───────────────────────────────────────────
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// ── Static files ────────────────────────────────────────
app.use(express.static(path.join(__dirname), {
  extensions: ['html', 'htm'],
  maxAge: '1d'
}));

// ── Instagram Webhook: Verification (GET) ───────────────
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    return res.status(200).send(challenge);
  }

  console.warn('⚠️ Webhook verification failed');
  return res.sendStatus(403);
});

// ── Instagram Webhook: Events (POST) ────────────────────
app.post('/webhook', async (req, res) => {
  const body = req.body;

  // Verify signature if APP_SECRET is set
  const appSecret = process.env.APP_SECRET;
  if (appSecret && req.rawBody) {
    const signature = req.headers['x-hub-signature-256'];
    if (signature) {
      const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(req.rawBody)
        .digest('hex');
      if (signature !== expectedSig) {
        console.warn('⚠️ Invalid signature, ignoring request');
        return res.sendStatus(403);
      }
    }
  }

  // Process Instagram events
  if (body.object === 'instagram') {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field === 'comments') {
          await handleComment(change.value);
        }
      }

      // Alternative: some webhook formats use messaging/comments differently
      if (entry.messaging) {
        for (const event of entry.messaging) {
          if (event.message && event.message.text) {
            // This handles DM messages if needed in the future
          }
        }
      }
    }

    return res.status(200).send('EVENT_RECEIVED');
  }

  return res.sendStatus(404);
});

// ── Handle a comment event ──────────────────────────────
async function handleComment(commentData) {
  try {
    const commentText = (commentData.text || '').toLowerCase().trim();
    const commenterId = commentData.from?.id;
    const commenterUsername = commentData.from?.username || 'unknown';

    if (!commenterId) {
      console.log('⚠️ Comment without sender ID, skipping');
      return;
    }

    // Check if the comment contains the trigger keyword
    if (!commentText.includes(TRIGGER_KEYWORD)) {
      return;
    }

    // Avoid sending duplicate DMs to the same user for the same session
    if (sentDMs.has(commenterId)) {
      console.log(`ℹ️ DM already sent to @${commenterUsername}, skipping`);
      return;
    }

    console.log(`💬 Trigger "${TRIGGER_KEYWORD}" detected from @${commenterUsername}`);

    // Send DM
    await sendDM(commenterId, commenterUsername);

    // Mark as sent
    sentDMs.add(commenterId);

    // Clear from set after 24h (allow re-trigger next day)
    setTimeout(() => sentDMs.delete(commenterId), 24 * 60 * 60 * 1000);

  } catch (error) {
    console.error('❌ Error handling comment:', error.message);
  }
}

// ── Send a DM via Instagram API ─────────────────────────
async function sendDM(recipientId, username) {
  if (!PAGE_ACCESS_TOKEN) {
    console.error('❌ PAGE_ACCESS_TOKEN not set — cannot send DM');
    return;
  }

  const message = `Salut ! 👋\n\nMerci pour ton commentaire. Voici le lien vers nos guides gratuits :\n\n${SITE_URL}\n\nBonne lecture !\n— L'équipe StratIA`;

  try {
    const response = await axios.post(
      'https://graph.instagram.com/v21.0/me/messages',
      {
        recipient: { id: recipientId },
        message: { text: message }
      },
      {
        params: { access_token: PAGE_ACCESS_TOKEN },
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log(`✅ DM sent to @${username} (ID: ${recipientId})`);
  } catch (error) {
    const errData = error.response?.data?.error;
    if (errData) {
      console.error(`❌ DM failed to @${username}: [${errData.code}] ${errData.message}`);
    } else {
      console.error(`❌ DM failed to @${username}:`, error.message);
    }
  }
}

// ── Health check ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    bot: PAGE_ACCESS_TOKEN ? 'configured' : 'missing PAGE_ACCESS_TOKEN',
    trigger: TRIGGER_KEYWORD,
    uptime: Math.floor(process.uptime()) + 's'
  });
});

// ── Fallback to index.html ──────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ── Start ───────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ StratIA server running on port ${PORT}`);
  console.log(`📡 Webhook endpoint: /webhook`);
  console.log(`🤖 Bot trigger keyword: "${TRIGGER_KEYWORD}"`);
  console.log(`🔗 Site URL: ${SITE_URL}`);
  if (!PAGE_ACCESS_TOKEN) {
    console.warn('⚠️  PAGE_ACCESS_TOKEN not set — bot will not send DMs');
  }
});
