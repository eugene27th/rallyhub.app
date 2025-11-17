const fs = require(`fs`);

const appLog = require(`./log`);
const tryFetch = require(`./fetch`);


module.exports = async function() {
    appLog(`Проверка версии приложения.`);

    const latestVersion = await tryFetch(`${globalThis.app.config.domainApi}/client/version`, `text`);

    if (!latestVersion) {
        return {
            code: `networkError`
        };
    };

    const latestMajorVersion = parseInt(latestVersion.split(`.`)[0]);
    const currentMajorVersion = parseInt(globalThis.app.config.appVersion.split(`.`)[0]);
    const electronMajorVersion = parseInt(process.versions.electron.split(`.`)[0]);

    if (currentMajorVersion < latestMajorVersion || electronMajorVersion < 34) {
        appLog(`Мажорная версия приложения/electron не совпадает с актуальной. Требуется ручная переустановка. Удалите текущее приложение и скачайте новое на сайте: "${globalThis.app.config.domainSite}".`);

        return {
            code: `majorUpdate`
        };
    };

    if (globalThis.app.config.appVersion !== latestVersion) {
        appLog(`Текущая версия приложения не совпадает с актуальной. Обновление приложения ("${globalThis.app.config.appVersion}" > "${latestVersion}").`);

        const asar = await tryFetch(`${globalThis.app.config.domainCdn}/app.asar`, `buffer`);

        if (!asar) {
            // todo: проверять целостность архива (хеш и размер)

            return {
                code: `networkError`
            };
        };

        try {
            fs.writeFileSync(globalThis.app.path.asar, Buffer.isBuffer(asar) ? asar : Buffer.from(asar));
        } catch (error) {
            appLog(`Ошибка при записи архива ресурсов. Путь: "${globalThis.app.path.asar}". Код: ${error.code}.`);

            return {
                code: `fileSystemError`
            };
        };

        globalThis.app.config.appVersion = latestVersion;

        try {
            fs.writeFileSync(globalThis.app.path.config, JSON.stringify(globalThis.app.config, null, 4));
        } catch (error) {
            appLog(`Ошибка при записи конфигурационного файла приложения. Путь: "${globalThis.app.path.config}". Код: ${error.code}.`);

            return {
                code: `fileSystemError`
            };
        };

        appLog(`Обновление приложения завершено. Перезагрузка.`);

        return {
            code: `restartRequired`
        };
    };

    appLog(`Текущая версия приложения совпадает с актуальной.`);

    return {
        code: `appReady`
    };
};