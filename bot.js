const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const sharp = require('sharp')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
ffmpeg.setFfmpegPath(ffmpegInstaller.path)

const SESSION_FOLDER = './session'

async function startBot() {
    console.log('بشغل البوت...')

    if (process.env.SESSION_DATA && !fs.existsSync(SESSION_FOLDER)) {
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
        browser: ['Chrome', 'Windows', '10.0.0'],
        qrTimeout: 60000
    })

    sock.ev.on('creds.update', async () => {
        await saveCreds()
        let files = {}
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
            console.log('\n========== انسخ اللينك ده في المتصفح ==========')
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`
            console.log(qrUrl)
            console.log('=================================================\n')
        }
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode
            if (statusCode === DisconnectReason.loggedOut) process.exit(1)
            setTimeout(() => startBot(), 5000)
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

        // 1. .هاي
        if (text === '.هاي') {
            await sock.sendMessage(from, { text: `هاي يا ${name} 💪\nالبوت شغال 24 ساعة` })
        }

        // 2. .بنج
        else if (text === '.بنج') {
            await sock.sendMessage(from, { text: 'بنج 🏓 البوت صاحي' })
        }

        // 3. .منو
        else if (text === '.منو') {
            await sock.sendMessage(from, { text: `انت ${name} يا زعيم 👑` })
        }

        // 4. .الاوامر
        else if (text === '.الاوامر') {
            await sock.sendMessage(from, {
                text: `*📜 اوامر البوت:*\n\n.هاي - ترحيب\n.بنج - تشيك البوت\n.منو - يعرف اسمك\n.ستيكر - رد على صورة تعملها ستيكر\n.ستيكر متحرك - رد على فيديو تعمله ستيكر متحرك\n.ترجمة نص - تترجم لانجليزي\n.حاسبة 5+3 - تحسبلك\n.مين ادمن - ادمن الجروب\n.رابط الجروب - رابط الدعوة\n.انذار @حد - انذار لعضو\n.اديت انمي - GIF انمي اكشن\n.اديت كلمة - فيديو لأي شخص او موضوع\n.صور كلمة - 3 صور افتراضي\n.صور كلمة 5 - تحديد عدد الصور (1-10)\n.الاوامر - القايمة دي`
            })
        }

        // 5. .ستيكر
        else if (text === '.ستيكر') {
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted?.imageMessage) {
                return await sock.sendMessage(from, { text: '📸 رد على صورة واكتب .ستيكر' })
            }
            try {
                await sock.sendMessage(from, { text: '⏳ جاري إنشاء الستيكر...' })
                const buffer = await downloadMediaMessage(
                    { message: quoted },
                    'buffer',
                    {},
                    {
                        logger: pino({ level: 'silent' }),
                        reuploadRequest: sock.updateMediaMessage
                    }
                )
                const webpBuffer = await sharp(buffer)
                    .resize(512, 512, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                        withoutEnlargement: false
                    })
                    .webp()
                    .toBuffer()

                await sock.sendMessage(from, { sticker: webpBuffer })
            } catch (err) {
                console.error('Sticker Error:', err)
                await sock.sendMessage(from, { text: '❌ فشل إنشاء الستيكر' })
            }
        }

        // 6. .ستيكر متحرك
        else if (text === '.ستيكر متحرك') {
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted?.videoMessage) {
                return await sock.sendMessage(from, { text: '🎥 رد على فيديو واكتب .ستيكر متحرك' })
            }
            let inputPath
            let outputPath
            try {
                await sock.sendMessage(from, { text: '⏳ جاري إنشاء الستيكر المتحرك...' })
                const buffer = await downloadMediaMessage(
                    { message: quoted },
                    'buffer',
                    {},
                    {
                        logger: pino({ level: 'silent' }),
                        reuploadRequest: sock.updateMediaMessage
                    }
                )
                inputPath = `./temp_${Date.now()}.mp4`
                outputPath = `./temp_${Date.now()}.webp`
                fs.writeFileSync(inputPath, buffer)

                await new Promise((resolve, reject) => {
                    ffmpeg(inputPath)
                        .outputOptions([
                            '-vcodec', 'libwebp',
                            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=24',
                            '-loop', '0',
                            '-quality', '80',
                            '-compression_level', '6',
                            '-an',
                            '-vsync', '0',
                            '-t', '10'
                        ])
                        .save(outputPath)
                        .on('end', resolve)
                        .on('error', reject)
                })

                const webpBuffer = fs.readFileSync(outputPath)
                await sock.sendMessage(from, { sticker: webpBuffer })

                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
            } catch (err) {
                console.error('Sticker Error:', err)
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
                if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
                await sock.sendMessage(from, { text: '❌ فشل إنشاء الستيكر المتحرك' })
            }
        }

        // 7. .ترجمة
        else if (text.startsWith('.ترجمة')) {
            const txt = text.replace('.ترجمة', '').trim()
            if (!txt) return await sock.sendMessage(from, { text: 'اكتب .ترجمة والنص\nمثال: .ترجمة ازيك' })
            try {
                const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(txt)}`)
                await sock.sendMessage(from, { text: `🇪🇬 ${txt}\n🇺🇸 ${res.data[0][0][0]}` })
            } catch {
                await sock.sendMessage(from, { text: 'فشلت الترجمة 😢' })
            }
        }

        // 8. .حاسبة
        else if (text.startsWith('.حاسبة')) {
            const calc = text.replace('.حاسبة', '').trim()
            if (!calc) return await sock.sendMessage(from, { text: 'اكتب .حاسبة 5+3' })
            try {
                const result = eval(calc.replace(/[^0-9+\-*/.() ]/g, ''))
                await sock.sendMessage(from, { text: `${calc} = ${result}` })
            } catch {
                await sock.sendMessage(from, { text: 'معادلة غلط 😅' })
            }
        }

        // 9. .مين ادمن
        else if (text === '.مين ادمن') {
            if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: 'الامر ده للجروبات بس' })
            const group = await sock.groupMetadata(from)
            const admins = group.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`).join('\n')
            await sock.sendMessage(from, {
                text: `*ادمن الجروب:*\n${admins}`,
                mentions: group.participants.filter(p => p.admin).map(p => p.id)
            })
        }

        // 10. .رابط الجروب
        else if (text === '.رابط الجروب') {
            if (!from.endsWith('@g.us')) return await sock.sendMessage(from, { text: 'الامر ده للجروبات بس' })
            const code = await sock.groupInviteCode(from)
            await sock.sendMessage(from, { text: `رابط الجروب:\nhttps://chat.whatsapp.com/${code}` })
        }

        // 11. .انذار
        else if (text.startsWith('.انذار')) {
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) {
                await sock.sendMessage(from, { text: 'اعمل منشن للشخص\nمثال: .انذار @احمد' })
            } else {
                await sock.sendMessage(from, {
                    text: `⚠️ انذار لـ @${mentioned[0].split('@')[0]}\nالتزم بقوانين الجروب`,
                    mentions: mentioned
                })
            }
        }

        // 12. .اديت انمي
        else if (text === '.اديت انمي') {
            try {
                await sock.sendMessage(from, { text: '⏳ جاري البحث عن GIF أنمي...' })
                const res = await axios.get('https://api.giphy.com/v1/gifs/search', {
                    params: {
                        api_key: process.env.GIPHY_API_KEY,
                        q: 'anime action fight',
                        limit: 20,
                        rating: 'g'
                    }
                })
                const gifs = res.data.data
                if (!gifs.length) return await sock.sendMessage(from, { text: '❌ مش لاقي حاجة' })
                const random = gifs[Math.floor(Math.random() * gifs.length)]
                const gifUrl = random.images.original.url
                const response = await axios.get(gifUrl, { responseType: 'arraybuffer' })
                const buffer = Buffer.from(response.data)
                await sock.sendMessage(from, { video: buffer, gifPlayback: true, caption: '🎌 أنمي أكشن' })
            } catch (err) {
                console.error('Giphy Error:', err)
                await sock.sendMessage(from, { text: '❌ فشل جلب الـ GIF' })
            }
        }

        // 13. .اديت
        else if (text.startsWith('.اديت ')) {
            const query = text.replace('.اديت', '').trim()
            if (!query) return await sock.sendMessage(from, { text: 'اكتب .اديت واسم الشخص\nمثال: .اديت كريستيانو' })
            try {
                await sock.sendMessage(from, { text: `⏳ جاري البحث عن فيديو ${query}...` })
                const res = await axios.get('https://api.pexels.com/videos/search', {
                    headers: { Authorization: process.env.PEXELS_API_KEY },
                    params: { query, per_page: 15, orientation: 'portrait' }
                })
                const videos = res.data.videos
                if (!videos.length) return await sock.sendMessage(from, { text: `❌ مش لاقي فيديو عن ${query}` })
                const random = videos[Math.floor(Math.random() * videos.length)]
                const videoFile = random.video_files.sort((a, b) => b.width - a.width)[0]
                const response = await axios.get(videoFile.link, { responseType: 'arraybuffer' })
                const buffer = Buffer.from(response.data)
                await sock.sendMessage(from, { video: buffer, caption: `🎬 ${query}` })
            } catch (err) {
                console.error('Pexels Video Error:', err)
                await sock.sendMessage(from, { text: '❌ فشل جلب الفيديو' })
            }
        }

        // 14. .صور
        else if (text.startsWith('.صور')) {
            const parts = text.replace('.صور', '').trim().split(' ')
            let count = 3
            let query = parts.join(' ')

            const lastWord = parts[parts.length - 1]
            if (!isNaN(lastWord) && lastWord !== '') {
                count = Math.min(Math.max(parseInt(lastWord), 1), 10)
                query = parts.slice(0, -1).join(' ')
            }

            if (!query) return await sock.sendMessage(from, { text: 'اكتب .صور وموضوع البحث\nمثال: .صور قطط\nأو: .صور قطط 5' })
            try {
                await sock.sendMessage(from, { text: `⏳ جاري البحث عن ${count} صورة ${query}...` })
                const res = await axios.get('https://api.pexels.com/v1/search', {
                    headers: { Authorization: process.env.PEXELS_API_KEY },
                    params: { query, per_page: count }
                })
                const photos = res.data.photos
                if (!photos.length) return await sock.sendMessage(from, { text: `❌ مش لاقي صور عن ${query}` })
                for (const photo of photos) {
                    const response = await axios.get(photo.src.large, { responseType: 'arraybuffer' })
                    const buffer = Buffer.from(response.data)
                    await sock.sendMessage(from, { image: buffer, caption: `📸 ${query}` })
                }
            } catch (err) {
                console.error('Pexels Photo Error:', err)
                await sock.sendMessage(from, { text: '❌ فشل جلب الصور' })
            }
        }
    })
}

startBot()
                
