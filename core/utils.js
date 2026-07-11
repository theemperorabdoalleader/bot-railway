// ===============================
// 🛠️ أدوات بوت الأباطرة
// ===============================

const config = require('../config/config');
const { db } = require('./db');
// توحيد الـ JID
// توحيد الـ JID أو الرقم
function normalizeJid(input) {
    if (!input) return '';

    let jid = String(input).trim();

    // إزالة @lid
    jid = jid.replace('@lid', '');

    // إزالة :xx@
    jid = jid.replace(/:\d+@/, '@');

    // لو JID كامل
    if (jid.endsWith('@s.whatsapp.net'))
        return jid.toLowerCase();

    // لو رقم فقط
    jid = jid.replace(/\D/g, '');

    if (jid.length >= 8)
        return `${jid}@s.whatsapp.net`;

    return '';
}

// هل الشخص هو المطور؟
function isOwner(jid) {

    if (!jid) return false;

    const clean = normalizeJid(jid)
        .split('@')[0]
        .split(':')[0];

    return config.owner.some(owner => {

        const ownerClean = normalizeJid(owner)
            .split('@')[0]
            .split(':')[0];

        return clean === ownerClean;
    });
}

// هل الشخص من النخبة؟
function isElite(jid) {
    jid = normalizeJid(jid);

    if (!db.elite) db.elite = [];

    return db.elite.some(user => normalizeJid(user) === jid);
}

// هل الشخص أدمن؟
async function isAdmin(sock, groupJid, userJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);

        const participant = metadata.participants.find(
            p => normalizeJid(p.id || p.jid) === normalizeJid(userJid)
        );

        return (
            participant?.admin === 'admin' ||
            participant?.admin === 'superadmin'
        );

    } catch (err) {
        return false;
    }
}

// هل البوت أدمن؟
async function isBotAdmin(sock, groupJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);

        const botNumber = sock.user.id.split(':')[0];

        const participant = metadata.participants.find(p => {
            const id = (p.id || p.jid || '').split(':')[0];
            return id.includes(botNumber);
        });

        return !!(
            participant &&
            (participant.admin === 'admin' ||
             participant.admin === 'superadmin')
        );

    } catch (err) {
        console.log('Bot admin check error:', err);
        return false;
    }
}
function isValidJid(jid) {
    if (!jid) return false;

    jid = normalizeJid(jid);

    // لو هو JID كامل
    if (jid.endsWith('@s.whatsapp.net')) return true;

    // لو المستخدم كتب رقم فقط
    return /^[0-9]{8,20}$/.test(jid);
}

module.exports = {
    normalizeJid,
    isValidJid,
    isOwner,
    isElite,
    isAdmin,
    isBotAdmin
};
