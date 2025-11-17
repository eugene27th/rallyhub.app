import { registerComponent } from "./modules/components.js";
import { setPreloaderError, removePreloader } from "./modules/preloader.js";
import { initGameModule } from "./modules/game.js";
import { initAudioModule } from "./modules/audio.js";
import { initLocationsModule } from "./modules/locations.js";
import { initRoutesModule } from "./modules/routes.js";
import { initWaypointsModule } from "./modules/waypoints.js";
import { initCommandsModule } from "./modules/commands.js";
import { initTelemetryModule } from "./modules/telemetry.js";


globalThis.app = {
    data: {
        config: {},
        routes: [],
        voices: [],
        commands: []
    },
    editor: {
        route: null,
        waypoint: null
    }
};


window.electronAPI.onStartupStatus(async function(code) {
    console.log(code);

    document.getElementById(`minimizeWindow`).addEventListener(`click`, async function() {
        await window.electronAPI.minimizeWindow();
    });

    document.getElementById(`closeWindow`).addEventListener(`click`, async function() {
        await window.electronAPI.closeWindow();
    });

    if (code !== `appReady`) {
        setPreloaderError(code);
        return;
    };

    globalThis.app.data = await window.electronAPI.getAppData();

    if (globalThis.app.data.error) {
        setPreloaderError(globalThis.app.data.error);
        return;
    };

    await registerComponent(`input-range`);
    await registerComponent(`input-select`);
    await registerComponent(`list-routes`);
    await registerComponent(`list-waypoints`);
    await registerComponent(`list-all-commands`);
    await registerComponent(`list-waypoint-commands`);

    document.getElementById(`headerVersionElement`).innerText = globalThis.app.data.config.appVersion;

    console.log(globalThis.app.data);

    await initGameModule();
    await initAudioModule();

    initLocationsModule();
    initRoutesModule();
    initWaypointsModule();
    initCommandsModule();
    initTelemetryModule();

    removePreloader();
});