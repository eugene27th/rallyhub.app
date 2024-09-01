const log = require(`./logger`);
const { readFile, writeFile } = require(`fs/promises`);


const app = async function() {
    log.info(`[CODE: APP_INDEX_FETCH] [GET: https://api.rallyhub.ru/app/version/latest]`);

    let response_version = await fetch(`https://api.rallyhub.ru/app/version/latest`, {
        method: `GET`
    }).catch(function() {
        log.error(`[CODE: APP_INSTALLER_FETCH_RESPONSE] [GET: https://api.rallyhub.ru/app/version/latest]`);
        return null;
    });

    if (!response_version || response_version.status !== 200) {
        log.error(`[CODE: APP_INSTALLER_FETCH_RESPONSE_STATUS] [GET: https://api.rallyhub.ru/app/version/latest]`);
        return false;
    };

    let latest_version = (await response_version.json()).basic;

    if (globalThis.config.version === latest_version) {
        return false;
    };

    log.info(`[CODE: APP_INDEX_FETCH] [GET: https://cdn.rallyhub.ru/resources/basic.asar]`);

    let response_resources = await fetch(`https://cdn.rallyhub.ru/resources/basic.asar`).catch(function() {
        log.error(`[CODE: APP_INSTALLER_FETCH_RESPONSE] [GET: https://cdn.rallyhub.ru/resources/basic.asar]`);
        return null;
    });

    if (!response_resources || response_resources.status !== 200) {
        log.error(`[CODE: APP_INSTALLER_FETCH_RESPONSE_STATUS] [GET: https://cdn.rallyhub.ru/resources/basic.asar]`);
        return false;
    };

    globalThis.config.version = latest_version;

    await writeFile(`${globalThis.path}/config.json`, JSON.stringify(globalThis.config, null, 4)).catch(function() {
        log.error(`[CODE: APP_INSTALLER_WRITEFILE] [PATH: ${globalThis.path}/config.json]`);
    });

    await writeFile(`${globalThis.path}/resources/app.asar`, Buffer.from(await response.arrayBuffer())).catch(function() {
        log.error(`[CODE: APP_INSTALLER_WRITEFILE] [PATH: ${globalThis.path}/resources/app.asar]`);
    });

    return true;
};

const wrc23 = async function() {
    log.info(`[CODE: APP_INSTALLER_WRC23_INIT]`);

    let config_file = await readFile(`${process.env[`USERPROFILE`]}/Documents/My Games/WRC/telemetry/config.json`).catch(function() {
        log.error(`[CODE: APP_INSTALLER_WRC23_READFILE] [PATH: ${process.env[`USERPROFILE`]}/Documents/My Games/WRC/telemetry/config.json]`);
        return false;
    });

    if (!config_file) {
        return false;
    };

    let config = JSON.parse(config_file.toString());
    let udp_packet = config.udp.packets.find(x => x.structure === `rallyhub.basic`);

    if (!udp_packet || udp_packet.port !== (globalThis.config.port || 20220)) {
        config.udp.packets.push({
            structure: `rallyhub.basic`,
            packet: `session_update`,
            ip: `127.0.0.1`,
            port: globalThis.config.port || 20220,
            frequencyHz: 30,
            bEnabled: true
        });

        await writeFile(`${process.env[`USERPROFILE`]}/Documents/My Games/WRC/telemetry/config.json`, JSON.stringify(config, null, 4)).catch(function() {
            log.error(`[CODE: APP_INSTALLER_WRC23_WRITEFILE] [PATH: ${process.env[`USERPROFILE`]}/Documents/My Games/WRC/telemetry/config.json]`);
        });
    };

    let structure_file = await readFile(`${process.env[`USERPROFILE`]}/Documents/My Games/WRC/telemetry/udp/rallyhub.basic.json`).catch(function() {
        log.error(`[CODE: APP_INSTALLER_WRC23_READFILE] [PATH: ${process.env[`USERPROFILE`]}/Documents/My Games/WRC/telemetry/udp/rallyhub.basic.json]`);
        return false;
    });

    if (!structure_file) {
        await writeFile(`${process.env[`USERPROFILE`]}/Documents/My Games/WRC/telemetry/udp/rallyhub.basic.json`, JSON.stringify({
            id: `rallyhub.basic`,
            versions: {
                schema: 1,
                data: 1
            },
            header: {
                channels: [
                    `packet_4cc`
                ]
            },
            packets: [
                {
                    id: `session_update`,
                    channels: [
                        `game_total_time`,
                        `stage_length`,
                        `stage_current_time`,
                        `stage_progress`,
                        `route_id`,
                        `vehicle_speed`
                    ]
                }
            ]
        }, null, 4)).catch(function() {
            log.error(`[CODE: APP_INSTALLER_WRC23_WRITEFILE] [PATH: ${process.env[`USERPROFILE`]}/Documents/My Games/WRC/telemetry/udp/rallyhub.basic.json]`);
        });
    };

    log.info(`[CODE: APP_INSTALLER_WRC23_FINISH]`);

    return true;
};

const drt20 = async function() {
    log.info(`[CODE: APP_INSTALLER_DRT20_INIT]`);
    log.info(`[CODE: APP_INSTALLER_DRT20_FINISH]`);
    return true;
};


module.exports = {
    app,
    wrc23,
    drt20
};