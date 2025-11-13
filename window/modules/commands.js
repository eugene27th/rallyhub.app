const waypointsListComponent = document.getElementById(`waypointsListComponent`);
const allCommandsListComponent = document.getElementById(`allCommandsListComponent`);
const allCommandsSearchInput = document.getElementById(`allCommandsSearchInput`);
const waypointCommandsListComponent = document.getElementById(`waypointCommandsListComponent`);


export const initCommandsModule = function() {
    for (const command of globalThis.app.data.commands) {
        if (!command.special) {
            allCommandsListComponent.addItem(command.key, command.name);
        };
    };

    allCommandsListComponent.addEventListener(`change`, function() {
        if (!globalThis.app.editor.waypoint) {
            return;
        };

        const commandKey = this.value;
        const commandName = (globalThis.app.data.commands.find(function(i) {
            return i.key === commandKey;
        })).name;

        waypointCommandsListComponent.addItem(commandKey, commandName);
    });

    allCommandsSearchInput.addEventListener(`input`, function() {
        allCommandsListComponent.searchItems(this.value);
    });

    waypointCommandsListComponent.addEventListener(`change`, function() {
        globalThis.app.editor.waypoint.commands = this.value;

        let description = ``;

        for (const commandKey of globalThis.app.editor.waypoint.commands) {
            const commandName = (globalThis.app.data.commands.find(function(i) {
                return i.key === commandKey;
            })).name;

            description += ` - ${commandName}`;
        };

        waypointsListComponent.editItemDescription(globalThis.app.editor.waypoint.distance, description);
    });
};