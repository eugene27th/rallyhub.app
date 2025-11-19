const electronRenderer = require(`electron/renderer`);


electronRenderer.contextBridge.exposeInMainWorld(`electronAPI`, {
    setConfig: function(config) {
        return electronRenderer.ipcRenderer.invoke(`setConfig`, config);
    },

    getAppData: function() {
        return electronRenderer.ipcRenderer.invoke(`getAppData`);
    },

    openRoute: async function() {
        return await electronRenderer.ipcRenderer.invoke(`openRoute`);
    },
    saveRoute: async function(route) {
        return await electronRenderer.ipcRenderer.invoke(`saveRoute`, route);
    },
    sendRoute: async function(data) {
        return await electronRenderer.ipcRenderer.invoke(`sendRoute`, data);
    },

    openExternalLink: async function(url) {
        return await electronRenderer.ipcRenderer.invoke(`openExternalLink`, url);
    },

    minimizeWindow: function() {
        return electronRenderer.ipcRenderer.invoke(`minimizeWindow`);
    },
    closeWindow: function() {
        return electronRenderer.ipcRenderer.invoke(`closeWindow`);
    },

    onStartupStatus: function(callback) {
        return electronRenderer.ipcRenderer.on(`startupStatus`, function(_event, code) {
            return callback(code);
        });
    },

    onGameTelemetry: function(callback) {
        return electronRenderer.ipcRenderer.on(`gameTelemetry`, function(_event, value) {
            return callback(value);
        });
    }
});