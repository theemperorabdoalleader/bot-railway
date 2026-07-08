const { isAdmin, normalizeJid } = require('./utils');

async function kick(sock, from, sender, args) {
    if (!await isAdmin(sock, from, sender)) return sock.sendMessage(from, { text: 'لازم تكون ادمن' });
    const target = normalizeJid(args[0]);
    await sock.groupParticipantsUpdate(from, [target], 'remove');
    sock.sendMessage(from, { text: 'تم الطرد' });
}

module.exports = { kick };
