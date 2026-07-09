const adminCmd = require('./admin');
const eliteCmd = require('./elite');
const economyCmd = require('./economy');
const { isElite, isAdmin, normalizeJid } = require('./utils');
const config = require('./config');

const prefix = '.';

async function handleMessage(sock, msg) {
    const from = msg.key.remoteJid;
    const sender = normalizeJid(msg.key.participant || msg.key.remoteJid);
    const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    
    if (!text.startsWith(prefix)) return;
    
    const args = text.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    try {
        // ===== اوامر الاقتصاد =====
        if (command === 'اصطاد' || command === 'hunt') {
            return await economyCmd.hunt(sock, from, sender);
        }

        // ===== اوامر النخبة - للاونر فقط =====
        if (command === 'اضافة_نخبة' || command === 'addelite') {
            if (!config.owner.includes(sender)) 
                return sock.sendMessage(from, { text: '❌ ده للاونر بس يغالي' });
            return await eliteCmd.add(sock, from, sender, args);
        }

        // ===== اوامر الادمن =====
        if (command === 'طرد' || command === 'kick') {
            const isSenderAdmin = await isAdmin(sock, from, sender);
            if (!isSenderAdmin) 
                return sock.sendMessage(from, { text: '❌ لازم تكون ادمن في الجروب' });
            return await adminCmd.kick(sock, from, sender, args);
        }

        // قائمة الاوامر
        if (command === 'الاوامر' || command === 'menu') {
            return sock.sendMessage(from, { text: `
*قائمة الاوامر:*
.اصطاد - تصطاد وتكسب فلوس
.اضافة_نخبة رقم - تضيف للنخبة "اونر فقط"
.طرد رقم - تطرد من الجروب "ادمن فقط"
`});

        }

    } catch (e) {
        console.error(e);
        sock.sendMessage(from, { text: '❌ حصل ايرور: ' + e.message });
    }
}

module.exports = { handleMessage };
