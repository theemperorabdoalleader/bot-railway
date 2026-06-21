const fs = require('fs');
if(fs.existsSync('./session')) {
  fs.rmSync('./session', {recursive: true, force: true});
  console.log('🗑️ السيشن اتمسح - مستني QR جديد');
}
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const path = require('path')

const SESSION_DIR = './session'

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update

        if(qr) {
            console.log('========================================')
            console.log('📱 افتح اللينك ده من الموبايل وصور الـ QR')
            console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`)
            console.log('========================================')
        }

        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode || lastDisconnect.error?.statusCode)!== DisconnectReason.loggedOut
            console.log('❌ الاتصال فصل...', shouldReconnect? 'هحاول أرجع' : 'تسجيل خروج')
            if(shouldReconnect) {
                setTimeout(startBot, 3000)
            }
        } else if(connection === 'open') {
            console.log('✅ البوت اشتغل بنجاح واتصل بالواتساب')
        }
    })

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
