const { shell } = require(`electron`);
const { app, BrowserWindow, ipcMain, dialog } = require(`electron/main`);

if (!app.requestSingleInstanceLock()) {
    return app.quit();
};

// globalThis.path = app.getAppPath(); // start
globalThis.path = process.resourcesPath.slice(0, process.resourcesPath.length - 10); // pack
globalThis.config = require(`${globalThis.path}/config.json`);
globalThis.url = { api: `https://api.${globalThis.config.domain || `rallyhub.ru`}`, cdn: `https://cdn.${globalThis.config.domain || `rallyhub.ru`}` };
globalThis.routes = { id: {}, game: {} };
globalThis.voices = {};

const fs = require(`fs/promises`);
const socket = require(`dgram`).createSocket(`udp4`);

const fetch = require(`./fetch`);
const logger = require(`./logger`);
const parser = require(`./parser`);
const installer = require(`./installer`);


ipcMain.handle(`config:get`, function() {
    return globalThis.config;
});

ipcMain.handle(`config:set`, async function(event, config) {
    globalThis.config = config;
});

ipcMain.handle(`voice:get`, async function(event, voice_id) {
    if (globalThis.voices[voice_id]) {
        return globalThis.voices[voice_id];
    };

    const response = await fetch.send(`${globalThis.url.api}/voice/${voice_id}`).catch(function() {
        return null;
    });

    if (response?.status !== 200) {
        await logger.log(`Ошибка при получении озвучки. Путь: "${globalThis.url.api}/voice/${voice_id}". Статус: ${response?.status}.`);
        return false;
    };

    return globalThis.voices[voice_id] = await response.json();
});

ipcMain.handle(`voices:get`, async function() {
    const response = await fetch.send(`${globalThis.url.api}/voices`).catch(function() {
        return null;
    });

    if (response?.status !== 200) {
        await logger.log(`Ошибка при получении списка озвучек. Путь: "${globalThis.url.api}/voices". Статус: ${response?.status}.`);
        return false;
    };

    return await response.json();
});

ipcMain.handle(`route:get`, async function(event, route_id) {
    if (globalThis.routes.id[route_id]) {
        return globalThis.routes.id[route_id];
    };

    const response = await fetch.send(`${globalThis.url.api}/route/${route_id}`).catch(function() {
        return null;
    });

    if (response?.status !== 200) {
        await logger.log(`Ошибка при получении спецучастка. Путь: "${globalThis.url.api}/route/${route_id}". Статус: ${response?.status}.`);
        return false;
    };

    return globalThis.routes.id[route_id] = await response.json();
});

