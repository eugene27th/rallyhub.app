const app = {
    data: {
        config: {},
        routes: [],
        voices: [],
        commands: []
    },
    audio: {
        voice: {},
        playing: false,
        playlist: [],
        element: new Audio()
    },
    editor: {
        selected: {
            route: {},
            waypoint: {}
        }
    }
};

const dom = {
    header: {
        version: document.querySelector(`header .draggable .logo .version`),
        status: document.querySelector(`header .draggable .status`),
        options: {
            minimize: document.getElementById(`minimizeWindow`),
            close: document.getElementById(`closeWindow`)
        }
    },
    main: {
        settings: {
            game: document.getElementById(`settingGame`),
            voice: document.getElementById(`settingVoice`),
            rate: document.getElementById(`settingRate`),
            volume: document.getElementById(`settingVolume`)
        },
        editor: {
            locations: document.getElementById(`editorLocations`),
            routes: document.getElementById(`editorRoutes`),
            waypoints: document.getElementById(`editorWaypoints`),
            commands: {
                list: document.getElementById(`editorAllCommands`),
                search: document.getElementById(`editorAllCommandSearch`)
            },
            waypoint: {
                new: {
                    create: document.getElementById(`editorNewWaypointCreate`),
                    distance: document.getElementById(`editorNewWaypointDistance`)
                },
                selected: {
                    delete: document.getElementById(`editorSelectedWaypointDelete`),
                    distance: document.getElementById(`editorSelectedWaypointDistance`),
                    commands: document.getElementById(`editorSelectedWaypointCommands`)
                }
            },
            route: {
                open: document.getElementById(`editorOpenRoute`),
                save: document.getElementById(`editorSaveRoute`),
                suggest: document.getElementById(`editorSuggestRoute`)
            }
        }
    }
};


const registerComponent = async function(name) {
    if (customElements.get(name)) {
        return;
    };

    const path = `./components/${name}`;
    const html = await (await fetch(`${path}/index.html`)).text();

    const link = document.createElement(`link`);

    link.rel = `stylesheet`;
    link.href = `${path}/index.css`;

    document.head.appendChild(link);

    const { init } = await import(`${path}/index.js`);

    customElements.define(name,
        class extends HTMLElement {
            constructor() {
                super();
            };

            async connectedCallback() {
                this.originalChilds = [...this.childNodes];
                this.innerHTML = html;

                await init(this);
            };
        }
    );
};

const playCommand = async function(command) {
    const base64Audio = app.audio.voice.commands[command];

    if (!base64Audio) {
        return;
    };

    app.audio.element.src = `data:audio/webm;base64,${base64Audio}`;
    app.audio.element.load();

    app.audio.element.volume = app.data.config.volume / 100;
    app.audio.element.playbackRate = app.data.config.rate / 100;

    if (app.audio.playlist.length > 5 && app.data.config.rate < 110) {
        app.audio.element.playbackRate = 1.1;
    };

    app.audio.playing = true;

    try {
        await app.audio.element.play();
    } catch (error) {
        app.audio.playing = false;
        return;
    };

    await new Promise(function(resolve) {
        return app.audio.element.onended = function() {
            return resolve();
        };
    });

    app.audio.playing = false;
};

const audioWorker = async function() {
    while (true) {
        if (app.audio.playlist.length === 0) {
            await new Promise(function(resolve) {
                return setTimeout(resolve, 100);
            });

            continue;
        };

        const command = app.audio.playlist.shift();
        await playCommand(command);
    }
};

const getCommandName = function(command) {
    return (app.data.commands.find(function(i) {
        return i.key === command;
    })).name;
};


