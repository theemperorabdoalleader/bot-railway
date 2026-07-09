// utils.js
const config = require('./config');

function normalizeJid(jid) {
    if (!jid) return ''

    return jid
        .replace(/:\d+/, '')
        .replace('@lid', '@s.whatsapp.net')
        .toLowerCase()
}
async function isElite(sock, jid) {
    jid = normalizeJid(jid);
    return config.elite.includes(jid);
}

async function isAdmin(sock, groupJid, userJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);
        const participant =
metadata.participants.find(p =>
normalizeJid(p.id || p.jid) === normalizeJid(userJid)
);
        return participant?.admin === 'admin' || participant?.admin === 'superadmin';
    } catch {
        return false;
    }
}

module.exports = { normalizeJid, isElite, isAdmin };