ipcMain.handle(`route:open`, async function() {
    const response = await dialog.showOpenDialog(globalThis.window, {
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

    const file = await fs.readFile(response.filePaths[0]).catch(async function(error) {
        await logger.log(`Ошибка при открытии файла. Путь: "${response.filePaths[0]}". Код: ${error.code}.`);
        return null;
    });

    if (!file) {
        return null;
    };

    try {
        // todo: проверять корректность схемы
        return JSON.parse(file);
    } catch (error) {
        await logger.log(`Ошибка при парсинге файла. Путь: "${response.filePaths[0]}".`);
        return null;
    };
});

ipcMain.handle(`route:save`, async function(event, route) {
    const response = await dialog.showSaveDialog(globalThis.window, {
        defaultPath: `${route.location} - ${route.name}.json`,
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

    await fs.writeFile(response.filePath, JSON.stringify(route, null, 4)).catch(async function(error) {
        await logger.log(`Ошибка при записи файла спецучастка. Путь: "${response.filePath}/config.json". Код: ${error.code}.`);
        return false;
    });

    return true;
});

ipcMain.handle(`route:suggest`, async function(event, data) {
    const response = await fetch.send(`${globalThis.url.api}/route/suggest`, {
        method: `POST`,
        headers: {
            [`Content-Type`]: `application/json`
        },
        body: JSON.stringify(data)
    }).catch(function() {
        return null;
    });

    if (response?.status !== 200) {
        await logger.log(`Ошибка при отправлении спецучастка. Путь: "${globalThis.url.api}/route/suggest". Статус: ${response?.status}.`);
        return false;
    };

    return true;
});

ipcMain.handle(`routes:get`, async function() {
    const response = await fetch.send(`${globalThis.url.api}/routes`).catch(function() {
        return null;
    });

    if (response?.status !== 200) {
        await logger.log(`Ошибка при получении списка спецучастков. Путь: "${globalThis.url.api}/routes". Статус: ${response?.status}.`);
        return false;
    };

    return await response.json();
});

ipcMain.handle(`commands:get`, async function() {
    const response = await fetch.send(`${globalThis.url.api}/commands`).catch(function() {
        return null;
    });

    if (response?.status !== 200) {
        await logger.log(`Ошибка при получении списка треков. Путь: "${globalThis.url.api}/commands". Статус: ${response?.status}.`);
        return false;
    };

    return await response.json();
});

ipcMain.handle(`external:open`, async function(event, url) {
    return shell.openExternal(url);
});

ipcMain.handle(`window:close`, async function() {
    return globalThis.window.close();
});

ipcMain.handle(`window:minimize`, async function() {
    return globalThis.window.minimize();
});


app.whenReady().then(async function() {
    globalThis.window = new BrowserWindow({
        width: 1200,
        height: 800,
        resizable: false,
        useContentSize: true,
        titleBarStyle: `hidden`,
        icon: `${app.getAppPath()}/icon.png`,
        backgroundColor: `#2B2D31`,
        webPreferences: {
            nodeIntegration: true,
            backgroundThrottling: false,
            preload: `${app.getAppPath()}/window/preload.js`
        }
    });

    globalThis.window.on(`closed`, async function() {
        await fs.writeFile(`${globalThis.path}/config.json`, JSON.stringify(globalThis.config, null, 4)).catch(async function(error) {
            await logger.log(`Ошибка при обновлении конфигурационного файла приложения. Путь: "${globalThis.path}/config.json". Код: ${error.code}.`);
        }).finally(app.quit);
    });

    globalThis.window.webContents.on(`did-finish-load`, async function() {
        if (await installer.app().catch(function() { return false })) {
            app.relaunch();
            app.exit();
        };

        await installer.wrc23();
        await installer.drt20();

        globalThis.window.webContents.send(`ready`);

        socket.on(`message`, async function(message) {
            if (globalThis.telemetry_awaiting) {
                return false;
            };

            if (!globalThis.config.game) {
                return false;
            };

            const telemetry = parser[globalThis.config.game](message);

            if (!telemetry) {
                return false;
            };

            let ingame_id;

            if (globalThis.config.game === `wrc23`) {
                ingame_id = telemetry.stage.id;
            } else if (globalThis.config.game === `drt20`) {
                ingame_id = parseInt(telemetry.stage.length * 100000);
            };

            if (!ingame_id) {
                return false;
            };

            if (globalThis.routes.game[ingame_id] === undefined) {
                globalThis.telemetry_awaiting = true;

                const response = await fetch.send(`${globalThis.url.api}/route/game/${ingame_id}`).catch(function() {
                    return null;
                });

                if (response?.status !== 200) {
                    await logger.log(`Ошибка при получении спецучастка. Путь: "${globalThis.url.api}/route/game/${ingame_id}". Статус: ${response?.status}.`);
                    return null;
                };

                globalThis.routes.game[ingame_id] = await response.json();
                globalThis.telemetry_awaiting = false;
            };

            if (!globalThis.routes.game[ingame_id]) {
                return false;
            };

            globalThis.window.webContents.send(`telemetry`, {
                route: {
                    id: globalThis.routes.game[ingame_id].id,
                    name: globalThis.routes.game[ingame_id].name,
                    location: globalThis.routes.game[ingame_id].location,
                    pacenote: globalThis.routes.game[ingame_id].pacenote
                },
                ...telemetry
            });
        });

        socket.bind(globalThis.config.port);
    });

    globalThis.window.loadFile(`./window/index.html`);
    globalThis.window.removeMenu();

    // globalThis.window.webContents.openDevTools({ activate: false });
});

app.on(`second-instance`, function() {
    if (globalThis.window.isMinimized()) {
        globalThis.window.restore();
    };

    return globalThis.window.focus();
});