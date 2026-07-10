// ===============================
// ⭐ أوامر النخبة
// ===============================

const { db, saveDB } = require('./db');
const { normalizeJid, isOwner } = require('./utils');

async function run(sock, msg, command, args) {

    const from = msg.key.remoteJid;
    const sender = normalizeJid(msg.key.participant || msg.key.remoteJid);

    // ===========================
    // .اضافة_نخبة
    // ===========================

    if (command === 'اضافة_نخبة') {

        if (!isOwner(sender))
            return sock.sendMessage(from, {
                text: '❌ هذا الأمر للمطور فقط.'
            });

        if (!args[0])
            return sock.sendMessage(from, {
                text: '❌ اكتب رقم أو منشن.'
            });

        let target = args[0];
const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
if (mentioned && mentioned.length > 0) {
    target = mentioned[0];
}
if (!target) {
    return sock.sendMessage(from, { text: '❌ اكتب الرقم أو اعمل منشن.' });
}
const targetJid = normalizeJid(target);
        if (!db.elite.includes(targetJid)) {
    db.elite.push(targetJid);
    }

        await sock.sendMessage(from, {
            text: '✅ تمت الإضافة إلى النخبة.'
        });

        return true;
    }

    // ===========================
    // .حذف_نخبة
    // ===========================

    if (command === 'حذف_نخبة') {

        if (!isOwner(sender))
            return sock.sendMessage(from, {
                text: '❌ هذا الأمر للمطور فقط.'
            });

        if (!args[0])
            return sock.sendMessage(from, {
                text: '❌ اكتب رقم أو منشن.'
            });

        let target = args[0];
const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
if (mentioned && mentioned.length > 0) {
    target = mentioned[0];
}
if (!target) {
    return sock.sendMessage(from, { text: '❌ اكتب الرقم أو اعمل منشن.' });
}
const targetJid = normalizeJid(target);
        db.elite = db.elite.filter(
    user => normalizeJid(user) !== targetJid
);

        await saveDB();

        await sock.sendMessage(from, {
            text: '✅ تمت الإزالة من النخبة.'
        });

        return true;
    }

    return false;
}

module.exports = {
    run
};
