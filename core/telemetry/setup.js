const fs = require(`fs`);
const path = require(`path`);

const appLog = require(`../app/log`);

process.noAsar = true;


const drt20 = function() {
    appLog(`Проверка конфигурации DRT20.`);

    const telemetryConfigPath = path.join(globalThis.app.path.documents, `My Games`, `DiRT Rally 2.0`, `hardwaresettings`, `hardware_settings_config.xml`);
    const telemetryBackupConfigPath = path.join(globalThis.app.path.documents, `My Games`, `DiRT Rally 2.0`, `hardwaresettings`, `hardware_settings_config.backup.xml`);

    let telemetryConfig;

    try {
        telemetryConfig = fs.readFileSync(telemetryConfigPath, { encoding: `utf8` });
    } catch (error) {
        appLog(`Ошибка при чтении конфигурационного файла DRT20. Путь: "${telemetryConfigPath}". Код: ${error.code}.`);
        return false;
    };

    if (telemetryConfig.search(`<udp enabled="true" extradata="3" port="${globalThis.app.config.port}" delay="1" ip="127.0.0.1" />`) < 0) {
        appLog(`Обновление конфигурационного файла DRT20.`);

        try {
            fs.copyFileSync(telemetryConfigPath, telemetryBackupConfigPath);
        } catch (error) {
            appLog(`Ошибка при создании резервной копии конфигурационного файла DRT20. Путь: "${telemetryBackupConfigPath}". Код: ${error.code}.`);
            return false;
        };

        const searchIndex = telemetryConfig.search(`</motion_platform>`);

        telemetryConfig = `${telemetryConfig.slice(0, searchIndex)}\t<udp enabled="true" extradata="3" port="${globalThis.app.config.port}" delay="1" ip="127.0.0.1" />\n\t${telemetryConfig.slice(searchIndex)}`;

        try {
            fs.writeFileSync(telemetryConfigPath, telemetryConfig);
        } catch (error) {
            appLog(`Ошибка при обновлении конфигурационного файла DRT20. Путь: "${telemetryConfigPath}". Код: ${error.code}.`);
            return false;
        };
    };

    appLog(`Конфигурация DRT20 завершена.`);

    return true;
};

const wrc23 = function() {
    appLog(`Проверка конфигурации WRC23.`);

    const telemetryConfigPath = path.join(globalThis.app.path.documents, `My Games`, `WRC`, `telemetry`, `config.json`);
    const telemetryBackupConfigPath = path.join(globalThis.app.path.documents, `My Games`, `WRC`, `telemetry`, `config.backup.json`);

    let telemetryConfig;
    let telemetryConfigNeedUpdate = false;

    const defaultTelemetryConfig = {
        structure: `rallyhub`,
        packet: `session_update`,
        ip: `127.0.0.1`,
        port: globalThis.app.config.port,
        frequencyHz: 30,
        bEnabled: true
    };

    try {
        telemetryConfig = JSON.parse(fs.readFileSync(telemetryConfigPath));
    } catch (error) {
        appLog(`Ошибка при чтении/парсинге конфигурационного файла телеметрии WRC23. Путь: "${telemetryConfigPath}". Код: ${error.code || `PARSE`}.`);
        return false;
    };

    const duplicatedPortPacket = telemetryConfig.udp.packets.find(function(element) {
        return element.port === globalThis.app.config.port && element.structure !== `rallyhub`;
    });

    if (duplicatedPortPacket) {
        appLog(`В конфигурационном файле телеметрии WRC23 найден пакет "${duplicatedPortPacket.structure}" с портом, используемым приложением.`);
    };

    const existPacketIndex = telemetryConfig.udp.packets.findIndex(function(element) {
        return element.structure === `rallyhub`;
    });

    if (existPacketIndex < 0) {
        appLog(`Добавление пакета в конфигурационный файл телеметрии WRC23.`);

        telemetryConfig.udp.packets.push(defaultTelemetryConfig);
        telemetryConfigNeedUpdate = true;
    } else if (telemetryConfig.udp.packets[existPacketIndex].port !== globalThis.app.config.port) {
        appLog(`Перезапись пакета в конфигурационном файле телеметрии WRC23.`);

        telemetryConfig.udp.packets[existPacketIndex] = defaultTelemetryConfig;
        telemetryConfigNeedUpdate = true;
    };

    if (telemetryConfigNeedUpdate) {
        appLog(`Обновление конфигурационного файла телеметрии WRC23.`);

        try {
            fs.copyFileSync(telemetryConfigPath, telemetryBackupConfigPath);
        } catch (error) {
            appLog(`Ошибка при создании резервной копии конфигурационного файла телеметрии WRC23. Путь: "${telemetryBackupConfigPath}". Код: ${error.code}.`);
            return false;
        };

        try {
            fs.writeFileSync(telemetryConfigPath, JSON.stringify(telemetryConfig, null, 4));
        } catch (error) {
            appLog(`Ошибка при обновлении конфигурационного файла телеметрии WRC23. Путь: "${telemetryConfigPath}". Код: ${error.code}.`);
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
            appLog(`Версия структурного файла телеметрии WRC23 не совпадает с актуальной.`);
            telemetryStructureNeedUpdate = true;
        };
    } catch (error) {
        appLog(`Ошибка при чтении/парсинге структурного файла телеметрии WRC23. Путь: "${telemetryStructurePath}". Код: ${error.code || `PARSE`}.`);
        telemetryStructureNeedUpdate = true;
    };

    if (telemetryStructureNeedUpdate) {
        appLog(`Запись структурного файла телеметрии WRC23.`);

        try {
            fs.writeFileSync(telemetryStructurePath, JSON.stringify(telemetryDefaultStructure, null, 4));
        } catch (error) {
            appLog(`Ошибка при записи структурного файла телеметрии WRC23. Путь: "${telemetryStructurePath}". Код: ${error.code}.`);
            return false;
        };
    };

    appLog(`Конфигурация WRC23 завершена.`);

    return true;
};

const acr25 = function() {
    appLog(`Проверка конфигурации ACR.`);

    // installing

    appLog(`Конфигурация ACR завершена.`);

    return true;
};


module.exports = {
    drt20,
    wrc23,
    acr25
};