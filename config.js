// ===============================
// ⚙️ إعدادات بوت الأباطرة
// ===============================

module.exports = {
    // رقم المطور (بدون +)
    owner: process.env.OWNER_JID ? 
        process.env.OWNER_JID.split(',') :
        ['201149182286@s.whatsapp.net'],

    // بادئة الأوامر
    prefix: '.',

    // اسم البوت
    botName: 'بوت الأباطرة',

    // إصدار البوت
    version: '1.0.0',

    // قاعدة البيانات الافتراضية
    db: {
        elite: [],
        users: {},
        groups: {},
        settings: {}
    }
}
