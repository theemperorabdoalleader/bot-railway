const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, downloadMediaMessage } = require('@whiskeysockets/baileys')
const pino = require('pino')
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const sharp = require('sharp')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
ffmpeg.setFfmpegPath(ffmpegInstaller.path)
const ytdl = require('@distube/ytdl-core');
const yts = require('yt-search');
const QRCode = require('qrcode');
const express = require('express');

const SESSION_FOLDER = './session'
const DB_FILE = './database.json'

const app = express();
let latestQR = null;
app.get('/', async (req, res) => {
    if (!latestQR) return res.send('<h1>مستني QR... شغل البوت</h1>');
    const img = await QRCode.toDataURL(latestQR);
    res.send(`<html><head><meta http-equiv="refresh" content="20"><meta name="viewport" content="width=device-width"><style>body{background:#000;display:flex;align-items:center;justify-content:center;height:100vh}img{width:95%;max-width:450px}</style></head><body><img src="${img}"/></body></html>`);
});
app.listen(3000, '0.0.0.0', () => console.log('السيرفر شغال'))

const DEVELOPER_NUMBER = '201149182286'
const DEVELOPER_JID = `${DEVELOPER_NUMBER}@s.whatsapp.net`

const TRIVIA_QUESTIONS = [
    { q: '🌍 ما عاصمة فرنسا؟', a: 'باريس' },
    { q: '🌍 ما عاصمة اليابان؟', a: 'طوكيو' },
    { q: '🌍 ما عاصمة البرازيل؟', a: 'برازيليا' },
    { q: '🌍 ما عاصمة أستراليا؟', a: 'كانبيرا' },
    { q: '🌍 ما عاصمة كندا؟', a: 'أوتاوا' },
    { q: '🌍 ما أكبر قارة في العالم؟', a: 'آسيا' },
    { q: '🌍 ما أصغر دولة في العالم؟', a: 'الفاتيكان' },
    { q: '🌍 ما أطول نهر في العالم؟', a: 'النيل' },
    { q: '🌍 ما أعلى جبل في العالم؟', a: 'إيفرست' },
    { q: '🌍 كم عدد قارات العالم؟', a: '7' },
    { q: '⚽ من فاز بكأس العالم 2022؟', a: 'الأرجنتين' },
    { q: '⚽ من فاز بكأس العالم 2018؟', a: 'فرنسا' },
    { q: '⚽ في أي دولة أقيمت كأس العالم 2022؟', a: 'قطر' },
    { q: '🔬 ما أسرع حيوان في العالم؟', a: 'الفهد' },
    { q: '🔬 كم عدد أسنان الإنسان البالغ؟', a: '32' },
    { q: '🔬 ما عدد عظام جسم الإنسان؟', a: '206' },
    { q: '🔬 كم تبعد الشمس عن الأرض (تقريباً)؟', a: '150 مليون كم' },
    { q: '🔬 ما أكبر كوكب في المجموعة الشمسية؟', a: 'المشتري' },
    { q: '🔬 ما المادة الأكثر صلابة في الطبيعة؟', a: 'الماس' },
    { q: '📖 من كتب رواية موبي ديك؟', a: 'هيرمان ملفيل' },
    { q: '📖 ما أول سورة في القرآن الكريم؟', a: 'الفاتحة' },
    { q: '📖 كم عدد سور القرآن الكريم؟', a: '114' },
    { q: '📖 ما عدد آيات سورة البقرة؟', a: '286' },
    { q: '🧮 كم ناتج 15 × 15؟', a: '225' },
    { q: '🧮 كم ناتج 12 × 12؟', a: '144' },
    { q: '🧮 ما جذر 144؟', a: '12' },
    { q: '🧮 ما جذر 256؟', a: '16' },
    { q: '🌙 ما أكبر محيطات العالم؟', a: 'المحيط الهادئ' },
    { q: '🌙 كم عدد أيام السنة الكبيسة؟', a: '366' },
    { q: '🌙 في أي عام وصل الإنسان للقمر؟', a: '1969' },
    { q: '🎨 من رسم الموناليزا؟', a: 'ليوناردو دافنشي' },
    { q: '🎨 ما اسم صاحب نظرية النسبية؟', a: 'أينشتاين' },
    { q: '🎨 من اخترع الهاتف؟', a: 'جراهام بيل' },
    { q: '🎨 من اخترع الكهرباء (المصباح)؟', a: 'إديسون' },
    { q: '🌊 كم يغطي الماء من سطح الأرض؟', a: '71%' },
    { q: '🌊 ما الغاز الأكثر وفرة في الغلاف الجوي؟', a: 'النيتروجين' },
    { q: '🌊 ما الغاز الذي نتنفسه؟', a: 'الأكسجين' },
    { q: '⭐ كم عدد نجوم علم الولايات المتحدة؟', a: '50' },
    { q: '⭐ كم عدد ألوان قوس قزح؟', a: '7' },
    { q: '⭐ ما عاصمة مصر؟', a: 'القاهرة' },
    { q: '⭐ ما عاصمة السعودية؟', a: 'الرياض' },
    { q: '⭐ ما عاصمة الإمارات؟', a: 'أبوظبي' },
    { q: '⭐ ما عاصمة المغرب؟', a: 'الرباط' },
    { q: '⭐ ما أكبر مدن العالم من حيث عدد السكان؟', a: 'طوكيو' },
    { q: '⭐ ما أقدم حضارة في العالم؟', a: 'السومرية' },
]

// ====== الألغاز - أكثر من 50 لغز ======
const PUZZLES = [
    { q: '🤔 ما هو الشيء الذي له أسنان لكن لا يعض؟', a: 'مشط', hint: 'يُستخدم للشعر' },
    { q: '🤔 كلما أخذت منه كبر، ما هو؟', a: 'حفرة', hint: 'في الأرض' },
    { q: '🤔 ما هو الشيء الذي يمشي على أربع في الصباح وعلى اثنين في الظهر وعلى ثلاث في المساء؟', a: 'إنسان', hint: 'نحن هم!' },
    { q: '🤔 ما هو الشيء الذي ينام ويستيقظ ولا يتحرك؟', a: 'ساعة', hint: 'تُخبرك بالوقت' },
    { q: '🤔 ما هو الشيء الذي له رأس وذيل ولكن ليس له جسم؟', a: 'عملة', hint: 'تستخدمها في البنك' },
    { q: '🤔 ما الذي يطير بلا أجنحة ويسري بلا قدم؟', a: 'وقت', hint: 'لا يمكنك إيقافه' },
    { q: '🤔 كلما غسلته يصبح أكثر قذارة، ما هو؟', a: 'ماء', hint: 'نشربه' },
    { q: '🤔 ما هو الشيء الذي عندما تنظر إليه ترى نفسك؟', a: 'مرآة', hint: 'في الحمام' },
    { q: '🤔 لديه مفاتيح ولكن لا أبواب له، ما هو؟', a: 'بيانو', hint: 'آلة موسيقية' },
    { q: '🤔 ما هو الشيء الذي يكون أمامك دائماً لكنك لا تستطيع رؤيته؟', a: 'مستقبل', hint: 'الغد والأيام القادمة' },
    { q: '🤔 ما الشيء الذي له عيون ولكن لا يرى؟', a: 'إبرة', hint: 'تستخدمه في الخياطة' },
    { q: '🤔 ما الشيء الذي كلما أخذت منه كبر؟', a: 'حفرة', hint: 'في التراب' },
    { q: '🤔 ما هو الشيء الذي يسقط ولا ينكسر ويكسر ولا يسقط؟', a: 'ليل ونهار', hint: 'الزمن' },
    { q: '🤔 ما هو البيت الذي يُحمل على الظهر؟', a: 'حلزون', hint: 'حيوان صغير بطيء' },
    { q: '🤔 ما هو الشيء الذي له أذنان ولا يسمع؟', a: 'إبريق', hint: 'تصب منه الشاي' },
    { q: '🤔 ما الذي يمشي وهو جالس؟', a: 'سفينة', hint: 'تسير في البحر' },
    { q: '🤔 ما هو الشيء الذي كلما أكثرت منه قل؟', a: 'عمر', hint: 'يمر مع الوقت' },
    { q: '🤔 ما هو الشيء الذي لا يُرى ولا يُشم ولكن يُحس؟', a: 'هواء', hint: 'نتنفسه' },
    { q: '🤔 ما هو الشيء الذي إذا سقط لا يُكسر وإذا وقع في الماء يختفي؟', a: 'ورقة', hint: 'نكتب عليها' },
    { q: '🤔 ما هو الشيء الذي له وجه ولكن ليس له رأس؟', a: 'ساعة', hint: 'على الحائط' },
    { q: '🤔 ما هو الشيء الذي يدور ولا يتحرك من مكانه؟', a: 'مروحة', hint: 'تبرد الهواء' },
    { q: '🤔 ما الشيء الذي يُفتح ولا يُغلق؟', a: 'بيضة', hint: 'تجده في المطبخ' },
    { q: '🤔 ما هو الشيء الذي يجري ولا يمشي وله فم ولا يتكلم؟', a: 'نهر', hint: 'مياه تجري' },
    { q: '🤔 ما هو الشيء الذي أحمر من الخارج وأبيض من الداخل؟', a: 'تفاحة', hint: 'فاكهة' },
    { q: '🤔 ما هو الشيء الذي يكبر كلما أكلت ويصغر كلما شربت؟', a: 'نار', hint: 'حرارة ولهب' },
    { q: '🤔 ما هو الشيء الذي لا يُرى ولكن يُسمع؟', a: 'صوت', hint: 'تسمعه بأذنيك' },
    { q: '🤔 ما هو الشيء الذي يطول في الشتاء ويقصر في الصيف؟', a: 'ليل', hint: 'عكس النهار' },
    { q: '🤔 ما هو الشيء الذي ينام بعيون مفتوحة؟', a: 'سمكة', hint: 'في الماء' },
    { q: '🤔 ما الشيء الذي يأكل ولا يشرب؟', a: 'نار', hint: 'ساخنة ومضيئة' },
    { q: '🤔 ما هو الشيء الذي له أجنحة ولكنه لا يطير؟', a: 'دجاجة', hint: 'طير منزلي' },
    { q: '🤔 ما هو الشيء الذي يُعطيك الدفء ولا يمكنك لمسه؟', a: 'شمس', hint: 'في السماء' },
    { q: '🤔 ما هو الشيء الذي يقترب منك كلما ابتعدت عنه؟', a: 'ظل', hint: 'يتبعك دائماً' },
    { q: '🤔 ما الشيء الذي إذا أضفت إليه الكثير أصبح أقل؟', a: 'حفرة', hint: 'في الأرض' },
    { q: '🤔 ما الشيء الذي يُسمع ولا يُرى ويُحس ولا يُمس؟', a: 'ريح', hint: 'تتحرك في الهواء' },
    { q: '🤔 ما هو الشيء الذي يعيش ويأكل ولكنه لا يتحرك؟', a: 'شجرة', hint: 'في الحديقة' },
    { q: '🤔 ما هو الشيء الذي جسمه في البحر ورأسه في السماء؟', a: 'مرساة', hint: 'تثبت السفينة' },
    { q: '🤔 ما هو الشيء الذي يُغلق بالليل ويُفتح بالنهار؟', a: 'عين', hint: 'تراه في وجهك' },
    { q: '🤔 ما هو الشيء الذي له ظهر ولا يمشي؟', a: 'كرسي', hint: 'تجلس عليه' },
    { q: '🤔 ما هو الشيء الذي تملأه بالهواء ويطير؟', a: 'بالون', hint: 'في الأعياد' },
    { q: '🤔 ما هو الشيء الذي يُشرب ولا يُؤكل وبدونه لا حياة؟', a: 'ماء', hint: 'سائل شفاف' },
    { q: '🤔 ما هو الشيء الذي له سطح ولكن ليس له أعماق؟', a: 'صورة', hint: 'تراها على الحائط' },
    { q: '🤔 ما الشيء الذي كلما أضأت النور اختفى؟', a: 'ظلام', hint: 'عكس النور' },
    { q: '🤔 ما هو الشيء الذي يأتي مرة واحدة في السنة؟', a: 'عيد ميلاد', hint: 'يوم خاص' },
    { q: '🤔 ما هو الشيء الذي يُنبت في الأرض ويُؤكل نيئاً؟', a: 'جزر', hint: 'برتقالي اللون' },
    { q: '🤔 ما هو الشيء الذي يُقلب ولا يُكسر؟', a: 'صفحة', hint: 'في الكتاب' },
    { q: '🤔 ما الشيء الذي يحترق ولا يُحرق؟', a: 'شمعة', hint: 'تضيء في الظلام' },
    { q: '🤔 ما هو الشيء الذي تراه كل يوم ولكن لا تستطيع لمسه؟', a: 'سماء', hint: 'فوقنا دائماً' },
    { q: '🤔 ما هو الشيء الذي له قلب ولكن لا دم فيه؟', a: 'شجرة', hint: 'لها جذع وأغصان' },
    { q: '🤔 ما هو الشيء الذي يدور حول العالم ولكنه يبقى في زاوية واحدة؟', a: 'طابع بريدي', hint: 'على الرسائل' },
    { q: '🤔 ما الشيء الذي تكسره قبل استخدامه؟', a: 'بيضة', hint: 'تطبخها في المطبخ' },
    { q: '🤔 ما هو الشيء الذي له ذراعان ولكنه لا يستطيع الحمل؟', a: 'ساعة', hint: 'عقارب الوقت' },
    { q: '🤔 ما هو الشيء الذي يُحفر في الصيف ويُستخدم في الشتاء؟', a: 'بئر', hint: 'فيها ماء' },
    { q: '🤔 ما هو الشيء الذي لا يزن شيئاً ولكن لا يستطيع أقوى رجل حمله لفترة طويلة؟', a: 'نفس', hint: 'تتوقف عن التنفس' },
    { q: '🤔 ما هو الشيء الذي يكبر كلما أضفت إليه ماء؟', a: 'عجين', hint: 'تصنع منه الخبز' },
]

