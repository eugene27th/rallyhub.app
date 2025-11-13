const electronMain = require(`electron/main`);

if (!electronMain.app.requestSingleInstanceLock()) {
    return electronMain.app.quit();
};

const fs = require(`fs`);
const path = require(`path`);

const appLog = require(`./log`);
const appStartup = require(`./startup`);
const appHandlers = require(`./handlers`);

const telemetryListen = require(`../telemetry/listen`);


electronMain.app.whenReady().then(async function() {
    globalThis.app = {
        url: {},
        path: {},
        telemetry: {}
    };

    globalThis.app.path.root = electronMain.app.isPackaged ? path.dirname(process.resourcesPath) : electronMain.app.getAppPath();
    globalThis.app.path.resources = electronMain.app.getAppPath();
    globalThis.app.path.log = path.join(globalThis.app.path.root, `app.log`);
    globalThis.app.path.config = path.join(globalThis.app.path.root, `config.json`);
    globalThis.app.path.asar = path.join(globalThis.app.path.root, `resources`, `app.asar`);

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

    const startupPromise = appStartup();

    globalThis.app.window.webContents.on(`did-finish-load`, async function() {
        appHandlers();

        let startupStatus;

        try {
            startupStatus = await startupPromise;
        } catch (error) {
            appLog(`Ошибка при старте приложения: ${error.stack || error}.`);

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

        globalThis.app.window.webContents.send(`startupStatus`, startupStatus.code);
    });

    globalThis.app.window.on(`closed`, function() {
        telemetryListen.stop();

        try {
            fs.writeFileSync(globalThis.app.path.config, JSON.stringify(globalThis.app.config, null, 4));
        } catch (error) {
            appLog(`Ошибка при записи конфигурационного файла приложения. Путь: "${globalThis.app.path.config}". Код: ${error.code}.`);
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