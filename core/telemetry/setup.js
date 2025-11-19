const fs = require(`fs`);
const path = require(`path`);

const appUtils = require(path.join(globalThis.app.path.resources, `core`, `app`, `utils.js`));


const drt20 = function() {
    appUtils.writeLog(`Проверка конфигурации "DiRT Rally 2.0".`);

    const telemetryConfigPath = path.join(globalThis.app.path.documents, `My Games`, `DiRT Rally 2.0`, `hardwaresettings`, `hardware_settings_config.xml`);
    const telemetryBackupConfigPath = path.join(globalThis.app.path.documents, `My Games`, `DiRT Rally 2.0`, `hardwaresettings`, `hardware_settings_config.backup.xml`);

    let telemetryConfig;

    try {
        telemetryConfig = fs.readFileSync(telemetryConfigPath, { encoding: `utf8` });
    } catch (error) {
        appUtils.writeLog(`Ошибка при чтении конфигурационного файла "DiRT Rally 2.0". Путь: "${telemetryConfigPath}". Код: ${error.code}.`);
        return false;
    };

    if (telemetryConfig.search(`<udp enabled="true" extradata="3" port="${globalThis.app.config.appTelemetryPort}" delay="1" ip="127.0.0.1" />`) < 0) {
        appUtils.writeLog(`Обновление конфигурационного файла "DiRT Rally 2.0".`);

        try {
            fs.copyFileSync(telemetryConfigPath, telemetryBackupConfigPath);
        } catch (error) {
            appUtils.writeLog(`Ошибка при создании резервной копии конфигурационного файла "DiRT Rally 2.0". Путь: "${telemetryBackupConfigPath}". Код: ${error.code}.`);
            return false;
        };

        const searchIndex = telemetryConfig.search(`</motion_platform>`);

        telemetryConfig = `${telemetryConfig.slice(0, searchIndex)}\t<udp enabled="true" extradata="3" port="${globalThis.app.config.appTelemetryPort}" delay="1" ip="127.0.0.1" />\n\t${telemetryConfig.slice(searchIndex)}`;

        try {
            fs.writeFileSync(telemetryConfigPath, telemetryConfig);
        } catch (error) {
            appUtils.writeLog(`Ошибка при записи конфигурационного файла "DiRT Rally 2.0". Путь: "${telemetryConfigPath}". Код: ${error.code}.`);
            return false;
        };
    };

    appUtils.writeLog(`Конфигурация "DiRT Rally 2.0" завершена.`);

    return true;
};

