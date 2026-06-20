const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('/app/session3'); // غيرنا الاسم تاني عشان نبدأ نضيف

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true // السطر السحري ده هيطبع المربعات
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, qr }) => {
    if(qr) {
      console.log('\n امسح المربعات دي بسرعة \n');
      qrcode.generate(qr, { small: true }); // هنا بيطبع المربعات
      console.log('\n امسح في 20 ثانية \n');
    }
    if(connection === 'open') {
      console.log('البوت اشتغل ✅ خلاص كده');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if(!msg.message || msg.key.fromMe) return;
    const text = msg.message.conversation;
    if(text === '.ping')
      await sock.sendMessage(msg.key.remoteJid, { text: 'pong شغال يا زعيم' });
  });
}
start();
