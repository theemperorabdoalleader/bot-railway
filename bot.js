const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const pino = require('pino')
const axios = require('axios')

async function startBot() {
    
    const { state, saveCreds } = await useMultiFileAuthState('./session')

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
    })

    sock.ev.on('creds.update', saveCreds)

    // ===== reconnect =====
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) console.log(qr)

        if (connection === 'close') {
    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
    console.log('Connection closed. Reconnecting...', shouldReconnect)
    if (shouldReconnect) {
        startBot() // شيل الـ setTimeout خالص
    }
        }

        if (connection === 'open') {
            console.log('BOT ONLINE 🔥')
        }
    })

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

    process.on('SIGTERM', () => process.exit(0))
}

startBot()
