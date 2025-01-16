const dom = {
    header: {
        status: document.querySelector(`.header .draggable .status`),
        minimize: document.querySelector(`.header .menu .buttons button[action=window-minimize]`),
        close: document.querySelector(`.header .menu .buttons button[action=window-close]`)
    },
    preloader: {
        container: document.querySelector(`.container .preloader`),
        link: document.querySelector(`.container .preloader .content .description .external.faq`)
    },
    settings: {
        game: document.querySelector(`.container .settings .block.game select`),
        voice: document.querySelector(`.container .settings .block.voice select`),
        rate: document.querySelector(`.container .settings .block.rate .range input`),
        volume: document.querySelector(`.container .settings .block.volume .row .range input`),
        listen: document.querySelector(`.container .settings .block.volume .row button[action=voice-listen]`)
    },
    editor: {
        location: document.querySelector(`.container .editor .location select`),
        routes: document.querySelector(`.container .editor .routes .list`),
        waypoints: document.querySelector(`.container .editor .waypoints .list`),
        route: {
            open: document.querySelector(`.container .editor button[action=route-open]`),
            save: document.querySelector(`.container .editor button[action=route-save]`),
            suggest: document.querySelector(`.container .editor button[action=route-suggest]`),
        },
        waypoint: {
            create: document.querySelector(`.container .editor button[action=point-create]`),
            delete: document.querySelector(`.container .editor button[action=point-delete]`),
            distance: {
                new: document.querySelector(`.container .editor .newwaypoint input`),
                set: document.querySelector(`.container .editor .newwaypoint button[action=point-set-distance]`),
                sel: document.querySelector(`.container .editor .selwaypoint input`),
            }
        },
        commands: {
            all: document.querySelector(`.container .editor .allcommands .list`),
            selected: document.querySelector(`.container .editor .selcommands .list`)
        }
    }
};

const app = {
    config: {},
    routes: [],
    voices: [],
    commands: [],
    audio: {
        element: new Audio(),
        selected_voice: {}
    },
    current_stage: {
        route_id: 0,
        playlist: [],
        briefing: false,
        completed_distance: 0,
        completed_waypoints: [],
        vehicle: {
            tyre_state: {
                fl: 0,
                fr: 0,
                rl: 0,
                rr: 0
            }
        }
    },
    editor: {
        selected_route: null,
        selected_waypoint: null
    }
};


const selectGame = async function(game) {
    if (app.config.game !== game) {
        app.config = {
            ...app.config,
            game: game
        };
    
        await window.electronAPI.config.set(app.config);
    };

    if (dom.settings.game.value !== game) {
        dom.settings.game.value = game;
    };

    if (dom.settings.game.querySelector(`option[disabled]`)) {
        dom.settings.game.querySelector(`option[disabled]`).remove();
    };

    resetSelectedLocation();

    const locations = new Set();

    for (const route of app.routes) {
        if (route.game === game) {
            locations.add(route.location);
        };
    };

    dom.editor.location.innerHTML = ``;

    let option = document.createElement(`option`);
        option.setAttribute(`disabled`, true);
        option.setAttribute(`selected`, true);
        option.innerText = `Выберите локацию`;

    dom.editor.location.append(option);

    for (const location of locations.values()) {
        let option = document.createElement(`option`);
            option.setAttribute(`value`, location);
            option.innerText = location;

        dom.editor.location.append(option);
    };
};

const selectLocation = function(location) {
    if (dom.editor.location.value !== location) {
        dom.editor.location.value = location;
    };

    if (dom.editor.location.querySelector(`option[disabled]`)) {
        dom.editor.location.querySelector(`option[disabled]`).remove();
    };

    resetSelectedRoute();

    dom.editor.routes.innerHTML = ``;

    for (const route of app.routes) {
        if (route.location === location) {
            let item = document.createElement(`div`);
                item.classList.add(`item`);
                item.setAttribute(`id`, route.id);
                item.innerText = route.name;

            dom.editor.routes.append(item);
        };
    };
};

