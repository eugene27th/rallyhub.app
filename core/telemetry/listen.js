const path = require(`path`);
const socket = require(`dgram`).createSocket(`udp4`);

const appUtils = require(path.join(globalThis.app.path.resources, `core`, `app`, `utils.js`));
const telemetryParse = require(path.join(globalThis.app.path.resources, `core`, `telemetry`, `parse.js`));


const start = function() {
    socket.on(`message`, function(message) {
        if (!telemetryParse[globalThis.app.config.settingGame]) {
            return false;
        };

        const telemetry = telemetryParse[globalThis.app.config.settingGame](message);

        if (telemetry) {
            globalThis.app.window.webContents.send(`gameTelemetry`, telemetry);
        };
    });

    socket.on(`listening`, function() {
        const { address, port } = socket.address();
        appUtils.writeLog(`Прослушивание сокета: "${address}:${port}".`);
    });

    socket.on(`error`, function(error) {
        appUtils.writeLog(`Ошибка прослушивания сокета. Ошибка: ${error.name}: ${error.message}.`);
        socket.close();
    });

    socket.bind(globalThis.app.config.appTelemetryPort);
};

const stop = function() {
    socket.close();
};


module.exports = {
    start,
    stop
}