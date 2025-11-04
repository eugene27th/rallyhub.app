const socket = require(`dgram`).createSocket(`udp4`);

const telemetryParse = require(`./parse`);


const defaultTelemetryStage = {
    currentDistance: 0,
    completedBriefing: false,
    completedWaypoints: [],
    vehicle: {
        tyres: {
            fl: {
                state: 0
            },
            fr: {
                state: 0
            },
            rl: {
                state: 0
            },
            rr: {
                state: 0
            }
        }
    }
};


const listener = function(message) {
    if (!telemetryParse[globalThis.app.config.game] || globalThis.app.telemetry.await) {
        return false;
    };

    const telemetry = telemetryParse[globalThis.app.config.game](message);

    if (!telemetry) {
        return false;
    };

    if (globalThis.app.telemetry.route?.game?.id !== telemetry.stage.id || globalThis.app.telemetry.route?.game?.code !== globalThis.app.config.game) {
        globalThis.app.telemetry.await = true;

        const route = globalThis.app.data.routes.find(function(i) {
            return i.game.id === telemetry.stage.id && i.game.code === globalThis.app.config.game;
        });

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

        globalThis.app.telemetry.stage = structuredClone(defaultTelemetryStage);
        globalThis.app.telemetry.await = false;
    };

    if (!globalThis.app.telemetry.route.pacenote) {
        return false;
    };

    if (globalThis.app.telemetry.stage.currentDistance <= 0 && globalThis.app.telemetry.stage.completedWaypoints.length > 1) {
        globalThis.app.telemetry.stage = structuredClone(defaultTelemetryStage);
    };

    globalThis.app.telemetry.stage.currentDistance = telemetry.stage.distance;

    let commandsToBeVoiced = [];

    if (!globalThis.app.telemetry.stage.completedBriefing) {
        if (globalThis.app.telemetry.stage.currentDistance <= 0) {
            const briefingWaypoint = globalThis.app.telemetry.route.pacenote.find(function(i) {
                return i.distance === 0;
            });

            if (briefingWaypoint) {
                globalThis.app.telemetry.stage.completedWaypoints.push(briefingWaypoint.distance);
                commandsToBeVoiced = commandsToBeVoiced.concat(briefingWaypoint.commands);
            };
        };

        globalThis.app.telemetry.stage.completedBriefing = true;
    };

    const waypointsToBeVoiced = globalThis.app.telemetry.route.pacenote.filter(function(waypoint) {
        return (
            waypoint.distance > globalThis.app.telemetry.stage.currentDistance &&
            waypoint.distance < (globalThis.app.telemetry.stage.currentDistance + 2) &&
            !globalThis.app.telemetry.stage.completedWaypoints.includes(waypoint.distance)
        );
    });

    if (waypointsToBeVoiced.length > 0) {
        for (const waypoint of waypointsToBeVoiced) {
            globalThis.app.telemetry.stage.completedWaypoints.push(waypoint.distance);
            commandsToBeVoiced = commandsToBeVoiced.concat(waypoint.commands);
        };
    };

    if (telemetry.vehicle?.tyres) {
        for (const [tyre, data] of Object.entries(telemetry.vehicle.tyres)) {
            if (globalThis.app.telemetry.stage.vehicle.tyres[tyre].state !== data.state) {
                if (data.state === 1) {
                    commandsToBeVoiced.push(`puncture_${tyre}`);
                };
                
                globalThis.app.telemetry.stage.vehicle.tyres[tyre].state = data.state;
            };
        };
    };

    globalThis.app.window.webContents.send(`gameTelemetry`, {
        route: {
            id: globalThis.app.telemetry.route.id,
            name: globalThis.app.telemetry.route.name,
            location: globalThis.app.telemetry.route.location
        },
        commands: commandsToBeVoiced,
        ...telemetry
    });
};


const start = function() {
    socket.on(`message`, listener);
    socket.bind(globalThis.app.config.port);
};

const stop = function() {
    socket.close();
};


module.exports = {
    start,
    stop
}