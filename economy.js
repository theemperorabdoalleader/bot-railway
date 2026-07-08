const { checkCooldown } = require('./utils');

async function hunt(sock, from, sender) {
    const cd = checkCooldown(sender, 'hunt', 30);
    if (cd) return sock.sendMessage(from, { text: `استنى ${cd} ثانية` });
    sock.sendMessage(from, { text: 'اصطدت غزال +100$ 💰' });
}

module.exports = { hunt };
