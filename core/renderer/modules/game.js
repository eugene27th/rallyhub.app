const gameInputComponent = document.getElementById(`gameInputComponent`);
const locationInputComponent = document.getElementById(`locationInputComponent`);

const routesListComponent = document.getElementById(`routesListComponent`);
const waypointsListComponent = document.getElementById(`waypointsListComponent`);
const waypointCurrentDistanceInput = document.getElementById(`waypointCurrentDistanceInput`);
const waypointCommandsListComponent = document.getElementById(`waypointCommandsListComponent`);

const games = [
    // [`acr25`, `Assetto Corsa Rally`],
    [`wrc23`, `EA SPORTS WRC`],
    [`drt20`, `DiRT Rally 2.0`]
];


export const setGame = async function(gameCode) {
    if (globalThis.app.data.config.settingGame !== gameCode) {
        globalThis.app.data.config.settingGame = gameCode;
        await window.electronAPI.setConfig(app.data.config);
    };

    if (gameInputComponent.value !== gameCode) {
        gameInputComponent.selectOption(gameCode);
    };

    locationInputComponent.removeOptions();
    routesListComponent.removeItems();
    waypointsListComponent.removeItems();
    waypointCommandsListComponent.removeItems();

    globalThis.app.editor.route = null;
    globalThis.app.editor.waypoint = null;

    waypointCurrentDistanceInput.value = 0;

    const locations = [];

    for (const route of globalThis.app.data.routes) {
        if (gameCode === route.game.code && !locations.includes(route.location)) {
            locations.push(route.location);
        };
    };

    for (const location of locations) {
        locationInputComponent.addOption(location, location);
    };
};


export const initGameModule = async function() {
    for (const game of games) {
        gameInputComponent.addOption(game[0], game[1]);
    };

    await setGame(globalThis.app.data.config.settingGame);

    gameInputComponent.addEventListener(`change`, async function() {
        await setGame(this.value);
    });
};