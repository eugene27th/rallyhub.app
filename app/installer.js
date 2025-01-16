const fs = require(`fs/promises`);

const fetch = require(`./fetch`);
const logger = require(`./logger`);


let documents_path;

try {
    documents_path = (require(`child_process`).execSync(`chcp 65001 & reg query "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Explorer\\User Shell Folders" /v Personal`))
        .toString(`utf-8`)
        .replaceAll(`\r\n`, ``)
        .split(`    `)
        .slice(3)
        .join(`    `);

    const matches = documents_path.match(/%[^%]+%/g);

    if (matches) {
        for (let match of matches) {
            documents_path = documents_path.replace(match, process.env[match.substring(1, match.length - 1)]);
        };
    };

    logger.log(`Используется путь директории "Documents" из реестра Windows: "${documents_path}".`);
} catch (error) {
    documents_path = `${process.env[`USERPROFILE`]}/Documents`;
    logger.log(`Путь директории "Documents" не найден в реестре Windows. Используется путь "{USERPROFILE}/Documents" из среды выполнения: "${documents_path}".`);
};


const app = async function() {
    await logger.log(`Проверка версии приложения.`);

    const response_version = await fetch.send(`${globalThis.url.api}/app/version`).catch(async function() {
        return null;
    });

    if (response_version?.status !== 200) {
        await logger.log(`Ошибка при получении актуальной версии приложения. Путь: "${globalThis.url.api}/app/version". Статус: ${response_version?.status}.`);
        return false;
    };

    const latest_version = await response_version.text();

    if (globalThis.config.version === latest_version) {
        await logger.log(`Текущая версия приложения совпадает с актуальной.`);
        return false;
    };

    await logger.log(`Текущая версия приложения не совпадает с актуальной. Обновление приложения.`);

    const response_resources = await fetch.send(`${globalThis.url.cdn}/app.asar`).catch(async function() {
        return null;
    });

    if (response_resources?.status !== 200) {
        await logger.log(`Ошибка при получении архива ресурсов. Путь: "${globalThis.url.cdn}/app.asar". Статус: ${response_resources?.status}.`);
        return false;
    };

    globalThis.config.version = latest_version;

    await fs.writeFile(`${globalThis.path}/config.json`, JSON.stringify(globalThis.config, null, 4)).catch(async function(error) {
        await logger.log(`Ошибка при обновлении конфигурационного файла приложения. Путь: "${globalThis.path}/config.json". Код: ${error.code}.`);
    });

    await fs.writeFile(`${globalThis.path}/resources/app.asar`, Buffer.from(await response_resources.arrayBuffer())).catch(async function(error) {
        await logger.log(`Ошибка при обновлении архива ресурсов. Путь: "${globalThis.path}/resources/app.asar". Код: ${error.code}.`);
    });

    await logger.log(`Обновление приложения завершено. Перезагрузка.`);

    return true;
};

const wrc23 = async function() {
    await logger.log(`Проверка конфигурации WRC23.`);

    const config_path = `${documents_path}/My Games/WRC/telemetry/config.json`;

    const config_file = await fs.readFile(config_path).catch(async function(error) {
        await logger.log(`Ошибка при чтении конфигурационного файла телеметрии WRC23. Путь: "${config_path}". Код: ${error.code}.`);
        return null;
    });

    if (!config_file) {
        return false;
    };

    let config = JSON.parse(config_file.toString());
    const udp_packet = config.udp.packets.find(x => x.structure === `rallyhub`);

    if (!udp_packet || udp_packet.port !== globalThis.config.port) {
        await logger.log(`Обновление конфигурационного файла телеметрии WRC23.`);

        const config_backup_path = `${documents_path}/My Games/WRC/telemetry/config.rallyhub-backup.json`;

        await fs.copyFile(config_path, config_backup_path).catch(async function(error) {
            await logger.log(`Ошибка при создании резервной копии конфигурационного файла телеметрии WRC23. Путь: "${config_backup_path}". Код: ${error.code}.`);
        });

        config.udp.packets.push({
            structure: `rallyhub`,
            packet: `session_update`,
            ip: `127.0.0.1`,
            port: globalThis.config.port,
            frequencyHz: 30,
            bEnabled: true
        });

        await fs.writeFile(config_path, JSON.stringify(config, null, 4)).catch(async function(error) {
            await logger.log(`Ошибка при обновлении конфигурационного файла телеметрии WRC23. Путь: "${config_path}". Код: ${error.code}.`);
        });
    };

    const structure_path = `${documents_path}/My Games/WRC/telemetry/udp/rallyhub.json`;

    const structure_file = await fs.readFile(structure_path).catch(async function(error) {
        await logger.log(`Ошибка при чтении структурного файла телеметрии WRC23. Путь: "${structure_path}". Код: ${error.code}.`);
        return null;
    });

    if (!structure_file) { // todo: или если версия схемы не совпадает с текущей
        await logger.log(`Запись нового структурного файла телеметрии WRC23.`);

        await fs.writeFile(structure_path, JSON.stringify({
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
                        `vehicle_speed`,
                        `vehicle_tyre_state_bl`,
                        `vehicle_tyre_state_br`,
                        `vehicle_tyre_state_fl`,
                        `vehicle_tyre_state_fr`,
                        `vehicle_brake_temperature_bl`,
                        `vehicle_brake_temperature_br`,
                        `vehicle_brake_temperature_fl`,
                        `vehicle_brake_temperature_fr`
                    ]
                }
            ]
        }, null, 4)).catch(async function(error) {
            await logger.log(`Ошибка при записи структурного файла телеметрии WRC23. Путь: "${structure_path}". Код: ${error.code}.`);
        });
    };

    await logger.log(`Конфигурация WRC23 завершена.`);

    return true;
};

const drt20 = async function() {
    await logger.log(`Проверка конфигурации DRT20.`);

    const config_path = `${documents_path}/My Games/DiRT Rally 2.0/hardwaresettings/hardware_settings_config.xml`;

    const config_file = await fs.readFile(config_path, { encoding: `utf8` }).catch(async function(error) {
        await logger.log(`Ошибка при чтении конфигурационного файла DRT20. Путь: "${config_path}". Код: ${error.code}.`);
        return null;
    });

    if (!config_file) {
        return false;
    };

    if (config_file.search(`<udp enabled="true" extradata="3" port="${globalThis.config.port}" delay="1" ip="127.0.0.1" />`) < 0) {
        await logger.log(`Обновление конфигурационного файла DRT20.`);

        const config_backup_path = `${documents_path}/My Games/DiRT Rally 2.0/hardwaresettings/hardware_settings_config.rallyhub-backup.xml`;

        await fs.copyFile(config_path, config_backup_path).catch(async function(error) {
            await logger.log(`Ошибка при создании резервной копии конфигурационного файла DRT20. Путь: "${config_backup_path}". Код: ${error.code}.`);
        });

        const index = config_file.search(`</motion_platform>`);
        const config = `${config_file.slice(0, index)}\t<udp enabled="true" extradata="3" port="${globalThis.config.port}" delay="1" ip="127.0.0.1" />\n\t${config_file.slice(index)}`;

        await fs.writeFile(config_path, config).catch(async function(error) {
            await logger.log(`Ошибка при обновлении конфигурационного файла DRT20. Путь: "${config_path}". Код: ${error.code}.`);
        });
    };

    await logger.log(`Конфигурация DRT20 завершена.`);

    return true;
};


module.exports = {
    app,
    wrc23,
    drt20
};