const selectRoute = async function(id) {
    dom.editor.routes.classList.add(`disabled`);
    
    resetSelectedWaypoint();

    const selected_item = dom.editor.routes.querySelector(`.item.selected`);

    if (selected_item) {
        selected_item.classList.remove(`selected`);
    };

    dom.editor.routes.querySelector(`.item[id="${id}"]`).classList.add(`selected`);

    app.editor.selected_route = await window.electronAPI.route.get(id);

    dom.editor.waypoints.innerHTML = ``;

    for (const waypoint of app.editor.selected_route.pacenote) {
        let item = document.createElement(`div`);
            item.classList.add(`item`);
            item.setAttribute(`distance`, waypoint.distance);
            item.innerHTML = getWaypointHtml(waypoint.distance, waypoint.commands);

        dom.editor.waypoints.append(item);
    };

    dom.editor.routes.classList.remove(`disabled`);
};

const selectWaypoint = function(distance) {
    const selected_item = dom.editor.waypoints.querySelector(`.item.selected`);

    if (selected_item) {
        selected_item.classList.remove(`selected`);
    };

    dom.editor.waypoints.querySelector(`.item[distance="${distance}"]`).classList.add(`selected`);

    app.editor.selected_waypoint = app.editor.selected_route.pacenote.find(function(x) {
        return x.distance === parseInt(distance);
    });

    dom.editor.commands.selected.innerHTML = ``;
    dom.editor.waypoint.distance.sel.value = distance;

    for (const command of app.editor.selected_waypoint.commands) {
        addCommandElement(command);
    };
};


const selectVoice = async function(voice_id) {
    if (app.config.voice !== parseInt(voice_id)) {
        app.config = {
            ...app.config,
            voice: parseInt(voice_id)
        };
    
        await window.electronAPI.config.set(app.config);
    };

    dom.settings.voice.value = voice_id;
    
    app.audio.selected_voice = await window.electronAPI.voice.get(voice_id);
    app.audio.element.setAttribute(`src`, `data:audio/webm;base64,${app.audio.selected_voice.tracks[`100`]}`);
};

const selectRate = async function(rate) {
    if (app.config.rate !== parseInt(rate)) {
        app.config = {
            ...app.config,
            rate: parseInt(rate)
        };

        await window.electronAPI.config.set(app.config);
    };
    
    dom.settings.rate.value = rate;
    dom.settings.rate.nextElementSibling.innerText = `${rate}%`;
};

const selectVolume = async function(volume) {
    if (app.config.volume !== parseInt(volume)) {
        app.config = {
            ...app.config,
            volume: parseInt(volume)
        };

        await window.electronAPI.config.set(app.config);
    };
    
    dom.settings.volume.value = volume;
    dom.settings.volume.nextElementSibling.innerText = `${volume}%`;
};


const resetSelectedLocation = function() {
    resetSelectedRoute();
    
    dom.editor.routes.innerHTML = `<div class="plug">Выберите локацию</div>`;
};

const resetSelectedRoute = function() {
    resetSelectedWaypoint();

    app.editor.selected_route = null;

    dom.editor.waypoints.innerHTML = `<div class="plug">Выберите спецучасток</div>`;
};

const resetSelectedWaypoint = function() {
    app.editor.selected_waypoint = null;

    dom.editor.waypoint.distance.sel.value = 0;
    dom.editor.commands.selected.innerHTML = `<div class="plug">Выберите путевую точку</div>`;
};


const getWaypointHtml = function(distance, commands) {
    let text = ``;

    for (const command of commands) {
        text += ` - ${(app.commands.find(function(x) { return x.key === command })).value}`;
    };

    return `${distance}м <span>${text}</span>`;
};

const getWaypointIndex = function(distance) {
    return app.editor.selected_route.pacenote.findIndex(function(x) {
        return x.distance === distance;
    });
};

const getCommandIndex = function(command) {
    return app.editor.selected_waypoint.commands.findIndex(function(x) {
        return x === command;
    }); 
};

