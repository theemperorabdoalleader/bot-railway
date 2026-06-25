const { default: makeWASocket, DisconnectReason, useSingleFileAuthState } = require('@whiskeysockets/baileys')
const pino = require('pino')
const qrcode = require('qrcode')
const fs = require('fs')

const SESSION_FILE = './session.json'

async function startBot() {
    console.log('بشغل البوت...')

    // لو السيشن موجود في ENV نزله ملف
    if (process.env.SESSION_DATA &&!fs.existsSync(SESSION_FILE)) {
        fs.writeFileSync(SESSION_FILE, Buffer.from(process.env.SESSION_DATA, 'base64'))
        console.log('تم تحميل السيشن من ENV ✅')
    }

    const { state, saveCreds } = useSingleFileAuthState(SESSION_FILE)

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Chrome', 'Windows', '10.0.0']
    })

    sock.ev.on('creds.update', () => {
        saveCreds()
        // اطبع السيشن Base64 عشان تحطه في Railway
        const sessionData = fs.readFileSync(SESSION_FILE, 'base64')
        console.log('\n========== انسخ ده في SESSION_DATA ==========')
        console.log(sessionData)
        console.log('=============================================\n')
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            console.log('امسح الكود ده بموبايل تاني:')
            const qrImage = await qrcode.toDataURL(qr)
            console.log(qrImage) // انسخه في المتصفح
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            const shouldReconnect = statusCode!== DisconnectReason.loggedOut

            console.log('الاتصال فصل... الكود:', statusCode)

            if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ السيشن اتحظر! امسح SESSION_DATA من Railway')
                process.exit(1)
            }

            if (shouldReconnect) startBot()
        } else if (connection === 'open') {
            console.log('✅ البوت اشتغل بنجاح واتصل بالواتساب 🔥')
        }
    })

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const from = msg.key.remoteJid

        if (text === '.هاي') {
            await sock.sendMessage(from, { text: 'اشتغلت يا معلم 💪' })
        }
    })
}

startBot()
