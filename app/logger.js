const fs = require(`fs`);


const log = function(message) {
    let date = new Date();

    const D = `${date.getUTCDate()}`.padStart(2, `0`);
    const M = `${date.getUTCMonth() + 1}`.padStart(2, `0`);
    const Y = date.getUTCFullYear();

    const h = `${date.getUTCHours()}`.padStart(2, `0`);
    const m = `${date.getUTCMinutes()}`.padStart(2, `0`);
    const s = `${date.getUTCSeconds()}`.padStart(2, `0`);

    const path = `${globalThis.path}/app.log`;
    const row = `[${D}.${M}.${Y} ${h}:${m}:${s}Z] ${message}\n`;

    try {
        let file = fs.readFileSync(path, { encoding: `utf8` });
        let rows = file.split(`\n`).slice(0, -1);

        if (rows.length > 1000) {
            rows.push(row); return fs.writeFileSync(path, rows.slice(50).join(`\n`));
        };
    } finally {
        try {
            return fs.appendFileSync(path, row);
        } catch (error) {
            return false;
        };
    };
};


module.exports = {
    log
};