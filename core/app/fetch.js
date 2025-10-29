const appLog = require(`./log`);


module.exports = async function(url, parse = `json`, options = {}, retries = 3) {
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

            clearTimeout(timeout);

            if (!response.ok) {
                appLog(`Не удалось получить ответ. Путь: "${url}". Статус: ${response.status}.`);
                return false;
            };

            if (parse === 'json') {
                return await response.json();
            };

            if (parse === 'text') {
                return await response.text();
            };

            if (parse === 'buffer') {
                return await response.arrayBuffer();
            };

            return null;
        } catch (error) {
            clearTimeout(timeout);

            appLog(`Ошибка при выполнении запроса. Путь: "${url}". Ошибка: ${error.name}: ${error.message}.${error.cause?.code ? ` Код: ${error.cause.code}.` : ``} Попытка: ${attempt}/${retries}.`);

            if (attempt === retries) {
                return false;
            };

            await new Promise(function(resolve) {
                return setTimeout(resolve, 1000);
            });
        };
    };
};