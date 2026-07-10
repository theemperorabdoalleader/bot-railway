const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const config = require('./config');
const { loadDB, saveDB } = require('./db');
const { handleMessage } = require('./handler');
const SESSION_FOLDER = './session';

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER);

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Chrome', 'Windows', '10.0.0'],
        qrTimeout: 60000
    });

    sock.ev.on('creds.update', saveCreds);

    await loadDB();

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
            console.log('\n======== SCAN THIS QR URL ========');
            console.log(qrUrl);
            console.log('==================================\n');
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('قطع الاتصال, باعيد التشغيل...');
            if (shouldReconnect) {
    console.log('🔄 إعادة الاتصال خلال 3 ثوان...');
    setTimeout(() => {
        startBot();
    }, 3000);
}
        if (connection === 'open') console.log('البوت اشتغل ✅');
    });

    sock.ev.on('messages.upsert', async (m) => {
        try {
            if (m.type !== 'notify') return;
            const msg = m.messages[0];
            if (!msg.message) return;
            
            if (msg.key.fromMe) return;

            await handleMessage(sock, msg);
        } catch (err) {
            console.error('❌ خطأ في معالجة الرسالة:', err);
        }
    });

    setInterval(saveDB, 5 * 60 * 1000);
}

startBot();
