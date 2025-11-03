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
        setting: {
            game: document.getElementById(`settingGame`),
            voice: document.getElementById(`settingVoice`),
            rate: document.getElementById(`settingRate`),
            volume: document.getElementById(`settingVolume`)
        },
        editor: {
            locations: document.getElementById(`editorLocations`),
            routes: document.getElementById(`editorRouteList`),
            waypoints: document.getElementById(`editorWaypointList`),
            commands: {
                all: document.getElementById(`editorAllCommandList`)
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

                console.log(`debug: component "${name}" connected`);

                await init(this);
            };
        }
    );

    console.log(`debug: component "${name}" loaded`);
};


const selectGame = async function(game) {
    const locations = new Set();

    for (const route of app.data.routes) {
        if (route.game.code === game) {
            locations.add(route.location);
        };
    };

    dom.main.editor.locations.removeOptions();
    dom.main.editor.routes.removeItems();
    dom.main.editor.waypoints.removeItems();

    dom.main.editor.locations.addOption(null, `Выберите локацию`, false, true);    

    for (const location of locations.values()) {
        dom.main.editor.locations.addOption(location, location);
    };

    console.log(`выбрана игра: ${game}`);
};

const selectLocation = async function(location) {
    dom.main.editor.routes.removeItems();
    dom.main.editor.waypoints.removeItems();

    for (const route of app.data.routes) {
        if (route.location === location) {
            dom.main.editor.routes.addItem(route.id, route.name);
        };
    };

    console.log(`выбрана локация: ${location}`);
};

const selectRoute = async function(id) {
    dom.main.editor.waypoints.removeItems();

    app.editor.selected.route = app.data.routes.find(function(route) {
        return route.id === id;
    });

    for (const waypoint of app.editor.selected.route.pacenote) {
        let commands = ``;

        for (const command of waypoint.commands) {
            commands += ` - ${(app.data.commands.find(function(element) {return element.key === command })).value}`;
        };

        dom.main.editor.waypoints.addItem(waypoint.distance, `${waypoint.distance} <span>${commands}</span>`);
    };

    console.log(`выбран спецучасток: ${app.editor.selected.route.name}`);
};


window.electronAPI.onStartupStatus(async function(code) {
    await registerComponent(`input-select`);
    await registerComponent(`input-range`);
    await registerComponent(`list-select`);

    dom.header.options.minimize.addEventListener(`click`, async function() {
        await window.electronAPI.minimizeWindow();
    });

    dom.header.options.close.addEventListener(`click`, async function() {
        await window.electronAPI.closeWindow();
    });

    console.log(code);

    if (code === `majorUpdate`) {
        // открываем экран ручного обновления
        return false;
    };

    if (code === `networkError`) {
        // открываем экран плохого соединения
        return false;
    };

    if (code === `fileSystemError` || code === `updateError` || code === `startupError`) {
        // открываем экран ошибки
        return false;
    };

    app.data = await window.electronAPI.getAppData();

    console.log(app.data);

    dom.header.version.innerText = app.data.config.version;

    for (const game of [[`acr25`, `Assetto Corsa Rally`], [`wrc23`, `EA SPORTS WRC`], [`drt20`, `DiRT Rally 2.0`]]) {
        dom.main.setting.game.addOption(game[0], game[1], game[0] === app.data.config.game);
    };

    dom.main.setting.rate.setValue(app.data.config.rate);
    dom.main.setting.volume.setValue(app.data.config.volume);

    for (const voice of app.data.voices) {
        dom.main.setting.voice.addOption(voice.id, voice.name, voice.id === app.data.config.voice);
    };

    for (const command of app.data.commands) {
        if (!command.special) {
            dom.main.editor.commands.all.addItem(command.key, command.value);
        };
    };


    dom.main.setting.game.addEventListener(`change`, function() {
        selectGame(this.value);
    });

    dom.main.editor.locations.addEventListener(`change`, function() {
        selectLocation(this.value); 
    });

    dom.main.editor.routes.addEventListener(`change`, function() {
        selectRoute(parseInt(this.value)); 
    });


    // закрываем/удаляем загрузочный экран


    app.audio.voice = app.data.voices[0];

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

    audioWorker();


    window.electronAPI.onGameTelemetry(function(telemetry) {
        // слушаем и добавляем команды в плейлист
        //      * команды для озвучки будут приходить в этом же объекте
        // слушаем и отрисовываем необходимые штуки:
        //      - спецучасток и пройденные метры в хедер окна
        //      - пройденные метры в инпут добавления новой точки

        const statusText = `${telemetry.route.location} • ${telemetry.route.name} • ${Math.round(telemetry.stage.distance)}м`;

        if (dom.header.status.innerText !== statusText) {
            dom.header.status.innerText = statusText;
        };

        if (telemetry.commands.length > 0) {
            console.log(telemetry.stage.distance, JSON.stringify(telemetry.commands));
            app.audio.playlist = app.audio.playlist.concat(telemetry.commands);
        };
    });
});