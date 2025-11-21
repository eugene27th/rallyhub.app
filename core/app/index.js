const electronMain = require(`electron/main`);
const electronUpdater = require('electron-updater');

if (!electronMain.app.requestSingleInstanceLock()) {
    return electronMain.app.quit();
};

const fs = require(`fs`);
const path = require(`path`);


electronMain.app.whenReady().then(async function() {
    globalThis.app = {
        version: electronMain.app.getVersion(),
        path: {
            resources: electronMain.app.getAppPath(),
            documents: electronMain.app.getPath(`documents`),
            log: path.join(electronMain.app.getPath(`userData`), `app.log`),
            config: path.join(electronMain.app.getPath(`userData`), `config.json`)
        }
    };

    const appUtils = require(path.join(globalThis.app.path.resources, `core`, `app`, `utils.js`));
    const appHandlers = require(path.join(globalThis.app.path.resources, `core`, `app`, `handlers.js`));
    const telemetrySetup = require(path.join(globalThis.app.path.resources, `core`, `telemetry`, `setup.js`));
    const telemetryListen = require(path.join(globalThis.app.path.resources, `core`, `telemetry`, `listen.js`));

    globalThis.app.window = new electronMain.BrowserWindow({
        width: 1200,
        height: 800,
        show: false,
        resizable: false,
        useContentSize: true,
        titleBarStyle: `hidden`,
        icon: path.join(globalThis.app.path.resources, `icon.ico`),
        backgroundColor: `#2B2D31`,
        webPreferences: {
            nodeIntegration: true,
            backgroundThrottling: false,
            preload: path.join(globalThis.app.path.resources, `core`, `renderer`, `preload.js`)
        }
    });

    globalThis.app.window.loadFile(path.join(globalThis.app.path.resources, `core`, `renderer`, `index.html`));
    globalThis.app.window.removeMenu();

    if (!electronMain.app.isPackaged) {
        globalThis.app.window.webContents.openDevTools({
            activate: false
        });
    };

    globalThis.app.window.once(`ready-to-show`, function() {
        globalThis.app.window.show();
        globalThis.app.window.focus();
    });

    globalThis.app.window.webContents.on(`did-finish-load`, async function() {
        appHandlers();

        try {
            if (fs.existsSync(globalThis.app.path.log) && fs.statSync(globalThis.app.path.log).size > (2 * 1024 * 1024)) {
                fs.writeFileSync(globalThis.app.path.log, ``);
            } else {
                fs.appendFileSync(globalThis.app.path.log, `\n`);
            };
        } catch (error) {
            appUtils.writeLog(`Ошибка при инициализации лог файла приложения. Ошибка: ${error.name}: ${error.message}.`);
            globalThis.app.window.webContents.send(`startupStatus`, `fileSystemError`);
            return;
        };

        appUtils.writeLog(`Запуск приложения.`);

        try {
            const defaultConfig = require(path.join(globalThis.app.path.resources, `config.default.json`));

            if (fs.existsSync(globalThis.app.path.config)) {
                globalThis.app.config = JSON.parse(fs.readFileSync(globalThis.app.path.config));

                for (const key of Object.keys(defaultConfig)) {
                    if (globalThis.app.config[key] === undefined) {
                        appUtils.writeLog(`Не найден необходимый ключ "${key}" в конфигурационном файле приложения. Возвращена конфигурация по-умолчанию.`);
                        globalThis.app.config = defaultConfig;
                        break;
                    };
                };
            } else {
                fs.writeFileSync(globalThis.app.path.config, JSON.stringify(defaultConfig, null, 4));
                globalThis.app.config = defaultConfig;
            };
        } catch (error) {
            appUtils.writeLog(`Ошибка при инициализации конфигурационного файла приложения. Ошибка: ${error.name}: ${error.message}.`);
            globalThis.app.window.webContents.send(`startupStatus`, `fileSystemError`);
            return;
        };

        try {
            const updateResult = await electronUpdater.autoUpdater.checkForUpdates();

            if (updateResult?.isUpdateAvailable && updateResult?.downloadPromise) {
                globalThis.app.window.webContents.send(`startupStatus`, `appUpdate`);
                await updateResult.downloadPromise;
                electronUpdater.autoUpdater.quitAndInstall();
                return;
            };
        } catch (error) {
            appUtils.writeLog(`Ошибка при обновлении приложения: ${error}.`);
            globalThis.app.window.webContents.send(`startupStatus`, `updateError`);
            return;
        };

        telemetrySetup.drt20();
        telemetrySetup.wrc23();
        telemetrySetup.acr25();
        telemetryListen.start();

        globalThis.app.window.webContents.send(`startupStatus`, `appReady`);
    });

    globalThis.app.window.on(`closed`, function() {
        telemetryListen.stop();
        appUtils.saveConfig();
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