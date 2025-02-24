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
        get: async function(voice_id) {
            return await ipcRenderer.invoke(`voice:get`, voice_id);
        }
    },
    voices: {
        get: async function() {
            return await ipcRenderer.invoke(`voices:get`);
        }
    },
    route: {
        get: async function(route_id) {
            return await ipcRenderer.invoke(`route:get`, route_id);
        },
        open: async function() {
            return await ipcRenderer.invoke(`route:open`);
        },
        save: async function(route) {
            return await ipcRenderer.invoke(`route:save`, route);
        },
        suggest: async function(data) {
            return await ipcRenderer.invoke(`route:suggest`, data);
        }
    },
    routes: {
        get: async function() {
            return await ipcRenderer.invoke(`routes:get`);
        }
    },
    commands: {
        get: async function() {
            return await ipcRenderer.invoke(`commands:get`);
        }
    },
    external: {
        open: async function(url) {
            return await ipcRenderer.invoke(`external:open`, url);
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
    },
    onMajorUpdate: function(callback) {
        return ipcRenderer.on(`major`, function(_event) {
            return callback();
        });
    }
});