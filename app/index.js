const { shell } = require(`electron`);
const { app, BrowserWindow, ipcMain, dialog } = require(`electron/main`);

if (!app.requestSingleInstanceLock()) {
    return app.quit();
};

// globalThis.path = app.getAppPath(); // start
globalThis.path = process.resourcesPath.slice(0, process.resourcesPath.length - 10); // pack

const fs = require(`fs`);
const socket = require(`dgram`).createSocket(`udp4`);

const fetch = require(`./fetch`);
const logger = require(`./logger`);
const parser = require(`./parser`);
const installer = require(`./installer`);


ipcMain.handle(`config:get`, function() {
    return globalThis.config;
});

ipcMain.handle(`config:set`, function(event, config) {
    globalThis.config = config;
});

ipcMain.handle(`voice:get`, async function(event, voice_id) {
    const from_cache = globalThis.voices.find(function(element) {
        return element.id === parseInt(voice_id);
    });

    if (from_cache) {
        return from_cache;
    };

    const voice = await fetch.send(`${globalThis.url.api}/voice/${voice_id}`);

    if (voice) {
        globalThis.voices.push(voice);
    };

    return voice;
});

ipcMain.handle(`voices:get`, async function() {
    return await fetch.send(`${globalThis.url.api}/voices`);
});

ipcMain.handle(`route:get`, async function(event, route_id) {
    const from_cache = globalThis.routes.find(function(element) {
        return element.id === parseInt(route_id);
    });

    if (from_cache) {
        return from_cache;
    };

    const route = await fetch.send(`${globalThis.url.api}/route/${route_id}`);

    if (route) {
        globalThis.routes.push(route);
    };

    return route;
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

    try {
        // todo: проверять корректность схемы
        return JSON.parse(fs.readFileSync(response.filePaths[0]));
    } catch (error) {
        logger.log(`Ошибка при открытии/парсинге файла. Путь: "${response.filePaths[0]}". Код: ${error.code || `PARSE`}.`);
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

    try {
        fs.writeFileSync(response.filePath, JSON.stringify(route, null, 4));
    } catch (error) {
        logger.log(`Ошибка при записи файла спецучастка. Путь: "${response.filePath}/config.json". Код: ${error.code}.`);
        return false;
    };

    return true;
});

ipcMain.handle(`route:suggest`, async function(event, data) {
    return await fetch.send(`${globalThis.url.api}/route/suggest`, {
        method: `POST`,
        headers: {
            [`Content-Type`]: `application/json`
        },
        body: JSON.stringify(data)
    }, false);
});

ipcMain.handle(`routes:get`, async function() {
    return await fetch.send(`${globalThis.url.api}/routes`);
});

ipcMain.handle(`commands:get`, async function() {
    return await fetch.send(`${globalThis.url.api}/commands`);
});

ipcMain.handle(`external:open`, async function(event, url) {
    return await shell.openExternal(url);
});

ipcMain.handle(`window:close`, function() {
    return globalThis.window.close();
});

ipcMain.handle(`window:minimize`, function() {
    return globalThis.window.minimize();
});


app.whenReady().then(function() {
    if (!installer.config()) {
        return app.exit();
    };

    globalThis.url = {
        api: `https://api.${globalThis.config.domain || `rallyhub.ru`}`,
        cdn: `https://cdn.${globalThis.config.domain || `rallyhub.ru`}`
    };

    globalThis.routes = [];
    globalThis.voices = [];

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

    globalThis.window.on(`closed`, function() {
        try {
            fs.writeFileSync(`${globalThis.path}/config.json`, JSON.stringify(globalThis.config, null, 4));
        } catch (error) {
            logger.log(`Ошибка при обновлении конфигурационного файла приложения. Путь: "${globalThis.path}/config.json". Код: ${error.code}.`);
        };

        app.quit();
    });

    globalThis.window.webContents.on(`did-finish-load`, async function() {
        const status = await installer.resources();

        if (status.restart) {
            app.relaunch();
            return app.exit();
        };

        if (status.major) {
            globalThis.window.webContents.send(`major`);
            return false;
        };

        installer.wrc23();
        installer.drt20();

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

            let route = globalThis.routes.find(function(element) {
                return element.ingame_id === ingame_id;
            });

            if (!route) {
                globalThis.telemetry_awaiting = true;

                route = await fetch.send(`${globalThis.url.api}/route/game/${ingame_id}`);

                if (!route) {
                    setTimeout(function() {
                        globalThis.telemetry_awaiting = false;
                    }, 5000);

                    return false;
                };

                globalThis.routes.push(route);
                globalThis.telemetry_awaiting = false;
            };

            globalThis.window.webContents.send(`telemetry`, {
                route: {
                    id: route.id,
                    name: route.name,
                    location: route.location,
                    pacenote: route.pacenote
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