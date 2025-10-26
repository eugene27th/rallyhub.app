const fs = require(`fs`);


const writeLog = function(message) {
    try {
        return fs.appendFileSync(globalThis.app.path.log, `[${(new Date()).toISOString()}] ${message}\n`);
    } catch (error) {
        return false;
    };
};

const tryFetch = async function(url, parse = `json`, options = {}, retries = 5, timeoutMs = 7000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController();

        const timeout = setTimeout(function() {
            return controller.abort(); 
        }, timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                writeLog(`Не удалось получить ответ. Путь: "${url}". Статус: ${response.status}. Попытка: ${attempt}/${retries}.`);

                return {
                    ok: false,
                    status: response.status
                };
            };

            let data;

            if (parse === 'json') {
                data = await response.json();
            } else if (parse === 'text') {
                data = await response.text();
            } else if (parse === 'buffer') {
                data = await response.arrayBuffer();
            } else {
                data = null;  
            };

            return {
                ok: true,
                data: data
            };

        } catch (error) {
            clearTimeout(timeout);

            writeLog(`Ошибка при выполнении запроса. Путь: "${url}". Ошибка: ${error.name}: ${error.message}.${error.cause?.code ? ` Код: ${error.cause.code}.` : ``} Попытка: ${attempt}/${retries}.`);

            if (attempt === retries) {
                return {
                    ok: false,
                    error: error
                };
            };

            await new Promise(function(resolve) {
                return setTimeout(resolve, 1000);
            });
        };
    };
};


module.exports = {
    writeLog,
    tryFetch
};