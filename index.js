const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// إعدادات البوت (LocalAuth عشان يحفظ الجلسة)
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session-data' // مجلد حفظ الجلسة
    }),
    puppeteer: {
        headless: 'new', // الوضع الجديد عشان يشتغل على السيرفرات
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu'
        ]
    }
});

// 1. لما يظهر QR كود
client.on('qr', (qr) => {
    console.log('📱 امسح الكود ده من واتساب (الأجهزة المرتبطة):');
    qrcode.generate(qr, { small: true });
});

// 2. لما البوت يشتغل ويجهز
client.on('ready', () => {
    console.log('✅ البوت شغال على Railway يا معلم!');
});

// 3. مركز الأوامر (الرد على الرسائل)
client.on('message', async (message) => {
    // نمنع البوت يرد على نفسه عشان مايعملش لوب
    if (message.fromMe) return;

    const text = message.body.trim();
    console.log(`📩 جات رسالة من ${message.from}: ${text}`);

    // ------------------ الأوامر الأساسية ------------------
    
    // أمر 1: رد بالسلام
    if (text === 'سلام' || text === 'السلام عليكم') {
        await message.reply('وعليكم السلام ورحمة الله وبركاته');
    }

    // أمر 2: أمر صور (حط رابط صورة حقيقي)
    if (text === 'صور') {
        await client.sendMessage(message.from, {
            image: { url: 'https://cdn.pixabay.com/photo/2023/01/03/08/00/cat-7694419_1280.jpg' },
            caption: '🐱 دي صورتك يا كبير'
        });
    }

    // أمر 3: أمر موقع (إحداثيات القاهرة مثلاً)
    if (text === 'موقعي') {
        await client.sendMessage(message.from, {
            location: {
                degreesLatitude: 30.0444,
                degreesLongitude: 31.2357
            }
        });
    }

    // أمر 4: أمر ملف (بي دي إف وهمي)
    if (text === 'ملف') {
        await client.sendMessage(message.from, {
            document: { url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
            mimetype: 'application/pdf',
            fileName: 'شرح_البوت.pdf'
        });
    }

    // أمر 5: استطلاع رأي (ميزة قوية جداً)
    if (text === 'استطلاع') {
        await client.sendMessage(message.from, {
            poll: {
                name: '📊 أحسن فيلم مصري؟',
                options: ['الجزء الأول', 'الجزء التاني', 'الاتنين حلوين']
            }
        });
    }

    // أمر 6: تشغيل أغنية (فيديو/صوت)
    if (text === 'اغنية') {
        await client.sendMessage(message.from, {
            audio: { url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
            mimetype: 'audio/mpeg',
            fileName: 'song.mp3'
        });
    }
});

// 4. لو حصل أي خطأ في البوت نفسه، اطبعه عشان نعرفه
client.on('disconnected', (reason) => {
    console.log('❌ البوت انفصل:', reason);
});

// 5. تشغيل البوت
client.initialize().catch(err => {
    console.error('❌ فشل التشغيل:', err);
});
