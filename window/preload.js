const electron = require(`electron/renderer`);


electron.contextBridge.exposeInMainWorld(`electronAPI`, {
    setConfig: function(config) {
        return electron.ipcRenderer.invoke(`setConfig`, config);
    },
    
    getAppData: function() {
        return electron.ipcRenderer.invoke(`getAppData`);
    },

    editorOpenRoute: async function() {
        return await electron.ipcRenderer.invoke(`editorOpenRoute`);
    },
    editorSaveRoute: async function() {
        return await electron.ipcRenderer.invoke(`editorSaveRoute`);
    },
    editorSendRoute: async function() {
        return await electron.ipcRenderer.invoke(`editorSendRoute`);
    },

    openExternalLink: async function(url) {
        return await electron.ipcRenderer.invoke(`openExternalLink`, url);
    },

    minimizeWindow: function() {
        return electron.ipcRenderer.invoke(`minimizeWindow`);
    },
    closeWindow: function() {
        return electron.ipcRenderer.invoke(`closeWindow`);
    },

    onStartupStatus: function(callback) {
        return electron.ipcRenderer.on(`startupStatus`, function(_event, code) {
            return callback(code);
        });
    },

    onGameTelemetry: function(callback) {
        return electron.ipcRenderer.on(`gameTelemetry`, function(_event, value) {
            return callback(value);
        });
    }
});