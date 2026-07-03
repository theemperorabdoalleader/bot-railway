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

const SESSION_FOLDER = './session'
const DB_FILE = './database.json'

const config = {
    OWNER: '201149182286',
    eliteList: ['201149182286@s.whatsapp.net']
}
// المطور دايماً في المقدمة — حماية من الحذف العرضي
const PROTECTED_JID = '201149182286@s.whatsapp.net'
if (!config.eliteList.includes(PROTECTED_JID)) config.eliteList.unshift(PROTECTED_JID)

const DEVELOPER_NUMBER = '201149182286'
const DEVELOPER_JID = `${DEVELOPER_NUMBER}@s.whatsapp.net`
const BOT_START_TIME = Date.now()

function normalizeJid(jid) {
    return jid ? jid.replace(/:\d+@/, '@') : jid
}
function isBotAdmin(groupMeta, rawBotId) {
    const botJid = normalizeJid(rawBotId)
    return groupMeta.participants.some(p => normalizeJid(p.id) === botJid && p.admin != null)
}
function isOwner(senderId) {
    if (!senderId) return false

    const clean = normalizeJid(senderId)
        .replace('@lid', '')
        .replace('@s.whatsapp.net', '')
        .split(':')[0]

    return clean === DEVELOPER_NUMBER
    }
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
    const cleanSender = normalizeJid(senderId)
    if (cleanSender === DEVELOPER_JID || cleanSender.split('@')[0] === DEVELOPER_NUMBER) return true
    if (!groupData) return true
    const mode = groupData.mode || 'اعضاء'
    if (mode === 'اعضاء') return true
    if (mode === 'مشرفين') return isAdmin
    if (mode === 'نخبة') return config.eliteList.includes(senderId) || config.eliteList.includes(normalizeJid(senderId))
    return true
}

function canModerate(senderId, isAdmin) {
    const cleanSender = senderId.split('@')[0]
    return cleanSender === DEVELOPER_NUMBER || senderId === DEVELOPER_JID || isAdmin
}

function isDeveloper(senderId) {
    if (!senderId) return false

    const clean = normalizeJid(senderId)
        .replace('@lid', '')
        .replace('@s.whatsapp.net', '')
        .split(':')[0]

    return clean === DEVELOPER_NUMBER
            }
function isBotAdmin(groupMeta, botId) {
    const normalBot = normalizeBotId(botId)
    return groupMeta.participants.some(p => normalizeBotId(p.id) === normalBot && p.admin != null)
}

const chatCooldown = new Map()

