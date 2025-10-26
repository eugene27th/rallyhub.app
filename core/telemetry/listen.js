const socket = require(`dgram`).createSocket(`udp4`);

const telemetryParse = require(`./parse`);


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

        const route = globalThis.app.data.routes.find(function(element) {
            return element.game.id === telemetry.stage.id && element.game.code === globalThis.app.config.game;
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

        globalThis.app.telemetry.stage = {
            currentDistance: 0,
            completedBriefing: false,
            completedWaypoints: []
        };

        globalThis.app.telemetry.await = false;
    };

    if (!globalThis.app.telemetry.route.pacenote) {
        return false;
    };

    if (globalThis.app.telemetry.stage.currentDistance <= 0 && globalThis.app.telemetry.stage.completedWaypoints.length > 1) {
        globalThis.app.telemetry.stage = {
            currentDistance: 0,
            completedBriefing: false,
            completedWaypoints: []
        };
    };

    globalThis.app.telemetry.stage.currentDistance = telemetry.stage.distance;

    let commandsToBeVoiced = [];

    if (!globalThis.app.telemetry.stage.completedBriefing) {
        if (globalThis.app.telemetry.stage.currentDistance <= 0) {
            const briefingWaypoint = globalThis.app.telemetry.route.pacenote.find(function(waypoint) {
                return waypoint.distance === 0;
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


module.exports = {
    start: function() {
        socket.on(`message`, listener);
        socket.bind(globalThis.app.config.port);
    },
    stop: function() {
        socket.close();
    }
}