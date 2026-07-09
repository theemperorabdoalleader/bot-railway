// ===============================
// 🛠️ أدوات بوت الأباطرة
// ===============================

const config = require('./config');
const { db } = require('./db');

// توحيد الـ JID
function normalizeJid(jid) {
    if (!jid) return '';

    return jid
        .replace(/:\d+@/, '@')
        .replace('@lid', '@s.whatsapp.net')
        .toLowerCase();
}

// هل الشخص هو المطور؟
function isOwner(jid) {
    jid = normalizeJid(jid);
    return config.owner.some(owner => normalizeJid(owner) === jid);
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

        const botId = normalizeJid(sock.user.id);

        const participant = metadata.participants.find(
            p => normalizeJid(p.id || p.jid) === botId
        );

        return (
            participant?.admin === 'admin' ||
            participant?.admin === 'superadmin'
        );

    } catch (err) {
        return false;
    }
}

module.exports = {
    normalizeJid,
    isOwner,
    isElite,
    isAdmin,
    isBotAdmin
};
