const fs = require(`fs`);

const electron = require(`electron`);
const electronMain = require(`electron/main`);

const appLog = require(`./log`);
const tryFetch = require(`./fetch`);


module.exports = function() {
    electronMain.ipcMain.handle(`setConfig`, function(event, config) {
        globalThis.app.config = config;
    });

    electronMain.ipcMain.handle(`getAppData`, async function() {
        return {
            config: globalThis.app.config,
            ...globalThis.app.data
        };
    });

    electronMain.ipcMain.handle(`editorOpenRoute`, async function() {
        const response = await electronMain.dialog.showOpenDialog(globalThis.app.window, {
            properties: ['openFile'],
            filters: [
                {
                    name: 'JSON',
                    extensions: ['json']
                }
            ]
        }).catch(function() {
            return null;
        });

        if (!response || response.canceled) {
            return null;
        };

        try {
            return JSON.parse(fs.readFileSync(response.filePaths[0]));
        } catch (error) {
            appLog(`Ошибка при открытии/парсинге файла. Путь: "${response.filePaths[0]}". Код: ${error.code || `PARSE`}.`);
            return null;
        };
    });

    electronMain.ipcMain.handle(`editorSaveRoute`, async function() {
        const response = await electronMain.dialog.showSaveDialog(globalThis.app.window, {
            defaultPath: `${data.location} - ${data.name}.json`,
            properties: ['openFile'],
            filters: [
                {
                    name: 'JSON',
                    extensions: ['json']
                }
            ]
        }).catch(function() {
            return false;
        });

        if (!response || response.canceled) {
            return false;
        };

        try {
            fs.writeFileSync(response.filePath, JSON.stringify(data, null, 4));
        } catch (error) {
            appLog(`Ошибка при записи файла спецучастка. Путь: "${response.filePath}". Код: ${error.code}.`);
            return false;
        };

        return true;
    });

    electronMain.ipcMain.handle(`editorSendRoute`, async function() {
        return await tryFetch(`${globalThis.app.url.api}/route/suggest`, null, {
            method: `POST`,
            headers: {
                [`Content-Type`]: `application/json`
            },
            body: JSON.stringify(data)
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