const { contextBridge, ipcRenderer } = require(`electron/renderer`);


contextBridge.exposeInMainWorld(`electronAPI`, {
    config: {
        get: function() {
            return ipcRenderer.invoke(`config:get`);
        },
        set: function(new_config) {
            return ipcRenderer.invoke(`config:set`, new_config);
        }
    },
    voice: {
        get: function(voice_id) {
            return ipcRenderer.invoke(`voice:get`, voice_id);
        }
    },
    voices: {
        get: function(options) {
            return ipcRenderer.invoke(`voices:get`, options);
        },
        filters: function() {
            return ipcRenderer.invoke(`voices:filters:get`);
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