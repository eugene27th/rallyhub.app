const waypointsListComponent = document.getElementById(`waypointsListComponent`);
const waypointCreateButton = document.getElementById(`waypointCreateButton`);
const waypointNewDistanceInput = document.getElementById(`waypointNewDistanceInput`);
const waypointCurrentDistanceInput = document.getElementById(`waypointCurrentDistanceInput`);
const waypointDeleteButton = document.getElementById(`waypointDeleteButton`);
const waypointCommandsListComponent = document.getElementById(`waypointCommandsListComponent`);


const getSafeWaypointDistance = function(distance, prevDistance = null) {
    while (true) {
        const existWaypointIndex = globalThis.app.editor.route.pacenote.findIndex(function(i) {
            return i.distance === distance;
        });

        if (existWaypointIndex < 0) {
            break;
        };

        if (prevDistance) {
            distance += ((prevDistance - distance) > 0) ? -1 : 1;
        } else {
            distance += 1;
        };
    };

    return distance;
};


export const initWaypointsModule = function() {
    waypointsListComponent.addEventListener(`change`, function() {
        const waypointDistance = parseInt(this.value);

        waypointCommandsListComponent.removeItems();

        globalThis.app.editor.waypoint = globalThis.app.editor.route.pacenote.find(function(x) {
            return x.distance === waypointDistance;
        });

        waypointCurrentDistanceInput.value = globalThis.app.editor.waypoint.distance;

        for (const commandKey of globalThis.app.editor.waypoint.commands) {
            const commandName = (globalThis.app.data.commands.find(function(i) {
                return i.key === commandKey;
            })).name;

            waypointCommandsListComponent.addItem(commandKey, commandName);
        };
    });

    waypointCreateButton.addEventListener(`click`, function() {
        if (!globalThis.app.editor.route || waypointNewDistanceInput.value.length < 1) {
            return;
        };

        const waypointDistance = getSafeWaypointDistance(parseInt(waypointNewDistanceInput.value));

        waypointNewDistanceInput.value = waypointDistance;

        globalThis.app.editor.waypoint = {
            distance: waypointDistance,
            commands: []
        };

        globalThis.app.editor.route.pacenote.push(globalThis.app.editor.waypoint);

        globalThis.app.editor.route.pacenote.sort(function(a, b) {
            return a.distance - b.distance;
        });

        waypointsListComponent.addItem(waypointDistance, null, true);
    });

    waypointDeleteButton.addEventListener(`click`, function() {
        if (!globalThis.app.editor.waypoint) {
            return;
        };

        waypointsListComponent.removeItem(globalThis.app.editor.waypoint.distance);

        waypointCommandsListComponent.removeItems();
        waypointCurrentDistanceInput.value = 0;

        globalThis.app.editor.waypoint = null;
    });

    waypointCurrentDistanceInput.addEventListener(`input`, function() {
        if (!globalThis.app.editor.waypoint || this.value.length < 1) {
            return;
        };

        const prevDistance = globalThis.app.editor.waypoint.distance;
        const newDistance = getSafeWaypointDistance(parseInt(this.value), prevDistance);

        this.value = newDistance;

        globalThis.app.editor.waypoint.distance = newDistance;

        globalThis.app.editor.route.pacenote.sort(function(a, b) {
            return a.distance - b.distance;
        });

        waypointsListComponent.editItemValue(prevDistance, newDistance);
    });
};