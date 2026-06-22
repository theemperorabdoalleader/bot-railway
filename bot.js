const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const pino = require('pino')

async function startBot() {

    const { state, saveCreds } = await useMultiFileAuthState('./session')

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' })
    })

    sock.ev.on('creds.update', saveCreds)

    // ====== فونت احترافي ======
    function toFancy(text) {
        const map = {
            a:'𝖺', b:'𝖻', c:'𝖼', d:'𝖽', e:'𝖾',
            f:'𝖿', g:'𝗀', h:'𝗁', i:'𝗂', j:'𝗃',
            k:'𝗄', l:'𝗅', m:'𝗆', n:'𝗇', o:'𝗈',
            p:'𝗉', q:'𝗊', r:'𝗋', s:'𝗌', t:'𝗍',
            u:'𝗎', v:'𝗏', w:'𝗐', x:'𝗑', y:'𝗒', z:'𝗓'
        }
        return text.split('').map(c => map[c] || c).join('')
    }

    async function send(jid, text) {
        return sock.sendMessage(jid, {
            text: toFancy(text)
        })
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update

        if (qr) {
            console.log('📱 QR Code:')
            console.log(`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`)
        }

        if (connection === 'close') {
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

            console.log('❌ فصل الاتصال', shouldReconnect ? 'هحاول تاني' : 'Logged out')

            if (shouldReconnect) startBot()
        }

        if (connection === 'open') {
            console.log('✅ البوت اشتغل')
        }
    })

    // ====== الرسائل ======
    sock.ev.on('messages.upsert', async (m) => {

        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            ""

        const args = text.trim().split(" ")
        const command = args[0]?.toLowerCase()
        const query = args.slice(1).join(" ")

        const jid = msg.key.remoteJid

        if (!command) return

        // ====== الأوامر ======

        switch (command) {

            case '.ping':
                await send(jid, 'pong 🏓')
                break

            case '.اوامر':
                await send(jid, `
📜 الأوامر:

🖼️ .صور
🎬 .اديت
💎 .اقوى_اديت
🎵 .اغنية
                `)
                break

            default:
                break
        }
    })

    // حماية Railway
    process.on('SIGTERM', () => {
        console.log('Railway قفلني')
        process.exit(0)
    })

    // keep alive
    setInterval(() => {
        console.log('alive 💪')
    }, 20000)
}

startBot()
