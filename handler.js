// ===============================
// 📨 معالج الرسائل الرئيسي
// ===============================

const config = require('./config');

const admin = require('./admin');
const elite = require('./elite');
const economy = require('./economy');

async function handleMessage(sock, msg) {

    const from = msg.key.remoteJid;

    const sender =
        msg.key.participant ||
        msg.key.remoteJid;

    const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

    if (!text.startsWith(config.prefix)) return;

    const args = text
        .slice(config.prefix.length)
        .trim()
        .split(/\s+/);

    const command = args.shift().toLowerCase();

    try {

        // أوامر الإدارة
        if (await admin.run(sock, msg, command, args))
            return;

        // أوامر النخبة
        if (await elite.run(sock, msg, command, args))
            return;

        // أوامر الاقتصاد
        if (await economy.run(sock, msg, command, args))
            return;

    } catch (err) {

        console.error(err);

        await sock.sendMessage(from, {
            text: "❌ حصل خطأ أثناء تنفيذ الأمر."
        });

    }

}

module.exports = {
    handleMessage
};
