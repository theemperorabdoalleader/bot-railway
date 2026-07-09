// ===============================
// 💾 قاعدة بيانات بوت الأباطرة
// ===============================

const fs = require('fs');
const path = './database.json';

let db = {
    elite: [],
    users: {},
    groups: {},
    settings: {}
};

// تحميل قاعدة البيانات
async function loadDB() {
    try {
        if (fs.existsSync(path)) {
            const data = JSON.parse(fs.readFileSync(path, 'utf8'));

            db = {
                elite: data.elite || [],
                users: data.users || {},
                groups: data.groups || {},
                settings: data.settings || {}
            };
        } else {
            saveDB();
        }
    } catch (err) {
        console.error('❌ خطأ في تحميل قاعدة البيانات:', err);
    }
}

// حفظ قاعدة البيانات
async function saveDB() {
    try {
        fs.writeFileSync(path, JSON.stringify(db, null, 2));
    } catch (err) {
        console.error('❌ خطأ في حفظ قاعدة البيانات:', err);
    }
}

// إنشاء مستخدم إذا لم يكن موجوداً
function getUser(jid) {
    if (!db.users[jid]) {
        db.users[jid] = {
            money: 0,
            bank: 0,
            xp: 0,
            level: 1,
            lastDaily: 0,
            lastWork: 0,
            lastHunt: 0
        };
    }

    return db.users[jid];
}

// إنشاء بيانات الجروب
function getGroup(jid) {
    if (!db.groups[jid]) {
        db.groups[jid] = {
            mute: false
        };
    }

    return db.groups[jid];
}

module.exports = {
    db,
    loadDB,
    saveDB,
    getUser,
    getGroup
};
