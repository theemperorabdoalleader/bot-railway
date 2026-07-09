const { db } = require('./db');
const { normalizeJid } = require('./utils');
const config = require('./config');

async function add(sock, from, sender, args) {
    if (!config.owner.includes(normalizeJid(sender))) return sock.sendMessage(from, { text: 'للاونر فقط' });
    const target = normalizeJid(args[0]);
    if (!db.elite) db.elite = [];
    sock.sendMessage(from, { text: 'تم اضافة للنخبة ✅' });
}

module.exports = { add };
