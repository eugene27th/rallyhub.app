const socket = require(`dgram`).createSocket(`udp4`);

const telemetryParse = require(`./parse`);


const start = function() {
    socket.on(`message`, function(message) {
        if (!telemetryParse[globalThis.app.config.game] || globalThis.app.telemetry.await) {
            return false;
        };

        const telemetry = telemetryParse[globalThis.app.config.game](message);

        if (!telemetry) {
            return false;
        };

        globalThis.app.window.webContents.send(`gameTelemetry`, telemetry);
    });

    socket.bind(globalThis.app.config.port);
};

const stop = function() {
    socket.close();
};


module.exports = {
    start,
    stop
}