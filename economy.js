// ===============================
// 💰 نظام الاقتصاد
// ===============================

const { getUser, saveDB } = require('./db');

async function run(sock, msg, command, args) {

    const from = msg.key.remoteJid;
    const sender = normalizeJid(msg.key.participant || msg.key.remoteJid);

    // ===========================
    // .اصطاد
    // ===========================

    if (command === 'اصطاد' || command === 'hunt') {

        const user = getUser(sender);

        const cooldown = 60 * 1000;

        if (Date.now() - user.lastHunt < cooldown) {

            const left = Math.ceil(
                (cooldown - (Date.now() - user.lastHunt)) / 1000
            );

            await sock.sendMessage(from, {
                text: `⏳ استنى ${left} ثانية وبعدين اصطاد تاني.`
            });

            return true;
        }

        const reward = Math.floor(Math.random() * 151) + 50;

        user.money += reward;
        user.lastHunt = Date.now();

        await saveDB();

        await sock.sendMessage(from, {
            text:
`🐦 اصطدت بنجاح!

💰 المكافأة: ${reward} جنيه

💵 رصيدك الحالي: ${user.money} جنيه`
        });

        return true;
    }

    // ===========================
    // .فلوسي
    // ===========================

    if (
        command === 'فلوسي' ||
        command === 'رصيدي' ||
        command === 'money'
    ) {

        const user = getUser(sender);

        await sock.sendMessage(from, {
            text:
`💰 رصيدك

💵 المحفظة: ${user.money}
🏦 البنك: ${user.bank}
⭐ المستوى: ${user.level}
✨ الخبرة: ${user.xp}`
        });

        return true;
    }

    return false;
}

module.exports = {
    run
};
