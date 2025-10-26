const fs = require(`fs`);
const path = require(`path`);

const electronMain = require(`electron/main`);

const appCommon = require(`./common`);
const telemetrySetup = require(`../telemetry/setup`);


const getConfig = function() {
    const defaultConfig = {
        version: `1.1.0`,
        domain: `rallyhub.ru`,
        port: 20220,
        game: `wrc23`,
        voice: 1,
        rate: 100,
        volume: 70
    };

    try {
        if (!fs.existsSync(globalThis.app.path.config)) {
            fs.writeFileSync(globalThis.app.path.config, JSON.stringify(defaultConfig, null, 4));
        };

        const config = JSON.parse(fs.readFileSync(globalThis.app.path.config));
        
        for (const key of Object.keys(defaultConfig)) {
            if (config[key] === undefined) {
                appCommon.writeLog(`Не найден необходимый ключ "${key}" в конфигурационном файле приложения. Возвращена конфигурация по-умолчанию.`);
                return defaultConfig;
            };
        };

        return config;
    } catch (error) {
        appCommon.writeLog(`Ошибка при парсинге конфигурационного файла приложения. Ошибка: ${error.name}: ${error.message}.`);
        return defaultConfig;
    };
};

const getDocumentPath = function() {
    try {
        const res = require(`child_process`).execSync(`powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Environment]::GetFolderPath('MyDocuments')"`, { encoding: `utf8` }).trim();
        appCommon.writeLog(`Получен путь директории "Documents" из реестра Windows: "${res}".`);
        return res;
    } catch {
        const res = path.join(process.env.USERPROFILE, `Documents`);
        appCommon.writeLog(`Путь директории "Documents" не найден в реестре Windows, либо был выключен PowerShell. Путь получен из среды выполнения: "${res}".`);
        return res;
    };
};


const setupEnv = function() {
    globalThis.app = {
        url: {},
        path: {},
        data: {},
        telemetry: {}
    };
    
    globalThis.app.path.root = electronMain.app.isPackaged ? path.dirname(process.resourcesPath) : electronMain.app.getAppPath();
    globalThis.app.path.resources = electronMain.app.getAppPath();
    globalThis.app.path.log = path.join(globalThis.app.path.root, `app.log`);
    globalThis.app.path.config = path.join(globalThis.app.path.root, `config.json`);
    globalThis.app.path.asar = path.join(globalThis.app.path.root, `resources`, `app.asar`);
    globalThis.app.path.documents = getDocumentPath();
    
    globalThis.app.config = getConfig();
    
    globalThis.app.url.api = `http://127.0.0.1:30001`;
    globalThis.app.url.cdn = `https://cdn.${globalThis.app.config.domain}`;
    globalThis.app.url.site = `https://rallyhub.ru`;
};

const updateApp = async function() {
    appCommon.writeLog(`Проверка версии приложения.`);

    const latestVersion = await appCommon.tryFetch(`${globalThis.app.url.api}/client/version`, `text`);

    if (!latestVersion.ok) {
        return {
            code: `networkError`
        };
    };

    const latestMajorVersion = parseInt(latestVersion.data.split(`.`)[0]);
    const currentMajorVersion = parseInt(globalThis.app.config.version.split(`.`)[0]);
    const electronMajorVersion = parseInt(process.versions.electron.split(`.`)[0]);

    if (currentMajorVersion < latestMajorVersion || electronMajorVersion < 34) {
        appCommon.writeLog(`Мажорная версия приложения/electron не совпадает с актуальной. Требуется ручная переустановка. Удалите текущее приложение и скачайте новое на сайте: "${globalThis.app.url.site}".`);

        return {
            code: `majorUpdate`
        };
    };

    if (globalThis.app.config.version === latestVersion.data) {
        appCommon.writeLog(`Текущая версия приложения совпадает с актуальной.`);

        return {
            code: `appReady`
        };
    };

    appCommon.writeLog(`Текущая версия приложения не совпадает с актуальной. Обновление приложения ("${globalThis.app.config.version}" > "${latestVersion}").`);

    const asar = await appCommon.tryFetch(`${globalThis.app.url.cdn}/app.asar`, `buffer`);

    if (!asar.ok) {
        // проверять целостность архива (хеш и/или размер)

        return {
            code: `networkError`
        };
    };

    try {
        fs.writeFileSync(globalThis.app.path.asar, Buffer.isBuffer(asar.data) ? asar.data : Buffer.from(asar.data));
    } catch (error) {
        appCommon.writeLog(`Ошибка при обновлении архива ресурсов. Путь: "${globalThis.app.path.asar}". Код: ${error.code}.`);

        return {
            code: `fileSystemError`
        };
    };

    globalThis.app.config.version = latestVersion;

    try {
        fs.writeFileSync(globalThis.app.path.config, JSON.stringify(globalThis.app.config, null, 4));
    } catch (error) {
        appCommon.writeLog(`Ошибка при обновлении конфигурационного файла приложения. Путь: "${globalThis.app.path.config}". Код: ${error.code}.`);

        return {
            code: `fileSystemError`
        };
    };

    appCommon.writeLog(`Обновление приложения завершено. Перезагрузка.`);

    return {
        code: `restartRequired`
    };
};

const setupApp = async function() {
    if (fs.existsSync(globalThis.app.path.log) && fs.statSync(globalThis.app.path.log).size > (5 * 1024 * 1024)) {
        fs.writeFileSync(globalThis.app.path.log, ``);
    };

    let updateStatus;
    
    try {
        updateStatus = await updateApp();
    } catch (error) {
        appCommon.writeLog(`Ошибка при обновлении приложения: ${error.stack || error}.`);

        updateStatus = {
            code: `updateError`
        };
    };

    if (updateStatus.code !== `appReady`) {
        return updateStatus;
    };

    const [routes, voices, commands] = await Promise.allSettled([
        appCommon.tryFetch(`${globalThis.app.url.api}/routes`),
        appCommon.tryFetch(`${globalThis.app.url.api}/voices`),
        appCommon.tryFetch(`${globalThis.app.url.api}/commands`)
    ]);

    if (routes.status !== `fulfilled` || !routes.value.ok || voices.status !== `fulfilled` || !voices.value.ok || commands.status !== `fulfilled` || !commands.value.ok) {
        return {
            code: `networkError`
        };
    };

    globalThis.app.data.routes = routes.value.data;
    globalThis.app.data.voices = voices.value.data;
    globalThis.app.data.commands = commands.value.data;

    telemetrySetup();

    return {
        code: `appReady`
    };
};


module.exports = {
    setupEnv,
    setupApp
};