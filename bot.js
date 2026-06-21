const QRCode = require('qrcode')
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

    sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if(qr) {
        console.log('📱 شوف واتسابك البوت بعتلك QR')
        
        const qrBuffer = await QRCode.toBuffer(qr, { width: 300 })
        
        const myNumber = '201149182286@s.whatsapp.net' // حط رقمك هنا
        
        await sock.sendMessage(myNumber, {
            image: qrBuffer,
            caption: 'امسح الكود ده'
        }).catch(err => console.log('حط رقمك صح', err))
    }

    if(connection === 'close') {
        const shouldReconnect = (lastDisconnect.error?.output?.statusCode || lastDisconnect.error?.statusCode) !== DisconnectReason.loggedOut
        console.log('❌ الاتصال فصل...', shouldReconnect? 'هحاول أرجع' : 'تسجيل خروج')
        if(shouldReconnect) startBot()
    } else if(connection === 'open') {
        console.log('✅ البوت اشتغل بنجاح واتصل بالواتساب')
    }
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
