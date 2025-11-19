const locationInputComponent = document.getElementById(`locationInputComponent`);

const routesListComponent = document.getElementById(`routesListComponent`);
const waypointsListComponent = document.getElementById(`waypointsListComponent`);
const waypointCurrentDistanceInput = document.getElementById(`waypointCurrentDistanceInput`);
const waypointCommandsListComponent = document.getElementById(`waypointCommandsListComponent`);


export const setLocation = function(locationName) {
    if (locationInputComponent.value !== locationName) {
        locationInputComponent.selectOption(locationName);
    };

    routesListComponent.removeItems();
    waypointsListComponent.removeItems();
    waypointCommandsListComponent.removeItems();

    globalThis.app.editor.route = null;
    globalThis.app.editor.waypoint = null;

    waypointCurrentDistanceInput.value = 0;

    for (const route of globalThis.app.data.routes) {
        if (route.location === locationName) {
            routesListComponent.addItem(route.id, route.name);
        };
    };
};


export const initLocationsModule = function() {
    locationInputComponent.addEventListener(`change`, function() {
        setLocation(this.value);
    });
};