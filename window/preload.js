const { contextBridge, ipcRenderer } = require(`electron/renderer`);


contextBridge.exposeInMainWorld(`electronAPI`, {
    config: {
        get: function() {
            return ipcRenderer.invoke(`config:get`);
        },
        set: function(config) {
            return ipcRenderer.invoke(`config:set`, config);
        }
    },
    voice: {
        get: function(voice_id) {
            return ipcRenderer.invoke(`voice:get`, voice_id);
        }
    },
    voices: {
        get: function() {
            return ipcRenderer.invoke(`voices:get`);
        }
    },
    route: {
        get: function(route_id) {
            return ipcRenderer.invoke(`route:get`, route_id);
        },
        open: function() {
            return ipcRenderer.invoke(`route:open`);
        },
        save: function(route) {
            return ipcRenderer.invoke(`route:save`, route);
        },
        suggest: function(data) {
            return ipcRenderer.invoke(`route:suggest`, data);
        }
    },
    routes: {
        get: function() {
            return ipcRenderer.invoke(`routes:get`);
        }
    },
    commands: {
        get: function() {
            return ipcRenderer.invoke(`commands:get`);
        }
    },
    external: {
        open: function(url) {
            return ipcRenderer.invoke(`external:open`, url);
        }
    },
    window: {
        close: function() {
            return ipcRenderer.invoke(`window:close`);
        },
        minimize: function() {
            return ipcRenderer.invoke(`window:minimize`);
        }
    },
    onUpdateTelemetry: function(callback) {
        return ipcRenderer.on(`telemetry`, function(_event, value) {
            return callback(value);
        });
    },
    onAppReady: function(callback) {
        return ipcRenderer.on(`ready`, function(_event) {
            return callback();
        });
    }
});