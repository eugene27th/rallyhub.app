const electronMain = require(`electron/main`);

if (!electronMain.app.requestSingleInstanceLock()) {
    return electronMain.app.quit();
};

const fs = require(`fs`);
const path = require(`path`);

const appCommon = require(`./common`);
const appHandlers = require(`./handlers`);
const appStartup = require(`./startup`);
const telemetryListen = require(`../telemetry/listen`);


electronMain.app.whenReady().then(async function() {
    appStartup.setupEnv();

    globalThis.app.window = new electronMain.BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        resizable: false,
        useContentSize: true,
        titleBarStyle: `hidden`,
        icon: path.join(globalThis.app.path.resources, `icon.png`),
        backgroundColor: `#2B2D31`,
        webPreferences: {
            nodeIntegration: true,
            backgroundThrottling: false,
            preload: path.join(globalThis.app.path.resources, `window`, `preload.js`)
        }
    });

    globalThis.app.window.loadFile(path.join(globalThis.app.path.resources, `window`, `index.html`));
    globalThis.app.window.removeMenu();

    if (!electronMain.app.isPackaged) {
        globalThis.app.window.webContents.openDevTools({ activate: false });
    };

    globalThis.app.window.once(`ready-to-show`, function() {
        globalThis.app.window.show();
        globalThis.app.window.focus();
    });

    const startupPromise = appStartup.setupApp();

    globalThis.app.window.webContents.on(`did-finish-load`, async function() {
        let startupStatus;

        try {
            startupStatus = await startupPromise;
        } catch (error) {
            appCommon.writeLog(`Ошибка при старте приложения: ${error.stack || error}.`);

            startupStatus = {
                code: `startupError`
            };
        };

        if (startupStatus.code === `restartRequired`) {
            electronMain.app.relaunch();
            return electronMain.app.exit();
        };

        if (startupStatus.code === `appReady`) {
            telemetryListen.start();
        };

        appHandlers();

        globalThis.app.window.webContents.send(`startupStatus`, startupStatus.code);
    });

    globalThis.app.window.on(`closed`, function() {
        telemetryListen.stop();

        try {
            fs.writeFileSync(globalThis.app.path.config, JSON.stringify(globalThis.app.config, null, 4));
        } catch (error) {
            appCommon.writeLog(`Ошибка при обновлении конфигурационного файла приложения. Путь: "${globalThis.app.path.config}". Код: ${error.code}.`);
        };

        electronMain.app.quit();
    });
});

electronMain.app.on(`second-instance`, function() {
    if (globalThis.app.window) {
        if (globalThis.app.window.isMinimized()) {
            globalThis.app.window.restore();
        };

        return globalThis.app.window.focus();
    };
});