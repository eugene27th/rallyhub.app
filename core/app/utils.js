const fs = require(`fs`);


const tryFetch = async function(url, parse = `json`, options = {}, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController();

        const timeout = setTimeout(function() {
            return controller.abort();
        }, 10000);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            if (!response.ok) {
                writeLog(`Не удалось получить ответ. Путь: "${url}". Статус: ${response.status}.`);
                return false;
            };

            if (parse === `json`) {
                return await response.json();
            };

            if (parse === `text`) {
                return await response.text();
            };

            if (parse === `buffer`) {
                return await response.arrayBuffer();
            };

            return null;
        } catch (error) {
            writeLog(`Ошибка при выполнении запроса. Путь: "${url}". Ошибка: ${error.name}: ${error.message}.${error.cause?.code ? ` Код: ${error.cause.code}.` : ``} Попытка: ${attempt}/${retries}.`);

            if (attempt === retries) {
                return false;
            };

            await new Promise(function(resolve) {
                return setTimeout(resolve, 1000);
            });
        } finally {
            clearTimeout(timeout);
        };
    };
};

const writeLog = function(message) {
    try {
        fs.appendFileSync(globalThis.app.path.log, `[${(new Date()).toISOString()}] ${message}\n`);
    } catch (error) {
        console.error(`Ошибка записи в лог. Сообщение: ${message}. Ошибка: ${error}.`);
    };
};

const saveConfig = function() {
    try {
        fs.writeFileSync(globalThis.app.path.config, JSON.stringify(globalThis.app.config, null, 4));
    } catch (error) {
        writeLog(`Ошибка при записи конфигурационного файла приложения. Путь: "${globalThis.app.path.config}". Код: ${error.code}.`);
    };
};


module.exports = {
    tryFetch,
    writeLog,
    saveConfig
};