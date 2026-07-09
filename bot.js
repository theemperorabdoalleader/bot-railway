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

    sock.ev.on('creds.update', saveCreds); // بس كده. مفيش حفظ ولا طباعة

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
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut;
            console.log('قطع الاتصال, باعيد التشغيل...');
            if (shouldReconnect) startBot();
        }
        if (connection === 'open') console.log('البوت اشتغل ✅');
    });

    sock.ev.on('messages.upsert', async (m) => {
        if (m.type!== 'notify') return;
        const msg = m.messages[0];
        if (!msg.message) return;
        await handleMessage(sock, msg);
    });

    setInterval(saveDB, 5 * 60 * 1000);
}

startBot();
