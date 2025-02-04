const fs = require(`fs`);

const fetch = require(`./fetch`);
const logger = require(`./logger`);

process.noAsar = true;


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


const config = function() {
    const default_config = {
        version: `1.0.0`,
        port: 20220,
        voice: 1,
        rate: 100,
        volume: 50
    };

    try {
        globalThis.config = require(`${globalThis.path}/config.json`);
    } catch (error) {
        logger.log(`Ошибка при парсинге конфигурационного файла приложения. Запись нового.`);

        globalThis.config = default_config;

        try {
            fs.writeFileSync(`${globalThis.path}/config.json`, JSON.stringify(globalThis.config, null, 4));
        } catch (error) {
            logger.log(`Ошибка при записи конфигурационного файла приложения. Путь: "${globalThis.path}/config.json". Код: ${error.code}.`);
            return false;
        };
    };

    if (!globalThis.config.version || !globalThis.config.port || !globalThis.config.voice || !globalThis.config.rate || !globalThis.config.volume) {
        globalThis.config = default_config;
    };

    return true;
};

const resources = async function() {
    logger.log(`Проверка версии приложения.`);

    const response_version = await fetch.send(`${globalThis.url.api}/app/version`).catch(function() {
        return null;
    });

    if (response_version?.status !== 200) {
        logger.log(`Ошибка при получении актуальной версии приложения. Путь: "${globalThis.url.api}/app/version". Статус: ${response_version?.status}.`);
        return false;
    };

    const latest_version = await response_version.text();

    const latest_major_version = parseInt(latest_version.split(`.`)[0]);
    const current_major_version = parseInt(globalThis.config.version.split(`.`)[0]);
    const electron_major_version = parseInt(process.versions.electron.split(`.`)[0]);
    
    if (current_major_version < latest_major_version || electron_major_version < 34) {
        logger.log(`Мажорная версия приложения не совпадает с актуальной. Требуется ручная переустановка. Удалите текущее приложение и скачайте новое на сайте: "https://rallyhub.ru".`);
        return { major: true };
    };

    if (globalThis.config.version === latest_version) {
        logger.log(`Текущая версия приложения совпадает с актуальной.`);
        return false;
    };

    logger.log(`Текущая версия приложения не совпадает с актуальной. Обновление приложения.`);

    const response_resources = await fetch.send(`${globalThis.url.cdn}/app.asar`).catch(function() {
        return null;
    });

    if (response_resources?.status !== 200) {
        logger.log(`Ошибка при получении архива ресурсов. Путь: "${globalThis.url.cdn}/app.asar". Статус: ${response_resources?.status}.`);
        return false;
    };

    globalThis.config.version = latest_version;

    try {
        fs.writeFileSync(`${globalThis.path}/config.json`, JSON.stringify(globalThis.config, null, 4));
    } catch (error) {
        logger.log(`Ошибка при обновлении конфигурационного файла приложения. Путь: "${globalThis.path}/config.json". Код: ${error.code}.`);
        return false;
    };

    try {
        fs.writeFileSync(`${globalThis.path}/resources/app.asar`, Buffer.from(await response_resources.arrayBuffer()));
    } catch (error) {
        logger.log(`Ошибка при обновлении архива ресурсов. Путь: "${globalThis.path}/resources/app.asar". Код: ${error.code}.`);
        return false;
    }

    logger.log(`Обновление приложения завершено. Перезагрузка.`);

    return { restart: true };
};