const sortWaypoints = function() {
    return app.editor.selected_route.pacenote.sort(function(a, b) {
        return a.distance - b.distance;
    });  
};

const redrawSelectedWaypoint = function() {
    return dom.editor.waypoints.querySelector(`.item[distance="${app.editor.selected_waypoint.distance}"]`).innerHTML = getWaypointHtml(app.editor.selected_waypoint.distance, app.editor.selected_waypoint.commands);
};

const addCommandElement = function(command) {
    let item = document.createElement(`div`);
        item.classList.add(`item`, `sb`, `move`);
        item.setAttribute(`command`, command);
        item.setAttribute(`draggable`, true);
        item.innerHTML = `
            ${app.commands.find(function(x) { return x.key === command }).value}
            <img class="delete" src="./assets/images/xmark.svg">
        `;

    dom.editor.commands.selected.append(item);
};


dom.header.minimize.addEventListener(`click`, async function() {
    await window.electronAPI.window.minimize();
});

dom.header.close.addEventListener(`click`, async function() {
    await window.electronAPI.window.close();
});


dom.preloader.link.addEventListener(`click`, async function() {
    await window.electronAPI.external.open(`https://rallyhub.ru/faq`);
});


dom.settings.game.addEventListener(`change`, async function() {
    await selectGame(this.value);
});

dom.settings.voice.addEventListener(`change`, async function() {
    await selectVoice(this.value);
});

dom.settings.rate.addEventListener(`input`, async function() {
    await selectRate(this.value);
});

dom.settings.volume.addEventListener(`input`, async function() {
    await selectVolume(this.value);
});

dom.settings.listen.addEventListener(`click`, async function() {
    const commands = Object.keys(app.audio.selected_voice.tracks);

    app.audio.element.setAttribute(`src`, `data:audio/webm;base64,${app.audio.selected_voice.tracks[commands[Math.floor(Math.random() * commands.length)]]}`);
    app.audio.element.load();

    app.audio.element.volume = app.config.volume / 100;
    app.audio.element.playbackRate = app.config.rate / 100;

    await app.audio.element.play();
});


dom.editor.location.addEventListener(`change`, function() {
    selectLocation(this.value);
});

dom.editor.routes.addEventListener(`click`, async function(event) {
    if (!event.target.classList.contains(`item`)) {
        return false;
    };

    await selectRoute(event.target.getAttribute(`id`));
});

dom.editor.waypoints.addEventListener(`click`, function(event) {
    if (!event.target.classList.contains(`item`)) {
        return false;
    };

    selectWaypoint(event.target.getAttribute(`distance`));
});

dom.editor.route.open.addEventListener(`click`, async function(event) {
    const route = await window.electronAPI.route.open();

    if (!route) {
        return false;
    };

    event.target.disabled = true;

    await selectGame(route.game);
    selectLocation(route.location);
    await selectRoute(route.id);

    event.target.disabled = false;
});

dom.editor.route.save.addEventListener(`click`, async function(event) {
    if (!app.editor.selected_route) {
        return false;  
    };

    event.target.disabled = true;
    await window.electronAPI.route.save(app.editor.selected_route);
    event.target.disabled = false;
});

dom.editor.route.suggest.addEventListener(`click`, async function(event) {
    if (!app.editor.selected_route) {
        return false;  
    };

    event.target.disabled = true;
    event.target.innerText = `Отправка...`;
    event.target.innerText = await window.electronAPI.route.suggest({ route_id: app.editor.selected_route.id, pacenote: app.editor.selected_route.pacenote }) ? `Отправлено` : `Ошибка`;

    setTimeout(() => {
        event.target.disabled = false;
        event.target.innerText = `Отправить стенограмму на сервер`;
    }, 2000);
});