// ====== أعين الأنمي - 35 عين شغالة ======
const ANIME_EYES = [
    { name: 'شارينغان - ساسكي', url: 'https://i.postimg.cc/6qZ3bG1R/sasuke-sharingan.jpg' },
    { name: 'رينيغان - ناغاتو', url: 'https://i.postimg.cc/8z4kV9cL/nagato-rinnegan.jpg' },
    { name: 'جيوغان - بوروتو', url: 'https://i.postimg.cc/0j1bF3c2/boruto-jougan.jpg' },
    { name: 'باياكوغان - هيناتا', url: 'https://i.postimg.cc/8gY5v1w2/hinata-byakugan.jpg' },
    { name: 'مانكيو - ايتاشي', url: 'https://i.postimg.cc/1z6w2k3P/itachi-mangekyou.jpg' },
    { name: 'شارينغان - كاكاشي', url: 'https://i.postimg.cc/4d2b2f2Q/kakashi-sharingan.jpg' },
    { name: 'عين كانيكي - توكيو غول', url: 'https://i.postimg.cc/7h3g4k5L/kaneki-eyes.jpg' },
    { name: 'عين نيزوكو', url: 'https://i.postimg.cc/2y8m1v2w/nezuko-eyes.jpg' },
    { name: 'عين إيتشيغو - هولو', url: 'https://i.postimg.cc/9X5y2b3q/ichigo-hollow.jpg' },
    { name: 'عين مادارا', url: 'https://i.postimg.cc/3j8z1q4w/madara-rinnegan.jpg' },
    { name: 'عين نارم - ون بيس', url: 'https://i.postimg.cc/5n2k3b1v/nami-eyes.jpg' },
    { name: 'عين شانكس', url: 'https://i.postimg.cc/7f1g2b3c/shanks-eyes.jpg' },
    { name: 'عين زورو', url: 'https://i.postimg.cc/9q2h4b1m/zoro-eyes.jpg' },
    { name: 'عين لوفي - غير 5', url: 'https://i.postimg.cc/1t3b2v4n/luffy-gear5.jpg' },
    { name: 'عين غوكو - الترا', url: 'https://i.postimg.cc/6q1b2v3m/goku-ultra.jpg' },
    { name: 'عين فيجيتا', url: 'https://i.postimg.cc/4n3b1v2q/vegeta-eyes.jpg' },
    { name: 'عين برولي', url: 'https://i.postimg.cc/8z2b1v3w/broly-eyes.jpg' },
    { name: 'عين إدوارد', url: 'https://i.postimg.cc/2y1b2v3q/edward-eyes.jpg' },
    { name: 'عين روي موستانغ', url: 'https://i.postimg.cc/7h2b1v3m/mustang-eyes.jpg' },
    { name: 'عين ليلوش - جياس', url: 'https://i.postimg.cc/9x1b2v3q/lelouch-geass.jpg' },
    { name: 'عين كيلوا', url: 'https://i.postimg.cc/5n1b2v3m/killua-eyes.jpg' },
    { name: 'عين غون', url: 'https://i.postimg.cc/8g1b2v3q/gon-eyes.jpg' },
    { name: 'عين هيسوكا', url: 'https://i.postimg.cc/3j1b2v3w/hisoka-eyes.jpg' },
    { name: 'عين ليفاي', url: 'https://i.postimg.cc/4d1b2v3q/levi-eyes.jpg' },
    { name: 'عين ايرين', url: 'https://i.postimg.cc/6q1b2v3m/eren-eyes.jpg' },
    { name: 'عين ميكاسا', url: 'https://i.postimg.cc/8z1b2v3w/mikasa-eyes.jpg' },
    { name: 'عين تانجيرو', url: 'https://i.postimg.cc/2y1b2v3q/tanjiro-eyes.jpg' },
    { name: 'عين زينيتسو', url: 'https://i.postimg.cc/7h1b2v3m/zenitsu-eyes.jpg' },
    { name: 'عين غوجو', url: 'https://i.postimg.cc/9x1b2v3q/gojo-eyes.jpg' },
    { name: 'عين ميغومي', url: 'https://i.postimg.cc/5n1b2v3m/megumi-eyes.jpg' },
    { name: 'عين ديكو', url: 'https://i.postimg.cc/8g1b2v3q/deku-eyes.jpg' },
    { name: 'عين باكوغو', url: 'https://i.postimg.cc/3j1b2v3w/bakugo-eyes.jpg' },
    { name: 'عين تودوروكي', url: 'https://i.postimg.cc/4d1b2v3q/todoroki-eyes.jpg' },
    { name: 'عين لايت', url: 'https://i.postimg.cc/6q1b2v3m/light-eyes.jpg' },
    { name: 'عين L', url: 'https://i.postimg.cc/8z1b2v3w/L-deathnote.jpg' },
]

function loadDB() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: {}, puzzles: {}, groups: {} }, null, 2))
    }
    try {
        const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
        if (!data.groups) data.groups = {}
        if (!data.msgCount) data.msgCount = {}
        if (!data.challenges) data.challenges = {}
        if (!data.duels) data.duels = {}
        if (!data.eyeGames) data.eyeGames = {}
        return data
    } catch {
        return { users: {}, puzzles: {}, groups: {}, msgCount: {}, challenges: {}, duels: {}, eyeGames: {} }
    }
}

