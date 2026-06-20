const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');

async function start() {
  // غيرنا اسم الفولدر من session لـ session2 عشان نبدأ من الصفر
  const { state, saveCreds } = await useMultiFileAuthState('/app/session2');
  const sock = makeWASocket({ auth: state });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, qr }) => {
    if(qr) {
      console.log('QR:', qr);
    }
    if(connection === 'open') {
      console.log('البوت اشتغل ✅');
    }
  });

  // الكود هيطلع مرة واحدة بس لو مفيش سيشن
  if (!state.creds.registered) {
    await new Promise(r => setTimeout(r, 5000)); // استنى 5 ثواني
    try {
      const code = await sock.requestPairingCode('201149182286'); // حط رقمك هنا
      console.log('PAIRING CODE:', code);
    } catch(e) {
      console.log('استنى الريستارت الجاي وهيطلع الكود');
    }
  }

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if(!msg.message || msg.key.fromMe) return;
    const text = msg.message.conversation;
    if(text === '.ping')
      await sock.sendMessage(msg.key.remoteJid, { text: 'pong شغال' });
  });
}
start();