dom.editor.waypoint.create.addEventListener(`click`, async function() {
    const distance = parseInt(dom.editor.waypoint.distance.new.value);

    app.editor.selected_route.pacenote.push({
        distance: distance,
        commands: []
    });

    sortWaypoints();

    let item = document.createElement(`div`);
        item.classList.add(`item`);
        item.setAttribute(`distance`, distance);
        item.innerHTML = `${distance}м`;
    
    const prev_waypoint = app.editor.selected_route.pacenote[getWaypointIndex(distance) - 1];

    if (prev_waypoint) {
        dom.editor.waypoints.querySelector(`.item[distance="${prev_waypoint.distance}"]`).after(item);
    } else {
        dom.editor.waypoints.prepend(item);
    };
});

dom.editor.waypoint.delete.addEventListener(`click`, async function() {
    if (!app.editor.selected_waypoint) {
        return false;
    };

    app.editor.selected_route.pacenote.splice(getWaypointIndex(app.editor.selected_waypoint.distance), 1);
    dom.editor.waypoints.querySelector(`.list .item[distance="${app.editor.selected_waypoint.distance}"]`).remove();

    resetSelectedWaypoint();
});


dom.editor.waypoint.distance.sel.addEventListener(`input`, async function() {
    if (this.value.length < 1) {
        return false;
    };

    const distance = parseInt(this.value);

    let item = dom.editor.waypoints.querySelector(`.item[distance="${app.editor.selected_waypoint.distance}"]`);
        item.setAttribute(`distance`, distance);
        item.innerHTML = getWaypointHtml(distance, app.editor.selected_waypoint.commands);

    app.editor.selected_waypoint.distance = distance;

    sortWaypoints();
    
    const prev_waypoint = app.editor.selected_route.pacenote[getWaypointIndex(app.editor.selected_waypoint.distance) - 1];

    if (prev_waypoint) {
        dom.editor.waypoints.querySelector(`.item[distance="${prev_waypoint.distance}"]`).after(item);
    } else {
        dom.editor.waypoints.prepend(item);
    };
});

dom.editor.waypoint.distance.set.addEventListener(`click`, async function() {
    dom.editor.waypoint.distance.new.value = Math.round(app.current_stage.completed_distance);
});

dom.editor.commands.selected.addEventListener(`dragstart`, (event) => {
    event.target.classList.add(`selected`);
})

dom.editor.commands.selected.addEventListener(`dragend`, (event) => {
    event.target.classList.remove(`selected`);
});

dom.editor.commands.selected.addEventListener(`dragover`, (event) => {
    event.preventDefault();
  
    const selected = dom.editor.commands.selected.querySelector(`.selected`);
    const under = event.target;

    if (selected === under || !under.classList.contains(`item`)) {
        return false;
    };

    const underpos = under.getBoundingClientRect();
    
    const next = (event.clientY < (underpos.y + underpos.height / 2)) ? under : under.nextElementSibling;
  
    if (next && selected === next.previousElementSibling || selected === next) {
        return false;
    };

    dom.editor.commands.selected.insertBefore(selected, next);

    app.editor.selected_waypoint.commands = [];

    for (const item of dom.editor.commands.selected.querySelectorAll(`.item`)) {
        app.editor.selected_waypoint.commands.push(item.getAttribute(`command`));
    };

    redrawSelectedWaypoint();
});

dom.editor.commands.selected.addEventListener(`click`, (event) => {
    if (!event.target.classList.contains(`delete`)) {
        return false;
    };

    app.editor.selected_waypoint.commands.splice(getCommandIndex(event.target.parentElement.getAttribute(`command`)), 1);

    event.target.parentElement.remove();

    redrawSelectedWaypoint();
});

dom.editor.commands.all.addEventListener(`click`, async function(event) {
    if (!event.target.classList.contains(`item`) || !app.editor.selected_waypoint) {
        return false;
    };

    const command = event.target.getAttribute(`command`);

    app.editor.selected_waypoint.commands.push(command);

    addCommandElement(command);
    redrawSelectedWaypoint();
});


