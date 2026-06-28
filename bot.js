const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const sharp = require('sharp')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
ffmpeg.setFfmpegPath(ffmpegInstaller.path)
const ytdl = require('ytdl-core');
const { pipeline } = require('stream/promises');

const SESSION_FOLDER = './session'

async function startBot() {
    console.log('بشغل البوت...')

    // 1. لو فيه SESSION_DATA في ENV هيحمله مرة واحدة بس
    if (process.env.SESSION_DATA &&!fs.existsSync(path.join(SESSION_FOLDER, 'creds.json'))) {
        console.log('⏳ بيحمل السيشن من ENV...')
        fs.mkdirSync(SESSION_FOLDER, { recursive: true })
        const files = JSON.parse(Buffer.from(process.env.SESSION_DATA, 'base64').toString())
        for (const [filename, content] of Object.entries(files)) {
            fs.writeFileSync(path.join(SESSION_FOLDER, filename), Buffer.from(content, 'base64'))
        }
        console.log('✅ تم تحميل السيشن بنجاح')
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER)

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Chrome', 'Windows', '10.0.0'],
        qrTimeout: 60000
    })

    // 2. هيطبع الكود مرة واحدة بس لما يسجل دخول جديد
    sock.ev.on('creds.update', async () => {
        await saveCreds()
        // بيتأكد ان creds.json موجود قبل ما يطبعه
        if (fs.existsSync(path.join(SESSION_FOLDER, 'creds.json')) && !process.env.SESSION_DATA) {
            let files = {}
            const filenames = fs.readdirSync(SESSION_FOLDER)
            for (const file of filenames) {
                const content = fs.readFileSync(path.join(SESSION_FOLDER, file))
                files = content.toString('base64')
            }
            const sessionData = Buffer.from(JSON.stringify(files)).toString('base64')
            console.log('\n========== انسخ ده كله مرة واحدة في SESSION_DATA ==========')
            console.log(sessionData)
            console.log('=================================================\n')
            console.log('⚠️ انسخه دلوقتي وحطه في ENV. بعد كده مش هيظهر تاني')
        }
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
            console.log('\n========== امسح الكود ده بالكاميرا ==========')
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`
            console.log(qrUrl)
            console.log('=================================================\n')
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ تم تسجيل الخروج. امسح SESSION_DATA من ENV وسجل تاني')
                process.exit(1)
            }
            setTimeout(() => startBot(), 5000)
        } else if (connection === 'open') {
            console.log('✅ البوت اشتغل بنجاح واتصل بالواتساب 🔥')
        }
    })

    // ====== الاوامر كلها زي ما هي ======
    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const from = msg.key.remoteJid
        const name = msg.pushName || 'مجهول'

        if (text === '.هاي') { await sock.sendMessage(from, { text: `هاي يا ${name} 💪\nالبوت شغال 24 ساعة` }) }
        else if (text === '.بنج') { await sock.sendMessage(from, { text: 'بنج 🏓 البوت صاحي' }) }
        else if (text === '.منو') { await sock.sendMessage(from, { text: `انت ${name} يا زعيم 👑` }) }
        // 4..الاوامر
        else if (text === '.الاوامر') {
            await sock.sendMessage(from, {
                text: `*📜 اوامر البوت:*\n\n.هاي - ترحيب\n.بنج - تشيك البوت\n.منو - يعرف اسمك\n.ستيكر - رد على صورة تعملها ستيكر\n.ستيكر متحرك - رد على فيديو تعمله ستيكر متحرك\n.ترجمة نص - تترجم لانجليزي\n.حاسبة 5+3 - تحسبلك\n.مين ادمن - ادمن الجروب\n.رابط الجروب - رابط الدعوة\n.انذار @حد - انذار لعضو\n.صور كلمة - 3 صور افتراضي\n.صور كلمة 5 - تحديد عدد الصور (1-10)\n.اغنية اسم - تنزل الاغنية MP3\n.الاوامر - القايمة دي`
            })
        }
        else if (text === '.ستيكر') {
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted?.imageMessage) { return await sock.sendMessage(from, { text: '📸 رد على صورة واكتب.ستيكر' }) }
            try {
                await sock.sendMessage(from, { text: '⏳ جاري إنشاء الستيكر...' })
                const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage })
                const webpBuffer = await sharp(buffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 50 }).toBuffer()
                await sock.sendMessage(from, { sticker: webpBuffer })
            } catch (err) { console.error('Sticker Error:', err); await sock.sendMessage(from, { text: '❌ فشل إنشاء الستيكر' }) }
        }
        else if (text === '.ستيكر متحرك') {
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted?.videoMessage) { return await sock.sendMessage(from, { text: '🎥 رد على فيديو واكتب.ستيكر متحرك' }) }
            let inputPath; let outputPath;
            try {
                await sock.sendMessage(from, { text: '⏳ جاري إنشاء الستيكر المتحرك...' })
                const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage })
                inputPath = `./temp_${Date.now()}.mp4`; outputPath = `./temp_${Date.now()}.webp`;
                fs.writeFileSync(inputPath, buffer)
                await new Promise((resolve, reject) => { ffmpeg(inputPath).outputOptions(['-vcodec', 'libwebp', '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15', '-loop', '0', '-quality', '60', '-compression_level', '6', '-an', '-vsync', '0', '-t', '8']).save(outputPath).on('end', resolve).on('error', reject) })
                const webpBuffer = fs.readFileSync(outputPath); await sock.sendMessage(from, { sticker: webpBuffer })
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath); if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
            } catch (err) { console.error('Sticker Error:', err); if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath); if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath); await sock.sendMessage(from, { text: '❌ فشل إنشاء الستيكر المتحرك' }) }
        }
        else if (text.startsWith('.ترجمة')) {
            const txt = text.replace('.ترجمة', '').trim()
            if (!txt) return await sock.sendMessage(from, { text: 'اكتب.ترجمة والنص' })
            try { const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(txt)}`); await sock.sendMessage(from, { text: `🇪🇬 ${txt}\n🇺🇸 ${res.data[0][0][0]}` }) } catch { await sock.sendMessage(from, { text: 'فشلت الترجمة 😢' }) }
        }
        else if (text.startsWith('.حاسبة')) {
            const calc = text.replace('.حاسبة', '').trim()
            if (!calc) return await sock.sendMessage(from, { text: 'اكتب.حاسبة 5+3' })
            try { const result = eval(calc.replace(/[^0-9+\-*/.() ]/g, '')); await sock.sendMessage(from, { text: `${calc} = ${result}` }) } catch { await sock.sendMessage(from, { text: 'معادلة غلط 😅' }) }
        }
        else if (text === '.مين ادمن') {
            if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: 'الامر ده للجروبات بس' })
            const group = await sock.groupMetadata(from); const admins = group.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`).join('\n')
            await sock.sendMessage(from, { text: `*ادمن الجروب:*\n${admins}`, mentions: group.participants.filter(p => p.admin).map(p => p.id) })
        }
            
// 13..اغنية
        else if (text.startsWith('.اغنية')) {
            const query = text.replace('.اغنية', '').trim()
            if (!query) return await sock.sendMessage(from, { text: 'اكتب.اغنية واسم الاغنية\nمثال:.اغنية انت معلم' })

            const audioPath = `./song_${Date.now()}.mp3`

            try {
                await sock.sendMessage(from, { text: `⏳ بدور على ${query}...` })

                // نجيب اول نتيجة بحث من يوتيوب
                const searchResults = await ytdl.search(query, { limit: 1 })
                if (!searchResults.videos.length) {
                    return await sock.sendMessage(from, { text: '❌ ملقتش الاغنية' })
                }
                const videoUrl = searchResults.videos[0].url
                const title = searchResults.videos[0].title.replace(/[^a-z0-9]/gi, '_').substring(0, 50)

                // ننزل الصوت بس MP3
                await pipeline(
                    ytdl(videoUrl, { filter: 'audioonly', quality: 'highestaudio' }),
                    fs.createWriteStream(audioPath)
                )

                const audioBuffer = fs.readFileSync(audioPath)

                await sock.sendMessage(from, {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${title}.mp3`,
                    ptt: false
                })

                fs.unlinkSync(audioPath)

            } catch (err) {
                console.error('Song Error:', err)
                if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
                await sock.sendMessage(from, { text: '❌ فشل تنزيل الاغنية. ممكن الاسم غلط او الفيديو محظور' })
            }
    }
        else if (text === '.رابط الجروب') {
            if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: 'الامر ده للجروبات بس' })
            const code = await sock.groupInviteCode(from); await sock.sendMessage(from, { text: `رابط الجروب:\nhttps://chat.whatsapp.com/${code}` })
        }
        else if (text.startsWith('.انذار')) {
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) { await sock.sendMessage(from, { text: 'اعمل منشن للشخص\nمثال:.انذار @احمد' }) } else {
                await sock.sendMessage(from, { text: `⚠️ انذار لـ @${mentioned[0].split('@')[0]}\nالتزم بقوانين الجروب`, mentions: mentioned })
            }
        }
        else if (text.startsWith('.صور')) {
            const parts = text.replace('.صور', '').trim().split(' '); let count = 3; let query = parts.join(' ')
            const lastWord = parts[parts.length - 1]; if (!isNaN(lastWord) && lastWord!== '') { count = Math.min(Math.max(parseInt(lastWord), 1), 10); query = parts.slice(0, -1).join(' ') }
            if (!query) return await sock.sendMessage(from, { text: 'اكتب.صور وموضوع البحث\nمثال:.صور كريستيانو' })
            try {
                await sock.sendMessage(from, { text: `⏳ جاري البحث عن ${count} صورة ${query}...` })
                const res = await axios.get('https://api.pexels.com/v1/search', { headers: { Authorization: process.env.PEXELS_API_KEY }, params: { query, per_page: count, orientation: 'portrait' } })
                const photos = res.data.photos; if (!photos.length) return await sock.sendMessage(from, { text: `❌ مش لاقي صور عن ${query}` })
                for (const photo of photos) { const response = await axios.get(photo.src.large, { responseType: 'arraybuffer' }); const buffer = Buffer.from(response.data); await sock.sendMessage(from, { image: buffer, caption: `📸 ${query}` }) }
            } catch (err) { console.error('Pexels Photo Error:', err); await sock.sendMessage(from, { text: '❌ فشل جلب الصور' }) }
        }
    })
}

startBot()
