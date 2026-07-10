// ===============================
// 👮 أوامر الإدارة
// ===============================

const {
    isAdmin,
    isBotAdmin,
    normalizeJid
} = require('./utils');

async function run(sock, msg, command, args) {

    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    // ===========================
    // .طرد
    // ===========================

    if (command === 'طرد') {

        if (!from.endsWith('@g.us'))
            return sock.sendMessage(from, {
                text: '❌ الأمر للجروبات فقط.'
            });

        if (!(await isAdmin(sock, from, sender)))
            return sock.sendMessage(from, {
                text: '❌ لازم تكون مشرف.'
            });

        if (!(await isBotAdmin(sock, from)))
            return sock.sendMessage(from, {
                text: '❌ لازم البوت يكون مشرف.'
            });

        if (!args[0])
            return sock.sendMessage(from, {
                text: '❌ اكتب أو اعمل منشن للشخص.'
            });

        // استخراج المنشن لو موجود، وإلا خد أول كلمة
let target = args[0];
const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
if (mentioned && mentioned.length > 0) {
    target = mentioned[0]; // أول حد اتعمل له منشن
}
if (!target) {
    return sock.sendMessage(from, { text: '❌ اكتب الرقم أو اعمل منشن للشخص.' });
}
const targetJid = normalizeJid(target);
        await sock.groupParticipantsUpdate(
            from,
            [targetJid],
            'remove'
        );

        await sock.sendMessage(from, {
            text: '✅ تم الطرد.'
        });

        return true;
    }

    // ===========================

    return false;
}

module.exports = {
    run
};