window.electronAPI.onUpdateTelemetry(function(telemetry) {
    const header = `${telemetry.route.location} - ${telemetry.route.name} - ${Math.round(telemetry.stage.distance)}м`;

    if (dom.header.status.innerText !== header) {
        dom.header.status.innerText = header;
    };

    app.current_stage.completed_distance = telemetry.stage.distance;

    if (app.current_stage.route_id !== telemetry.route.id || (app.current_stage.completed_distance <= 0 && app.current_stage.completed_waypoints.length > 1)) {
        app.current_stage = {
            route_id: telemetry.route.id,
            playlist: [],
            briefing: false,
            completed_distance: 0,
            completed_waypoints: [],
            vehicle: {
                tyre_state: {
                    fl: 0,
                    fr: 0,
                    rl: 0,
                    rr: 0
                }
            }
        };
    };

    let pacenote;

    if (app.editor.selected_route) {
        pacenote = app.editor.selected_route.pacenote;
    } else {
        pacenote = telemetry.route.pacenote;
    };

    if (!pacenote) {
        return false;
    };

    if (!app.current_stage.briefing) {
        if (app.current_stage.completed_distance <= 0) {
            const briefpoint = pacenote.find(function(briefpoint) {
                return briefpoint.distance === 0;
            });

            if (briefpoint) {
                app.current_stage.completed_waypoints.push(briefpoint.distance);
                app.current_stage.playlist = app.current_stage.playlist.concat(briefpoint.commands);
            };
        };

        app.current_stage.briefing = true;
    };

    const waypoints = pacenote.filter(function(waypoint) {
        return !app.current_stage.completed_waypoints.includes(waypoint.distance) && waypoint.distance > app.current_stage.completed_distance && waypoint.distance < (app.current_stage.completed_distance + 2);
    });

    if (waypoints.length > 0) {
        app.current_stage.completed_waypoints.push(waypoints[0].distance);
        app.current_stage.playlist = app.current_stage.playlist.concat(waypoints[0].commands);
    };

    if (telemetry.vehicle?.tyre_state) {
        for (let [tyre, state] of Object.entries(telemetry.vehicle.tyre_state)) {
            if (app.current_stage.vehicle.tyre_state[tyre] !== state) {
                if (state === 1 || (state === 2 && app.current_stage.vehicle.tyre_state[tyre] !== 1)) {
                    app.current_stage.playlist.push(`puncture_${tyre}`);
                };

                app.current_stage.vehicle.tyre_state[tyre] = state;
            };
        };
    };
});

window.electronAPI.onAppReady(async function() {
    app.config = await window.electronAPI.config.get();
    app.routes = await window.electronAPI.routes.get();
    app.voices = await window.electronAPI.voices.get();
    app.commands = await window.electronAPI.commands.get();

    for (const voice of app.voices) {
        let option = document.createElement(`option`);
            option.setAttribute(`value`, voice.id);
            option.innerText = voice.name;

        if (app.config.voice === voice.id) {
            option.setAttribute(`selected`, true);
        };

        dom.settings.voice.append(option);
    };

    for (const command of app.commands) {
        if (command.special) {
            continue;
        };

        let item = document.createElement(`div`);
            item.classList.add(`item`);
            item.setAttribute(`command`, command.key);
            item.innerText = command.value;

        dom.editor.commands.all.append(item);
    };

    if (app.config.game) {
        await selectGame(app.config.game);
    };

    if (app.config.voice) {
        await selectVoice(app.config.voice);
    };

    if (app.config.rate) {
        await selectRate(app.config.rate);
    };
    
    if (app.config.volume) {
        await selectVolume(app.config.volume);
    };
    
    dom.preloader.container.remove();

    setInterval(function() {
        if (app.current_stage.playlist.length < 1 || (app.audio.element.currentTime > 0 && !app.audio.element.ended)) {
            return false;
        };

        if (app.audio.selected_voice.tracks[app.current_stage.playlist[0]]) {
            app.audio.element.setAttribute(`src`, `data:audio/webm;base64,${app.audio.selected_voice.tracks[app.current_stage.playlist[0]]}`);
            app.audio.element.load();

            app.audio.element.volume = app.config.volume / 100;
            app.audio.element.playbackRate = app.config.rate / 100;

            app.audio.element.play();
        };

        app.current_stage.playlist.splice(0, 1);
    }, 50);
});