const dom = {
    header: {
        version: document.querySelector(`.header .draggable .logo .version`),
        status: document.querySelector(`.header .draggable .status`),
        minimize: document.querySelector(`.header .menu .buttons button[action=window-minimize]`),
        close: document.querySelector(`.header .menu .buttons button[action=window-close]`)
    },
    screens: {
        loading: {
            container: document.querySelector(`.container .screen.loading`),
            message: document.querySelector(`.container .screen.loading .center .message`),
            link: document.querySelector(`.container .screen.loading .bottom .external.faq`)
        },
        major: {
            container: document.querySelector(`.container .screen.major`),
            link: {
                faq: document.querySelector(`.container .screen.major .bottom .external.faq`),
                site: document.querySelector(`.container .screen.major .center .message .external.site`)
            }
        }
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
        waypoints: {
            list: document.querySelector(`.container .editor .waypoints .list`),
            options: {
                scroll: document.querySelector(`.container .editor .waypoints .title .buttons button[action=waypoints-scroll-into-view]`)
            }
        },
        route: {
            open: document.querySelector(`.container .editor button[action=route-open]`),
            save: document.querySelector(`.container .editor button[action=route-save]`),
            suggest: document.querySelector(`.container .editor button[action=route-suggest]`),
        },
        waypoint: {
            create: document.querySelector(`.container .editor button[action=waypoint-create]`),
            delete: document.querySelector(`.container .editor button[action=waypoint-delete]`),
            distance: {
                new: document.querySelector(`.container .editor .newwaypoint input`),
                set: document.querySelector(`.container .editor .newwaypoint button[action=waypoint-set-distance]`),
                sel: document.querySelector(`.container .editor .selwaypoint input`),
            }
        },
        commands: {
            all: {
                list: document.querySelector(`.container .editor .allcommands .list`),
                search: document.querySelector(`.container .editor .allcommands input`)
            },
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

const selectRoute = async function(id, route) {
    dom.editor.routes.classList.add(`disabled`);
    
    resetSelectedWaypoint();

    const selected_item = dom.editor.routes.querySelector(`.item.selected`);

    if (selected_item) {
        selected_item.classList.remove(`selected`);
    };

    dom.editor.routes.querySelector(`.item[id="${id}"]`).classList.add(`selected`);
    app.editor.selected_route = route ? route : await window.electronAPI.route.get(id);
    dom.editor.waypoints.list.innerHTML = ``;

    if (!app.editor.selected_route) {
        return false;
    };

    for (const waypoint of app.editor.selected_route.pacenote) {
        let item = document.createElement(`div`);
            item.classList.add(`item`);
            item.setAttribute(`distance`, waypoint.distance);
            item.innerHTML = getWaypointHtml(waypoint.distance, waypoint.commands);

        dom.editor.waypoints.list.append(item);
    };

    dom.editor.routes.classList.remove(`disabled`);
};

const selectWaypoint = function(distance) {
    const exist_selected_item = dom.editor.waypoints.list.querySelector(`.item.selected`);

    if (exist_selected_item) {
        exist_selected_item.classList.remove(`selected`);
    };

    const selected_item = dom.editor.waypoints.list.querySelector(`.item[distance="${distance}"]`);

    selected_item.classList.add(`selected`);

    if (app.editor.waypoint_scroll_into_view) {
        selected_item.scrollIntoView({ block: `center`, behavior: `smooth` });
    };

    app.editor.selected_waypoint = app.editor.selected_route.pacenote.find(function(element) {
        return element.distance === parseInt(distance);
    });

    dom.editor.commands.selected.innerHTML = ``;
    dom.editor.waypoint.distance.sel.value = distance;

    for (const command of app.editor.selected_waypoint.commands) {
        addCommandElement(command);
    };
};

const selectVoice = async function(voice_id) {
    dom.settings.voice.disabled = true;
    dom.settings.listen.disabled = true;

    if (app.config.voice !== parseInt(voice_id)) {
        app.config = {
            ...app.config,
            voice: parseInt(voice_id)
        };
    
        await window.electronAPI.config.set(app.config);
    };

    dom.settings.voice.value = voice_id;
    
    app.audio.selected_voice = await window.electronAPI.voice.get(voice_id);

    if (!app.audio.selected_voice) {
        return false;
    };

    app.audio.element.setAttribute(`src`, `data:audio/webm;base64,${app.audio.selected_voice.tracks[`100`]}`);

    dom.settings.voice.disabled = false;
    dom.settings.listen.disabled = false;
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
    dom.editor.waypoints.list.innerHTML = `<div class="plug">Выберите спецучасток</div>`;
};

const resetSelectedWaypoint = function() {
    app.editor.selected_waypoint = null;

    dom.editor.waypoint.distance.sel.value = 0;
    dom.editor.commands.selected.innerHTML = `<div class="plug">Выберите путевую точку</div>`;
};


const getWaypointHtml = function(distance, commands) {
    let text = ``;

    for (const command of commands) {
        text += ` - ${(app.commands.find(function(element) {return element.key === command })).value}`;
    };

    return `${distance}м <span>${text}</span>`;
};

const getWaypointIndex = function(distance) {
    return app.editor.selected_route.pacenote.findIndex(function(element) {
        return element.distance === distance;
    });
};

const getCommandIndex = function(command) {
    return app.editor.selected_waypoint.commands.findIndex(function(element) {
        return element === command;
    }); 
};

const addWaypoint = function(distance) {
    if (!app.editor.selected_route?.pacenote) {
        return false;
    };

    const exist = app.editor.selected_route.pacenote.findIndex(function(element) {
        return element.distance === distance;
    });

    if (exist > -1) {
        return false;
    };

    app.editor.selected_route.pacenote.push({
        distance: distance,
        commands: []
    });

    sortWaypoints();

    let item = document.createElement(`div`);
        item.classList.add(`item`);
        item.setAttribute(`distance`, distance);
        item.innerHTML = `${distance}м`;

    appendWaypointElement(distance, item);
    selectWaypoint(distance);
};

const sortWaypoints = function() {
    return app.editor.selected_route.pacenote.sort(function(a, b) {
        return a.distance - b.distance;
    });  
};

const updateSelectedWaypoint = function(distance) {
    let item = dom.editor.waypoints.list.querySelector(`.item[distance="${app.editor.selected_waypoint.distance}"]`);

    if (distance !== undefined) {
        const exist = app.editor.selected_route.pacenote.findIndex(function(element) {
            return element.distance === distance;
        });

        if (exist > -1) {
            distance += ((app.editor.selected_waypoint.distance - distance) > 0) ? -1 : 1;
            dom.editor.waypoint.distance.sel.value = distance;
        };

        app.editor.selected_waypoint.distance = distance;
        sortWaypoints();
        item.setAttribute(`distance`, distance);
        appendWaypointElement(distance, item);
    };

    item.innerHTML = getWaypointHtml(distance || app.editor.selected_waypoint.distance, app.editor.selected_waypoint.commands);
};

const deleteSelectedWaypoint = function() {
    if (!app.editor.selected_waypoint) {
        return false;
    };

    app.editor.selected_route.pacenote.splice(getWaypointIndex(app.editor.selected_waypoint.distance), 1);
    dom.editor.waypoints.list.querySelector(`.list .item[distance="${app.editor.selected_waypoint.distance}"]`).remove();

    resetSelectedWaypoint();
};

const appendWaypointElement = function(distance, item) {
    const prev_waypoint = app.editor.selected_route.pacenote[getWaypointIndex(distance) - 1];

    if (prev_waypoint) {
        dom.editor.waypoints.list.querySelector(`.item[distance="${prev_waypoint.distance}"]`).after(item);
    } else {
        dom.editor.waypoints.list.prepend(item);
    };
};

const addCommandElement = function(command) {
    let item = document.createElement(`div`);
        item.classList.add(`item`, `sb`, `move`);
        item.setAttribute(`command`, command);
        item.setAttribute(`draggable`, true);
        item.innerHTML = `
            ${app.commands.find(function(element) { return element.key === command }).value}
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


dom.screens.loading.link.addEventListener(`click`, async function() {
    await window.electronAPI.external.open(`https://rallyhub.ru/faq`);
});

dom.screens.major.link.faq.addEventListener(`click`, async function() {
    await window.electronAPI.external.open(`https://rallyhub.ru/faq`);
});

dom.screens.major.link.site.addEventListener(`click`, async function() {
    await window.electronAPI.external.open(`https://rallyhub.ru`);
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

dom.editor.waypoints.list.addEventListener(`click`, function(event) {
    if (!event.target.classList.contains(`item`)) {
        return false;
    };

    selectWaypoint(event.target.getAttribute(`distance`));
});

dom.editor.waypoints.options.scroll.addEventListener(`click`, function(event) {
    app.editor.waypoint_scroll_into_view = !app.editor.waypoint_scroll_into_view;
    event.target.classList.contains(`active`) ? event.target.classList.remove(`active`) : event.target.classList.add(`active`);
});

dom.editor.route.open.addEventListener(`click`, async function(event) {
    const route = await window.electronAPI.route.open();

    if (!route) {
        return false;
    };

    event.target.disabled = true;

    await selectGame(route.game);
    selectLocation(route.location);
    await selectRoute(route.id, route);

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

    setTimeout(function() {
        event.target.disabled = false;
        event.target.innerText = `Отправить стенограмму на сервер`;
    }, 2000);
});

dom.editor.waypoint.create.addEventListener(`click`, function() {
    addWaypoint(parseInt(dom.editor.waypoint.distance.new.value));
});

dom.editor.waypoint.delete.addEventListener(`click`, function() {
    deleteSelectedWaypoint();
});

dom.editor.waypoint.distance.sel.addEventListener(`input`, function() {
    if (this.value.length < 1) {
        return false;
    };

    updateSelectedWaypoint(parseInt(this.value));
});

dom.editor.waypoint.distance.set.addEventListener(`click`, function() {
    dom.editor.waypoint.distance.new.value = Math.round(app.current_stage.completed_distance);
});

dom.editor.commands.selected.addEventListener(`dragstart`, function(event) {
    event.target.classList.add(`selected`);
})

dom.editor.commands.selected.addEventListener(`dragend`, function(event) {
    event.target.classList.remove(`selected`);
});

dom.editor.commands.selected.addEventListener(`dragover`, function(event) {
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

    updateSelectedWaypoint();
});

dom.editor.commands.selected.addEventListener(`click`, function(event) {
    if (!event.target.classList.contains(`delete`)) {
        return false;
    };

    app.editor.selected_waypoint.commands.splice(getCommandIndex(event.target.parentElement.getAttribute(`command`)), 1);
    event.target.parentElement.remove();
    updateSelectedWaypoint();
});

dom.editor.commands.all.list.addEventListener(`click`, function(event) {
    if (!event.target.classList.contains(`item`) || !app.editor.selected_waypoint) {
        return;
    };

    const command = event.target.getAttribute(`command`);

    app.editor.selected_waypoint.commands.push(command);

    addCommandElement(command);
    updateSelectedWaypoint();
});

dom.editor.commands.all.search.addEventListener(`input`, function() {
    const items = dom.editor.commands.all.list.querySelectorAll(`.item`);
    const value = this.value.trim().toLowerCase();

    if (value.length < 1) {
        for (const item of items) {
            item.style.display = `flex`;
        };

        return;
    };

    for (const item of items) {
        item.style.display = item.innerText.toLowerCase().includes(value) ? `flex` : `none`;
    };
});


document.addEventListener(`keydown`, function(event) {
    if (event.code === `Enter`) {
        addWaypoint(parseInt(dom.editor.waypoint.distance.new.value));
    };

    if (event.code === `Space`) {
        dom.editor.waypoint.distance.new.value = Math.round(app.current_stage.completed_distance);
    };

    if (event.code === `Delete`) {
        deleteSelectedWaypoint();
    };
});


window.electronAPI.onMajorUpdate(async function() {
    dom.screens.loading.container.remove();
});

window.electronAPI.onAppReady(async function() {
    dom.screens.major.container.remove();

    app.config = await window.electronAPI.config.get();
    app.routes = await window.electronAPI.routes.get();
    app.voices = await window.electronAPI.voices.get();
    app.commands = await window.electronAPI.commands.get();

    dom.header.version.innerText = `${app.config.version}`;

    if (!app.routes || !app.voices || !app.commands) {
        dom.screens.loading.message.innerText = `Нет соединения с сервером.`;
        return false;
    };

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

        dom.editor.commands.all.list.append(item);
    };

    if (app.config.game) {
        await selectGame(app.config.game);
    };

    await selectRate(app.config.rate);
    await selectVoice(app.config.voice);
    await selectVolume(app.config.volume);
    
    dom.screens.loading.container.remove();

    setInterval(function() {
        if (app.current_stage.playlist.length < 1 || (app.audio.element.currentTime > 0 && !app.audio.element.ended)) {
            return false;
        };

        if (app.audio.selected_voice.tracks[app.current_stage.playlist[0]]) {
            app.audio.element.setAttribute(`src`, `data:audio/webm;base64,${app.audio.selected_voice.tracks[app.current_stage.playlist[0]]}`);
            app.audio.element.load();

            app.audio.element.volume = app.config.volume / 100;
            app.audio.element.playbackRate = app.config.rate / 100;

            if (app.current_stage.playlist.length > 5 && app.config.rate < 110) {
                app.audio.element.playbackRate = 1.1;
            };

            app.audio.element.play();
        };

        app.current_stage.playlist.splice(0, 1);
    }, 50);

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
                completed_distance: telemetry.stage.distance,
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
    
        const pacenote = (app.editor.selected_route && app.editor.selected_route.id === telemetry.route.id) ? app.editor.selected_route.pacenote : telemetry.route.pacenote;
    
        if (!pacenote) {
            return false;
        };
    
        if (!app.current_stage.briefing) {
            if (app.current_stage.completed_distance <= 0) {
                const briefpoint = pacenote.find(function(element) {
                    return element.distance === 0;
                });
    
                if (briefpoint) {
                    app.current_stage.playlist = app.current_stage.playlist.concat(briefpoint.commands);
                };
            };
    
            app.current_stage.briefing = true;
        };
    
        const waypoints = pacenote.filter(function(waypoint) {
            return waypoint.distance !== 0 && !app.current_stage.completed_waypoints.includes(waypoint.distance) && waypoint.distance > app.current_stage.completed_distance && waypoint.distance < (app.current_stage.completed_distance + 2);
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
});