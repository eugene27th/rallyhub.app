const { readFile, writeFile } = require(`fs/promises`);


const wrc23 = async function() {
    console.log(`installer > wrc23`);
    return true;

    let config_file = await readFile(`${process.env[`USERPROFILE`]}/Documents/My Games/WRC/telemetry/config.json`).catch(function() {
        return false;
    });

    if (!config_file) {
        return false;
    };

    let config = JSON.parse(config_file.toString());
    let udp_packet = config.udp.packets.find(x => x.structure === `rallyhub`);

    if (!udp_packet || udp_packet.port !== (globalThis.config.port || 20220)) {
        config.udp.packets.push({
            structure: `rallyhub`,
            packet: `session_update`,
            ip: `127.0.0.1`,
            port: globalThis.config.port || 20220,
            frequencyHz: 30,
            bEnabled: true
        });

        await writeFile(`${process.env[`USERPROFILE`]}/Documents/My Games/WRC/telemetry/config.json`, JSON.stringify(config, null, 4));
    };

    let structure_file = await readFile(`${process.env[`USERPROFILE`]}/Documents/My Games/WRC/telemetry/udp/rallyhub.json`).catch(function() {
        return false;
    });

    if (!structure_file) {
        await writeFile(`${process.env[`USERPROFILE`]}/Documents/My Games/WRC/telemetry/udp/rallyhub.json`, JSON.stringify({
            id: `rallyhub`,
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
        }, null, 4));
    };

    return true;
};

const drt20 = async function() {
    console.log(`installer > drt20`);
    return true;
};


module.exports = {
    wrc23,
    drt20
};