function saveDB(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

function getUser(db, id) {
    if (!db.users[id]) {
        db.users[id] = {
            wallet: 500,
            bank: 0,
            xp: 0,
            level: 1,
            lastSalary: 0,
            lastFish: 0,
            lastAdventure: 0,
            lastPuzzle: 0
        }
    }
    return db.users[id]
}

function getGroup(db, groupId) {
    if (!db.groups[groupId]) {
        db.groups[groupId] = {
            mode: 'اعضاء',
            elite: [],
            muted: [],
            banned: [],
            warnings: {}
        }
    }
    if (!db.groups[groupId].banned) db.groups[groupId].banned = []
    if (!db.groups[groupId].warnings) db.groups[groupId].warnings = {}
    return db.groups[groupId]
}

function calcLevel(xp) {
    return Math.floor(xp / 100) + 1
}

function addXP(user, amount) {
    user.xp += amount
    user.level = calcLevel(user.xp)
}

function canUseBot(senderId, groupData, isAdmin) {
    const cleanSender = senderId.split('@')[0]
    if (cleanSender === DEVELOPER_NUMBER || senderId === DEVELOPER_JID) return true
    if (!groupData) return true
    const mode = groupData.mode || 'اعضاء'
    if (mode === 'اعضاء') return true
    if (mode === 'مشرفين') return isAdmin
    if (mode === 'نخبة') return groupData.elite.includes(senderId) || isAdmin
    return true
}

function canModerate(senderId, isAdmin) {
    const cleanSender = senderId.split('@')[0]
    return cleanSender === DEVELOPER_NUMBER || senderId === DEVELOPER_JID || isAdmin
}

function isDeveloper(senderId) {
    return senderId.split('@')[0] === DEVELOPER_NUMBER || senderId === DEVELOPER_JID
}

async function startBot() {
    console.log('بشغل البوت...')

    if (process.env.SESSION_DATA && !fs.existsSync(path.join(SESSION_FOLDER, 'creds.json'))) {
        console.log('⏳ بيحمل السيشن من ENV...')
        fs.mkdirSync(SESSION_FOLDER, { recursive: true })
        const files = JSON.parse(Buffer.from(process.env.SESSION_DATA, 'base64').toString())
        for (const [filename, content] of Object.entries(files)) {
            fs.writeFileSync(path.join(SESSION_FOLDER, filename), Buffer.from(content, 'base64'))
        }
        console.log('✅ تم تحميل السيشن بنجاح')
    }

    const { state, saveCreds } = await useMultiFileAuthState(SESSION_FOLDER)

    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: ['Chrome', 'Windows', '10.0.0'],
        qrTimeout: 60000
    })

    sock.ev.on('creds.update', async () => {
        await saveCreds()
        if (fs.existsSync(path.join(SESSION_FOLDER, 'creds.json')) && !process.env.SESSION_DATA) {
            let files = {}
            const filenames = fs.readdirSync(SESSION_FOLDER)
            for (const file of filenames) {
                const content = fs.readFileSync(path.join(SESSION_FOLDER, file))
                files[file] = content.toString('base64')
            }
            const sessionData = Buffer.from(JSON.stringify(files)).toString('base64')
            console.log('\n========== انسخ ده كله مرة واحدة في SESSION_DATA ==========')
            console.log(sessionData)
            console.log('=================================================\n')
        }
    })

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update
        if (qr) {
            latestQR = qr;
            console.log('🔄 QR جديد جاهز — افتح اللينك في المتصفح')
        }
        if (connection === 'close') {
            latestQR = null
            const statusCode = lastDisconnect?.error?.output?.statusCode
            if (statusCode === DisconnectReason.loggedOut) {
                console.log('❌ تم تسجيل الخروج.')
                process.exit(1)
            }
            setTimeout(() => startBot(), 5000)
        } else if (connection === 'open') {
            latestQR = null
            console.log('✅ البوت اشتغل بنجاح واتصل بالواتساب 🔥')
        }
    })

    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update
        if (action !== 'add') return
        try {
            const db = loadDB()
            const groupData = getGroup(db, id)
            for (const participant of participants) {
                if (groupData.banned.includes(participant)) {
                    await sock.groupParticipantsUpdate(id, [participant], 'remove')
                    await sock.sendMessage(id, {
                        text: `🚫 تم طرد @${participant.split('@')[0]} تلقائياً لأنه محظور من الجروب`,
                        mentions: [participant]
                    })
                }
            }
        } catch (e) { }
    })

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0]
        if (!msg.message || msg.key.fromMe) return

        const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
        const from = msg.key.remoteJid
        const name = msg.pushName || 'مجهول'
        const senderId = msg.key.participant || msg.key.remoteJid
        const isGroup = from.endsWith('@g.us')

        if (isGroup) {
            const db = loadDB()
            const groupData = getGroup(db, from)
            if (groupData.muted.includes(senderId)) {
                try { await sock.sendMessage(from, { delete: msg.key }) } catch (e) { }
                return
            }
        }
// ====== فحص إجابات التحدي النشط ======
        if (isGroup && text &&!text.startsWith('.')) {
            try {
                const db = loadDB()

                // فحص إجابات لعبة العين
                if (db.eyeGames && db.eyeGames[from]) {
                    const eyeGame = db.eyeGames[from]
                    const now = Date.now()
                    if (now > eyeGame.expiresAt) {
                        delete db.eyeGames[from]
                        saveDB(db)
                        await sock.sendMessage(from, {
                            text: `⏰ انتهى وقت لعبة العين!\n✅ الإجابة كانت: *${eyeGame.answer}*`
                        })
                    } else {
                        const userAnswer = text.trim().toLowerCase()
                        const correctAnswer = eyeGame.answer.trim().toLowerCase()
                        if (userAnswer === correctAnswer || correctAnswer.includes(userAnswer) || userAnswer.includes(correctAnswer)) {
                            const winner = getUser(db, senderId)
                            winner.wallet += 300
                            addXP(winner, 30)
                            delete db.eyeGames[from]
                            saveDB(db)
                            await sock.sendMessage(from, {
                                text:
                                    `🎉 *إجابة صحيحة!*\n\n` +
                                    `🏆 الفائز: @${senderId.split('@')[0]}\n` +
                                    `✅ الإجابة: *${eyeGame.answer}*\n` +
                                    `💰 المكافأة: +300 🪙\n` +
                                    `✨ خبرة: +30 XP`,
                                mentions: [senderId]
                            })
                        }
                    }
                }

                // فحص إجابات المبارزة
                const duel = db.duels[from]
                if (duel) {
                    const now = Date.now()
                    if (now > duel.expiresAt) {
                        delete db.duels[from]; saveDB(db) // <- صلحتها db
                        await sock.sendMessage(from, { text: `⏰ *انتهى وقت المبارزة!*\n✅ الإجابة: *${duel.answer}*\n💔 الفلوس رجعت لأصحابها` }) // <- صلحتها duel.answer
                    }
                }
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) } // <- ال try صح
            }
                    } else if (senderId === duel.challenger || senderId === duel.challenged) {
                        const userAnswer = text.trim().toLowerCase()
                        const correctAnswer = duel.answer.trim().toLowerCase()
                        if (userAnswer === correctAnswer || userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer)) {
                            const loserId = senderId === duel.challenger ? duel.challenged : duel.challenger
                            const prize = duel.amount
                            const winnerUser = getUser(db, senderId)
                            const loserUser = getUser(db, loserId)
                            if (loserUser.wallet >= prize) {
                                loserUser.wallet -= prize
                            } else {
                                const fromBank = Math.min(loserUser.bank, prize - loserUser.wallet)
                                loserUser.wallet = 0
                                loserUser.bank -= fromBank
                            }
                            winnerUser.wallet += prize
                            addXP(winnerUser, 30)
                            delete db.duels[from]
                            saveDB(db)
                            await sock.sendMessage(from, {
                                text:
                                    `🎉 *انتهى التحدي!*\n\n` +
                                    `✅ الإجابة الصحيحة: *${duel.answer}*\n\n` +
                                    `🏆 الفائز: @${senderId.split('@')[0]}\n` +
                                    `💸 الخاسر: @${loserId.split('@')[0]}\n\n` +
                                    `💰 المبلغ المنقول: ${prize} 🪙\n` +
                                    `⭐ +30 XP للفائز`,
                                mentions: [senderId, loserId]
                            })
                        }
                    }
                }
            } catch (e) { }
        }

        // ====== عداد الرسائل ======
        if (isGroup && text) {
            try {
                const db = loadDB()
                const today = new Date().toISOString().slice(0, 10)
                if (!db.msgCount[from]) db.msgCount[from] = {}
                if (!db.msgCount[from][senderId]) db.msgCount[from][senderId] = {}
                if (!db.msgCount[from][senderId][today]) db.msgCount[from][senderId][today] = 0
                db.msgCount[from][senderId][today]++
                saveDB(db)
            } catch (e) { }
        }

        if (isGroup && text.startsWith('.')) {
            try {
                const db = loadDB()
                const groupData = getGroup(db, from)
                const groupMeta = await sock.groupMetadata(from)
                const isAdmin = groupMeta.participants.find(p => p.id === senderId)?.admin != null
                if (!canUseBot(senderId, groupData, isAdmin)) {
                    const modeTxt = groupData.mode === 'مشرفين' ? 'المشرفين فقط' : 'النخبة فقط'
                    await sock.sendMessage(from, { text: `🔒 البوت في وضع *${modeTxt}* - مش تقدر تستخدمه` })
                    return
                }
            } catch (e) { }
        }

        // ================================================================
        // ========================= الأوامر ==============================
        // ================================================================

        if (text === '.هاي') {
            await sock.sendMessage(from, { text: `هاي يا ${name} 💪\nالبوت شغال 24 ساعة` })
        }

        else if (text === '.بنج') {
            await sock.sendMessage(from, { text: 'بنج 🏓 البوت صاحي' })
        }

        else if (text === '.منو') {
            await sock.sendMessage(from, { text: `انت ${name} يا زعيم 👑` })
        }

        else if (text === '.الاوامر') {
            const menu =
                `╔══════════════════════╗\n` +
                `║   🤖 *اوامر البوت*   ║\n` +
                `╚══════════════════════╝\n\n` +

                `━━━━━━━ 🔧 *عام* ━━━━━━━\n` +
                `▸ .هاي — ترحيب\n` +
                `▸ .بنج — تشيك البوت\n` +
                `▸ .منو — يعرف اسمك\n` +
                `▸ .الاوامر — قائمة الأوامر\n\n` +

                `━━━━ 📊 *إحصائيات* ━━━━\n` +
                `▸ .احصائيات — إحصائيات الجروب\n` +
                `▸ .نشاط — أكثر 10 أعضاء نشاطاً\n` +
                `▸ .رسائلي — رسائلك اليوم\n\n` +

                `━━━━━━ 🎨 *وسائط* ━━━━━━\n` +
                `▸ .ستيكر — رد على صورة\n` +
                `▸ .ستيكر متحرك — رد على فيديو\n` +
                `▸ .صور [كلمة] — 3 صور افتراضي\n` +
                `▸ .صور [كلمة] [1-10] — تحديد العدد\n` +
                `▸ .اغنية [اسم] — تنزيل اغنية MP3\n\n` +

                `━━━━━━ 🛠️ *أدوات* ━━━━━━\n` +
                `▸ .ترجمة [نص] — ترجمة لانجليزي\n` +
                `▸ .حاسبة [معادلة] — حاسبة\n` +
                `▸ .مين ادمن — مشرفي الجروب\n` +
                `▸ .رابط الجروب — رابط الدعوة\n\n` +

                `━━━ 🛡️ *إشراف (مشرفين)* ━━━\n` +
                `▸ .مود مشرفين / نخبة / اعضاء\n` +
                `▸ .اضافة للنخبة @شخص\n` +
                `▸ .تحذير @شخص [سبب]\n` +
                `▸ .انذار @شخص — 3 انذارات = طرد\n` +
                `▸ .طرد @شخص\n` +
                `▸ .باند @شخص [سبب]\n` +
                `▸ .الغاء باند @شخص\n` +
                `▸ .قائمة الباند\n` +
                `▸ .كتم @شخص\n` +
                `▸ .الغاء كتم @شخص\n` +
                `▸ .قائمة المكتومين\n\n` +

                `━━━━━ 💰 *اقتصاد* ━━━━━\n` +
                `▸ .فلوسي — رصيدك\n` +
                `▸ .مستواي — مستواك\n` +
                `▸ .راتب — راتب يومي\n` +
                `▸ .ايداع / .سحب [مبلغ]\n` +
                `▸ .تحويل @شخص [مبلغ]\n` +
                `▸ .اغنى — ترتيب الأغنى\n` +
                `▸ .مستويات — ترتيب المستويات\n\n` +

                `━━━━━━ 🎮 *ألعاب* ━━━━━━\n` +
                `▸ .زهر [مبلغ] — لعبة الزهر\n` +
                `▸ .تخمين [مبلغ] [1-10]\n` +
                `▸ .حجر [مبلغ] [حجر/ورقة/مقص]\n` +
                `▸ .صيد — اصطياد السمك\n` +
                `▸ .مغامرة — مغامرة عشوائية\n\n` +

                `━━━━━━ 🧩 *ألغاز* ━━━━━━\n` +
                `▸ .لغز — لغز بمكافأة 200 🪙\n` +
                `▸ .جواب [إجابة]\n` +
                `▸ .تلميح — تلميح مقابل 50 🪙\n\n` +

                `━━━━━━ 👁️ *لعبة العين* ━━━━━━\n` +
                `▸ .عين — خمن عين الأنمي واكسب 300 🪙\n\n` +

                `━━━━━━ ⚔️ *تحدي* ━━━━━━\n` +
                `▸ .تحدي @شخص [مبلغ]\n` +
                `▸ .قبول / .رفض\n\n` +

                `━━━━━━ 🛒 *متجر* ━━━━━━\n` +
                `▸ .متجر — عرض الألقاب\n` +
                `▸ .اشتري [رقم]\n` +
                `▸ .لقبي / .ازالة لقب`

            await sock.sendMessage(from, { text: menu })
        }

        // ====== وسائط ======
        else if (text === '.ستيكر') {
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted?.imageMessage) { return await sock.sendMessage(from, { text: '📸 رد على صورة واكتب .ستيكر' }) }
            try {
                await sock.sendMessage(from, { text: '⏳ جاري إنشاء الستيكر...' })
                const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage })
                const webpBuffer = await sharp(buffer).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp({ quality: 50 }).toBuffer()
                await sock.sendMessage(from, { sticker: webpBuffer })
            } catch (err) { console.error('Sticker Error:', err); await sock.sendMessage(from, { text: '❌ فشل إنشاء الستيكر' }) }
        }

        else if (text === '.ستيكر متحرك') {
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted?.videoMessage) { return await sock.sendMessage(from, { text: '🎥 رد على فيديو واكتب .ستيكر متحرك' }) }
            let inputPath; let outputPath;
            try {
                await sock.sendMessage(from, { text: '⏳ جاري إنشاء الستيكر المتحرك...' })
                const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage })
                inputPath = `./temp_${Date.now()}.mp4`; outputPath = `./temp_${Date.now()}.webp`
                fs.writeFileSync(inputPath, buffer)
                await new Promise((resolve, reject) => { ffmpeg(inputPath).outputOptions(['-vcodec', 'libwebp', '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,fps=15', '-loop', '0', '-quality', '60', '-compression_level', '6', '-an', '-vsync', '0', '-t', '8']).save(outputPath).on('end', resolve).on('error', reject) })
                const webpBuffer = fs.readFileSync(outputPath)
                await sock.sendMessage(from, { sticker: webpBuffer })
                if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
            } catch (err) {
                console.error('Sticker Error:', err)
                if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
                if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
                await sock.sendMessage(from, { text: '❌ فشل إنشاء الستيكر المتحرك' })
            }
        }

        else if (text.startsWith('.صور')) {
            const parts = text.replace('.صور', '').trim().split(' ')
            let count = 3; let query = parts.join(' ')
            const lastWord = parts[parts.length - 1]
            if (!isNaN(lastWord) && lastWord !== '') { count = Math.min(Math.max(parseInt(lastWord), 1), 10); query = parts.slice(0, -1).join(' ') }
            if (!query) return await sock.sendMessage(from, { text: 'اكتب .صور وموضوع البحث\nمثال: .صور كريستيانو' })
            try {
                await sock.sendMessage(from, { text: `⏳ جاري البحث عن ${count} صورة ${query}...` })
                const res = await axios.get('https://api.pexels.com/v1/search', { headers: { Authorization: process.env.PEXELS_API_KEY }, params: { query, per_page: count, orientation: 'portrait' } })
                const photos = res.data.photos
                if (!photos.length) return await sock.sendMessage(from, { text: `❌ مش لاقي صور عن ${query}` })
                for (const photo of photos) {
                    const response = await axios.get(photo.src.large, { responseType: 'arraybuffer' })
                    const buffer = Buffer.from(response.data)
                    await sock.sendMessage(from, { image: buffer, caption: `📸 ${query}` })
                }
            } catch (err) { console.error('Pexels Photo Error:', err); await sock.sendMessage(from, { text: '❌ فشل جلب الصور' }) }
        }

        // ======.اغنية - نسخة API بدون تحميل ======
