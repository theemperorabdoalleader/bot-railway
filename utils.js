const { normalizeJid } = require('@whiskeysockets/baileys');
const { db } = require('./db');

function isAdmin(sock, groupId, sender) {
    return sock.groupMetadata(groupId).then(meta =>
        meta.participants.find(p => p.id === sender)?.admin
    );
}

function checkCooldown(user, cmd, seconds = 30) {
    const now = Date.now();
    if (!db.cooldowns) db.cooldowns = {};
    if (db.cooldowns[cmd] && now - db.cooldowns[cmd] < seconds * 1000) {
        return Math.ceil((seconds * 1000 - (now - db.cooldowns[cmd])) / 1000);
    }
    db.cooldowns[cmd] = now;
    return false;
}

module.exports = { normalizeJid, isAdmin, checkCooldown };
