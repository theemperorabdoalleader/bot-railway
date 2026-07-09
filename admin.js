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

        const target = normalizeJid(args[0]);

        await sock.groupParticipantsUpdate(
            from,
            [target],
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
