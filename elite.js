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

        const target = normalizeJid(args[0]);

        if (!db.elite.includes(target)) {
            db.elite.push(target);
            await saveDB();
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

        const target = normalizeJid(args[0]);

        db.elite = db.elite.filter(
            user => normalizeJid(user) !== target
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
