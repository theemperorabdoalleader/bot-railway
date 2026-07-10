// ===============================
// 👮 أوامر الإدارة
// ===============================

const {
    isAdmin,
    isBotAdmin,
    normalizeJid,
    isValidJid
} = require('./utils');

async function run(sock, msg, command, args) {

    const from = msg.key.remoteJid;
    const sender = normalizeJid(msg.key.participant || msg.key.remoteJid);

    // ===========================
    // .طرد
    // ===========================

    if (command === 'طرد') {

        try {
            if (!from.endsWith('@g.us'))
                return sock.sendMessage(from, {
                    text: '❌ الأمر للجروبات فقط.'
                });

            if (!(await isAdmin(sock, from, sender)))
                return sock.sendMessage(from, {
                    text: '❌ لازم تكون مشرف.'
                });

            if (!(await isBotAdmin(sock, from)))
                return sock.sendMessage(from, {
                    text: '❌ لازم البوت يكون مشرف.'
                });

            if (!args[0])
                return sock.sendMessage(from, {
                    text: '❌ اكتب أو اعمل منشن للشخص.'
                });

            // استخراج المنشن لو موجود، وإلا خد أول كلمة
            let target = args[0];
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            if (mentioned && mentioned.length > 0) {
                target = mentioned[0]; // أول حد اتعمل له منشن
            }
            if (!target) {
                return sock.sendMessage(from, { text: '❌ اكتب الرقم أو اعمل منشن للشخص.' });
            }
            
            // التحقق من صحة الـ JID
            if (!isValidJid(target)) {
                return sock.sendMessage(from, { 
                    text: '❌ رقم غير صحيح. تأكد من صحة الرقم.' 
                });
            }

            const targetJid = normalizeJid(target);

            // منع طرد البوت نفسه
            if (targetJid === normalizeJid(sock.user.id)) {
                return sock.sendMessage(from, {
                    text: '❌ لا يمكنك طرد البوت!'
                });
            }

            // منع طرد المطور
            if (targetJid === sender) {
                return sock.sendMessage(from, {
                    text: '❌ لا يمكنك طرد نفسك!'
                });
            }

            await sock.groupParticipantsUpdate(
                from,
                [targetJid],
                'remove'
            );

            await sock.sendMessage(from, {
                text: '✅ تم الطرد بنجاح.'
            });

            return true;

        } catch (err) {
            console.error('❌ خطأ في أمر الطرد:', err);
            await sock.sendMessage(from, {
                text: '❌ حدث خطأ أثناء محاولة الطرد. تأكد من وجود المستخدم في المجموعة.'
            });
            return true;
        }
    }

    // ===========================

    return false;
}

module.exports = {
    run
};
