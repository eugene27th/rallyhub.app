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
            route: null,
            waypoint: null
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
        preloader: {
            root: document.querySelector(`.preloader`),
            img: document.querySelector(`.preloader .center svg`),
            message: document.querySelector(`.preloader .center .message`)
        },
        settings: {
            game: document.getElementById(`settingGame`),
            voice: document.getElementById(`settingVoice`),
            listen: document.getElementById(`listenVoice`),
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


const startupMessages = {
    majorUpdate: `Вышло крупное обновление, которое нельзя обновить автоматически.<br>Удалите текущее приложение и загрузите новое с сайта.`,
    networkError: `Не удалось подключиться к серверу.<br>Проверьте интернет-соединение и попробуйте снова.`,
    fileSystemError: `Не удалось получить доступ к файлам.<br>Проверьте права доступа или место на диске.`,
    updateError: `Не удалось завершить обновление.<br>Попробуйте выполнить обновление позже.`,
    startupError: `Произошла ошибка при запуске.<br>Попробуйте перезапустить приложение.`,
    unknownError: `Произошла неизвестная ошибка при запуске.<br>Попробуйте перезапустить приложение.`
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

        if (!app.audio.playing) {
            await playCommand(app.audio.playlist.shift());
        };
    };
};

const getCommandName = function(command) {
    return (app.data.commands.find(function(i) {
        return i.key === command;
    })).name;
};

const getLocationsByGame = function(game) {
    const locations = [];

    for (const route of app.data.routes) {
        if (game === route.game.code && !locations.includes(route.location)) {
            locations.push(route.location);
        };
    };

    return locations;
};


