import { addCommandsToPlaylist } from "./audio.js";


const headerStatusElement = document.getElementById(`headerStatusElement`);
const waypointNewDistanceInput = document.getElementById(`waypointNewDistanceInput`);

let telemetryAwait = false;
let telemetryRoute = {};
let telemetryStage = {};

const telemetryDefaultStage = {
    hasStarted: false,
    nextWaypointIndex: 0,
    vehicleState: {
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


export const resetNextWaypointIndex = function() {
    telemetryStage.nextWaypointIndex = 0;
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

        const telemetryPacenote = globalThis.app.editor.route?.game.id === telemetry.stage.id ? globalThis.app.editor.route.pacenote : telemetryRoute.pacenote;

        if (!telemetryPacenote) {
            return false;
        };

        const telemetryStageRoundDistance = Math.round(telemetry.stage.distance);

        if (telemetryStageRoundDistance <= 0 && telemetryStage.hasStarted) {
            telemetryStage = structuredClone(telemetryDefaultStage);
        };

        if (telemetryStageRoundDistance > 0 && !telemetryStage.hasStarted) {
            telemetryStage.hasStarted = true;
        };

        const statusText = `${telemetryRoute.location} - ${telemetryRoute.name} - ${telemetryStageRoundDistance}м / ${Math.round(telemetry.stage.length)}м`;

        if (headerStatusElement.innerText !== statusText) {
            headerStatusElement.innerText = statusText;
        };

        waypointNewDistanceInput.value = telemetryStageRoundDistance;

        if (globalThis.app.data.config.settingPlaybackOffset !== 0 && telemetryStageRoundDistance > Math.max(50, globalThis.app.data.config.settingPlaybackOffset)) {
            telemetryStageRoundDistance += globalThis.app.data.config.settingPlaybackOffset;
        };

        let commandsToBeVoiced = [];

        for (let i = telemetryStage.nextWaypointIndex; i < telemetryPacenote.length; i++) {
            const waypoint = telemetryPacenote[i];

            if (telemetryStageRoundDistance > (waypoint.distance + 5)) {
                telemetryStage.nextWaypointIndex = i + 1;
                continue;
            };

            if (waypoint.distance !== 0 && telemetryStageRoundDistance < (waypoint.distance - 2)) {
                break;
            };

            commandsToBeVoiced = commandsToBeVoiced.concat(waypoint.commands);
            telemetryStage.nextWaypointIndex = i + 1;
        };

        if (telemetry.vehicle?.tyres) {
            for (const [tyre, data] of Object.entries(telemetry.vehicle.tyres)) {
                if (telemetryStage.vehicleState.tyres[tyre].state !== data.state) {
                    if (data.state === 1) {
                        commandsToBeVoiced.push(`puncture_${tyre}`);
                    };

                    telemetryStage.vehicleState.tyres[tyre].state = data.state;
                };
            };
        };

        if (commandsToBeVoiced.length > 0) {
            addCommandsToPlaylist(commandsToBeVoiced);
        };
    });
};