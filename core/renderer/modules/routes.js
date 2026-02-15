import { setGame } from "./game.js";
import { setLocation } from "./locations.js";
import { resetNextWaypointIndex } from "./telemetry.js";


const routesListComponent = document.getElementById(`routesListComponent`);
const waypointsListComponent = document.getElementById(`waypointsListComponent`);
const waypointCurrentDistanceInput = document.getElementById(`waypointCurrentDistanceInput`);
const waypointCommandsListComponent = document.getElementById(`waypointCommandsListComponent`);
const openRouteButton = document.getElementById(`openRouteButton`);
const saveRouteButton = document.getElementById(`saveRouteButton`);
const sendRouteButton = document.getElementById(`sendRouteButton`);


export const setRoute = function(routeId, customRoute = null) {
    if (parseInt(routesListComponent.value) !== routeId) {
        routesListComponent.selectItem(routeId);
    };

    waypointsListComponent.removeItems();
    waypointCommandsListComponent.removeItems();

    globalThis.app.editor.route = customRoute ? customRoute : structuredClone(globalThis.app.data.routes.find(function(i) {
        return i.id === routeId;
    }));

    globalThis.app.editor.waypoint = null;

    waypointCurrentDistanceInput.value = 0;

    for (const waypoint of globalThis.app.editor.route.pacenote) {
        let description = ``;

        for (const commandKey of waypoint.commands) {
            const commandName = (globalThis.app.data.commands.find(function(i) {
                return i.key === commandKey;
            })).name;

            description += ` - ${commandName}`;
        };

        waypointsListComponent.addItem(waypoint.distance, description);
    };
};


export const initRoutesModule = function() {
    routesListComponent.addEventListener(`change`, function() {
        setRoute(parseInt(this.value));
    });

    openRouteButton.addEventListener(`click`, async function(event) {
        event.target.disabled = true;

        const importedRoute = await window.electronAPI.openRoute();

        event.target.disabled = false;

        if (!importedRoute) {
            return;
        };

        await setGame(importedRoute.game.code);
        setLocation(importedRoute.location);
        setRoute(importedRoute.id, importedRoute);

        resetNextWaypointIndex();
    });

    saveRouteButton.addEventListener(`click`, async function(event) {
        if (!globalThis.app.editor.route) {
            return;
        };

        event.target.disabled = true;

        await window.electronAPI.saveRoute(globalThis.app.editor.route);

        event.target.disabled = false;
    });

    sendRouteButton.addEventListener(`click`, async function(event) {
        if (!globalThis.app.editor.route) {
            return;
        };

        event.target.disabled = true;
        event.target.innerText = `Отправка...`;

        const response = await window.electronAPI.sendRoute({
            route: {
                id: globalThis.app.editor.route.id
            },
            pacenote: globalThis.app.editor.route.pacenote
        });

        if (response.ok) {
            event.target.innerText = `Отправлено`;
        } else {
            event.target.innerText = response.status === 429 ? `Превышен лимит` : `Ошибка`;
        };

        setTimeout(function() {
            event.target.disabled = false;
            event.target.innerText = `Отправить на сервер`;
        }, 2000);
    });
};