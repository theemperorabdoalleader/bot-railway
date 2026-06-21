const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const qrcode = require('qrcode-terminal')
const yts = require('yt-search')
const fs = require('fs')
const path = require('path')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./session')

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true // خليه true عشان Railway يطبع QR
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
        const shouldReconnect = (lastDisconnect.error?.output?.statusCode || lastDisconnect.error?.statusCode) !== DisconnectReason.loggedOut
        console.log('❌ الاتصال فصل...', shouldReconnect? 'هحاول أرجع' : 'تسجيل خروج')
        if(shouldReconnect) {
            setTimeout(startBot, 3000) // يستنى 3 ثواني ويرجع
        }
    } else if(connection === 'open') {
        console.log('✅ البوت اشتغل بنجاح واتصل بالواتساب')
    }
})
})

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const from = msg.key.remoteJid

        if (text === '.هاي') {
            await sock.sendMessage(from, { text: 'اشتغلت يا معلم 🔥 ابعت.اديت + اسم الأنمي' })
        }

        if (text.startsWith('.اديت')) {
            const query = text.slice(5).trim()
            if (!query) return sock.sendMessage(from, { text: '🎬 اكتب اسم الإيديت\nمثال:.اديت gojo' })

            await sock.sendMessage(from, { text: `🔍 بدور على ${query}...` })

            try {
                const res = await yts(query + ' anime edit')
                const video = res.videos[0]

                if (!video) throw new Error('مفيش نتيجة')

                const caption = `◆<< • ${video.title}\n⏱ | ${video.timestamp}\n📺 | ${video.author.name}\n👀 | ${video.views.toLocaleString()}\n🔗 | ${video.url}`

                await sock.sendMessage(from, {
                    image: { url: video.thumbnail },
                    caption: caption
                })

            } catch (e) {
                console.log('Error:', e.message)
                await sock.sendMessage(from, {
                    text: `⚠️ معرفتش أجيب الإيديت\n🔗 ابحث بنفسك: https://youtube.com/results?search_query=${encodeURIComponent(query + " anime edit")}`
                })
            }
        }
    })
}

startBot()