else if (text.startsWith('.اغنية')) {
    const query = text.replace('.اغنية', '').trim()
    if (!query) return await sock.sendMessage(from, { text: 'اكتب.اغنية واسم الاغنية\nمثال:.اغنية انت معلم' })
    
    try {
        await sock.sendMessage(from, { text: `🔍 بدور على: ${query}...` })
        const r = await yts(query)
        const video = r.videos[0]
        if (!video) return await sock.sendMessage(from, { text: '❌ ملقتش الاغنية' })
        if (video.seconds > 420) return await sock.sendMessage(from, { text: '❌ الاغنية أطول من 7 دقائق' })

        await sock.sendMessage(from, { text: `🎵 *لقيت الاغنية!*\n\n📌 ${video.title}\n⏳ جاري التحميل...` })

        // بنجيب رابط التحميل المباشر من API
        const apiRes = await axios.post('https://api.cobalt.tools/api/json', {
            url: video.url,
            aFormat: 'mp3',
            isAudioOnly: true
        })

        const audioUrl = apiRes.data.url
        if (!audioUrl) throw new Error('مفيش رابط تحميل')

        const audioResponse = await axios.get(audioUrl, { responseType: 'arraybuffer' })
        const audioBuffer = Buffer.from(audioResponse.data)

        if (audioBuffer.length > 16 * 1024 * 1024) {
            return await sock.sendMessage(from, { text: '❌ الاغنية كبيرة اوي، واتساب اخره 16MB' })
        }

        await sock.sendMessage(from, {
            audio: audioBuffer,
            mimetype: 'audio/mpeg',
            fileName: `${video.title}.mp3`,
        })
    } catch (err) {
        console.error('Song Error:', err)
        await sock.sendMessage(from, { text: '❌ فشل تنزيل الاغنية، جرب اسم تاني' })
    }
                                           }
                    const writeStream = fs.createWriteStream(audioPath)
                    stream.pipe(writeStream)
                    stream.on('error', reject)
                    writeStream.on('finish', resolve)
                    writeStream.on('error', reject)
                })

                if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size === 0) {
                    throw new Error('الملف فارغ')
                }

                const audioBuffer = fs.readFileSync(audioPath)
                await sock.sendMessage(from, {
                    audio: audioBuffer,
                    mimetype: 'audio/mpeg',
                    fileName: `${video.title}.mp3`,
                    ptt: false
                })
                fs.unlinkSync(audioPath)
            } catch (err) {
                console.error('Song Error:', err)
                if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
                await sock.sendMessage(from, { text: '❌ فشل تنزيل الاغنية، جرب اسم تاني' })
            }
        }

        // ====== أدوات ======
        else if (text.startsWith('.ترجمة')) {
            const txt = text.replace('.ترجمة', '').trim()
            if (!txt) return await sock.sendMessage(from, { text: 'اكتب .ترجمة والنص' })
            try {
                const res = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(txt)}`)
                await sock.sendMessage(from, { text: `🇪🇬 ${txt}\n🇺🇸 ${res.data[0][0][0]}` })
            } catch { await sock.sendMessage(from, { text: 'فشلت الترجمة 😢' }) }
        }

        else if (text.startsWith('.حاسبة')) {
            const calc = text.replace('.حاسبة', '').trim()
            if (!calc) return await sock.sendMessage(from, { text: 'اكتب .حاسبة 5+3' })
            try {
                const result = eval(calc.replace(/[^0-9+\-*/.() ]/g, ''))
                await sock.sendMessage(from, { text: `🔢 ${calc} = *${result}*` })
            } catch { await sock.sendMessage(from, { text: 'معادلة غلط 😅' }) }
        }

        else if (text === '.مين ادمن') {
            if (!isGroup) return await sock.sendMessage(from, { text: 'الامر ده للجروبات بس' })
            const group = await sock.groupMetadata(from)
            const admins = group.participants.filter(p => p.admin).map(p => `@${p.id.split('@')[0]}`).join('\n')
            await sock.sendMessage(from, { text: `*👑 ادمن الجروب:*\n\n${admins}`, mentions: group.participants.filter(p => p.admin).map(p => p.id) })
        }

        else if (text === '.رابط الجروب') {
            if (!isGroup) return await sock.sendMessage(from, { text: 'الامر ده للجروبات بس' })
            const code = await sock.groupInviteCode(from)
            await sock.sendMessage(from, { text: `🔗 رابط الجروب:\nhttps://chat.whatsapp.com/${code}` })
        }

        // ================================================================
        // ==================== نظام الإشراف =============================
        // ================================================================

        else if (text === '.مود مشرفين') {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            try {
                const groupMeta = await sock.groupMetadata(from)
                const isAdmin = groupMeta.participants.find(p => p.id === senderId)?.admin != null
                if (!canModerate(senderId, isAdmin)) return await sock.sendMessage(from, { text: '❌ المشرفين بس يقدروا يغيروا الوضع' })
                const db = loadDB(); const groupData = getGroup(db, from)
                groupData.mode = 'مشرفين'; saveDB(db)
                await sock.sendMessage(from, { text: '🛡️ *تم تفعيل وضع المشرفين*' })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text === '.مود نخبة') {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            try {
                const groupMeta = await sock.groupMetadata(from)
                const isAdmin = groupMeta.participants.find(p => p.id === senderId)?.admin != null
                if (!canModerate(senderId, isAdmin)) return await sock.sendMessage(from, { text: '❌ المشرفين بس يقدروا يغيروا الوضع' })
                const db = loadDB(); const groupData = getGroup(db, from)
                groupData.mode = 'نخبة'; saveDB(db)
                await sock.sendMessage(from, { text: '⭐ *تم تفعيل وضع النخبة*' })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text === '.مود اعضاء') {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            try {
                const groupMeta = await sock.groupMetadata(from)
                const isAdmin = groupMeta.participants.find(p => p.id === senderId)?.admin != null
                if (!canModerate(senderId, isAdmin)) return await sock.sendMessage(from, { text: '❌ المشرفين بس يقدروا يغيروا الوضع' })
                const db = loadDB(); const groupData = getGroup(db, from)
                groupData.mode = 'اعضاء'; saveDB(db)
                await sock.sendMessage(from, { text: '✅ *تم تفعيل وضع الأعضاء*' })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text.startsWith('.اضافة للنخبة')) {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) return await sock.sendMessage(from, { text: 'اعمل منشن للشخص' })
            try {
                const groupMeta = await sock.groupMetadata(from)
                const isAdmin = groupMeta.participants.find(p => p.id === senderId)?.admin != null
                if (!canModerate(senderId, isAdmin)) return await sock.sendMessage(from, { text: '❌ المشرفين بس' })
                const db = loadDB(); const groupData = getGroup(db, from)
                const targetId = mentioned[0]
                if (groupData.elite.includes(targetId)) return await sock.sendMessage(from, { text: `⭐ موجود في النخبة أصلاً`, mentions: [targetId] })
                groupData.elite.push(targetId); saveDB(db)
                await sock.sendMessage(from, { text: `⭐ *تم إضافة @${targetId.split('@')[0]} للنخبة!*`, mentions: [targetId] })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text.startsWith('.تحذير')) {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) return await sock.sendMessage(from, { text: 'اعمل منشن للشخص' })
            try {
                const groupMeta = await sock.groupMetadata(from)
                const isAdmin = groupMeta.participants.find(p => p.id === senderId)?.admin != null
                if (!canModerate(senderId, isAdmin)) return await sock.sendMessage(from, { text: '❌ المشرفين بس' })
                const targetId = mentioned[0]
                const targetClean = targetId.split('@')[0]
                if (isDeveloper(targetId)) return await sock.sendMessage(from, { text: '❌ مش تقدر تحذر المطور!' })
                const reason = text.replace('.تحذير', '').replace(`@${targetClean}`, '').trim() || 'لم يُذكر سبب'
                await sock.sendMessage(from, {
                    text: `⚠️ *تحذير*\n\n👤 العضو: @${targetClean}\n📋 السبب: ${reason}\n👮 بواسطة: ${name}`,
                    mentions: [targetId]
                })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text.startsWith('.انذار')) {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) return await sock.sendMessage(from, { text: 'اعمل منشن للشخص' })
            try {
                const groupMeta = await sock.groupMetadata(from)
                const isAdmin = groupMeta.participants.find(p => p.id === senderId)?.admin != null
                if (!canModerate(senderId, isAdmin)) return await sock.sendMessage(from, { text: '❌ المشرفين بس' })
                const targetId = mentioned[0]
                const targetClean = targetId.split('@')[0]
                if (isDeveloper(targetId)) return await sock.sendMessage(from, { text: '❌ مش تقدر تنذر المطور!' })
                const db = loadDB(); const groupData = getGroup(db, from)
                groupData.warnings[targetId] = (groupData.warnings[targetId] || 0) + 1
                const warnCount = groupData.warnings[targetId]
                saveDB(db)
                if (warnCount >= 3) {
                    groupData.warnings[targetId] = 0; saveDB(db)
                    try {
                        await sock.groupParticipantsUpdate(from, [targetId], 'remove')
                        await sock.sendMessage(from, { text: `🚨 *تم طرد @${targetClean}!*\nوصل لـ 3 إنذارات`, mentions: [targetId] })
                    } catch {
                        await sock.sendMessage(from, { text: `⚠️ @${targetClean} وصل لـ 3 إنذارات\nمقدرتش أطرده - تأكد إن البوت مشرف`, mentions: [targetId] })
                    }
                } else {
                    const bars = '🔴'.repeat(warnCount) + '⚪'.repeat(3 - warnCount)
                    await sock.sendMessage(from, {
                        text: `⚠️ *إنذار لـ @${targetClean}!*\n\n${bars} ${warnCount}/3\n${warnCount === 2 ? '🚨 إنذار أخير!' : 'التزم بقوانين الجروب'}`,
                        mentions: [targetId]
                    })
                }
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text.startsWith('.طرد')) {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) return await sock.sendMessage(from, { text: 'اعمل منشن للشخص' })
            try {
                const groupMeta = await sock.groupMetadata(from)
                const isAdmin = groupMeta.participants.find(p => p.id === senderId)?.admin != null
                if (!canModerate(senderId, isAdmin)) return await sock.sendMessage(from, { text: '❌ المشرفين بس' })
                const targetId = mentioned[0]
                if (isDeveloper(targetId)) return await sock.sendMessage(from, { text: '❌ مش تقدر تطرد المطور!' })
                try {
                    await sock.groupParticipantsUpdate(from, [targetId], 'remove')
                    await sock.sendMessage(from, { text: `🚪 *تم طرد @${targetId.split('@')[0]}!*`, mentions: [targetId] })
                } catch { await sock.sendMessage(from, { text: '❌ مقدرتش أطرد - تأكد إن البوت مشرف' }) }
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text.startsWith('.باند')) {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) return await sock.sendMessage(from, { text: 'اعمل منشن للشخص' })
            try {
                const groupMeta = await sock.groupMetadata(from)
                const isAdmin = groupMeta.participants.find(p => p.id === senderId)?.admin != null
                if (!canModerate(senderId, isAdmin)) return await sock.sendMessage(from, { text: '❌ المشرفين بس' })
                const targetId = mentioned[0]
                const targetClean = targetId.split('@')[0]
                if (isDeveloper(targetId)) return await sock.sendMessage(from, { text: '❌ مش تقدر تحظر المطور!' })
                const reason = text.replace('.باند', '').replace(`@${targetClean}`, '').trim() || 'لم يُذكر سبب'
                const db = loadDB(); const groupData = getGroup(db, from)
                if (groupData.banned.includes(targetId)) return await sock.sendMessage(from, { text: `🚫 محظور أصلاً`, mentions: [targetId] })
                groupData.banned.push(targetId); saveDB(db)
                try { await sock.groupParticipantsUpdate(from, [targetId], 'remove') } catch { }
                await sock.sendMessage(from, {
                    text: `🚫 *تم الحظر الدائم!*\n\n👤 العضو: @${targetClean}\n📋 السبب: ${reason}`,
                    mentions: [targetId]
                })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text.startsWith('.الغاء باند')) {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) return await sock.sendMessage(from, { text: 'اعمل منشن للشخص' })
            try {
                const groupMeta = await sock.groupMetadata(from)
                const isAdmin = groupMeta.participants.find(p => p.id === senderId)?.admin != null
                if (!canModerate(senderId, isAdmin)) return await sock.sendMessage(from, { text: '❌ المشرفين بس' })
                const targetId = mentioned[0]
                const db = loadDB(); const groupData = getGroup(db, from)
                if (!groupData.banned.includes(targetId)) return await sock.sendMessage(from, { text: `✅ مش محظور أصلاً` })
                groupData.banned = groupData.banned.filter(id => id !== targetId); saveDB(db)
                await sock.sendMessage(from, { text: `✅ *تم رفع الحظر عن @${targetId.split('@')[0]}*`, mentions: [targetId] })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text === '.قائمة الباند') {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            const db = loadDB(); const groupData = getGroup(db, from)
            if (!groupData.banned || groupData.banned.length === 0) return await sock.sendMessage(from, { text: '✅ مفيش حد محظور' })
            const list = groupData.banned.map((id, i) => `${i + 1}. @${id.split('@')[0]}`).join('\n')
            await sock.sendMessage(from, { text: `🚫 *قائمة المحظورين:*\n\n${list}`, mentions: groupData.banned })
        }

        else if (text.startsWith('.كتم')) {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) return await sock.sendMessage(from, { text: 'اعمل منشن للشخص' })
            try {
                const groupMeta = await sock.groupMetadata(from)
                const isAdmin = groupMeta.participants.find(p => p.id === senderId)?.admin != null
                if (!canModerate(senderId, isAdmin)) return await sock.sendMessage(from, { text: '❌ المشرفين بس' })
                const targetId = mentioned[0]
                if (isDeveloper(targetId)) return await sock.sendMessage(from, { text: '❌ مش تقدر تكتم المطور!' })
                const db = loadDB(); const groupData = getGroup(db, from)
                if (groupData.muted.includes(targetId)) return await sock.sendMessage(from, { text: `🔇 مكتوم أصلاً`, mentions: [targetId] })
                groupData.muted.push(targetId); saveDB(db)
                await sock.sendMessage(from, { text: `🔇 *تم كتم @${targetId.split('@')[0]}*`, mentions: [targetId] })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text.startsWith('.الغاء كتم')) {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) return await sock.sendMessage(from, { text: 'اعمل منشن للشخص' })
            try {
                const groupMeta = await sock.groupMetadata(from)
                const isAdmin = groupMeta.participants.find(p => p.id === senderId)?.admin != null
                if (!canModerate(senderId, isAdmin)) return await sock.sendMessage(from, { text: '❌ المشرفين بس' })
                const targetId = mentioned[0]
                const db = loadDB(); const groupData = getGroup(db, from)
                if (!groupData.muted.includes(targetId)) return await sock.sendMessage(from, { text: `🔊 مش مكتوم أصلاً` })
                groupData.muted = groupData.muted.filter(id => id !== targetId); saveDB(db)
                await sock.sendMessage(from, { text: `🔊 *تم إلغاء كتم @${targetId.split('@')[0]}*`, mentions: [targetId] })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text === '.قائمة المكتومين') {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            const db = loadDB(); const groupData = getGroup(db, from)
            if (!groupData.muted || groupData.muted.length === 0) return await sock.sendMessage(from, { text: '✅ مفيش حد مكتوم' })
            const list = groupData.muted.map((id, i) => `${i + 1}. @${id.split('@')[0]}`).join('\n')
            await sock.sendMessage(from, { text: `🔇 *قائمة المكتومين:*\n\n${list}`, mentions: groupData.muted })
        }

        // ================================================================
        // =================== نظام الاقتصاد =============================
        // ================================================================

        else if (text === '.فلوسي') {
            const db = loadDB(); const user = getUser(db, senderId); saveDB(db)
            await sock.sendMessage(from, {
                text: `💰 *رصيدك يا ${name}:*\n\n👛 المحفظة: ${user.wallet.toLocaleString()} 🪙\n🏦 البنك: ${user.bank.toLocaleString()} 🪙\n💎 الإجمالي: ${(user.wallet + user.bank).toLocaleString()} 🪙`
            })
        }

        else if (text === '.مستواي') {
            const db = loadDB(); const user = getUser(db, senderId); saveDB(db)
            const xpNeeded = user.level * 100
            const xpProgress = user.xp - ((user.level - 1) * 100)
            const filled = Math.min(10, Math.floor((xpProgress / xpNeeded) * 10))
            const bar = '█'.repeat(filled) + '░'.repeat(10 - filled)
            await sock.sendMessage(from, {
                text: `⭐ *مستواك يا ${name}:*\n\n🏅 المستوى: ${user.level}\n✨ الخبرة: ${user.xp} XP\n📊 [${bar}] ${xpProgress}/${xpNeeded}`
            })
        }

        else if (text === '.راتب') {
            const db = loadDB(); const user = getUser(db, senderId)
            const now = Date.now(); const cooldown = 24 * 60 * 60 * 1000
            const remaining = cooldown - (now - user.lastSalary)
            if (remaining > 0) {
                const h = Math.floor(remaining / 3600000); const min = Math.floor((remaining % 3600000) / 60000)
                return await sock.sendMessage(from, { text: `⏰ الوقت المتبقي: ${h} ساعة و ${min} دقيقة` })
            }
            const salary = 200 + (user.level * 50)
            user.wallet += salary; user.lastSalary = now; addXP(user, 10); saveDB(db)
            await sock.sendMessage(from, {
                text: `💵 *تم صرف راتبك!*\n\n💰 +${salary} 🪙\n✨ +10 XP\n👛 رصيدك: ${user.wallet.toLocaleString()} 🪙`
            })
        }

        else if (text.startsWith('.ايداع')) {
            const amount = parseInt(text.replace('.ايداع', '').trim())
            if (isNaN(amount) || amount <= 0) return await sock.sendMessage(from, { text: 'مثال: .ايداع 100' })
            const db = loadDB(); const user = getUser(db, senderId)
            if (user.wallet < amount) return await sock.sendMessage(from, { text: `❌ رصيدك: ${user.wallet} 🪙` })
            user.wallet -= amount; user.bank += amount; addXP(user, 5); saveDB(db)
            await sock.sendMessage(from, { text: `🏦 *تم الإيداع!*\n💸 ${amount.toLocaleString()} 🪙\n👛 المحفظة: ${user.wallet.toLocaleString()}\n🏦 البنك: ${user.bank.toLocaleString()}` })
        }

        else if (text.startsWith('.سحب')) {
            const amount = parseInt(text.replace('.سحب', '').trim())
            if (isNaN(amount) || amount <= 0) return await sock.sendMessage(from, { text: 'مثال: .سحب 100' })
            const db = loadDB(); const user = getUser(db, senderId)
            if (user.bank < amount) return await sock.sendMessage(from, { text: `❌ رصيد البنك: ${user.bank} 🪙` })
            user.bank -= amount; user.wallet += amount; addXP(user, 5); saveDB(db)
            await sock.sendMessage(from, { text: `💵 *تم السحب!*\n💸 ${amount.toLocaleString()} 🪙\n👛 المحفظة: ${user.wallet.toLocaleString()}\n🏦 البنك: ${user.bank.toLocaleString()}` })
        }

        else if (text.startsWith('.تحويل')) {
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) return await sock.sendMessage(from, { text: 'مثال: .تحويل @احمد 500' })
            const parts = text.split(' '); const amount = parseInt(parts[parts.length - 1])
            if (isNaN(amount) || amount <= 0) return await sock.sendMessage(from, { text: 'مثال: .تحويل @احمد 500' })
            const targetId = mentioned[0]
            if (targetId === senderId) return await sock.sendMessage(from, { text: '😅 ما تقدرش تحول لنفسك!' })
            const db = loadDB(); const sender = getUser(db, senderId)
            if (sender.wallet < amount) return await sock.sendMessage(from, { text: `❌ رصيدك: ${sender.wallet} 🪙` })
            const target = getUser(db, targetId)
            sender.wallet -= amount; target.wallet += amount; addXP(sender, 5); saveDB(db)
            await sock.sendMessage(from, { text: `✅ *تم التحويل!*\n💸 ${amount.toLocaleString()} 🪙 إلى @${targetId.split('@')[0]}\n👛 رصيدك: ${sender.wallet.toLocaleString()} 🪙`, mentions: [targetId] })
        }

        // ====== الألعاب - بدون وقت انتظار ======
        else if (text.startsWith('.زهر')) {
            const amount = parseInt(text.replace('.زهر', '').trim())
            if (isNaN(amount) || amount <= 0) return await sock.sendMessage(from, { text: 'مثال: .زهر 100' })
            const db = loadDB(); const user = getUser(db, senderId)
            if (user.wallet < amount) return await sock.sendMessage(from, { text: `❌ رصيدك: ${user.wallet} 🪙` })
            const p = Math.floor(Math.random() * 6) + 1; const b = Math.floor(Math.random() * 6) + 1
            const dice = ['', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣']
            let result, xp, win
            if (p > b) {
                // الربح = نصف المبلغ فقط (حد أقصى 200)
                win = Math.min(Math.floor(amount * 0.5), 200)
                user.wallet += win; result = `🎉 *ربحت!* +${win} 🪙`; xp = 15
            } else if (p < b) {
                user.wallet -= amount; result = `😢 *خسرت!* -${amount} 🪙`; xp = 5
            } else {
                result = `🤝 *تعادل!*`; xp = 8
            }
            addXP(user, xp); saveDB(db)
            await sock.sendMessage(from, {
                text: `🎲 *لعبة الزهر!*\n\n${dice[p]} أنت: ${p}\n${dice[b]} البوت: ${b}\n\n${result}\n✨ +${xp} XP\n👛 رصيدك: ${user.wallet.toLocaleString()} 🪙`
            })
        }

        else if (text.startsWith('.تخمين')) {
            const parts = text.replace('.تخمين', '').trim().split(' ')
            const amount = parseInt(parts[0]); const guess = parseInt(parts[1])
            if (isNaN(amount) || amount <= 0 || isNaN(guess) || guess < 1 || guess > 10) {
                return await sock.sendMessage(from, { text: 'مثال: .تخمين 100 7' })
            }
            const db = loadDB(); const user = getUser(db, senderId)
            if (user.wallet < amount) return await sock.sendMessage(from, { text: `❌ رصيدك: ${user.wallet} 🪙` })
            const secret = Math.floor(Math.random() * 10) + 1
            if (guess === secret) {
                const win = Math.min(amount * 2, 200)
                user.wallet += win; addXP(user, 25); saveDB(db)
                await sock.sendMessage(from, { text: `🎯 *أصبت! الرقم كان ${secret}!*\n\n🎉 +${win} 🪙\n✨ +25 XP\n👛 ${user.wallet.toLocaleString()} 🪙` })
            } else {
                user.wallet -= amount; addXP(user, 5); saveDB(db)
                await sock.sendMessage(from, { text: `❌ *غلطت! الرقم كان ${secret}*\n\n😢 -${amount} 🪙\n✨ +5 XP\n👛 ${user.wallet.toLocaleString()} 🪙` })
            }
        }

        else if (text.startsWith('.حجر')) {
            const parts = text.replace('.حجر', '').trim().split(' ')
            const amount = parseInt(parts[0]); const choice = parts[1]
            const valid = ['حجر', 'ورقة', 'مقص']
            if (isNaN(amount) || amount <= 0 || !valid.includes(choice)) {
                return await sock.sendMessage(from, { text: 'مثال: .حجر 100 ورقة' })
            }
            const db = loadDB(); const user = getUser(db, senderId)
            if (user.wallet < amount) return await sock.sendMessage(from, { text: `❌ رصيدك: ${user.wallet} 🪙` })
            const botChoice = valid[Math.floor(Math.random() * 3)]
            const emoji = { 'حجر': '🪨', 'ورقة': '📄', 'مقص': '✂️' }
            let result, xp
            if (choice === botChoice) { result = `🤝 تعادل!`; xp = 8 }
            else if ((choice === 'حجر' && botChoice === 'مقص') || (choice === 'ورقة' && botChoice === 'حجر') || (choice === 'مقص' && botChoice === 'ورقة')) {
                const win = Math.min(amount, 200)
                user.wallet += win; result = `🎉 *ربحت!* +${win} 🪙`; xp = 15
            } else { user.wallet -= amount; result = `😢 *خسرت!* -${amount} 🪙`; xp = 5 }
            addXP(user, xp); saveDB(db)
            await sock.sendMessage(from, {
                text: `${emoji[choice]} *حجر ورقة مقص!*\n\nأنت: ${emoji[choice]} ${choice}\nالبوت: ${emoji[botChoice]} ${botChoice}\n\n${result}\n✨ +${xp} XP\n👛 ${user.wallet.toLocaleString()} 🪙`
            })
        }

        else if (text === '.صيد') {
            const db = loadDB(); const user = getUser(db, senderId)
            const fish = [
                { name: 'سمكة صغيرة 🐟', reward: 30, xp: 10, chance: 40 },
                { name: 'سمكة متوسطة 🐠', reward: 80, xp: 20, chance: 30 },
                { name: 'سمكة كبيرة 🐡', reward: 150, xp: 35, chance: 20 },
                { name: 'سمكة نادرة 🦈', reward: 180, xp: 60, chance: 8 },
                { name: 'كنز في البحر 💎', reward: 200, xp: 100, chance: 2 }
            ]
            const rand = Math.random() * 100; let cum = 0; let caught = fish[0]
            for (const f of fish) { cum += f.chance; if (rand < cum) { caught = f; break } }
            user.wallet += caught.reward; addXP(user, caught.xp); saveDB(db)
            await sock.sendMessage(from, {
                text: `🎣 *نتيجة الصيد!*\n\nاصطدت: ${caught.name}\n💰 +${caught.reward} 🪙\n✨ +${caught.xp} XP\n👛 ${user.wallet.toLocaleString()} 🪙`
            })
        }

        else if (text === '.مغامرة') {
            const db = loadDB(); const user = getUser(db, senderId)
            const adventures = [
                { story: '🏰 دخلت قصر مسكون ووجدت كنز!', reward: 200, xp: 50, win: true },
                { story: '🐉 قاتلت تنين وانتصرت!', reward: 200, xp: 70, win: true },
                { story: '🗺️ وجدت خريطة كنز قديمة!', reward: 180, xp: 40, win: true },
                { story: '🌊 أنقذت تاجر وكافأك!', reward: 150, xp: 35, win: true },
                { story: '💀 وقعت في فخ اللصوص!', reward: -100, xp: 15, win: false },
                { story: '🐺 هاجمك ذئب وخسرت معداتك!', reward: -80, xp: 10, win: false },
                { story: '🌪️ عاصفة رملية دمرت رحلتك!', reward: -50, xp: 8, win: false },
                { story: '🎭 تاجرت في السوق وربحت!', reward: 120, xp: 20, win: true }
            ]
            const adv = adventures[Math.floor(Math.random() * adventures.length)]
            const actualReward = adv.reward < 0 ? Math.max(adv.reward, -user.wallet) : adv.reward
            user.wallet += actualReward; addXP(user, adv.xp); saveDB(db)
            await sock.sendMessage(from, {
                text: `⚔️ *مغامرتك يا ${name}!*\n\n${adv.story}\n\n${adv.win ? '🎉 +' : '💸 '}${actualReward} 🪙\n✨ +${adv.xp} XP\n👛 ${user.wallet.toLocaleString()} 🪙`
            })
        }

        // ====== الألغاز - وقت 2 دقيقة ومكافأة 200 ======
        else if (text === '.لغز') {
            const db = loadDB()
            const puzzle = PUZZLES[Math.floor(Math.random() * PUZZLES.length)]
            db.puzzles[senderId] = {
                answer: puzzle.a,
                hint: puzzle.hint,
                expiresAt: Date.now() + (2 * 60 * 1000),
                hintUsed: false
            }
            saveDB(db)
            await sock.sendMessage(from, {
                text: `🧩 *اللغز!*\n\n${puzzle.q}\n\n⏰ عندك دقيقتين تجاوب\n💰 المكافأة: 200 🪙 + 20 XP\n💡 .جواب [إجابتك]\n🔍 .تلميح (بيخصم 50 🪙)`
            })
        }

        else if (text === '.تلميح') {
            const db = loadDB(); const puzzleData = db.puzzles[senderId]
            if (!puzzleData || Date.now() > puzzleData.expiresAt) return await sock.sendMessage(from, { text: '❌ ما فيه لغز نشط! اكتب .لغز أولاً' })
            const user = getUser(db, senderId)
            if (puzzleData.hintUsed) return await sock.sendMessage(from, { text: `💡 التلميح: ${puzzleData.hint}` })
            if (user.wallet < 50) return await sock.sendMessage(from, { text: '❌ ما عندكش 50 🪙!' })
            user.wallet -= 50; puzzleData.hintUsed = true; saveDB(db)
            await sock.sendMessage(from, { text: `💡 التلميح (-50 🪙): ${puzzleData.hint}` })
        }

        else if (text.startsWith('.جواب')) {
            const answer = text.replace('.جواب', '').trim()
            if (!answer) return await sock.sendMessage(from, { text: 'مثال: .جواب مشط' })
            const db = loadDB(); const puzzleData = db.puzzles[senderId]
            if (!puzzleData) return await sock.sendMessage(from, { text: '❌ ما فيه لغز نشط!' })
            if (Date.now() > puzzleData.expiresAt) {
                delete db.puzzles[senderId]; saveDB(db)
                return await sock.sendMessage(from, { text: `❌ انتهى وقت اللغز!\nالإجابة كانت: ${puzzleData.answer}` })
            }
            const user = getUser(db, senderId)
            if (answer.trim().toLowerCase() === puzzleData.answer.toLowerCase()) {
                const reward = puzzleData.hintUsed ? 150 : 200
                user.wallet += reward; addXP(user, 20)
                delete db.puzzles[senderId]; saveDB(db)
                await sock.sendMessage(from, { text: `✅ *إجابة صحيحة!*\n\n💰 +${reward} 🪙\n✨ +20 XP\n👛 ${user.wallet.toLocaleString()} 🪙` })
            } else {
                await sock.sendMessage(from, { text: '❌ إجابة غلط! حاول تاني' })
            }
        }

        // ====== لعبة العين ======
        else if (text === '.عين') {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            try {
                const db = loadDB()
                if (db.eyeGames && db.eyeGames[from]) {
                    return await sock.sendMessage(from, { text: '👁️ في لعبة عين شغالة بالجروب! جاوبوا الأول' })
                }
                const eye = ANIME_EYES[Math.floor(Math.random() * ANIME_EYES.length)]
                const expiresAt = Date.now() + (2 * 60 * 1000)
                if (!db.eyeGames) db.eyeGames = {}
                db.eyeGames[from] = { answer: eye.name, expiresAt }
                saveDB(db)

                try {
                    const response = await axios.get(eye.url, { responseType: 'arraybuffer', timeout: 10000 })
                    const buffer = Buffer.from(response.data)
                    await sock.sendMessage(from, {
                        image: buffer,
                        caption: `👁️ *لعبة العين!*\n\nمن صاحب هذه العين؟\n\n⏰ عندكم دقيقتين\n💰 المكافأة: 300 🪙 + 30 XP\n\n📝 اكتب الاسم مباشرة!`
                    })
                } catch {
                    // لو الصورة ما اشتغلتش، نبعت نص بس
                    await sock.sendMessage(from, {
                        text: `👁️ *لعبة العين!*\n\nمن صاحب عين: *${eye.name.split(' - ')[1] || '???'}*\n\n⏰ عندكم دقيقتين\n💰 المكافأة: 300 🪙`
                    })
                }

                setTimeout(async () => {
                    try {
                        const db2 = loadDB()
                        if (db2.eyeGames && db2.eyeGames[from]) {
                            const ans = db2.eyeGames[from].answer
                            delete db2.eyeGames[from]
                            saveDB(db2)
                            await sock.sendMessage(from, {
                                text: `⏰ انتهى وقت لعبة العين!\n✅ الإجابة كانت: *${ans}*`
                            })
                        }
                    } catch (e) { }
                }, 2 * 60 * 1000)

            } catch (err) {
                console.error('Eye Game Error:', err)
                await sock.sendMessage(from, { text: '❌ حصل خطأ في لعبة العين' })
            }
        }

        else if (text === '.اغنى') {
            const db = loadDB()
            const sorted = Object.entries(db.users)
                .map(([id, d]) => ({ id, total: (d.wallet || 0) + (d.bank || 0) }))
                .sort((a, b) => b.total - a.total).slice(0, 10)
            if (sorted.length === 0) return await sock.sendMessage(from, { text: '📊 ما فيه بيانات بعد!' })
            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
            let lb = '💰 *ترتيب أغنى الأعضاء:*\n\n'
            sorted.forEach((u, i) => { lb += `${medals[i]} ${u.id.split('@')[0]}: ${u.total.toLocaleString()} 🪙\n` })
            await sock.sendMessage(from, { text: lb })
        }

        else if (text === '.مستويات') {
            const db = loadDB()
            const sorted = Object.entries(db.users)
                .map(([id, d]) => ({ id, level: d.level || 1, xp: d.xp || 0 }))
                .sort((a, b) => b.xp - a.xp).slice(0, 10)
            if (sorted.length === 0) return await sock.sendMessage(from, { text: '📊 ما فيه بيانات بعد!' })
            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
            let lb = '⭐ *ترتيب أعلى مستوى:*\n\n'
            sorted.forEach((u, i) => { lb += `${medals[i]} ${u.id.split('@')[0]}: المستوى ${u.level} (${u.xp} XP)\n` })
            await sock.sendMessage(from, { text: lb })
        }

        else if (text === '.احصائيات') {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            try {
                const db = loadDB()
                const groupData = getGroup(db, from)
                const groupMeta = await sock.groupMetadata(from)
                const totalMembers = groupMeta.participants.length
                const adminCount = groupMeta.participants.filter(p => p.admin).length
                const mutedCount = groupData.muted ? groupData.muted.length : 0
                const bannedCount = groupData.banned ? groupData.banned.length : 0
                const warnedUsers = groupData.warnings ? Object.keys(groupData.warnings).filter(id => groupData.warnings[id] > 0).length : 0
                const eliteCount = groupData.elite ? groupData.elite.length : 0
                const currentMode = groupData.mode || 'اعضاء'
                const today = new Date().toISOString().slice(0, 10)
                const groupMsgData = db.msgCount[from] || {}
                let todayMsgTotal = 0; let mostActiveId = null; let mostActiveCount = 0
                for (const [uid, days] of Object.entries(groupMsgData)) {
                    const cnt = days[today] || 0
                    todayMsgTotal += cnt
                    if (cnt > mostActiveCount) { mostActiveCount = cnt; mostActiveId = uid }
                }
                const modeEmoji = { 'اعضاء': '🌐', 'مشرفين': '🛡️', 'نخبة': '⭐' }
                let stats =
                    `📊 *إحصائيات الجروب*\n\n` +
                    `👥 الأعضاء: ${totalMembers} | المشرفون: ${adminCount} | النخبة: ${eliteCount}\n` +
                    `🛡️ المكتومون: ${mutedCount} | المحظورون: ${bannedCount} | المنذرون: ${warnedUsers}\n` +
                    `⚙️ وضع البوت: ${modeEmoji[currentMode] || '🌐'} ${currentMode}\n` +
                    `💬 رسائل اليوم: ${todayMsgTotal}\n`
                if (mostActiveId) stats += `🔥 الأكثر نشاطاً: @${mostActiveId.split('@')[0]} (${mostActiveCount} رسالة)`
                const mentions = mostActiveId ? [mostActiveId] : []
                await sock.sendMessage(from, { text: stats, mentions })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text === '.نشاط') {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            try {
                const db = loadDB()
                const today = new Date().toISOString().slice(0, 10)
                const groupMsgData = db.msgCount[from] || {}
                const sorted = Object.entries(groupMsgData)
                    .map(([id, days]) => ({ id, count: days[today] || 0 }))
                    .filter(u => u.count > 0)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 10)
                if (sorted.length === 0) return await sock.sendMessage(from, { text: '📊 ما في نشاط اليوم بعد!' })
                const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟']
                const maxCount = sorted[0].count
                const mentions = sorted.map(u => u.id)
                let msgText = `🔥 *نشاط اليوم*\n📅 ${today}\n\n`
                sorted.forEach((u, i) => {
                    const bar = Math.round((u.count / maxCount) * 8)
                    const filled = '█'.repeat(bar) + '░'.repeat(8 - bar)
                    msgText += `${medals[i]} @${u.id.split('@')[0]}\n   ${filled} ${u.count} رسالة\n\n`
                })
                msgText += `👥 الإجمالي: ${sorted.reduce((s, u) => s + u.count, 0)} رسالة`
                await sock.sendMessage(from, { text: msgText, mentions })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text.startsWith('.رسائلي')) {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })
            try {
                const db = loadDB()
                const today = new Date().toISOString().slice(0, 10)
                const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
                const targetId = (mentioned && mentioned.length > 0) ? mentioned[0] : senderId
                const count = db.msgCount?.[from]?.[targetId]?.[today] || 0
                const groupMsgData = db.msgCount[from] || {}
                const sorted = Object.entries(groupMsgData)
                    .map(([id, days]) => ({ id, count: days[today] || 0 }))
                    .filter(u => u.count > 0)
                    .sort((a, b) => b.count - a.count)
                const rank = sorted.findIndex(u => u.id === targetId) + 1
                await sock.sendMessage(from, {
                    text: `💬 *رسائل @${targetId.split('@')[0]}*\n\n📊 ${count} رسالة اليوم\n🏆 الترتيب: ${rank > 0 ? `#${rank}` : 'لا يوجد نشاط'}`,
                    mentions: [targetId]
                })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        // ================================================================
        // ====================== نظام التحدي ============================
        // ================================================================

        else if (text.startsWith('.تحدي')) {
            if (!isGroup) return await sock.sendMessage(from, { text: '❌ التحدي للجروبات بس' })
            try {
                const db = loadDB()
                const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
                if (!mentioned || mentioned.length === 0) return await sock.sendMessage(from, { text: 'مثال: .تحدي @شخص 200' })
                const challenged = mentioned[0]
                if (challenged === senderId) return await sock.sendMessage(from, { text: '❌ ما تقدر تتحدى نفسك!' })
                const parts = text.trim().split(' ')
                const amount = parseInt(parts[parts.length - 1])
                if (isNaN(amount) || amount < 50) return await sock.sendMessage(from, { text: '❌ أقل مبلغ 50 🪙\nمثال: .تحدي @شخص 200' })
                const challengerUser = getUser(db, senderId)
                if (challengerUser.wallet < amount) return await sock.sendMessage(from, { text: `❌ محفظتك: ${challengerUser.wallet} 🪙` })
                if (db.challenges[from] || db.duels[from]) return await sock.sendMessage(from, { text: '⏳ في تحدي ناشط بالجروب' })
                db.challenges[from] = { challenger: senderId, challenged, amount, expiresAt: Date.now() + 60000 }
                saveDB(db)
                await sock.sendMessage(from, {
                    text: `⚔️ *تحدي جديد!*\n\n🔴 @${senderId.split('@')[0]}\n🔵 @${challenged.split('@')[0]}\n💰 الرهان: ${amount} 🪙\n\n✅ .قبول أو ❌ .رفض\n⏰ ينتهي بعد 60 ثانية`,
                    mentions: [senderId, challenged]
                })
                setTimeout(async () => {
                    try {
                        const db2 = loadDB()
                        if (db2.challenges[from] && db2.challenges[from].challenger === senderId) {
                            delete db2.challenges[from]; saveDB(db2)
                            await sock.sendMessage(from, { text: `⏰ انتهى وقت التحدي - ملغى`, mentions: [challenged] })
                        }
                    } catch (e) { }
                }, 60000)
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text === '.قبول') {
            if (!isGroup) return
            try {
                const db = loadDB()
                const challenge = db.challenges[from]
                if (!challenge) return await sock.sendMessage(from, { text: '❌ ما في تحدي ناشط' })
                if (senderId !== challenge.challenged) return await sock.sendMessage(from, { text: `❌ التحدي موجه لشخص تاني`, mentions: [challenge.challenged] })
                if (Date.now() > challenge.expiresAt) {
                    delete db.challenges[from]; saveDB(db)
                    return await sock.sendMessage(from, { text: '⏰ انتهى وقت التحدي' })
                }
                const q = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)]
                delete db.challenges[from]
                db.duels[from] = { challenger: challenge.challenger, challenged: challenge.challenged, amount: challenge.amount, question: q.q, answer: q.a, expiresAt: Date.now() + 90000 }
                saveDB(db)
                await sock.sendMessage(from, {
                    text: `🎮 *بدأت المبارزة!*\n\n@${challenge.challenger.split('@')[0]} VS @${challenge.challenged.split('@')[0]}\n💰 الرهان: ${challenge.amount} 🪙\n\n❓ *السؤال:*\n${q.q}\n\n⏰ 90 ثانية للإجابة!`,
                    mentions: [challenge.challenger, challenge.challenged]
                })
                setTimeout(async () => {
                    try {
                        const db2 = loadDB()
                        if (db2.duels[from]) {
                            const ans = db2.duels[from].answer
                            delete db2.duels[from]; saveDB(db2)
                            await sock.sendMessage(from, { text: `⏰ *انتهى وقت المبارزة!*\n✅ الإجابة: *${ans}*\n💔 الفلوس رجعت لأصحابها` })
                        }
                    } catch (e) { }
                }, 90000)
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text === '.رفض') {
            if (!isGroup) return
            try {
                const db = loadDB()
                const challenge = db.challenges[from]
                if (!challenge) return await sock.sendMessage(from, { text: '❌ ما في تحدي ناشط' })
                if (senderId !== challenge.challenged) return
                delete db.challenges[from]; saveDB(db)
                await sock.sendMessage(from, {
                    text: `❌ @${senderId.split('@')[0]} رفض التحدي!`,
                    mentions: [senderId, challenge.challenger]
                })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        // ================================================================
        // ======================== المتجر =================================
        // ================================================================

        else if (text === '.متجر') {
            const shop =
                `╔══════════════════════╗\n` +
                `║    🛒 *متجر البوت*    ║\n` +
                `╚══════════════════════╝\n\n` +
                `1️⃣  👑 *ملك الجروب* — 2000 🪙\n` +
                `2️⃣  ⭐ *نجم الأسبوع* — 1000 🪙\n` +
                `3️⃣  🔥 *ناري* — 800 🪙\n` +
                `4️⃣  💎 *ماسي* — 1500 🪙\n` +
                `5️⃣  🦁 *الأسد* — 1200 🪙\n` +
                `6️⃣  🎯 *قناص* — 900 🪙\n` +
                `7️⃣  🧠 *عبقري* — 700 🪙\n` +
                `8️⃣  🌙 *ابن الليل* — 600 🪙\n` +
                `9️⃣  🚀 *صاروخ* — 500 🪙\n` +
                `🔟  🐉 *التنين* — 1800 🪙\n\n` +
                `📌 للشراء: *.اشتري [رقم]*`
            await sock.sendMessage(from, { text: shop })
        }

        else if (text.startsWith('.اشتري')) {
            const SHOP_ITEMS = [
                { id: 1, title: '👑 ملك الجروب', price: 2000 },
                { id: 2, title: '⭐ نجم الأسبوع', price: 1000 },
                { id: 3, title: '🔥 ناري', price: 800 },
                { id: 4, title: '💎 ماسي', price: 1500 },
                { id: 5, title: '🦁 الأسد', price: 1200 },
                { id: 6, title: '🎯 قناص', price: 900 },
                { id: 7, title: '🧠 عبقري', price: 700 },
                { id: 8, title: '🌙 ابن الليل', price: 600 },
                { id: 9, title: '🚀 صاروخ', price: 500 },
                { id: 10, title: '🐉 التنين', price: 1800 },
            ]
            const num = parseInt(text.split(' ')[1])
            const item = SHOP_ITEMS.find(i => i.id === num)
            if (!item) return await sock.sendMessage(from, { text: '❌ رقم غلط! اكتب .متجر' })
            const db = loadDB(); const user = getUser(db, senderId)
            if (user.wallet < item.price) return await sock.sendMessage(from, { text: `❌ السعر: ${item.price} 🪙\nمحفظتك: ${user.wallet} 🪙` })
            user.wallet -= item.price; user.title = item.title; saveDB(db)
            await sock.sendMessage(from, { text: `🎉 *تم الشراء!*\n\n🏷️ لقبك: ${item.title}\n💸 دُفع: ${item.price} 🪙\n💰 المتبقي: ${user.wallet} 🪙`, mentions: [senderId] })
        }

        else if (text === '.لقبي') {
            const db = loadDB(); const user = getUser(db, senderId)
            const title = user.title || null
            if (!title) return await sock.sendMessage(from, { text: `👤 @${senderId.split('@')[0]}\n\n😕 ما عندكش لقب!\nاكتب .متجر`, mentions: [senderId] })
            await sock.sendMessage(from, { text: `👤 @${senderId.split('@')[0]}\n\n🏷️ لقبك: *${title}*`, mentions: [senderId] })
        }

        else if (text === '.ازالة لقب') {
            const db = loadDB(); const user = getUser(db, senderId)
            if (!user.title) return await sock.sendMessage(from, { text: '❌ ما عندكش لقب!' })
            const oldTitle = user.title; delete user.title; saveDB(db)
            await sock.sendMessage(from, { text: `✅ تم إزالة لقبك: ${oldTitle}` })
        }
    })
}

startBot()
