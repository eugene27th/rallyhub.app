const fs = require(`fs`);


module.exports = function(message) {
    try {
        fs.appendFileSync(globalThis.app.path.log, `[${(new Date()).toISOString()}] ${message}\n`);
    } catch (error) {
        console.error(`Ошибка записи в лог. Сообщение: ${message}.`);
    };
};