const wrc23 = function() {
    appUtils.writeLog(`Проверка конфигурации "EA SPORTS WRC".`);

    const telemetryConfigPath = path.join(globalThis.app.path.documents, `My Games`, `WRC`, `telemetry`, `config.json`);
    const telemetryBackupConfigPath = path.join(globalThis.app.path.documents, `My Games`, `WRC`, `telemetry`, `config.backup.json`);

    let telemetryConfig;
    let telemetryConfigNeedUpdate = false;

    const defaultTelemetryConfig = {
        structure: `rallyhub`,
        packet: `session_update`,
        ip: `127.0.0.1`,
        port: globalThis.app.config.appTelemetryPort,
        frequencyHz: 30,
        bEnabled: true
    };

    try {
        telemetryConfig = JSON.parse(fs.readFileSync(telemetryConfigPath));
    } catch (error) {
        appUtils.writeLog(`Ошибка при чтении/парсинге конфигурационного файла телеметрии "EA SPORTS WRC". Путь: "${telemetryConfigPath}". Код: ${error.code || `PARSE`}.`);
        return false;
    };

    const duplicatedPortPacket = telemetryConfig.udp.packets.find(function(i) {
        return i.port === globalThis.app.config.appTelemetryPort && i.structure !== `rallyhub`;
    });

    if (duplicatedPortPacket) {
        appUtils.writeLog(`В конфигурационном файле телеметрии "EA SPORTS WRC" найден пакет "${duplicatedPortPacket.structure}" с портом, используемым приложением.`);
    };

    const existPacketIndex = telemetryConfig.udp.packets.findIndex(function(i) {
        return i.structure === `rallyhub`;
    });

    if (existPacketIndex < 0) {
        appUtils.writeLog(`Добавление пакета в конфигурационный файл телеметрии "EA SPORTS WRC".`);

        telemetryConfig.udp.packets.push(defaultTelemetryConfig);
        telemetryConfigNeedUpdate = true;
    } else if (telemetryConfig.udp.packets[existPacketIndex].port !== globalThis.app.config.appTelemetryPort) {
        appUtils.writeLog(`Перезапись пакета в конфигурационном файле телеметрии "EA SPORTS WRC".`);

        telemetryConfig.udp.packets[existPacketIndex] = defaultTelemetryConfig;
        telemetryConfigNeedUpdate = true;
    };

    if (telemetryConfigNeedUpdate) {
        appUtils.writeLog(`Обновление конфигурационного файла телеметрии "EA SPORTS WRC".`);

        try {
            fs.copyFileSync(telemetryConfigPath, telemetryBackupConfigPath);
        } catch (error) {
            appUtils.writeLog(`Ошибка при создании резервной копии конфигурационного файла телеметрии "EA SPORTS WRC". Путь: "${telemetryBackupConfigPath}". Код: ${error.code}.`);
            return false;
        };

        try {
            fs.writeFileSync(telemetryConfigPath, JSON.stringify(telemetryConfig, null, 4));
        } catch (error) {
            appUtils.writeLog(`Ошибка при записи конфигурационного файла телеметрии "EA SPORTS WRC". Путь: "${telemetryConfigPath}". Код: ${error.code}.`);
            return false;
        };
    };


    const telemetryStructurePath = path.join(globalThis.app.path.documents, `My Games`, `WRC`, `telemetry`, `udp`, `rallyhub.json`);

    let telemetryStructure;
    let telemetryStructureNeedUpdate = false;

    const telemetryDefaultStructure = {
        id: `rallyhub`,
        versions: {
            schema: 1,
            data: 2
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
                    `stage_length`,
                    `stage_progress`,
                    `route_id`,
                    `vehicle_tyre_state_bl`,
                    `vehicle_tyre_state_br`,
                    `vehicle_tyre_state_fl`,
                    `vehicle_tyre_state_fr`
                ]
            }
        ]
    };

    try {
        telemetryStructure = JSON.parse(fs.readFileSync(telemetryStructurePath));

        if (telemetryStructure.versions.data !== telemetryDefaultStructure.versions.data) {
            appUtils.writeLog(`Версия структурного файла телеметрии "EA SPORTS WRC" не совпадает с актуальной.`);
            telemetryStructureNeedUpdate = true;
        };
    } catch (error) {
        appUtils.writeLog(`Ошибка при чтении/парсинге структурного файла телеметрии "EA SPORTS WRC". Путь: "${telemetryStructurePath}". Код: ${error.code || `PARSE`}.`);
        telemetryStructureNeedUpdate = true;
    };

    if (telemetryStructureNeedUpdate) {
        appUtils.writeLog(`Запись структурного файла телеметрии "EA SPORTS WRC".`);

        try {
            fs.writeFileSync(telemetryStructurePath, JSON.stringify(telemetryDefaultStructure, null, 4));
        } catch (error) {
            appUtils.writeLog(`Ошибка при записи структурного файла телеметрии "EA SPORTS WRC". Путь: "${telemetryStructurePath}". Код: ${error.code}.`);
            return false;
        };
    };

    appUtils.writeLog(`Конфигурация "EA SPORTS WRC" завершена.`);

    return true;
};

const acr25 = function() {
    appUtils.writeLog(`Проверка конфигурации "Assetto Corsa Rally".`);

    // installing

    appUtils.writeLog(`Конфигурация "Assetto Corsa Rally" завершена.`);

    return true;
};


module.exports = {
    drt20,
    wrc23,
    acr25
};