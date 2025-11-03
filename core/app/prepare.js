const fs = require(`fs`);
const path = require(`path`);

const electronMain = require(`electron/main`);

const appLog = require(`./log`);


const defaultConfig = {
    version: `1.1.0`,
    domain: `rallyhub.ru`,
    port: 20220,
    game: `wrc23`,
    voice: 1,
    rate: 100,
    volume: 70
};


module.exports = function() {
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

    if (fs.existsSync(globalThis.app.path.log) && fs.statSync(globalThis.app.path.log).size > (5 * 1024 * 1024)) {
        fs.writeFileSync(globalThis.app.path.log, ``);
    } else {
        fs.appendFileSync(globalThis.app.path.log, `\n`);
    };

    appLog(`Запуск приложения.`);

    if (!fs.existsSync(globalThis.app.path.config)) {
        fs.writeFileSync(globalThis.app.path.config, JSON.stringify(defaultConfig, null, 4));
    };

    try {
        globalThis.app.config = JSON.parse(fs.readFileSync(globalThis.app.path.config));
    } catch (error) {
        appLog(`Ошибка при парсинге конфигурационного файла приложения. Ошибка: ${error.name}: ${error.message}.`);
        globalThis.app.config = defaultConfig;
    };

    for (const key of Object.keys(defaultConfig)) {
        if (globalThis.app.config[key] === undefined) {
            appLog(`Не найден необходимый ключ "${key}" в конфигурационном файле приложения. Возвращена конфигурация по-умолчанию.`);
            globalThis.app.config = defaultConfig;
        };
    };

    try {
        globalThis.app.path.documents = require(`child_process`).execSync(`powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Environment]::GetFolderPath('MyDocuments')"`, { encoding: `utf8` }).trim();
        appLog(`Получен путь директории "Documents" из реестра Windows: "${globalThis.app.path.documents}".`);
    } catch {
        globalThis.app.path.documents = path.join(process.env.USERPROFILE, `Documents`);
        appLog(`Путь директории "Documents" не найден в реестре Windows, либо был выключен PowerShell. Путь получен из среды выполнения: "${globalThis.app.path.documents}".`);
    };

    globalThis.app.url.api = `http://127.0.0.1:30001`;
    globalThis.app.url.cdn = `https://cdn.${globalThis.app.config.domain}`;
    globalThis.app.url.site = `https://rallyhub.ru`;
};