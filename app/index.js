globalThis.config = require(`../config.json`);

const parser = require(`./parser`);
const installer = require(`./installer`);
const socket = require(`dgram`).createSocket(`udp4`);

const { writeFile } = require(`fs/promises`);
const { join: pathJoin } = require(`node:path`);
const { app, BrowserWindow, ipcMain } = require(`electron/main`);


const getRoute = async function(game, ingame_id) {
    if (globalThis.routes.requesting) {
        return false;
    };

    if (globalThis.routes.list[`${game}-${ingame_id}`] !== undefined) {
        return globalThis.routes.list[`${game}-${ingame_id}`];
    };

    globalThis.routes.requesting = true;

    let response = await fetch(`http://127.0.0.1:30001/route/${game}/${ingame_id}/get`, {
        method: `GET`
    }).catch(function() {
        return null;
    });

    if (response && response.status === 200) {
        globalThis.routes.list[`${game}-${ingame_id}`] = await response.json();
    } else {
        globalThis.routes.list[`${game}-${ingame_id}`] = null;
    };

    globalThis.routes.requesting = false;

    return globalThis.routes.list[`${game}-${ingame_id}`];
};

const getVoice = async function(voice_id) {
    if (globalThis.voices.requesting) {
        return false;
    };

    if (globalThis.voices.list[voice_id] !== undefined) {
        return globalThis.voices.list[voice_id];
    };

    globalThis.voices.requesting = true;

    let response = await fetch(`http://127.0.0.1:30001/voice/${voice_id}/get`, {
        method: `GET`
    }).catch(function() {
        return null;
    });

    if (response && response.status === 200) {
        globalThis.voices.list[voice_id] = await response.json();
    } else {
        globalThis.voices.list[voice_id] = null;
    };

    globalThis.voices.requesting = false;

    return globalThis.voices.list[voice_id];
};

const getVoices = async function(options) {
    let response = await fetch(`http://127.0.0.1:30001/voices/get${options ? `?${new URLSearchParams(options)}` : ``}`, {
        method: `GET`
    }).catch(function() {
        return [];
    });

    if (!response || response.status != 200) {
        return [];
    };

    return await response.json();
};

const getFilters = async function() {
    let response = await fetch(`http://127.0.0.1:30001/voices/filters`, {
        method: `GET`
    }).catch(function() {
        return [];
    });

    if (!response || response.status != 200) {
        return [];
    };

    return await response.json();
};


ipcMain.handle(`config:get`, function(event) {
    return globalThis.config;
});

ipcMain.handle(`config:set`, async function(event, new_config) {
    if (globalThis.config.game !== new_config.game) {
        await installer[new_config.game]();
    };

    globalThis.config = new_config;
});

ipcMain.handle(`voice:get`, async function(event, voice_id) {
    return await getVoice(voice_id);
});

ipcMain.handle(`voices:get`, async function(event, options) {
    return await getVoices(options);
});

ipcMain.handle(`voices:filters:get`, async function(event) {
    return await getFilters();
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

    let route_id;

    if (globalThis.config.game === `wrc23`) {
        if (!telemetry.packet_4cc) {
            return false;
        };

        route_id = telemetry.stage.id;
    } else if (globalThis.config.name === `drt20`) {
        if (telemetry.packet_4cc) {
            return false;
        };

        route_id = telemetry.stage.length;
    };

    let route = await getRoute(globalThis.config.game, route_id);

    if (!route) {
        return false;
    };

    globalThis.window.webContents.send(`telemetry`, {
        route: {
            location: route.location,
            name: route.name,
            pacenote: route.pacenote
        },
        ...telemetry
    });
});

socket.bind(globalThis.config.port || 20220);


app.whenReady().then(async function() {
    globalThis.config.path = __dirname.slice(0, -4);

    if (globalThis.config.game) {
        await installer[globalThis.config.game]();
    };

    globalThis.routes = {
        requesting: false,
        list: {}
    };

    globalThis.voices = {
        requesting: false,
        list: {}
    };

    globalThis.window = new BrowserWindow({
        width: 1200,
        height: 800,
        resizable: false,
        useContentSize: true,
        titleBarStyle: `hidden`,
        webPreferences: {
            nodeIntegration: true,
            preload: pathJoin(__dirname, `../window/preload.js`)
        }
    });

    globalThis.window.loadFile(`./window/index.html`);

    globalThis.window.webContents.openDevTools({ activate: false });
    globalThis.window.removeMenu();

    globalThis.window.on(`closed`, async function() {
        await writeFile(pathJoin(__dirname, `../config.json`), JSON.stringify(globalThis.config, null, 4));
        app.quit();
    });
});

app.on(`window-all-closed`, function() {
    if (process.platform !== `darwin`) {
        app.quit();
    };
});