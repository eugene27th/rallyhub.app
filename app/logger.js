const fs = require(`fs/promises`);


const log = async function(message) {
    let date = new Date();

    let D = date.getUTCDate();
    let M = date.getUTCMonth() + 1;
    let Y = date.getUTCFullYear();

    if (D < 10) {
        D = `0${D}`;
    };

    if (M < 10) {
        M = `0${M}`;
    };

    let h = date.getUTCHours();
    let m = date.getUTCMinutes();
    let s = date.getUTCSeconds();

    if (h < 10) {
        h = `0${h}`;
    };

    if (m < 10) {
        m = `0${m}`;
    };

    if (s < 10) {
        s = `0${s}`;
    };

    let path = `${globalThis.path}/app.log`;
    let row = `[${D}.${M}.${Y} ${h}:${m}:${s}Z] ${message}\n`;

    let file = await fs.readFile(path, { encoding: `utf8` }).catch(function() {
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