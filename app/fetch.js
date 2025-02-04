const logger = require(`./logger`);


const send = async function(url, options = {}, attemts = 5) {
    for (let a = 1; a <= attemts; a++) {
        try {
            if (options.headers) {
                options.headers[`app-version`] = globalThis.config.version;
            } else {
                options.headers = {
                    [`app-version`]: globalThis.config.version
                };
            };

            return await fetch(url, options);
        } catch (error) {
            logger.log(`Ошибка при выполнении запроса. Путь: "${url}". Код: ${error.code}.`);

            if (a >= attemts) {
                throw error;
            };
        };
    };
};


module.exports = {
    send
};