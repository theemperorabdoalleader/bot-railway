// economy.js
const fs = require('fs');
const path = './data.json';

// نجيب الداتا
function getData() {
    if (!fs.existsSync(path)) return {};
    return JSON.parse(fs.readFileSync(path));
}

// نحفظ الداتا
function saveData(data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 2));
}

// فانكشن الكول داون اللي ناقصة
function checkCooldown(lastTime, cooldown) {
    if (!lastTime) return true;
    const now = Date.now();
    return (now - lastTime) > cooldown;
}

async function hunt(sock, from, sender) {
    let data = getData();
    if (!data[sender]) data[sender] = { money: 0, lastHunt: 0 };

    const cooldown = 60000; // دقيقة واحدة
    if (!checkCooldown(data[sender].lastHunt, cooldown)) {
        const left = Math.ceil((cooldown - (Date.now() - data[sender].lastHunt)) / 1000);
        return sock.sendMessage(from, { text: `❌ استنى ${left} ثانية عشان تصطاد تاني` });
    }

    const earn = Math.floor(Math.random() * 100) + 50;
    data[sender].money += earn;
    data[sender].lastHunt = Date.now();
    saveData(data);

    sock.sendMessage(from, { text: `🐦 اصطدت عصفور وكسبت ${earn} جنيه\nرصيدك: ${data[sender].money}` });
}

module.exports = { hunt };