window.electronAPI.onStartupStatus(async function(code) {
    // регистрируем компоненты
    await registerComponent(`input-range`);
    await registerComponent(`input-select`);
    await registerComponent(`list-drag`);
    await registerComponent(`list-click`);
    await registerComponent(`list-select`);


    // обязательные хендлеры
    dom.header.options.minimize.addEventListener(`click`, async function() {
        await window.electronAPI.minimizeWindow();
    });

    dom.header.options.close.addEventListener(`click`, async function() {
        await window.electronAPI.closeWindow();
    });


    // работа с внеплановыми кодами запуска и прелоадером
    console.log(code);

    if (code !== `appReady`) {
        dom.main.preloader.img.classList.add(`broken`);
        dom.main.preloader.img.style.animationPlayState = `paused`;
        dom.main.preloader.message.innerHTML = startupMessages[code] || startupMessages.unknownError;

        return false;
    };


    // нода приложения готова, настраиваем окно
    app.data = await window.electronAPI.getAppData();

    console.log(app.data);

    dom.header.version.innerText = app.data.config.version;

    for (const game of [[`acr25`, `Assetto Corsa Rally`], [`wrc23`, `EA SPORTS WRC`], [`drt20`, `DiRT Rally 2.0`]]) {
        dom.main.settings.game.addOption(game[0], game[1], game[0] === app.data.config.game);
    };

    for (const voice of app.data.voices) {
        dom.main.settings.voice.addOption(voice.id, voice.name, voice.id === app.data.config.voice);
    };

    app.audio.voice = app.data.voices[app.data.voices.findIndex(function(i) { return i.id === app.data.config.voice })];

    dom.main.settings.rate.setValue(app.data.config.rate);
    dom.main.settings.volume.setValue(app.data.config.volume);

    for (const location of getLocationsByGame(app.data.config.game)) {
        dom.main.editor.locations.addOption(location, location);
    };

    for (const command of app.data.commands) {
        if (!command.special) {
            dom.main.editor.commands.list.addItem(command.key, command.name);
        };
    };


    // хендлеры
    dom.main.settings.game.addEventListener(`change`, async function() {
        app.data.config.game = this.value;
        await window.electronAPI.setConfig(app.data.config);

        dom.main.editor.locations.removeOptions();
        dom.main.editor.routes.removeItems();
        dom.main.editor.waypoints.removeItems();
        dom.main.editor.waypoint.selected.commands.removeItems();
        dom.main.editor.waypoint.selected.distance.value = 0;

        app.editor.selected.route = null;
        app.editor.selected.waypoint = null;

        for (const location of getLocationsByGame(this.value)) {
            dom.main.editor.locations.addOption(location, location);
        };
    });

    dom.main.settings.voice.addEventListener(`change`, async function() {
        const id = parseInt(this.value);

        app.data.config.voice = id;
        await window.electronAPI.setConfig(app.data.config);

        app.audio.voice = app.data.voices[app.data.voices.findIndex(function(i) { return i.id === id })];
    });

    dom.main.settings.listen.addEventListener(`click`, async function() {
        const commands = Object.keys(app.audio.voice.commands);
        const randomCommand = commands[Math.floor(Math.random() * commands.length)];

        app.audio.element.src = `data:audio/webm;base64,${app.audio.voice.commands[randomCommand]}`;
        app.audio.element.load();

        app.audio.element.volume = app.data.config.volume / 100;
        app.audio.element.playbackRate = app.data.config.rate / 100;

        try {
            await app.audio.element.play();
        } catch (error) {
            return;
        };
    });

    dom.main.settings.rate.addEventListener(`input`, async function() {
        app.data.config.rate = parseInt(this.value);
        await window.electronAPI.setConfig(app.data.config);
    });

    dom.main.settings.volume.addEventListener(`input`, async function() {
        app.data.config.volume = parseInt(this.value);
        await window.electronAPI.setConfig(app.data.config);
    });

    dom.main.editor.locations.addEventListener(`change`, function() {
        dom.main.editor.routes.removeItems();
        dom.main.editor.waypoints.removeItems();
        dom.main.editor.waypoint.selected.commands.removeItems();
        dom.main.editor.waypoint.selected.distance.value = 0;

        app.editor.selected.route = null;
        app.editor.selected.waypoint = null;

        for (const route of app.data.routes) {
            if (route.location === this.value) {
                dom.main.editor.routes.addItem(route.id, route.name);
            };
        };
    });

    dom.main.editor.routes.addEventListener(`change`, function() {
        const routeId = parseInt(this.value);

        if (app.editor.selected.route?.id === routeId) {
            return;
        };

        app.editor.selected.route = app.data.routes.find(function(i) {
            return i.id === routeId;
        });

        dom.main.editor.waypoints.removeItems();
        dom.main.editor.waypoint.selected.commands.removeItems();
        dom.main.editor.waypoint.selected.distance.value = 0;

        app.editor.selected.waypoint = null;

        for (const waypoint of app.editor.selected.route.pacenote) {
            let commands = ``;

            for (const commandKey of waypoint.commands) {
                commands += ` - ${getCommandName(commandKey)}`;
            };

            dom.main.editor.waypoints.addItem(waypoint.distance, `${waypoint.distance} <span>${commands}</span>`);
        };
    });

    dom.main.editor.waypoints.addEventListener(`change`, function() {
        const waypointDistance = parseInt(this.value);

        if (app.editor.selected.waypoint?.distance === waypointDistance) {
            return;
        };

        app.editor.selected.waypoint = app.editor.selected.route.pacenote.find(function(x) {
            return x.distance === waypointDistance;
        });

        dom.main.editor.waypoint.selected.commands.removeItems();

        for (const waypointCommand of app.editor.selected.waypoint.commands) {
            dom.main.editor.waypoint.selected.commands.addItem(waypointCommand, getCommandName(waypointCommand));
        };

        dom.main.editor.waypoint.selected.distance.value = app.editor.selected.waypoint.distance;
    });

    dom.main.editor.commands.list.addEventListener(`change`, function() {
        if (app.editor.selected.waypoint) {
            dom.main.editor.waypoint.selected.commands.addItem(this.value, getCommandName(this.value));
        };
    });

    dom.main.editor.commands.search.addEventListener(`input`, function() {
        dom.main.editor.commands.list.searchItems(this.value);
    });


    // окно настроено, удаляем загрузочный экран
    dom.main.preloader.root.style.opacity = `0`;

    setTimeout(function() {
        dom.main.preloader.root.remove();
    }, 250);


    // запускаем аудио воркер
    audioWorker();


    // начинаем слушать телеметрию
    window.electronAPI.onGameTelemetry(function(telemetry) {
        const currentDistance = telemetry.stage.distance > 0 ? Math.round(telemetry.stage.distance) : 0;

        // отрисовываем статус текущего заезда в хедере
        const statusText = `${telemetry.route.location} • ${telemetry.route.name} • ${currentDistance}м`;

        if (dom.header.status.innerText !== statusText) {
            dom.header.status.innerText = statusText;
        };

        // отрисовываем пройденную дистанцию в окне ввода дистанции для создания новой точки
        dom.main.editor.waypoint.new.distance.value = currentDistance;

        // добавляем команды в плейлист для озвучки
        if (telemetry.commands.length > 0) {
            app.audio.playlist = app.audio.playlist.concat(telemetry.commands);
        };
    });
});