window.electronAPI.onStartupStatus(async function(code) {
    // регистрируем компоненты
    await registerComponent(`input-select`);
    await registerComponent(`input-range`);
    await registerComponent(`list-click`);
    await registerComponent(`list-select`);


    // обязательные хендлеры
    dom.header.options.minimize.addEventListener(`click`, async function() {
        await window.electronAPI.minimizeWindow();
    });

    dom.header.options.close.addEventListener(`click`, async function() {
        await window.electronAPI.closeWindow();
    });


    // работа с внеплановыми кодами
    console.log(code);

    if (code !== `appReady`) {
        if (code === `majorUpdate`) {
            // открываем экран ручного обновления
            return false;
        };

        if (code === `networkError`) {
            // открываем экран ошибки с соответствующей причиной
            return false;
        };

        if (code === `fileSystemError`) {
            // открываем экран ошибки с соответствующей причиной
            return false;
        };

        if (code === `updateError`) {
            // открываем экран ошибки с соответствующей причиной
            return false;
        };

        if (code === `startupError`) {
            // открываем экран ошибки с соответствующей причиной
            return false;
        };

        // открываем экран ошибки без указания причины
        return false;
    };


    // нода приложения готова, настраиваем окно
    app.data = await window.electronAPI.getAppData();

    console.log(app.data);

    dom.header.version.innerText = app.data.config.version;

    for (const game of [[`acr25`, `Assetto Corsa Rally`], [`wrc23`, `EA SPORTS WRC`], [`drt20`, `DiRT Rally 2.0`]]) {
        dom.main.settings.game.addOption(game[0], game[1], game[0] === app.data.config.game);
    };

    dom.main.settings.rate.setValue(app.data.config.rate);
    dom.main.settings.volume.setValue(app.data.config.volume);

    for (const voice of app.data.voices) {
        dom.main.settings.voice.addOption(voice.id, voice.name, voice.id === app.data.config.voice);
    };

    app.audio.voice = app.data.voices[app.data.voices.findIndex(function(i) { return i.id === app.data.config.voice })];

    for (const command of app.data.commands) {
        if (!command.special) {
            dom.main.editor.commands.list.addItem(command.key, command.name);
        };
    };


    // хендлеры
    dom.main.settings.game.addEventListener(`change`, function() {
        const locations = new Set();

        for (const route of app.data.routes) {
            if (route.game.code === this.value) {
                locations.add(route.location);
            };
        };

        dom.main.editor.locations.removeOptions();
        dom.main.editor.routes.removeItems();
        dom.main.editor.waypoints.removeItems();
        dom.main.editor.waypoint.selected.commands.removeItems();
        dom.main.editor.waypoint.selected.distance.value = 0;

        dom.main.editor.locations.setDisplayName(`Выберите локацию`);

        for (const location of locations.values()) {
            dom.main.editor.locations.addOption(location, location);
        };

        console.log(`выбрана игра: ${this.value}`);
    });

    dom.main.editor.locations.addEventListener(`change`, function() {
        dom.main.editor.routes.removeItems();
        dom.main.editor.waypoints.removeItems();
        dom.main.editor.waypoint.selected.commands.removeItems();
        dom.main.editor.waypoint.selected.distance.value = 0;

        for (const route of app.data.routes) {
            if (route.location === this.value) {
                dom.main.editor.routes.addItem(route.id, route.name);
            };
        };

        console.log(`выбрана локация: ${this.value}`);
    });

    dom.main.editor.routes.addEventListener(`change`, function() {
        const routeId = parseInt(this.value);

        if (app.editor.selected.route.id === routeId) {
            return;
        };

        app.editor.selected.route = app.data.routes.find(function(i) {
            return i.id === routeId;
        });

        dom.main.editor.waypoints.removeItems();
        dom.main.editor.waypoint.selected.commands.removeItems();
        dom.main.editor.waypoint.selected.distance.value = 0;

        for (const waypoint of app.editor.selected.route.pacenote) {
            let commands = ``;

            for (const commandKey of waypoint.commands) {
                commands += ` - ${getCommandName(commandKey)}`;
            };

            dom.main.editor.waypoints.addItem(waypoint.distance, `<code>${waypoint.distance}</code> <span>${commands}</span>`);
        };

        console.log(`выбран спецучасток: ${app.editor.selected.route.name}`);
    });

    dom.main.editor.waypoints.addEventListener(`change`, function() {
        const waypointDistance = parseInt(this.value);

        if (app.editor.selected.waypoint.distance === waypointDistance) {
            return;
        };
        
        app.editor.selected.waypoint = app.editor.selected.route.pacenote.find(function(x) {
            return x.distance === waypointDistance;
        });

        console.log(app.editor.selected.waypoint);

        dom.main.editor.waypoint.selected.commands.removeItems();

        for (const waypointCommand of app.editor.selected.waypoint.commands) {
            dom.main.editor.waypoint.selected.commands.addItem(app.editor.selected.waypoint.distance, getCommandName(waypointCommand));
        };

        dom.main.editor.waypoint.selected.distance.value = app.editor.selected.waypoint.distance;
    });

    dom.main.editor.commands.list.addEventListener(`change`, function() {
        dom.main.editor.waypoint.selected.commands.addItem(this.value, getCommandName(this.value));
    });

    dom.main.editor.commands.search.addEventListener(`input`, function() {
        dom.main.editor.commands.list.searchItems(this.value);
    });


    // окно настроено, удаляем загрузочный экран



    // запускаем аудио воркер
    audioWorker();


    // начинаем слушать телеметрию
    window.electronAPI.onGameTelemetry(function(telemetry) {
        // отрисовываем статус текущего заезда в хедере
        const statusText = `${telemetry.route.location} • ${telemetry.route.name} • ${Math.round(telemetry.stage.distance)}м`;

        if (dom.header.status.innerText !== statusText) {
            dom.header.status.innerText = statusText;
        };

        // отрисовываем пройденную дистанцию в окне ввода дистанции для создания новой точки
        dom.main.editor.waypoint.new.distance.value = telemetry.stage.distance;

        // добавляем команды в плейлист для озвучки
        if (telemetry.commands.length > 0) {
            console.log(telemetry.stage.distance, JSON.stringify(telemetry.commands));
            app.audio.playlist = app.audio.playlist.concat(telemetry.commands);
        };
    });
});