const { app, BrowserWindow, ipcMain, dialog } = require(`electron/main`);

if (!app.requestSingleInstanceLock()) {
    return app.quit();
};

const fs = require(`fs`);
const path = require(`path`);
const socket = require(`dgram`).createSocket(`udp4`);

const { shell } = require(`electron`);

globalThis.app = {
    path: {
        root: app.isPackaged ? path.dirname(process.resourcesPath) : app.getAppPath(),
        resources: app.getAppPath()
    },
    cache: {
        routes: []
    },
    telemetry: {
        await: false,
        route: {}
    }
};

globalThis.app.path.log = path.join(globalThis.app.path.root, `app.log`);
globalThis.app.path.config = path.join(globalThis.app.path.root, `config.json`);
globalThis.app.path.asar = path.join(globalThis.app.path.root, `resources`, `app.asar`);

const common = require(`./common`);

globalThis.app.config = common.getConfig();
globalThis.app.path.documents = common.getDocumentPath();

globalThis.app.url = {
    // api: `https://api.${globalThis.app.config.domain}`,
    api: `http://127.0.0.1:30001`,
    cdn: `https://cdn.${globalThis.app.config.domain}`
};

const parse = require(`./parse`);
const install = require(`./install`);


ipcMain.handle(`setConfig`, function(event, config) {
    globalThis.app.config = config;
});

ipcMain.handle(`getInitData`, async function() {
    return {
        config: globalThis.app.config,
        routes: await common.getRoutes(),
        voices: await common.getVoices(),
        commands: await common.getCommands()
    };
});

ipcMain.handle(`getRoute`, async function(event, id) {
    const routeFromCache = globalThis.app.cache.routes.find(function(element) {
        return element.id === id;
    });

    if (routeFromCache) {
        return routeFromCache;
    };

    const route = await common.getRouteById(id);

    if (route) {
        globalThis.app.cache.routes.push(route);
    };

    return route;
});

ipcMain.handle(`openRoute`, async function() {
    const response = await dialog.showOpenDialog(globalThis.app.window, {
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
        common.writeLog(`Ошибка при открытии/парсинге файла. Путь: "${response.filePaths[0]}". Код: ${error.code || `PARSE`}.`);
        return null;
    };
});

ipcMain.handle(`saveRoute`, async function(event, data) {
    const response = await dialog.showSaveDialog(globalThis.app.window, {
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
        common.writeLog(`Ошибка при записи файла спецучастка. Путь: "${response.filePath}". Код: ${error.code}.`);
        return false;
    };

    return true;
});

ipcMain.handle(`sendRoute`, async function(event, data) {
    return await common.suggestRoute(data);
});

ipcMain.handle(`openExternal`, async function(event, url) {
    return await shell.openExternal(url);
});

ipcMain.handle(`minimizeWindow`, function() {
    return globalThis.app.window.minimize();
});

ipcMain.handle(`closeWindow`, function() {
    return globalThis.app.window.close();
});


app.whenReady().then(async function() {
    globalThis.app.window = new BrowserWindow({
        width: 1200,
        height: 800,
        resizable: false,
        useContentSize: true,
        titleBarStyle: `hidden`,
        icon: `${globalThis.app.path.resources}/icon.png`,
        backgroundColor: `#2B2D31`,
        webPreferences: {
            nodeIntegration: true,
            backgroundThrottling: false,
            preload: `${globalThis.app.path.resources}/window/preload.js`
        }
    });

    globalThis.app.window.on(`closed`, function() {
        try {
            fs.writeFileSync(globalThis.app.path.config, JSON.stringify(globalThis.app.config, null, 4));
        } catch (error) {
            common.writeLog(`Ошибка при обновлении конфигурационного файла приложения. Путь: "${globalThis.app.path.config}". Код: ${error.code}.`);
        };

        app.quit();
    });

    // globalThis.app.window.webContents.openDevTools({ activate: false }); // debug
    globalThis.app.window.loadFile(`./window/index.html`);

    globalThis.app.window.webContents.on(`did-finish-load`, async function() {
        const updateStatus = await install.resources();

        if (updateStatus.code) {
            console.log(updateStatus);

            if (updateStatus.code === `restartRequired`) {
                app.relaunch();
                return app.exit();
            };

            globalThis.app.window.webContents.send(`updateStatus`, updateStatus.code);

            return false;
        };

        install.wrc23();
        install.drt20();
        install.acr25();

        globalThis.app.window.webContents.send(`updateStatus`, `appReady`);

        socket.on(`message`, async function(message) {
            if (!globalThis.app.config.game || globalThis.app.telemetry.await) {
                return false;
            };

            const telemetry = parse[globalThis.app.config.game](message);

            if (!telemetry) {
                return false;
            };

            if (globalThis.app.telemetry.route.game?.id !== telemetry.stage.id || globalThis.app.telemetry.route.game?.code !== globalThis.app.config.game) {
                globalThis.app.telemetry.await = true;

                const routeFromCache = globalThis.app.cache.routes.find(function(element) {
                    return element.game.id === telemetry.stage.id && element.game.code === globalThis.app.config.game;
                });

                if (routeFromCache) {
                    globalThis.app.telemetry.route = routeFromCache;
                } else {
                    const route = await common.getRouteByGameId(globalThis.app.config.game, telemetry.stage.id);

                    if (route) {
                        globalThis.app.telemetry.route = route;
                    } else {
                        globalThis.app.telemetry.route = {
                            game: {
                                id: telemetry.stage.id,
                                code: globalThis.app.config.game
                            }
                        };
                    };

                    globalThis.app.cache.routes.push(globalThis.app.telemetry.route);
                };

                globalThis.app.telemetry.await = false;
            };

            if (!globalThis.app.telemetry.route) {
                return false;
            };

            globalThis.app.window.webContents.send(`gameTelemetry`, {
                route: {
                    id: globalThis.app.telemetry.route.id,
                    name: globalThis.app.telemetry.route.name,
                    location: globalThis.app.telemetry.route.location,
                    pacenote: globalThis.app.telemetry.route.pacenote
                },
                ...telemetry
            });
        });

        socket.bind(globalThis.app.config.port);
    });
});

app.on(`second-instance`, function() {
    if (globalThis.app.window.isMinimized()) {
        globalThis.app.window.restore();
    };

    return globalThis.app.window.focus();
});