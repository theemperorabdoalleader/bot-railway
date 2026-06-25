const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys')
const pino = require('pino')
const qrcode = require('qrcode')
const fs = require('fs')
const path = require('path')
const axios = require('axios')

const SESSION_FOLDER = './session'

async function startBot() {
    console.log('بشغل البوت...')

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

    sock.ev.on('creds.update', async () => {
        await saveCreds()
        const files = {}
        const filenames = fs.readdirSync(SESSION_FOLDER)
        for (const file of filenames) {
            const content = fs.readFileSync(path.join(SESSION_FOLDER, file))
            files = content.toString('base64')
        }
        const sessionData = Buffer.from(JSON.stringify(files)).toString('base64')
        console.log('\n========== انسخ ده كله في SESSION_DATA ==========')
        console.log(sessionData)
        console.log('=================================================\n')
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
    console.log('\n========== انسخ اللي تحت وحطه في المتصفح ==========')
    const qrImage = await qrcode.toDataURL(qr)
    const cleanQR = qrImage.replace('data:image/png;base64,', '')
    console.log(cleanQR)
    console.log('=================================================\n')
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            if (statusCode === DisconnectReason.loggedOut) process.exit(1)
            startBot()
        } else if (connection === 'open') {
            console.log('✅ البوت اشتغل بنجاح واتصل بالواتساب 🔥')
        }
    })

    // ====== الاوامر ======
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const from = msg.key.remoteJid
        const name = msg.pushName || 'مجهول'

        // 1..هاي
        if (text === '.هاي') {
            await sock.sendMessage(from, { text: `هاي يا ${name} 💪\nالبوت شغال 24 ساعة` })
        }

        // 2..بنج
        else if (text === '.بنج') {
            await sock.sendMessage(from, { text: 'بنج 🏓 البوت صاحي' })
        }

        // 3..منو
        else if (text === '.منو') {
            await sock.sendMessage(from, { text: `انت ${name} يا زعيم 👑` })
        }

        // 4..الاوامر
        else if (text === '.الاوامر') {
            await sock.sendMessage(from, {
                text: `*📜 اوامر البوت:*\n\n.هاي - ترحيب\n.بنج - تشيك البوت\n.منو - يعرف اسمك\n.ستيكر - رد على صورة تعملها ستيكر\n.ترجمة نص - تترجم لانجليزي\n.حاسبة 5+3 - تحسبلك\n.مين ادمن - ادمن الجروب\n.رابط الجروب - رابط الدعوة\n.انذار @حد - انذار لعضو\n.الاوامر - القايمة دي`
            })
        }

        // 5..ستيكر - رد على صورة
        else if (text === '.ستيكر') {
            if (msg.message.imageMessage || msg.message.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
                await sock.sendMessage(from, { text: 'ثانية بحولهولك ستيكر... ⏳' })
                const buffer = await downloadMediaMessage(msg.message.extendedTextMessage?.contextInfo?.quotedMessage? msg.message.extendedTextMessage.contextInfo.quotedMessage : msg.message, 'buffer', {})
                await sock.sendMessage(from, { sticker: buffer })
            } else {
                await sock.sendMessage(from, { text: 'رد على صورة واكتب.ستيكر' })
            }
        }

        // 6..ترجمة
        else if (text.startsWith('.ترجمة')) {
            const txt = text.replace('.ترجمة', '').trim()
            if (!txt) return await sock.sendMessage(from, { text: 'اكتب.ترجمة والنص\nمثال:.ترجمة ازيك' })
            try {
                const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(txt)}`)
                await sock.sendMessage(from, { text: `🇪🇬 ${txt}\n🇺🇸 ${res.data[0][0][0]}` })
            } catch {
                await sock.sendMessage(from, { text: 'فشلت الترجمة 😢' })
            }
        }

        // 7..حاسبة
        else if (text.startsWith('.حاسبة')) {
            const calc = text.replace('.حاسبة', '').trim()
            if (!calc) return await sock.sendMessage(from, { text: 'اكتب.حاسبة 5+3' })
            try {
                const result = eval(calc.replace(/[^0-9+\-*/.() ]/g, ''))
                await sock.sendMessage(from, { text: `${calc} = ${result}` })
            } catch {
                await sock.sendMessage(from, { text: 'معادلة غلط 😅' })
            }
        }

        // 8..مين ادمن - للجروبات
        else if (text === '.مين ادمن') {
            if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: 'الامر ده للجروبات بس' })
            const group = await sock.groupMetadata(from)
            const admins = group.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`).join('\n')
            await sock.sendMessage(from, { text: `*ادمن الجروب:*\n${admins}`, mentions: group.participants.filter(p => p.admin).map(p => p.id) })
        }

        // 9..رابط الجروب
        else if (text === '.رابط الجروب') {
            if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: 'الامر ده للجروبات بس' })
            const code = await sock.groupInviteCode(from)
            await sock.sendMessage(from, { text: `رابط الجروب:\nhttps://chat.whatsapp.com/${code}` })
        }

        // 10..انذار @حد
        else if (text.startsWith('.انذار')) {
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) {
                await sock.sendMessage(from, { text: 'اعمل منشن للشخص\nمثال:.انذار @احمد' })
            } else {
                await sock.sendMessage(from, { text: `⚠️ انذار لـ @${mentioned[0].split('@')[0]}\nالتزم بقوانين الجروب`, mentions: mentioned })
            }
        }
    })
}

startBot()
