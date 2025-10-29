const appLog = require(`./log`);
const tryFetch = require(`./fetch`);
const appUpdate = require(`./update`);

const telemetrySetup = require(`../telemetry/setup`);


module.exports = async function() {
    let updateStatus;

    try {
        updateStatus = await appUpdate();
    } catch (error) {
        appLog(`Ошибка при обновлении приложения: ${error.stack || error}.`);

        updateStatus = {
            code: `updateError`
        };
    };

    if (updateStatus.code !== `appReady`) {
        return updateStatus;
    };

    const [routes, voices, commands] = await Promise.allSettled([
        tryFetch(`${globalThis.app.url.api}/routes`),
        tryFetch(`${globalThis.app.url.api}/voices`),
        tryFetch(`${globalThis.app.url.api}/commands`)
    ]);

    if (routes.status !== `fulfilled` || !routes.value || voices.status !== `fulfilled` || !voices.value || commands.status !== `fulfilled` || !commands.value) {
        return {
            code: `networkError`
        };
    };

    globalThis.app.data.routes = routes.value;
    globalThis.app.data.voices = voices.value;
    globalThis.app.data.commands = commands.value;

    telemetrySetup();

    return {
        code: `appReady`
    };
};