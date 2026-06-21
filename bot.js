const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const pino = require('pino')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session')

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update

        if(qr) {
            console.log('📱 افتح اللينك ده وصور الـ QR:')
            console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`)
        }

        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut
            console.log('❌ الاتصال فصل...', shouldReconnect? 'هحاول أرجع' : 'تسجيل خروج')
            if(shouldReconnect) startBot()
        } else if(connection === 'open') {
            console.log('✅ البوت اشتغل بنجاح')
        }
    })
    // عشان Railway ميقتلش البوت
process.on('SIGTERM', () => {
    console.log('Railway قفلني بس انا هقوم تاني')
    process.exit(0)
})

// KeepAlive كل 20 ثانية
setInterval(() => {
    console.log('انا صاحي اهو 💪')
}, 20000)

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if(!msg.message || msg.key.fromMe) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text

        if(text === '.ping') {
            await sock.sendMessage(msg.key.remoteJid, { text: 'pong 🏓' })
        }
    })
}

startBot()
