const { default: makeWASocket, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const SESSION_DIR = './session'
const SUPA_URL = 'https://ibazogakqsewnqweohzu.supabase.co'
const SUPA_KEY = 'sb_publishable_Ukzz_htzOKaZzbUayP7STg_yQAJxao-'
const supabase = createClient(SUPA_URL, SUPA_KEY)

// تحميل السيشن من Supabase
async function loadSession() {
    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR)
    const { data } = await supabase.from('sessions').select('data').eq('id', 'baileys').single()
    if (data?.data && data.data!== '{}') {
        const files = JSON.parse(data.data)
        for (const [name, content] of Object.entries(files)) {
            fs.writeFileSync(path.join(SESSION_DIR, name), Buffer.from(content, 'base64'))
        }
        console.log('✅ السيشن نزل من Supabase')
    }
}

// حفظ السيشن في Supabase
async function saveSession() {
    const files = {}
    if (fs.existsSync(SESSION_DIR)) {
        fs.readdirSync(SESSION_DIR).forEach(file => {
            files = fs.readFileSync(path.join(SESSION_DIR, file)).toString('base64')
        })
    }
    await supabase.from('sessions').upsert({ id: 'baileys', data: JSON.stringify(files) })
}

// تشغيل البوت
async function startBot() {
    await loadSession()

    const { state, saveCreds } = await require('@whiskeysockets/baileys').useMultiFileAuthState(SESSION_DIR)

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
    })

    sock.ev.on('creds.update', async () => {
        saveCreds()
        await saveSession()
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update

        if(qr) {
            console.log('📱 QR هنا: https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=' + encodeURIComponent(qr))
        }

        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode!== DisconnectReason.loggedOut
            console.log('❌ الاتصال فصل...', shouldReconnect? 'هحاول أرجع' : 'تسجيل خروج')
            if(shouldReconnect) setTimeout(startBot, 3000)
        } else if(connection === 'open') {
            console.log('✅ البوت اشتغل واتصل')
            await saveSession()
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if(!msg.message || msg.key.fromMe) return
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        const sender = msg.key.remoteJid

        if(text === '.stop' && sender === '201149182286@c.us') {
            await saveSession()
            await sock.sendMessage(sender, { text: 'تمام هنام 💤' })
            setTimeout(() => process.exit(0), 3000)
        }
    })
}

startBot()
// 3. دي بتعمل state للـ Baileys من الملفات المحلية
async function getAuthState() {
    if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR)

    const saveCreds = async () => {
        await saveSession()
    }

    // نقرا الملفات ونعمل state يدوي
    const credsPath = path.join(SESSION_DIR, 'creds.json')
    let state = { creds: {}, keys: {} }

    if (fs.existsSync(credsPath)) {
        state.creds = JSON.parse(fs.readFileSync(credsPath, 'utf-8'))
    }

    return { state, saveCreds }
}

async function startBot() {
    // نحمل السيشن من Supabase الأول
    await loadSession()

    // نجيب الstate من الملفات المحلية
    const { state, saveCreds } = await getAuthState()

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false
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
            const shouldReconnect = (lastDisconnect.error?.output?.statusCode || lastDisconnect.error?.statusCode)!== DisconnectReason.loggedOut
            console.log('❌ الاتصال فصل...', shouldReconnect? 'هحاول أرجع' : 'تسجيل خروج')
            if(shouldReconnect) {
                setTimeout(startBot, 3000)
            }
        } else if(connection === 'open') {
            console.log('✅ البوت اشتغل بنجاح واتصل بالواتساب')
        }
    })

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0]
        if(!msg.message || msg.key.fromMe) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text
        const sender = msg.key.remoteJid // انت كنت ناسي تعرف sender

        if(text === '.ping') {
            await sock.sendMessage(msg.key.remoteJid, { text: 'pong 🏓' })
        }
        if (text === '.stop' && sender === '201149182286@c.us') {
            await saveSession() // احفظ قبل ما تنام
            await sock.sendMessage(sender, { text: 'تمام هنام 💤 السيشن اتحفظ في Supabase' })
            setTimeout(() => process.exit(0), 3000)
        }
    })
}

startBot()
