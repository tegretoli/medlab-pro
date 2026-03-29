const axios    = require('axios');
const Settings = require('../models/Settings');

/**
 * Dërgon njoftim WhatsApp pacientit pasi rezultatet validohen.
 * @param {object} porosi  - PorosiLab document me pacienti populated
 * @param {string} emriPac - emri i plotë i pacientit
 */
async function dergoWhatsApp(porosi, emriPac) {
  const settings = await Settings.findOne().lean();
  if (!settings?.whatsappAktiv) return;

  const telefoni = porosi.pacienti?.telefoni;
  if (!telefoni) return;

  // Ndërtim URL QR (nëse aktivizuar)
  const qrBaseUrl = (settings.qrBaseUrl || '').replace(/\/$/, '');
  const tokenPublik = porosi.tokenPublik || '';
  const linkRezultati = qrBaseUrl && tokenPublik ? `${qrBaseUrl}/r/${tokenPublik}` : '';

  // Mesazhi
  const teksti = settings.whatsappTemplate
    ? settings.whatsappTemplate
        .replace('{emri}', emriPac)
        .replace('{numrPorosi}', porosi.numrPorosi || '')
        .replace('{link}', linkRezultati || '—')
    : `Të nderuari ${emriPac}, rezultatet tuaja laboratorike (${porosi.numrPorosi || ''}) janë gati.${linkRezultati ? ' Mund t\'i shikoni në: ' + linkRezultati : ''}`;

  const provider = settings.whatsappProvider || 'callmebot';

  try {
    if (provider === 'callmebot') {
      // https://www.callmebot.com/blog/free-api-whatsapp-messages/
      const apiKey = settings.whatsappApiKey || '';
      const nr = telefoni.replace(/\s+/g, '').replace(/^0/, '+383');
      await axios.get('https://api.callmebot.com/whatsapp.php', {
        params: { phone: nr, text: teksti, apikey: apiKey },
        timeout: 10000,
      });

    } else if (provider === 'twilio') {
      const accountSid = settings.whatsappTwilioSid || '';
      const authToken  = settings.whatsappTwilioToken || '';
      const from       = settings.whatsappTwilioFrom || 'whatsapp:+14155238886';
      const nr = telefoni.replace(/\s+/g, '');
      const to = nr.startsWith('+') ? `whatsapp:${nr}` : `whatsapp:+${nr}`;
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        new URLSearchParams({ From: from, To: to, Body: teksti }),
        { auth: { username: accountSid, password: authToken }, timeout: 10000 }
      );

    } else if (provider === 'custom') {
      // Webhook i personalizuar — POST me { telefoni, mesazhi }
      const webhookUrl = settings.whatsappWebhookUrl || '';
      if (webhookUrl) {
        await axios.post(webhookUrl, { telefoni, mesazhi: teksti }, { timeout: 10000 });
      }
    }
  } catch (err) {
    console.error(`[WhatsApp] Gabim gjatë dërgimit: ${err.message}`);
  }
}

module.exports = { dergoWhatsApp };
