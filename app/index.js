const log = require(`./logger`);
const utils = require(`./utils`);
const fs = require(`fs/promises`);
const parser = require(`./parser`);
const installer = require(`./installer`);
const socket = require(`dgram`).createSocket(`udp4`);

const { app, BrowserWindow, ipcMain } = require(`electron/main`);


if (!app.requestSingleInstanceLock()) {
    return app.quit();
};


// globalThis.path = app.getAppPath(); // start
globalThis.path = process.resourcesPath.slice(0, process.resourcesPath.length - 10); // pack
globalThis.config = require(`${globalThis.path}/config.json`);


ipcMain.handle(`config:get`, function(event) {
    return globalThis.config;
});

ipcMain.handle(`config:set`, async function(event, new_config) {
    globalThis.config = new_config;
});

ipcMain.handle(`voice:get`, async function(event, voice_id) {
    if (globalThis.voices.requesting) {
        return false;
    };

    if (globalThis.voices.list[voice_id] !== undefined) {
        return globalThis.voices.list[voice_id];
    };

    globalThis.voices.requesting = true;

    let url = `https://api.rallyhub.ru/voice/${voice_id}`;

    log.info(`[CODE: INDEX_FETCH] [GET: ${url}]`);

    let response = await utils.fetcha(url, {
        method: `GET`
    }).catch(function() {
        log.error(`[CODE: INDEX_FETCH_RESPONSE] [GET: ${url}]`);
        return null;
    });

    if (response && response.status === 200) {
        globalThis.voices.list[voice_id] = await response.json();
    } else {
        log.error(`[CODE: INDEX_FETCH_RESPONSE_STATUS] [GET: ${url}]`);
        globalThis.voices.list[voice_id] = null;
    };

    globalThis.voices.requesting = false;

    return globalThis.voices.list[voice_id];
});

ipcMain.handle(`voices:get`, async function(event, options) {
    let url = `https://api.rallyhub.ru/voices${options ? `?${new URLSearchParams(options)}` : ``}`;

    log.info(`[CODE: INDEX_FETCH] [GET: ${url}]`);

    let response = await utils.fetcha(url, {
        method: `GET`
    }).catch(function() {
        log.error(`[CODE: INDEX_FETCH_RESPONSE] [GET: ${url}]`);
        return [];
    });

    if (!response || response.status !== 200) {
        log.error(`[CODE: INDEX_FETCH_RESPONSE_STATUS] [GET: ${url}]`);
        return [];
    };

    return await response.json();
});

ipcMain.handle(`voices:filters:get`, async function(event) {
    let url = `https://api.rallyhub.ru/voices/filters`;

    let response = await utils.fetcha(url, {
        method: `GET`
    }).catch(function() {
        log.error(`[CODE: INDEX_FETCH_RESPONSE] [GET: ${url}]`);
        return [];
    });

    if (!response || response.status !== 200) {
        log.error(`[CODE: INDEX_FETCH_RESPONSE_STATUS] [GET: ${url}]`);
        return [];
    };

    return await response.json();
});

ipcMain.handle(`window:close`, async function(event) {
    return globalThis.window.close();
});

ipcMain.handle(`window:minimize`, async function(event) {
    return globalThis.window.minimize();
});


socket.on(`message`, async function (message){
    if (!globalThis.config.game) {
        return false;
    };

    const telemetry = parser[globalThis.config.game](message);

    let ingame_id;

    if (globalThis.config.game === `wrc23`) {
        if (!telemetry.packet_4cc) {
            return false;
        };

        ingame_id = telemetry.stage.id;
    } else if (globalThis.config.game === `drt20`) {
        if (telemetry.packet_4cc) {
            return false;
        };

        ingame_id = parseInt(telemetry.stage.length * 100000);
    };

    if (!ingame_id) {
        return false;
    };

    if (globalThis.routes.requesting) {
        return false;
    };

    let route_key = `${globalThis.config.game}-${ingame_id}`;

    if (globalThis.routes.list[route_key] === undefined) {
        globalThis.routes.requesting = true;

        let url = `https://api.rallyhub.ru/route/${globalThis.config.game}/${ingame_id}`;

        log.info(`[CODE: INDEX_FETCH] [GET: ${url}]`);

        let response = await utils.fetcha(url, {
            method: `GET`
        }).catch(function() {
            log.error(`[CODE: INDEX_FETCH_RESPONSE] [GET: ${url}]`);
            return null;
        });

        if (response && response.status === 200) {
            globalThis.routes.list[route_key] = await response.json();
        } else {
            log.error(`[CODE: INDEX_FETCH_RESPONSE_STATUS] [GET: ${url}]`);
            globalThis.routes.list[route_key] = null;
        };
    
        globalThis.routes.requesting = false;
    };

    if (!globalThis.routes.list[route_key]) {
        return false;
    };

    globalThis.window.webContents.send(`telemetry`, {
        route: {
            id: globalThis.routes.list[route_key].id,
            location: globalThis.routes.list[route_key].location,
            name: globalThis.routes.list[route_key].name,
            pacenote: globalThis.routes.list[route_key].pacenote
        },
        ...telemetry
    });
});

socket.bind(globalThis.config.port || 20220);


app.whenReady().then(async function() {
    let restart = await installer.app().catch(function() {
        log.error(`[CODE: INDEX_INSTALL_APP]`);
        return false;
    });
    
    if (restart) {
        await log.info(`[CODE: INDEX_RESTART_AFTER_UPDATE]`);

        app.relaunch();
        app.exit();
    };

    await installer.wrc23();
    await installer.drt20();

    globalThis.routes = {
        requesting: false,
        list: {}
    };

    globalThis.voices = {
        requesting: false,
        list: {}
    };

    globalThis.window = new BrowserWindow({
        width: 1100,
        height: 800,
        resizable: false,
        useContentSize: true,
        titleBarStyle: `hidden`,
        icon: `${app.getAppPath()}/icon.png`,
        webPreferences: {
            nodeIntegration: true,
            backgroundThrottling: false,
            preload: `${app.getAppPath()}/window/preload.js`
        }
    });

    globalThis.window.loadFile(`./window/index.html`);

    // globalThis.window.webContents.openDevTools({ activate: false });
    globalThis.window.removeMenu();

    globalThis.window.on(`closed`, async function() {
        log.info(`[CODE: INDEX_WRITEFILE] [PATH: ${globalThis.path}/config.json]`);

        await fs.writeFile(`${globalThis.path}/config.json`, JSON.stringify(globalThis.config, null, 4)).catch(function(error) {
            log.error(`[CODE: INDEX_WRITEFILE] [FS: ${error.code}] [PATH: ${globalThis.path}/config.json]`);
        });

        app.quit();
    });
});

app.on(`second-instance`, function() {
    if (globalThis.window) {
        if (globalThis.window.isMinimized()) {
            globalThis.window.restore();
        };

        return globalThis.window.focus();
    };
});

app.on(`window-all-closed`, function() {
    if (process.platform !== `darwin`) {
        app.quit();
    };
});