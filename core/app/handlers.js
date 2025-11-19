const fs = require(`fs`);
const path = require(`path`);

const electron = require(`electron`);
const electronMain = require(`electron/main`);

const appUtils = require(path.join(globalThis.app.path.resources, `core`, `app`, `utils.js`));


module.exports = function() {
    electronMain.ipcMain.handle(`setConfig`, function(event, config) {
        globalThis.app.config = config;
    });

    electronMain.ipcMain.handle(`getAppData`, async function() {
        const [routes, voices, commands] = await Promise.allSettled([
            appUtils.tryFetch(`${globalThis.app.config.domainApi}/routes`),
            appUtils.tryFetch(`${globalThis.app.config.domainApi}/voices`),
            appUtils.tryFetch(`${globalThis.app.config.domainApi}/commands`)
        ]);

        if (routes.status !== `fulfilled` || !routes.value || voices.status !== `fulfilled` || !voices.value || commands.status !== `fulfilled` || !commands.value) {
            return {
                error: `networkError`
            };
        };

        return {
            version: globalThis.app.version,
            config: globalThis.app.config,
            routes: routes.value,
            voices: voices.value,
            commands: commands.value
        };
    });

    electronMain.ipcMain.handle(`openRoute`, async function() {
        const response = await electronMain.dialog.showOpenDialog(globalThis.app.window, {
            properties: [`openFile`],
            filters: [
                {
                    name: `JSON`,
                    extensions: [`json`]
                }
            ]
        }).catch(function() {
            return null;
        });

        if (!response || response.canceled) {
            return null;
        };

        try {
            // todo: валидация файла
            return JSON.parse(fs.readFileSync(response.filePaths[0]));
        } catch (error) {
            appUtils.writeLog(`Ошибка при открытии/парсинге файла. Путь: "${response.filePaths[0]}". Код: ${error.code || `PARSE`}.`);
            return null;
        };
    });

    electronMain.ipcMain.handle(`saveRoute`, async function(event, route) {
        const response = await electronMain.dialog.showSaveDialog(globalThis.app.window, {
            defaultPath: `${route.location} - ${route.name}.json`,
            properties: [`openFile`],
            filters: [
                {
                    name: `JSON`,
                    extensions: [`json`]
                }
            ]
        }).catch(function() {
            return false;
        });

        if (!response || response.canceled) {
            return false;
        };

        try {
            fs.writeFileSync(response.filePath, JSON.stringify(route, null, 4));
        } catch (error) {
            appUtils.writeLog(`Ошибка при записи файла спецучастка. Путь: "${response.filePath}". Код: ${error.code}.`);
            return false;
        };

        return true;
    });

    electronMain.ipcMain.handle(`sendRoute`, async function(event, route) {
        return await appUtils.tryFetch(`${globalThis.app.config.domainApi}/route/suggest`, null, {
            method: `POST`,
            headers: {
                [`Content-Type`]: `application/json`
            },
            body: JSON.stringify(route)
        });
    });

    electronMain.ipcMain.handle(`openExternalLink`, async function(event, url) {
        return await electron.shell.openExternal(url);
    });

    electronMain.ipcMain.handle(`minimizeWindow`, function() {
        return globalThis.app.window.minimize();
    });

    electronMain.ipcMain.handle(`closeWindow`, function() {
        return globalThis.app.window.close();
    });
};