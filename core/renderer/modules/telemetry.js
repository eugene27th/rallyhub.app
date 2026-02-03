import { addCommandsToPlaylist } from "./audio.js";


const headerStatusElement = document.getElementById(`headerStatusElement`);
const waypointNewDistanceInput = document.getElementById(`waypointNewDistanceInput`);

let telemetryAwait = false;
let telemetryRoute = {};
let telemetryStage = {};
let telemetryPacenote = {};

const telemetryDefaultStage = {
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


export const initTelemetryModule = function() {
    window.electronAPI.onGameTelemetry(function(telemetry) {
        if (telemetryAwait) {
            return;
        };

        if (telemetryRoute.game?.id !== telemetry.stage.id || telemetryRoute.game?.code !== globalThis.app.data.config.settingGame) {
            telemetryAwait = true;

            const route = globalThis.app.data.routes.find(function(i) {
                return i.game.id === telemetry.stage.id && i.game.code === globalThis.app.data.config.settingGame;
            });

            if (route) {
                telemetryRoute = route;
            } else {
                telemetryRoute = {
                    game: {
                        id: telemetry.stage.id,
                        code: globalThis.app.data.config.settingGame
                    }
                };
            };

            telemetryStage = structuredClone(telemetryDefaultStage);
            telemetryAwait = false;
        };

        telemetryPacenote = globalThis.app.editor.route?.game.id === telemetry.stage.id ? globalThis.app.editor.route.pacenote : telemetryRoute.pacenote;

        if (!telemetryPacenote) {
            return false;
        };

        if (telemetry.stage.distance <= 0 && telemetryStage.completedWaypoints.length > 1) {
            telemetryStage = structuredClone(telemetryDefaultStage);
        };

        const currentRoundDistance = telemetry.stage.distance > 0 ? Math.round(telemetry.stage.distance) : 0;

        const statusText = `${telemetryRoute.location} • ${telemetryRoute.name} • ${currentRoundDistance}м`;

        if (headerStatusElement.innerText !== statusText) {
            headerStatusElement.innerText = statusText;
        };

        waypointNewDistanceInput.value = currentRoundDistance;

        let commandsToBeVoiced = [];

        if (!telemetryStage.completedBriefing) {
            if (telemetry.stage.distance <= 0) {
                const briefingWaypoint = telemetryPacenote.find(function(i) {
                    return i.distance === 0;
                });

                if (briefingWaypoint) {
                    telemetryStage.completedWaypoints.push(briefingWaypoint.distance);
                    commandsToBeVoiced = commandsToBeVoiced.concat(briefingWaypoint.commands);
                };
            };

            telemetryStage.completedBriefing = true;
        };

        const waypointsToBeVoiced = telemetryPacenote.filter(function(waypoint) {
            return (
                waypoint.distance > telemetry.stage.distance &&
                waypoint.distance < (telemetry.stage.distance + 2) &&
                !telemetryStage.completedWaypoints.includes(waypoint.distance)
            );
        });

        if (waypointsToBeVoiced.length > 0) {
            for (const waypoint of waypointsToBeVoiced) {
                telemetryStage.completedWaypoints.push(waypoint.distance);
                commandsToBeVoiced = commandsToBeVoiced.concat(waypoint.commands);
            };
        };

        if (telemetry.vehicle?.tyres) {
            for (const [tyre, data] of Object.entries(telemetry.vehicle.tyres)) {
                if (telemetryStage.vehicle.tyres[tyre].state !== data.state) {
                    if (data.state === 1) {
                        commandsToBeVoiced.push(`puncture_${tyre}`);
                    };

                    telemetryStage.vehicle.tyres[tyre].state = data.state;
                };
            };
        };

        if (commandsToBeVoiced.length > 0) {
            addCommandsToPlaylist(commandsToBeVoiced);
        };
    });
};