async function startBot() {
    console.log('بشغل البوت...')
    // تحميل النخبة المحفوظة من database.json
    try {
        const db = loadDB()
        if (Array.isArray(db.eliteList) && db.eliteList.length > 0) {
            for (const jid of db.eliteList) {
                if (!config.eliteList.includes(jid)) config.eliteList.push(jid)
            }
            console.log(`✅ تم تحميل النخبة: ${config.eliteList.length} عضو`)
        }
    } catch (e) { console.log('⚠️ فشل تحميل النخبة:', e.message) }

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
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`
            console.log('\n======== SCAN THIS QR URL ========')
            console.log(qrUrl)
            console.log('==================================\n')
        }
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode
            const isLoggedOut = code === DisconnectReason.loggedOut
            const is405 = code === 405

            if (is405) {
                console.log('⚠️ كود 405 — سيشن تالف، بمسحه وبطلب QR جديد...')
                try {
                    fs.rmSync(SESSION_FOLDER, { recursive: true, force: true })
                    console.log('🗑️ تم مسح السيشن')
                } catch (e) {
                    console.log('❌ فشل مسح السيشن:', e.message)
                }
                setTimeout(() => startBot(), 5000)
            } else if (isLoggedOut) {
                console.log('🔴 تم تسجيل الخروج — محتاج QR جديد ومش هيعيد الاتصال تلقائياً')
            } else {
                console.log(`❌ الاتصال انقطع (كود: ${code}) — بعيد الاتصال بعد 5 ثواني...`)
                setTimeout(() => startBot(), 5000)
            }
        }
        if (connection === 'open') {
            console.log('✅ البوت اتوصل بنجاح!')
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
                        delete db.duels[from]
                        saveDB(db)
                        await sock.sendMessage(from, { text: `⏰ *انتهى وقت المبارزة!*\n✅ الإجابة: *${duel.answer}*\n💔 الفلوس رجعت لأصحابها` })
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

        // ====== ردود تلقائية ======
        if (isGroup && text) {
            const trimmed = text.trim()
            if (trimmed === 'السلام عليكم' || trimmed === 'سلام عليكم') {
                await sock.sendMessage(from, { text: `وعليكم السلام ورحمة الله وبركاته يا ${name} 🌹` })
            } else if (trimmed === 'منور' || trimmed === 'منورين') {
                await sock.sendMessage(from, { text: 'بنورك يا غالي ✨' })
            } else if (trimmed === 'احا') {
                await sock.sendMessage(from, { text: 'فيه ايه ياد استرجل 😂' })
            }
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

        else if (text === '.وقت التشغيل') {
            const ms = Date.now() - BOT_START_TIME
            const secs  = Math.floor(ms / 1000) % 60
            const mins  = Math.floor(ms / 60000) % 60
            const hours = Math.floor(ms / 3600000) % 24
            const days  = Math.floor(ms / 86400000)
            const parts = []
            if (days)  parts.push(`${days} يوم`)
            if (hours) parts.push(`${hours} ساعة`)
            if (mins)  parts.push(`${mins} دقيقة`)
            if (secs && !days) parts.push(`${secs} ثانية`)
            await sock.sendMessage(from, {
                text: `⏱️ *وقت تشغيل البوت*\n\n🟢 شغال من: ${parts.join(' و') || 'ثواني'}`
            })
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
                `▸ .وقت التشغيل — وقت تشغيل البوت ⏱️\n` +
                `▸ .منو — يعرف اسمك\n` +
                `▸ .الاوامر — قائمة الأوامر\n\n` +

                `━━━━ 📊 *إحصائيات* ━━━━\n` +
                `▸ .احصائيات — إحصائيات الجروب\n` +
                `▸ .نشاط — أكثر 10 أعضاء نشاطاً\n` +
                `▸ .رسائلي — رسائلك اليوم\n\n` +

                `━━━━━━ 🎨 *وسائط* ━━━━━━\n` +
                `▸ .ستيكر — رد على صورة\n` +
                `▸ .ستيكر متحرك — رد على فيديو\n` +
                `▸ .لصورة — حول ستيكر لصورة PNG\n` +
                `▸ .صور [كلمة] — 3 صور افتراضي\n` +
                `▸ .صور [كلمة] [1-10] — تحديد العدد\n` +
                `▸ .اغنية [اسم] — تنزيل اغنية MP3\n\n` +

                `━━━━━━ 🛠️ *أدوات* ━━━━━━\n` +
                `▸ .ترجمة [نص] — ترجمة لانجليزي\n` +
                `▸ .حاسبة [معادلة] — حاسبة\n` +
                `▸ .مين ادمن — مشرفي الجروب\n` +
                `▸ .رابط الجروب — رابط الدعوة\n` +
                `▸ .طقس [مدينة] — طقس أي مدينة\n` +
                `▸ .ميمز — ميم عشوائي مضحك 😂\n` +
                `▸ .فيلم [اسم] — معلومات أي فيلم/مسلسل 🎬\n` +
                `▸ .اخبار — اخر 5 اخبار عربية 📰\n` +
                `▸ .كورة — نتائج وماتشات قادمة ⚽\n` +
                `▸ .ترتيب [دوري] — جدول ترتيب أي دوري 🏆\n` +
                `▸ .هداف [دوري] — أفضل 10 هدافين في الدوري 🎯\n` +
                `     ↳ انجليزي، اسباني، ايطالي، الماني، فرنسي، ابطال\n` +
                `▸ .صوت [نص] — تحويل نص لصوت عربي 🔊\n` +
                `▸ .ترجمة صوت [نص] — ترجمة وصوت انجليزي 🔊\n\n` +

                `━━━━━━ 🤖 *ذكاء اصطناعي* ━━━━━━\n` +
                `▸ .شات [سؤال] — اسأل الذكاء الاصطناعي\n\n` +

                `━━━ 🛡️ *إشراف (مشرفين)* ━━━\n` +
                `▸ .مود مشرفين / نخبة / اعضاء\n` +
                `▸ .تحذير @شخص [سبب]\n` +
                `▸ .انذار @شخص — 3 انذارات = طرد\n` +
                `▸ .طرد @شخص\n` +
                `▸ .باند @شخص [سبب]\n` +
                `▸ .الغاء باند @شخص\n` +
                `▸ .قائمة الباند\n` +
                `▸ .كتم @شخص\n` +
                `▸ .الغاء كتم @شخص\n` +
                `▸ .قائمة المكتومين\n` +
                `▸ .حذف — رد على رسالة لحذفها\n\n` +

                `━━━ 👑 *مطور فقط* ━━━\n` +
                `▸ .اضافة للنخبة @شخص\n` +
                `▸ .حذف نخبة @شخص\n` +
                `▸ .قائمة النخبة\n\n` +

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

        else if (text === '.لصورة') {
            const quoted = msg.message.extendedTextMessage?.contextInfo?.quotedMessage
            if (!quoted?.stickerMessage) return await sock.sendMessage(from, { text: 'رد على ستيكر يا معلم' })
            try {
                const buffer = await downloadMediaMessage({ message: quoted }, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage })
                const pngBuffer = await sharp(buffer).png().toBuffer()
                await sock.sendMessage(from, { image: pngBuffer })
            } catch (err) {
                await sock.sendMessage(from, { text: '❌ فشل التحويل، حاول تاني' })
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
                const isAdmin = groupMeta.participants.find(
    p => normalizeJid(p.id) === normalizeJid(senderId)
)?.admin != null
                if (!canModerate(senderId, isAdmin)) return await sock.sendMessage(from, { text: '❌ المشرفين بس يقدروا يغيروا الوضع' })
                const db = loadDB(); const groupData = getGroup(db, from)
                groupData.mode = 'اعضاء'; saveDB(db)
                await sock.sendMessage(from, { text: '✅ *تم تفعيل وضع الأعضاء*' })
            } catch (e) { await sock.sendMessage(from, { text: '❌ حصل خطأ' }) }
        }

        else if (text.startsWith('.اضافة نخبة') || text.startsWith('.اضافة للنخبة')) {
            if (!isDeveloper(senderId)) return await sock.sendMessage(from, { text: '❌ ده امر المالك بس' })
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) return await sock.sendMessage(from, { text: '📌 اعمل منشن للشخص اللي هينضاف للنخبة\nمثال: .اضافة نخبة @شخص' })
            const targetId = normalizeJid(mentioned[0])
            if (config.eliteList.includes(targetId)) return await sock.sendMessage(from, { text: `⭐ @${targetId.split('@')[0]} موجود في النخبة أصلاً`, mentions: [mentioned[0]] })
            config.eliteList.push(targetId)
            await sock.sendMessage(from, {
                text: `⭐ *تم إضافة @${targetId.split('@')[0]} للنخبة!*\n\n📋 قائمة النخبة الحالية: ${config.eliteList.length} عضو`,
                mentions: [mentioned[0]]
            })
        }

        else if (text.startsWith('.ازالة نخبة') || text.startsWith('.حذف نخبة') || text.startsWith('.حذف من النخبة')) {
            if (!isDeveloper(senderId)) return await sock.sendMessage(from, { text: '❌ ده امر المالك بس' })
            const mentioned = msg.message.extendedTextMessage?.contextInfo?.mentionedJid
            if (!mentioned || mentioned.length === 0) return await sock.sendMessage(from, { text: '📌 اعمل منشن للشخص اللي هيتحذف من النخبة\nمثال: .ازالة نخبة @شخص' })
            const targetId = normalizeJid(mentioned[0])
            if (targetId === PROTECTED_JID) return await sock.sendMessage(from, { text: '❌ مش تقدر تحذف المطور من النخبة!' })
            if (!config.eliteList.includes(targetId)) return await sock.sendMessage(from, { text: `❌ @${targetId.split('@')[0]} مش في النخبة أصلاً`, mentions: [mentioned[0]] })
            config.eliteList.splice(config.eliteList.indexOf(targetId), 1)
            await sock.sendMessage(from, {
                text: `✅ *تم إزالة @${targetId.split('@')[0]} من النخبة*\n\n📋 قائمة النخبة الحالية: ${config.eliteList.length} عضو`,
                mentions: [mentioned[0]]
            })
        }

        else if (text === '.نخبة' || text === '.قائمة النخبة') {
            if (!isDeveloper(senderId)) return await sock.sendMessage(from, { text: '❌ ده امر المالك بس' })
            if (config.eliteList.length === 0) return await sock.sendMessage(from, { text: '❌ مفيش حد في النخبة' })
            const list = config.eliteList.map((id, i) => {
                const num = i === 0 ? '👑' : `${i + 1}.`
                return `${num} @${id.split('@')[0]}`
            }).join('\n')
            await sock.sendMessage(from, {
                text: `⭐ *قائمة النخبة (${config.eliteList.length} عضو):*\n\n${list}`,
                mentions: config.eliteList
            })
        }

        else if (text === '.حفظ نخبة') {
            if (!isDeveloper(senderId)) return await sock.sendMessage(from, { text: '❌ ده امر المالك بس' })
            try {
                const db = loadDB()
                db.eliteList = config.eliteList
                saveDB(db)
                await sock.sendMessage(from, {
                    text: `💾 *تم حفظ النخبة بنجاح!*\n\n✅ ${config.eliteList.length} عضو محفوظين في قاعدة البيانات\n🔄 هيتحملوا تلقائياً عند إعادة تشغيل البوت`
                })
            } catch (e) {
                await sock.sendMessage(from, { text: `❌ فشل الحفظ: ${e.message}` })
            }
        }

        else if (text === '.حذف') {
    if (!isGroup)
        return await sock.sendMessage(from, { text: '❌ الأمر ده للجروبات بس' })

    try {
        const groupMeta = await sock.groupMetadata(from)

        const isAdmin = groupMeta.participants.find(
            p => normalizeJid(p.id) === normalizeJid(senderId)
        )?.admin != null

        if (!canModerate(senderId, isAdmin))
            return await sock.sendMessage(from, { text: '❌ المشرفين بس' })

        const ctx = msg.message?.extendedTextMessage?.contextInfo

        if (!ctx)
            return await sock.sendMessage(from, {
                text: '❌ لازم ترد على الرسالة اللي عايز تحذفها'
            })

        await sock.sendMessage(from, {
            delete: {
                remoteJid: from,
                fromMe: false,
                id: ctx.stanzaId,
                participant: ctx.participant
            }
        })

    } catch (e) {
        console.log(e)
        await sock.sendMessage(from, {
            text: `❌ حصل خطأ:\n${e.message}`
        })
    }
}

        else if (text.startsWith('.شات ')) {
            const question = text.replace('.شات ', '').trim()
            if (!question) return await sock.sendMessage(from, { text: '📌 اكتب سؤالك بعد الامر. مثال: .شات من هو نابليون' })
            if (!process.env.TOGETHER_API_KEY) return await sock.sendMessage(from, { text: '❌ مفتاح الذكاء الاصطناعي مش مضاف في Secrets' })
            const now = Date.now(); const lastUsed = chatCooldown.get(senderId) || 0
            if (now - lastUsed < 10000) return await sock.sendMessage(from, { text: `⏳ استنى ${Math.ceil((10000 - (now - lastUsed)) / 1000)} ثانية قبل ما تسأل تاني` })
            chatCooldown.set(senderId, now)
            try {
                const res = await axios.post(
                    'https://api.together.ai/v1/chat/completions',
                    {
                        model: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
                        messages: [
                            { role: 'system', content: 'أنت مساعد ذكي. أجب دائماً باللغة العربية بشكل مختصر وواضح.' },
                            { role: 'user', content: question }
                        ]
                    },
                    { headers: { Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`, 'Content-Type': 'application/json' } }
                )
                const answer = res.data.choices[0].message.content
                await sock.sendMessage(from, { text: answer })
            } catch (e) { await sock.sendMessage(from, { text: '❌ في مشكلة في الذكاء الاصطناعي حاول تاني' }) }
        }

        else if (text.startsWith('.صوت ')) {
            const ttsText = text.replace('.صوت ', '').trim()
            if (!ttsText) return await sock.sendMessage(from, { text: '📌 اكتب النص بعد الامر. مثال: .صوت مرحبا بكم' })
            if (ttsText.length > 200) return await sock.sendMessage(from, { text: '❌ النص طويل اوي، حد أقصى 200 حرف' })
            try {
                const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ar&q=${encodeURIComponent(ttsText)}`
                const response = await axios.get(url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } })
                const audioBuffer = Buffer.from(response.data)
                await sock.sendMessage(from, { audio: audioBuffer, mimetype: 'audio/mpeg', ptt: true })
            } catch (e) { await sock.sendMessage(from, { text: '❌ فشل تحويل النص لصوت' }) }
        }

        else if (text.startsWith('.ترجمة صوت ')) {
            const inputText = text.replace('.ترجمة صوت ', '').trim()
            if (!inputText) return await sock.sendMessage(from, { text: '📌 اكتب النص بعد الامر. مثال: .ترجمة صوت مرحبا بالعالم' })
            if (inputText.length > 200) return await sock.sendMessage(from, { text: '❌ النص طويل اوي، حد أقصى 200 حرف' })
            try {
                const transRes = await axios.get(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(inputText)}`)
                const translated = transRes.data[0][0][0]
                const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(translated)}`
                const audioRes = await axios.get(url, { responseType: 'arraybuffer', headers: { 'User-Agent': 'Mozilla/5.0' } })
                const audioBuffer = Buffer.from(audioRes.data)
                await sock.sendMessage(from, { audio: audioBuffer, mimetype: 'audio/mpeg', ptt: true, caption: `🇺🇸 ${translated}` })
            } catch (e) { await sock.sendMessage(from, { text: '❌ فشل التحويل، حاول تاني' }) }
        }

        else if (text.startsWith('.طقس ')) {
            const city = text.replace('.طقس ', '').trim()
            if (!city) return await sock.sendMessage(from, { text: '📌 اكتب اسم المدينة. مثال: .طقس القاهرة' })
            if (!process.env.OPENWEATHER_API_KEY) return await sock.sendMessage(from, { text: '❌ مفتاح الطقس مش مضاف في Secrets (OPENWEATHER_API_KEY)' })
            try {
                const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric&lang=ar`)
                const d = res.data
                const desc = d.weather[0].description
                const temp = d.main.temp
                const feels = d.main.feels_like
                const humidity = d.main.humidity
                const wind = d.wind.speed
                const tempEmoji = temp >= 35 ? '🔥' : temp >= 25 ? '☀️' : temp >= 15 ? '🌤️' : temp >= 5 ? '🌧️' : '❄️'
                await sock.sendMessage(from, {
                    text:
                        `${tempEmoji} *طقس ${d.name}*\n\n` +
                        `🌡️ الحرارة: ${Math.round(temp)}°C (محسوسة: ${Math.round(feels)}°C)\n` +
                        `☁️ الحالة: ${desc}\n` +
                        `💧 الرطوبة: ${humidity}%\n` +
                        `💨 الرياح: ${wind} م/ث`
                })
            } catch (e) {
                if (e.response?.status === 404) return await sock.sendMessage(from, { text: `❌ مش لاقي مدينة اسمها "${city}"` })
                await sock.sendMessage(from, { text: '❌ فشل جلب الطقس، حاول تاني' })
            }
        }

        else if (text === '.ميمز') {
            const subreddits = ['ArabsMemes', 'memes', 'arabmemes']
            const sub = subreddits[Math.floor(Math.random() * subreddits.length)]
            try {
                const res = await axios.get(`https://meme-api.com/gimme/${sub}`, { timeout: 8000 })
                const meme = res.data
                if (!meme || meme.nsfw || !meme.url) throw new Error('bad meme')
                const imgRes = await axios.get(meme.url, { responseType: 'arraybuffer', timeout: 10000 })
                const imgBuffer = Buffer.from(imgRes.data)
                await sock.sendMessage(from, {
                    image: imgBuffer,
                    caption: `😂 *${meme.title || 'ميم عشوائي'}*`
                })
            } catch (e) {
                await sock.sendMessage(from, { text: 'الميمز هربت دلوقتي 😂 جرب كمان شوية' })
            }
        }

        else if (text.startsWith('.فيلم ')) {
            const movieName = text.replace('.فيلم ', '').trim()
            if (!movieName) return await sock.sendMessage(from, { text: '🎬 اكتب اسم الفيلم. مثال: .فيلم Inception' })
            if (!process.env.OMDB_API_KEY) return await sock.sendMessage(from, { text: '❌ مفتاح OMDB مش مضاف في Secrets (OMDB_API_KEY)' })
            try {
                const res = await axios.get(`https://www.omdbapi.com/?t=${encodeURIComponent(movieName)}&apikey=${process.env.OMDB_API_KEY}&plot=short`, { timeout: 8000 })
                const d = res.data
                if (d.Response === 'False') return await sock.sendMessage(from, { text: `❌ مش لاقي فيلم اسمه "${movieName}"` })

                const typeMap = { movie: '🎬 فيلم', series: '📺 مسلسل', episode: '📺 حلقة' }
                const typeAr = typeMap[d.Type] || d.Type
                const ratingImdb = d.imdbRating !== 'N/A' ? `⭐ ${d.imdbRating}/10` : '⭐ غير متاح'

                let msg2 =
                    `🎬 *${d.Title}* (${d.Year})\n\n` +
                    `📌 النوع: ${typeAr}\n` +
                    `🎭 التصنيف: ${d.Genre !== 'N/A' ? d.Genre : 'غير متاح'}\n` +
                    `⏱️ المدة: ${d.Runtime !== 'N/A' ? d.Runtime : 'غير متاح'}\n` +
                    `${ratingImdb}\n` +
                    `🌍 اللغة: ${d.Language !== 'N/A' ? d.Language : 'غير متاح'}\n` +
                    `🎥 المخرج: ${d.Director !== 'N/A' ? d.Director : 'غير متاح'}\n\n` +
                    `📝 *القصة:*\n${d.Plot !== 'N/A' ? d.Plot : 'لا يوجد وصف'}`

                if (d.Poster && d.Poster !== 'N/A') {
                    try {
                        const imgRes = await axios.get(d.Poster, { responseType: 'arraybuffer', timeout: 8000 })
                        await sock.sendMessage(from, { image: Buffer.from(imgRes.data), caption: msg2 })
                    } catch {
                        await sock.sendMessage(from, { text: msg2 })
                    }
                } else {
                    await sock.sendMessage(from, { text: msg2 })
                }
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ فشل جلب معلومات الفيلم، حاول تاني' })
            }
        }

        else if (text === '.اخبار') {
            const feeds = [
                'https://www.bbc.com/arabic/index.xml',
                'https://www.aljazeera.net/rss'
            ]
            const parseRSS = (xml) => {
                const items = []
                const regex = /<item[\s\S]*?<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>[\s\S]*?<link>([\s\S]*?)<\/link>|<item[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>/g
                let match
                while ((match = regex.exec(xml)) !== null && items.length < 5) {
                    const title = (match[1] || match[3] || '').trim()
                    const link = (match[2] || match[4] || '').trim()
                    if (title && link) items.push({ title, link })
                }
                return items
            }
            let items = []
            for (const url of feeds) {
                try {
                    const res = await axios.get(url, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } })
                    items = parseRSS(res.data)
                    if (items.length > 0) break
                } catch { }
            }
            if (items.length === 0) {
                return await sock.sendMessage(from, { text: 'الاخبار فصلت دلوقتي 😂' })
            }
            let reply = `📰 *اخر الاخبار*\n\n`
            items.forEach((item, i) => {
                reply += `${i + 1}. *${item.title}*\n🔗 ${item.link}\n\n`
            })
            await sock.sendMessage(from, { text: reply.trim() })
        }

        else if (text === '.كورة') {
            if (!process.env.FOOTBALL_API_KEY) return await sock.sendMessage(from, { text: '❌ مفتاح FOOTBALL_API_KEY مش مضاف في Secrets' })
            const nowTs = Date.now()
            if (global._kooraCache && nowTs - global._kooraCache.ts < 3600000) {
                return await sock.sendMessage(from, { text: global._kooraCache.msg })
            }
            try {
                const toDate = d => d.toISOString().split('T')[0]
                const yesterday = toDate(new Date(nowTs - 86400000))
                const today     = toDate(new Date(nowTs))
                const tomorrow  = toDate(new Date(nowTs + 86400000))
                const res = await axios.get('https://api.football-data.org/v4/matches', {
                    headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY },
                    params: { dateFrom: yesterday, dateTo: tomorrow },
                    timeout: 10000
                })
                const allowed = ['PL', 'PD', 'CL', 'EGY']
                const all = (res.data.matches || []).filter(m => allowed.includes(m.competition?.code))
                const results  = all.filter(m => m.status === 'FINISHED')
                const upcoming = all.filter(m => ['SCHEDULED', 'TIMED'].includes(m.status))
                if (results.length === 0 && upcoming.length === 0) {
                    return await sock.sendMessage(from, { text: 'مفيش كورة النهاردة 😴 البس البيجاما' })
                }
                const shortName = t => t.shortName || t.tla || t.name
                let reply = ''
                if (results.length > 0) {
                    reply += `⚽ *نتائج الامس والنهاردة*\n\n`
                    results.slice(0, 8).forEach(m => {
                        const h = m.score.fullTime.home
                        const a = m.score.fullTime.away
                        const emoji = h === a ? '🤝' : '✅'
                        reply += `${shortName(m.homeTeam)} ${h} - ${a} ${shortName(m.awayTeam)} ${emoji}\n`
                    })
                    reply += '\n'
                }
                if (upcoming.length > 0) {
                    reply += `📅 *ماتشات النهاردة وبكرة*\n\n`
                    upcoming.slice(0, 8).forEach(m => {
                        const d = new Date(m.utcDate)
                        const matchDay = toDate(d)
                        const dayLabel = matchDay === today ? 'اليوم' : 'بكرة'
                        const h = String((d.getUTCHours() + 3) % 24).padStart(2, '0')
                        const min = String(d.getUTCMinutes()).padStart(2, '0')
                        reply += `${shortName(m.homeTeam)} vs ${shortName(m.awayTeam)} | ${dayLabel} ${h}:${min}\n`
                    })
                }
                reply = reply.trim()
                global._kooraCache = { ts: nowTs, msg: reply }
                await sock.sendMessage(from, { text: reply })
            } catch (e) {
                await sock.sendMessage(from, { text: 'مفيش كورة النهاردة 😴 البس البيجاما' })
            }
        }

        else if (text.startsWith('.ترتيب')) {
            if (!process.env.FOOTBALL_API_KEY) return await sock.sendMessage(from, { text: '❌ مفتاح FOOTBALL_API_KEY مش مضاف في Secrets' })
            const leagueInput = text.replace('.ترتيب', '').trim().toLowerCase()
            if (!leagueInput) return await sock.sendMessage(from, {
                text: '📌 اكتب اسم الدوري. مثال: .ترتيب الانجليزي\nالدوريات المتاحة: انجليزي، اسباني، ايطالي، الماني، فرنسي، ابطال'
            })
            const leagueMap = {
                PL: ['انجليزي', 'الانجليزي', 'premier', 'premier league', 'pl', 'england'],
                PD: ['اسباني', 'الاسباني', 'laliga', 'la liga', 'spanish', 'spain', 'pd'],
                SA: ['ايطالي', 'الايطالي', 'serie a', 'seriea', 'italian', 'italy', 'sa'],
                BL1: ['الماني', 'الالماني', 'bundesliga', 'german', 'germany', 'bl1'],
                FL1: ['فرنسي', 'الفرنسي', 'ligue 1', 'ligue1', 'french', 'france', 'fl1'],
                CL: ['ابطال', 'الابطال', 'دوري الابطال', 'champions', 'champions league', 'cl', 'ucl']
            }
            const leagueNames = { PL: 'الدوري الإنجليزي', PD: 'الدوري الإسباني', SA: 'الدوري الإيطالي', BL1: 'الدوري الألماني', FL1: 'الدوري الفرنسي', CL: 'دوري أبطال أوروبا' }
            let leagueCode = null
            for (const [code, keywords] of Object.entries(leagueMap)) {
                if (keywords.some(k => leagueInput.includes(k))) { leagueCode = code; break }
            }
            if (!leagueCode) return await sock.sendMessage(from, { text: 'الدوري ده مش متاح 😅\nالدوريات المتاحة: انجليزي، اسباني، ايطالي، الماني، فرنسي، ابطال' })
            const nowTs = Date.now()
            if (!global._standingsCache) global._standingsCache = {}
            if (global._standingsCache[leagueCode] && nowTs - global._standingsCache[leagueCode].ts < 3600000) {
                return await sock.sendMessage(from, { text: global._standingsCache[leagueCode].msg })
            }
            try {
                const res = await axios.get(`https://api.football-data.org/v4/competitions/${leagueCode}/standings`, {
                    headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY },
                    timeout: 10000
                })
                const table = res.data.standings?.find(s => s.type === 'TOTAL')?.table || []
                if (table.length === 0) return await sock.sendMessage(from, { text: 'مفيش بيانات للدوري ده دلوقتي 😅' })
                const pluralPts = n => n === 1 ? 'نقطة' : 'نقطة'
                let reply = `🏆 *جدول ${leagueNames[leagueCode]}*\n\n`
                table.forEach(row => {
                    const medal = row.position === 1 ? '🥇' : row.position === 2 ? '🥈' : row.position === 3 ? '🥉' : `${row.position}.`
                    const team = row.team.shortName || row.team.tla || row.team.name
                    reply += `${medal} ${team} — ${row.points} ${pluralPts(row.points)}\n`
                })
                reply = reply.trim()
                global._standingsCache[leagueCode] = { ts: nowTs, msg: reply }
                await sock.sendMessage(from, { text: reply })
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ فشل جلب الترتيب، حاول تاني' })
            }
        }

        else if (text.startsWith('.هداف')) {
            if (!process.env.FOOTBALL_API_KEY) return await sock.sendMessage(from, { text: '❌ مفتاح FOOTBALL_API_KEY مش مضاف في Secrets' })
            const leagueInput = text.replace('.هداف', '').trim().toLowerCase()
            if (!leagueInput) return await sock.sendMessage(from, {
                text: '📌 اكتب اسم الدوري. مثال: .هداف الانجليزي\nالدوريات المتاحة: انجليزي، اسباني، ايطالي، الماني، فرنسي، ابطال'
            })
            const leagueMap = {
                PL:  ['انجليزي', 'الانجليزي', 'premier', 'premier league', 'pl', 'england'],
                PD:  ['اسباني', 'الاسباني', 'laliga', 'la liga', 'spanish', 'spain', 'pd'],
                SA:  ['ايطالي', 'الايطالي', 'serie a', 'seriea', 'italian', 'italy', 'sa'],
                BL1: ['الماني', 'الالماني', 'bundesliga', 'german', 'germany', 'bl1'],
                FL1: ['فرنسي', 'الفرنسي', 'ligue 1', 'ligue1', 'french', 'france', 'fl1'],
                CL:  ['ابطال', 'الابطال', 'دوري الابطال', 'champions', 'champions league', 'cl', 'ucl']
            }
            const leagueNames = { PL: 'الدوري الإنجليزي', PD: 'الدوري الإسباني', SA: 'الدوري الإيطالي', BL1: 'الدوري الألماني', FL1: 'الدوري الفرنسي', CL: 'دوري أبطال أوروبا' }
            let leagueCode = null
            for (const [code, keywords] of Object.entries(leagueMap)) {
                if (keywords.some(k => leagueInput.includes(k))) { leagueCode = code; break }
            }
            if (!leagueCode) return await sock.sendMessage(from, { text: 'الدوري ده مش متاح 😅\nالدوريات المتاحة: انجليزي، اسباني، ايطالي، الماني، فرنسي، ابطال' })
            const nowTs = Date.now()
            if (!global._scorersCache) global._scorersCache = {}
            if (global._scorersCache[leagueCode] && nowTs - global._scorersCache[leagueCode].ts < 3600000) {
                return await sock.sendMessage(from, { text: global._scorersCache[leagueCode].msg })
            }
            try {
                const res = await axios.get(`https://api.football-data.org/v4/competitions/${leagueCode}/scorers?limit=10`, {
                    headers: { 'X-Auth-Token': process.env.FOOTBALL_API_KEY },
                    timeout: 10000
                })
                const scorers = res.data.scorers || []
                if (scorers.length === 0) return await sock.sendMessage(from, { text: 'مفيش بيانات هدافين للدوري ده دلوقتي 😅' })
                const medals = ['🥇', '🥈', '🥉']
                let reply = `⚽ *أفضل هدافين ${leagueNames[leagueCode]}*\n\n`
                scorers.forEach((s, i) => {
                    const pos = medals[i] || `${i + 1}.`
                    const name = s.player?.name || 'لاعب'
                    const team = s.team?.shortName || s.team?.tla || s.team?.name || ''
                    const goals = s.goals ?? 0
                    const assists = s.assists ?? 0
                    reply += `${pos} ${name} (${team}) — ${goals} هدف 🎯`
                    if (assists > 0) reply += ` · ${assists} تمريرة`
                    reply += '\n'
                })
                reply = reply.trim()
                global._scorersCache[leagueCode] = { ts: nowTs, msg: reply }
                await sock.sendMessage(from, { text: reply })
            } catch (e) {
                await sock.sendMessage(from, { text: '❌ فشل جلب الهدافين، حاول تاني' })
            }
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
                if (!isBotAdmin(groupMeta, sock.user.id)) return await sock.sendMessage(from, { text: '❌ لازم اكون ادمن عشان أطرد' })
                const targetId = mentioned[0]
                if (isDeveloper(targetId)) return await sock.sendMessage(from, { text: '❌ مش تقدر تطرد المطور!' })
                try {
                    await sock.groupParticipantsUpdate(from, [targetId], 'remove')
                    await sock.sendMessage(from, { text: `🚪 *تم طرد @${targetId.split('@')[0]} بنجاح ✅*`, mentions: [targetId] })
                } catch (e) {
                    await sock.sendMessage(from, { text: `❌ فشل الطرد — ${e.message || 'تأكد إن البوت مشرف'}` })
                }
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
                if (!isBotAdmin(groupMeta, sock.user.id)) return await sock.sendMessage(from, { text: '❌ لازم اكون ادمن عشان أكتم (بحذف رسائله)' })
                const targetId = mentioned[0]
                if (isDeveloper(targetId)) return await sock.sendMessage(from, { text: '❌ مش تقدر تكتم المطور!' })
                const db = loadDB(); const groupData = getGroup(db, from)
                if (groupData.muted.includes(targetId)) return await sock.sendMessage(from, { text: `🔇 مكتوم أصلاً`, mentions: [targetId] })
                groupData.muted.push(targetId); saveDB(db)
                await sock.sendMessage(from, { text: `🔇 *تم كتم @${targetId.split('@')[0]} بنجاح ✅*\nرسائله هتتحذف تلقائياً`, mentions: [targetId] })
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

    })  // end messages.upsert
}  // end startBot

startBot()