const wrc23 = function() {
    logger.log(`Проверка конфигурации WRC23.`);

    const config_path = `${documents_path}/My Games/WRC/telemetry/config.json`;
    const structure_path = `${documents_path}/My Games/WRC/telemetry/udp/rallyhub.json`;

    let config;
    let structure;

    try {
        config = JSON.parse(fs.readFileSync(config_path));
    } catch (error) {
        logger.log(`Ошибка при чтении/парсинге конфигурационного файла телеметрии WRC23. Путь: "${config_path}". Код: ${error.code || `PARSE`}.`);
        return false;
    };

    const exist_packet = config.udp.packets.find(function(element) {
        return element.structure === `rallyhub`;
    });

    const duplicated_port_packet = config.udp.packets.find(function(element) {
        return element.port === globalThis.config.port;
    });

    if (duplicated_port_packet && duplicated_port_packet.structure !== `rallyhub`) {
        logger.log(`В конфигурационном файле телеметрии WRC23 найден пакет "${duplicated_port_packet.structure}" с одинаковым портом.`);
    };

    if (!exist_packet || exist_packet.port !== globalThis.config.port) {
        logger.log(`Обновление конфигурационного файла телеметрии WRC23.`);

        const config_backup_path = `${documents_path}/My Games/WRC/telemetry/config.backup.json`;

        try {
            fs.copyFileSync(config_path, config_backup_path);
        } catch (error) {
            logger.log(`Ошибка при создании резервной копии конфигурационного файла телеметрии WRC23. Путь: "${config_backup_path}". Код: ${error.code}.`);
            return false;
        };

        config.udp.packets.push({
            structure: `rallyhub`,
            packet: `session_update`,
            ip: `127.0.0.1`,
            port: globalThis.config.port,
            frequencyHz: 30,
            bEnabled: true
        });

        try {
            fs.writeFileSync(config_path, JSON.stringify(config, null, 4));
        } catch (error) {
            logger.log(`Ошибка при обновлении конфигурационного файла телеметрии WRC23. Путь: "${config_path}". Код: ${error.code}.`);
            return false;
        };
    };

    let structure_update = false;
    
    const structure_schema = {
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
    };

    try {
        structure = JSON.parse(fs.readFileSync(structure_path));

        if (structure.versions.data !== structure_schema.versions.data) {
            logger.log(`Версия структурного файла телеметрии WRC23 не совпадает с актуальной.`);
            structure_update = true;
        };
    } catch (error) {
        logger.log(`Ошибка при чтении/парсинге структурного файла телеметрии WRC23. Путь: "${structure_path}". Код: ${error.code || `PARSE`}.`);
        structure_update = true;
    };

    if (structure_update) {
        logger.log(`Запись структурного файла телеметрии WRC23.`);

        try {
            fs.writeFileSync(structure_path, JSON.stringify(structure_schema, null, 4));
        } catch (error) {
            logger.log(`Ошибка при записи структурного файла телеметрии WRC23. Путь: "${structure_path}". Код: ${error.code}.`);
            return false;
        };
    };

    logger.log(`Конфигурация WRC23 завершена.`);

    return true;
};

const drt20 = function() {
    logger.log(`Проверка конфигурации DRT20.`);

    const config_path = `${documents_path}/My Games/DiRT Rally 2.0/hardwaresettings/hardware_settings_config.xml`;

    let config_file;

    try {
        config_file = fs.readFileSync(config_path, { encoding: `utf8` });
    } catch (error) {
        logger.log(`Ошибка при чтении конфигурационного файла DRT20. Путь: "${config_path}". Код: ${error.code}.`);
        return false;
    };

    if (config_file.search(`<udp enabled="true" extradata="3" port="${globalThis.config.port}" delay="1" ip="127.0.0.1" />`) < 0) {
        logger.log(`Обновление конфигурационного файла DRT20.`);

        const config_backup_path = `${documents_path}/My Games/DiRT Rally 2.0/hardwaresettings/hardware_settings_config.backup.xml`;

        try {
            fs.copyFileSync(config_path, config_backup_path);
        } catch (error) {
            logger.log(`Ошибка при создании резервной копии конфигурационного файла DRT20. Путь: "${config_backup_path}". Код: ${error.code}.`);
            return false;
        };

        const index = config_file.search(`</motion_platform>`);

        try {
            fs.writeFileSync(config_path, `${config_file.slice(0, index)}\t<udp enabled="true" extradata="3" port="${globalThis.config.port}" delay="1" ip="127.0.0.1" />\n\t${config_file.slice(index)}`);
        } catch (error) {
            logger.log(`Ошибка при обновлении конфигурационного файла DRT20. Путь: "${config_path}". Код: ${error.code}.`);
            return false;
        };
    };

    logger.log(`Конфигурация DRT20 завершена.`);

    return true;
};


module.exports = {
    config,
    resources,
    wrc23,
    drt20
};