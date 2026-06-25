const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const pino = require('pino')
const qrcode = require('qrcode')
const fs = require('fs')
const path = require('path')

const SESSION_FOLDER = './session'

async function startBot() {
    console.log('بشغل البوت...')

    // لو فيه SESSION_DATA في ENV فكها لملفات
    if (process.env.SESSION_DATA &&!fs.existsSync(SESSION_FOLDER)) {
        fs.mkdirSync(SESSION_FOLDER, { recursive: true })
        const files = JSON.parse(Buffer.from(process.env.SESSION_DATA, 'base64').toString())
        for (const [filename, content] of Object.entries(files)) {
            fs.writeFileSync(path.join(SESSION_FOLDER, filename), Buffer.from(content, 'base64'))
        }
        console.log('تم تحميل السيشن من ENV ✅')
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER)

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Chrome', 'Windows', '10.0.0']
    })

    // كل ما السيشن يتحدث نحوله Base64
    sock.ev.on('creds.update', async () => {
        await saveCreds()
        const files = {}
        const filenames = fs.readdirSync(SESSION_FOLDER)
        for (const file of filenames) {
            const content = fs.readFileSync(path.join(SESSION_FOLDER, file))
            files[file] = content.toString('base64')
        }
        const sessionData = Buffer.from(JSON.stringify(files)).toString('base64')
        console.log('\n========== انسخ ده كله في SESSION_DATA ==========')
        console.log(sessionData)
        console.log('=================================================\n')
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            console.log('امسح الكود ده بموبايل تاني:')
            const qrImage = await qrcode.toDataURL(qr)
            console.log(qrImage)
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            console.log('الاتصال فصل... الكود:', statusCode)

            if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ السيشن اتحظر! امسح SESSION_DATA من Railway')
                process.exit(1)
            }
            startBot()
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
