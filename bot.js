const { default: makeWASocket, DisconnectReason, useMultiF>
const qrcode = require('qrcode-terminal')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthSta>

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false // هنطبعه يدوي عشان Termux
    })

    sock.ev.on('creds.update', saveCreds)

    // هنا بقى الطباعة
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update

        if(qr) {
            console.log('امسح الكود ده بموبايل تاني:')
            qrcode.generate(qr, { small: true })
        }

        if(connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.>
            console.log('الاتصال فصل...', shouldReconnect)
            if(shouldReconnect) startBot()
        } else if(connection === 'open') {
            console.log('✅ البوت اشتغل بنجاح واتصل بالوات>
        }
    })

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const text = msg.message.conversation || msg.messa>
        const from = msg.key.remoteJid

        if (text === '.هاي') {
            await sock.sendMessage(from, { text: 'اشتغلت ي>
        }
    })
}

startBot()
