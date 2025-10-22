const fs = require(`fs`);
const path = require(`path`);


const writeLog = function(message) {
    try {
        return fs.appendFileSync(globalThis.app.path.log, `[${(new Date()).toISOString()}] ${message}\n`);
    } catch (error) {
        return false;
    };
};


const tryFetch = async function(url, parse = `json`, options = null) {
    for (let a = 1; a <= 5; a++) {
        try {
            const response = await fetch(url, options);

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

            return true;
        } catch (error) {
            writeLog(`Ошибка при выполнении запроса. Путь: "${url}". Ошибка: ${error.name}: ${error.message}.${error.cause?.code ? ` Код: ${error.cause.code}.` : ``}`);

            if (a >= 5) {
                return false;
            };
        };
    };
};


const getConfig = function() {
    const defaultConfig = {
        version: `1.1.0`,
        domain: `rallyhub.ru`,
        port: 20220,
        game: `wrc23`,
        voice: 1,
        rate: 100,
        volume: 50
    };

    try {
        const config = require(globalThis.app.path.config);
        
        for (const key of Object.keys(defaultConfig)) {
            if (config[key] === undefined) {
                writeLog(`Не найден необходимый ключ конфигурационного файла приложения. Возвращена конфигурация по-умолчанию.`);
                return defaultConfig;
            };
        };

        return config;
    } catch (error) {
        writeLog(`Ошибка при парсинге конфигурационного файла приложения. Ошибка: ${error.name}: ${error.message}.`);
        return defaultConfig;
    };
};

const getDocumentPath = function() {
    try {
        const res = require(`child_process`).execSync(`powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Environment]::GetFolderPath('MyDocuments')"`, { encoding: `utf8` }).trim();
        writeLog(`Получен путь директории "Documents" из реестра Windows: "${res}".`);
        return res;
    } catch {
        const res = path.join(process.env.USERPROFILE, `Documents`);
        writeLog(`Путь директории "Documents" не найден в реестре Windows, либо был выключен PowerShell. Путь получен из среды выполнения: "${res}".`);
        return res;
    };
};


const getLatestVersion = async function() {
    return await tryFetch(`${globalThis.app.url.api}/client/version`, `text`);
};

const getLatestAsar = async function() {
    return await tryFetch(`${globalThis.app.url.cdn}/app.asar`, `buffer`);
};

const getRoutes = async function() {
    return await tryFetch(`${globalThis.app.url.api}/routes`);
};

const getVoices = async function() {
    return await tryFetch(`${globalThis.app.url.api}/voices`);
};

const getCommands = async function() {
    return await tryFetch(`${globalThis.app.url.api}/commands`);
};

const getRouteById = async function(id) {
    return await tryFetch(`${globalThis.app.url.api}/route/${id}`);
};

const getRouteByGameId = async function(game, id) {
    return await tryFetch(`${globalThis.app.url.api}/route/${game}/${id}`);
};

const suggestRoute = async function(data) {
    return await tryFetch(`${globalThis.app.url.api}/suggest`, null, {
        method: `POST`,
        headers: {
            [`Content-Type`]: `application/json`
        },
        body: JSON.stringify(data)
    });
};


module.exports = {
    writeLog,
    tryFetch,
    getConfig,
    getDocumentPath,
    getLatestVersion,
    getLatestAsar,
    getRoutes,
    getVoices,
    getCommands,
    getRouteById,
    getRouteByGameId,
    suggestRoute
};