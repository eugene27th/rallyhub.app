const logger = require(`./logger`);


const send = async function(url, options, parse = `json`) {
    for (let a = 1; a <= 5; a++) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                logger.log(`Ошибка при выполнении запроса. Путь: "${url}". Статус: ${response.status}.`);
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

            return true;
        } catch (error) {
            logger.log(`Ошибка при выполнении запроса. Путь: "${url}". Ошибка: ${error.name}: ${error.message}.${error.cause?.code ? ` Код: ${error.cause.code}.` : ``}`);

            if (a >= 5) {
                return false;
            };
        };
    };
};


module.exports = {
    send
};