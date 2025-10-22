const { contextBridge, ipcRenderer } = require(`electron/renderer`);


contextBridge.exposeInMainWorld(`electronAPI`, {
    setConfig: function(config) {
        return ipcRenderer.invoke(`setConfig`, config);
    },
    
    getInitData: function() {
        return ipcRenderer.invoke(`getInitData`);
    },

    getRoute: async function(id) {
        return await ipcRenderer.invoke(`getRoute`, id);
    },
    openRoute: async function() {
        return await ipcRenderer.invoke(`openRoute`);
    },
    saveRoute: async function(data) {
        return await ipcRenderer.invoke(`saveRoute`, data);
    },
    sendRoute: async function(data) {
        return await ipcRenderer.invoke(`sendRoute`, data);
    },

    openExternal: async function(url) {
        return await ipcRenderer.invoke(`openExternal`, url);
    },

    minimizeWindow: function() {
        return ipcRenderer.invoke(`minimizeWindow`);
    },
    closeWindow: function() {
        return ipcRenderer.invoke(`closeWindow`);
    },

    onUpdateStatus: function(callback) {
        return ipcRenderer.on(`updateStatus`, function(_event, code) {
            return callback(code);
        });
    },

    onGameTelemetry: function(callback) {
        return ipcRenderer.on(`gameTelemetry`, function(_event, value) {
            return callback(value);
        });
    }
});