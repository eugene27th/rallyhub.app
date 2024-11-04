const fs = require(`fs/promises`);


const log = async function(message) {
    let date = new Date();

    const D = `${date.getUTCDate()}`.padStart(2, `0`);
    const M = `${date.getUTCMonth() + 1}`.padStart(2, `0`);
    const Y = date.getUTCFullYear();

    const h = `${date.getUTCHours()}`.padStart(2, `0`);
    const m = `${date.getUTCMinutes()}`.padStart(2, `0`);
    const s = `${date.getUTCSeconds()}`.padStart(2, `0`);

    const path = `${globalThis.path}/app.log`;
    const row = `[${D}.${M}.${Y} ${h}:${m}:${s}Z] ${message}\n`;

    const file = await fs.readFile(path, { encoding: `utf8` }).catch(function() {
        return null;
    });

    if (file) {
        let rows = file.split(`\n`).slice(0, -1);

        if (rows.length > 1000) {
            rows.push(row);
            return await fs.writeFile(path, rows.slice(50).join(`\n`));
        };
    };

    return await fs.appendFile(path, row);
};

const info = async function(message) {
    return await log(`[INFO] ${message}`);  
};

const error = async function(message) {
    return await log(`[ERROR] ${message}`);  
};


module.exports = {
    info,
    error
};