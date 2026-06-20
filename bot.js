const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('/app/session');
  const sock = makeWASocket({ auth: state });
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, qr }) => {
    if(qr) console.log('QR STRING:', qr);
    if(!sock.authState.creds.registered) {
        const code = await sock.requestPairingCode('201149182286'); // <-- حط رقمك هنا بالكود
        console.log('PAIRING CODE:', code);
    }
    if(connection === 'open') console.log('البوت اشتغل ✅');
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if(!msg.message || msg.key.fromMe) return;
    const text = msg.message.conversation;
    if(text === '.ping')
      await sock.sendMessage(msg.key.remoteJid, { text: 'pong شغال' });
  });
}
start();
