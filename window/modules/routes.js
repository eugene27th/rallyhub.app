import { setGame } from "./game.js";
import { setLocation } from "./locations.js";


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
        const importedRoute = await window.electronAPI.openRoute();

        if (!importedRoute) {
            return;
        };

        await setGame(importedRoute.game.code);
        setLocation(importedRoute.location);
        setRoute(importedRoute.id, importedRoute);

        event.target.disabled = false;
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
        event.target.innerText = await window.electronAPI.sendRoute(globalThis.app.editor.route) !== false ? `Отправлено` : `Ошибка`;

        setTimeout(function() {
            event.target.disabled = false;
            event.target.innerText = `Отправить на сервер`;
        }, 2000);
    });
};