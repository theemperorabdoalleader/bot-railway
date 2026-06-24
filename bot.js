const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const axios = require('axios')

process.on('SIGTERM', () => process.exit(0))

let sock
let sessionPath = './session' // هنبدأ بالاساسي

async function startBot() {
    // لو فولدر السيشن بايظ، غير المسار تلقائي
    if (fs.existsSync(sessionPath) && fs.readdirSync(sessionPath).length > 0) {
        console.log('لقيت سيشن قديم، هجرب اشغله...')
    } else {
        console.log('مفيش سيشن، هعمل واحد جديد')
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath)

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            console.log('=================================')
            console.log('QR CODE:', qr)
            console.log('=================================')
        }

        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode

            console.log('اتقفل. الكود:', statusCode)

            // لو 405 يعني السيشن باظ
            if (statusCode === 405 || statusCode === 401) {
                console.log('السيشن بايظ! هعمل فولدر جديد...')

                // غير المسار لـ session2
                sessionPath = './session2'

                // امسح القديم عشان ميعملش لخبطة
                if (fs.existsSync('./session')) {
                    fs.rmSync('./session', { recursive: true, force: true })
                }

                // شغل البوت تاني بالمسار الجديد
                setTimeout(() => startBot(), 2000)
            }
        }

        if (connection === 'open') {
    console.log('اشتغل يا معلم 🔥 المسار:', sessionPath)
}
}); // قفلة sock.ev.on
} // قفلة async function startBot
    
    const send = (jid, text) => sock.sendMessage(jid, { text })

    // =========================
    // 🖼️ PEXELS IMAGES API
    // =========================
    async function getImages(query, limit = 3) {
        try {
            const API_KEY = process.env.PEXELS_API_KEY

            const res = await axios.get('https://api.pexels.com/v1/search', {
                headers: {
                    Authorization: API_KEY
                },
                params: {
                    query,
                    per_page: limit
                }
            })

            return res.data.photos.map(p => p.src.original)
        } catch (e) {
            return []
        }
    }

    // =========================
    // 📩 MESSAGES
    // =========================
    sock.ev.on('messages.upsert', async (m) => {

        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const jid = msg.key.remoteJid

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            ''

        const args = text.trim().split(' ')
        const cmd = args[0].toLowerCase()
        const query = args.slice(1).join(' ')

        // =========================
        // 🖼️ .صور COMMAND
        // =========================
        if (cmd === '.صور') {

            if (!query) return send(jid, 'اكتب حاجة بعد الأمر 🖼️')

            const parts = query.split(' ')
            let last = parts[parts.length - 1]
            let num = parseInt(last)

            let isNumber = !isNaN(num)

            let limit = isNumber ? num : 3
            let search = isNumber ? parts.slice(0, -1).join(' ') : query

            if (limit < 1) limit = 1
            if (limit > 10) limit = 10

            await send(jid, `🖼️ جاري جلب ${limit} صور لـ: ${search}`)

            const images = await getImages(search, limit)

            if (!images.length) {
                return send(jid, 'مفيش صور ❌')
            }

            for (let img of images) {
                await sock.sendMessage(jid, {
                    image: { url: img },
                    caption: search
                })
            }

            return
        }

        // =========================
        // 🔥 PING
        // =========================
        if (cmd === '.ping') {
            return send(jid, 'pong 🏓')
        }
        if (cmd === '.نرد') {
    const num = Math.floor(Math.random() * 6) + 1
    return send(jid, `🎲 النتيجة: ${num}`)
}

if (cmd === '.عملة') {
    const result = Math.random() < 0.5 ? '🪙 صورة' : '🪙 كتابة'
    return send(jid, result)
}

if (cmd === '.حظ') {
    const luck = Math.floor(Math.random() * 101)
    return send(jid, `🍀 نسبة حظك: ${luck}%`)
}

if (cmd === '.حجر' || cmd === '.ورقة' || cmd === '.مقص') {

    const choices = ['حجر', 'ورقة', 'مقص']
    const bot = choices[Math.floor(Math.random() * choices.length)]

    const player = cmd.replace('.', '')

    let result = '🤝 تعادل'

    if (
        (player === 'حجر' && bot === 'مقص') ||
        (player === 'ورقة' && bot === 'حجر') ||
        (player === 'مقص' && bot === 'ورقة')
    ) {
        result = '✅ فزت'
    } else if (player !== bot) {
        result = '❌ خسرت'
    }

    return send(
        jid,
        `👤 أنت: ${player}\n🤖 البوت: ${bot}\n\n${result}`
    )
}

        // =========================
        // 🧠 HELP
        // =========================
        if (cmd === '.اوامر') {
            return send(jid, `
🤖 BOT:

🖼️ .صور <اسم> <1-10>
🔥 .ping
            `)
        }

        // =========================
        // 💬 AUTO REPLY
        // =========================
        if (text.includes('سلام')) {
            return send(jid, 'وعليكم السلام 👋')
        }
    })

}

startBot()
