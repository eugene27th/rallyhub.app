import { addCommandsToPlaylist } from "./audio.js";


const headerStatusElement = document.getElementById(`headerStatusElement`);
const waypointNewDistanceInput = document.getElementById(`waypointNewDistanceInput`);

let telemetryAwait = false;
let telemetryRoute = {};
let telemetryStage = {};
let telemetryPacenote = {};

const telemetryDefaultStage = {
    nextWaypointIndex: 0,
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

        if (telemetry.stage.distance <= 0 && telemetryStage.nextWaypointIndex > 1) {
            telemetryStage = structuredClone(telemetryDefaultStage);
        };

        const currentRoundDistance = telemetry.stage.distance > 0 ? Math.round(telemetry.stage.distance) : 0;

        const statusText = `${telemetryRoute.location} - ${telemetryRoute.name} - ${currentRoundDistance}м / ${Math.round(telemetry.stage.length)}м`;

        if (headerStatusElement.innerText !== statusText) {
            headerStatusElement.innerText = statusText;
        };

        waypointNewDistanceInput.value = currentRoundDistance;

        if (globalThis.app.data.config.settingPlaybackOffset !== 0 && telemetry.stage.distance > Math.max(50, globalThis.app.data.config.settingPlaybackOffset)) {
            telemetry.stage.distance += globalThis.app.data.config.settingPlaybackOffset;
        };

        let commandsToBeVoiced = [];

        for (let i = telemetryStage.nextWaypointIndex; i < telemetryPacenote.length; i++) {
            const waypoint = telemetryPacenote[i];

            if (telemetry.stage.distance > (waypoint.distance + 5)) {
                telemetryStage.nextWaypointIndex = i + 1;
                continue;
            };

            if (waypoint.distance !== 0 && telemetry.stage.distance < (waypoint.distance - 2)) {
                break;
            };

            commandsToBeVoiced = commandsToBeVoiced.concat(waypoint.commands);
            telemetryStage.nextWaypointIndex = i + 1;
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