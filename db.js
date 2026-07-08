const fs = require('fs');
const config = require('./config');
let db = config.db;

async function loadDB() {
    if (fs.existsSync('./database.json')) {
        db = JSON.parse(fs.readFileSync('./database.json'));
        config.db = db;
    }
}

async function saveDB() {
    fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
}

module.exports = { db, loadDB, saveDB };
