const fs = require(`fs`);
const path = require(`path`);

const appLog = require(`./log`);
const appUpdate = require(`./update`);

const telemetrySetup = require(`../telemetry/setup`);

const defaultConfig = {
    appVersion: `1.1.0`,
    appTelemetryPort: 20220,

    domainApi: `https://api-beta.rallyhub.ru`,
    domainCdn: `https://cdn.rallyhub.ru`,
    domainSite: `https://rallyhub.ru`,

    settingGame: `wrc23`,
    settingVoice: 1,
    settingPlaybackRate: 100,
    settingPlaybackVolume: 100
};


module.exports = async function() {
    try {
        fs.accessSync(globalThis.app.path.root, fs.constants.W_OK | fs.constants.R_OK);
    } catch (error) {
        appLog(`Нет прав доступа к корневой директории приложения. Ошибка: ${error.name}: ${error.message}.`);

        return {
            code: `fileSystemError`
        };
    };

    try {
        if (fs.existsSync(globalThis.app.path.log) && fs.statSync(globalThis.app.path.log).size > (5 * 1024 * 1024)) {
            fs.writeFileSync(globalThis.app.path.log, ``);
        };

        fs.appendFileSync(globalThis.app.path.log, `\n`);
    } catch (error) {
        appLog(`Ошибка при чтении/записи лог файла приложения. Ошибка: ${error.name}: ${error.message}. Код: ${error.code}.`);

        return {
            code: `fileSystemError`
        };
    };

    appLog(`Запуск приложения.`);

    try {
        if (fs.existsSync(globalThis.app.path.config)) {
            globalThis.app.config = JSON.parse(fs.readFileSync(globalThis.app.path.config));
        } else {
            fs.writeFileSync(globalThis.app.path.config, JSON.stringify(defaultConfig, null, 4));
            globalThis.app.config = defaultConfig;
        };
    } catch (error) {
        appLog(`Ошибка при чтении/записи конфигурационного файла приложения. Ошибка: ${error.name}: ${error.message}. Код: ${error.code || `PARSE`}.`);
        globalThis.app.config = defaultConfig;
    };

    for (const key of Object.keys(defaultConfig)) {
        if (globalThis.app.config[key] === undefined) {
            appLog(`Не найден необходимый ключ "${key}" в конфигурационном файле приложения. Возвращена конфигурация по-умолчанию.`);
            globalThis.app.config = defaultConfig;
            break;
        };
    };

    try {
        globalThis.app.path.documents = require(`child_process`).execSync(`powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Environment]::GetFolderPath('MyDocuments')"`, { encoding: `utf8` }).trim();
        appLog(`Получен путь директории "Documents" из реестра Windows: "${globalThis.app.path.documents}".`);
    } catch {
        globalThis.app.path.documents = path.join(process.env.USERPROFILE, `Documents`);
        appLog(`Путь директории "Documents" не найден в реестре Windows, либо был выключен PowerShell. Путь получен из среды выполнения: "${globalThis.app.path.documents}".`);
    };

    let updateStatus;

    try {
        updateStatus = await appUpdate();
    } catch (error) {
        appLog(`Ошибка при обновлении приложения: ${error.stack || error}.`);

        updateStatus = {
            code: `updateError`
        };
    };

    if (updateStatus.code !== `appReady`) {
        return updateStatus;
    };

    telemetrySetup.drt20();
    telemetrySetup.wrc23();
    telemetrySetup.acr25();

    return {
        code: `appReady`
    };
};