const config = require('./config');
const { normalizeJid } = require('./utils');
const adminCmd = require('./admin');
const eliteCmd = require('./elite');
const economyCmd = require('./economy');
async function handleMessage(sock, msg) {
    const m = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!m.startsWith(config.prefix)) return;

    const args = m.slice(config.prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;

    if (cmd === 'addelite') return eliteCmd.add(sock, from, sender, args);
    if (cmd === 'kick') return adminCmd.kick(sock, from, sender, args);
    if (cmd === 'hunt') return economyCmd.hunt(sock, from, sender);
}

module.exports = handleMessage;
