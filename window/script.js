const elements = {
    header: {
        status: document.querySelector(`.header .title .status`),
        minimize: document.querySelector(`button[action=window-minimize]`),
        close: document.querySelector(`button[action=window-close]`)
    },
    voice: {
        content: document.querySelector(`.settings .setting.voice .content`),
        name: document.querySelector(`.settings .setting.voice .content .name`),
        author: document.querySelector(`.settings .setting.voice .content .author`),
        language: document.querySelector(`.settings .setting.voice .content .language`),
        gender: document.querySelector(`.settings .setting.voice .content .gender`),
        listen: document.querySelector(`.settings .setting.voice .content button[action=voice-listen]`)
    },
    voices: {
        search: document.getElementById(`search`),
        author: document.getElementById(`author`),
        language: document.getElementById(`language`),
        gender: document.getElementById(`gender`),
        load: document.querySelector(`button[action=voices-load]`),
        list: document.querySelector(`.voices .list`)
    },
    settings: {
        game: document.getElementById(`game`),
        rate: document.getElementById(`rate`),
        volume: document.getElementById(`volume`)
    },
    preloader: {
        container: document.querySelector(`.preloader`),
        external: {
            faq: document.querySelector(`.external.faq`)
        }
    }
};

let config = await window.electronAPI.config.get();

let audio = {
    voice: {},
    element: new Audio(),
    playlist: [],
    points: [],
    preloaded: []
};

let route = {
    id: 0,
    briefing: false
};

let vehicle = {
    tyre_state: {
        fl: 0,
        fr: 0,
        rl: 0,
        rr: 0
    }
};


const editConfig = async function(data) {
    config = {
        ...config,
        ...data
    };

    await window.electronAPI.config.set(config); 
};


const loadVoices = async function() {
    elements.voices.list.innerHTML = ``;

    for (let i = 0; i < 3; i++) {
        let row = document.createElement(`div`);
            row.classList.add(`row`, `loading`);
    
        elements.voices.list.append(row);
    };

    let options = {};

    if (elements.voices.search.value && elements.voices.search.value.length > 1) {
        options.search = elements.voices.search.value;
    };

    if (elements.voices.author.value && elements.voices.author.value.length > 1 && elements.voices.author.value !== `any`) {
        options.author = elements.voices.author.value;
    };

    if (elements.voices.language.value && elements.voices.language.value.length > 1 && elements.voices.language.value !== `any`) {
        options.language = elements.voices.language.value;
    };

    if (elements.voices.gender.value && elements.voices.gender.value.length > 1 && elements.voices.gender.value !== `any`) {
        options.gender = elements.voices.gender.value;
    };
    
    const voices = await window.electronAPI.voices.get(Object.keys(options).length > 0 ? options : null);

    elements.voices.list.innerHTML = ``;

    for (const voice of voices) {
        let row = document.createElement(`div`);
            row.classList.add(`row`);
            row.innerHTML = `
                <button class="icon" action="voice-select" voice="${voice.id}">
                    <img src="./assets/images/download.svg">
                </button>
                <button class="icon" action="voice-listen" voice="${voice.id}">
                    <img src="./assets/images/listen.svg">
                </button>
                <div class="name" title="${voice.name}">${voice.name}</div>
                <div class="language">${voice.language.toUpperCase()}</div>
                <div class="gender">${voice.gender.toUpperCase()}</div>
                <div class="author" title="${voice.author}">${voice.author}</div>
                <div class="updated">${(new Date(voice.updated)).toLocaleString(`ru-RU`)}</div>
            `;
    
        elements.voices.list.append(row);
    };
};

const loadVoice = async function(voice_id) {
    elements.voice.content.classList.add(`loading`);

    elements.voice.name.innerText = `Downloading...`;
    elements.voice.author.innerText = ``;
    elements.voice.language.innerText = ``;
    elements.voice.gender.innerText = ``;

    elements.voice.listen.disabled = true;

    audio.voice = await window.electronAPI.voice.get(voice_id);

    if (!audio.voice) {
        elements.voice.name.innerText = `Not selected`;
        elements.voice.content.classList.remove(`loading`);
        
        return false;
    };

    if (!audio.preloaded.includes(audio.voice.id)) {
        audio.preloaded.push(audio.voice.id);
    };

    audio.element.setAttribute(`src`, `data:audio/webm;base64,${audio.voice.tracks[`100`]}`);

    elements.voice.name.innerText = audio.voice.name;
    elements.voice.author.innerText = `by ${audio.voice.author}`;
    elements.voice.language.innerText = audio.voice.language.toUpperCase();
    elements.voice.gender.innerText = audio.voice.gender.toUpperCase();

    elements.voice.content.classList.remove(`loading`);
    elements.voice.listen.disabled = false;
};


elements.settings.game.addEventListener(`change`, async function() {
    await editConfig({
        game: this.value
    });
});

elements.settings.volume.addEventListener(`input`, async function() {
    this.nextElementSibling.innerText = `${this.value}%`;

    await editConfig({
        volume: this.value
    });
});

elements.settings.rate.addEventListener(`input`, async function() {
    this.nextElementSibling.innerText = `${this.value}%`;

    await editConfig({
        rate: this.value
    });
});


elements.voice.listen.addEventListener(`click`, async function() {
    const names = Object.keys(audio.voice.tracks);

    audio.element.setAttribute(`src`, `data:audio/webm;base64,${audio.voice.tracks[names[Math.floor(Math.random() * names.length)]]}`);
    audio.element.load();

    audio.element.volume = parseInt(config.volume) / 100;
    
    if (config.rate) {
        audio.element.playbackRate = parseInt(config.rate) / 100;
    };

    await audio.element.play();
});

elements.voices.list.addEventListener(`click`, async function(event) {
    if (event.target.tagName !== `BUTTON`) {
        return false;
    };

    const action = event.target.getAttribute(`action`);
    const voice_id = event.target.getAttribute(`voice`);

    if (!action || !voice_id) {
        return false;
    };

    if (config.voice !== voice_id && !audio.preloaded.includes(voice_id)) {
        audio.preloaded.push(voice_id);

        event.target.classList.add(`loading`);
        event.target.parentElement.classList.add(`loading`);

        for (const button of elements.voices.list.querySelectorAll(`button[action]`)) {
            button.disabled = true;
        };
    };

    if (action === `voice-listen`) {
        const voice = await window.electronAPI.voice.get(voice_id);
    
        if (!voice) {
            return false;
        };
    
        const names = Object.keys(voice.tracks);
    
        audio.element.setAttribute(`src`, `data:audio/webm;base64,${voice.tracks[names[Math.floor(Math.random() * names.length)]]}`);
        audio.element.load();
    
        audio.element.volume = parseInt(config.volume) / 100;

        if (config.rate) {
            audio.element.playbackRate = parseInt(config.rate) / 100;
        };

        audio.element.play();
    };

    if (action === `voice-select`) {
        await editConfig({
            voice: voice_id
        });

        await loadVoice(voice_id);
    };

    event.target.classList.remove(`loading`);
    event.target.parentElement.classList.remove(`loading`);

    for (const button of elements.voices.list.querySelectorAll(`button[action]`)) {
        button.disabled = false;
    };
});

elements.voices.load.addEventListener(`click`, async function() {
    await loadVoices();
});


elements.header.minimize.addEventListener(`click`, async function() {
    await window.electronAPI.window.minimize();
});

elements.header.close.addEventListener(`click`, async function() {
    await window.electronAPI.window.close();
});


elements.preloader.external.faq.addEventListener(`click`, async function() {
    await window.electronAPI.external.open(`https://rallyhub.ru/ru/faq`);
});


window.electronAPI.onUpdateTelemetry(function(telemetry) {
    const header = `${telemetry.route.location} - ${telemetry.route.name} - ${Math.round(telemetry.stage.distance)}m`;

    if (elements.header.status.innerText !== header) {
        elements.header.status.innerText = header;
    };

    const distance = telemetry.stage.distance;

    if (route.id !== telemetry.route.id || (distance <= 0 && audio.points.length > 1)) {
        audio.points = [];
        audio.playlist = [];

        route.id = telemetry.route.id;
        route.briefing = false;

        vehicle.tyre_state = {
            fl: 0,
            fr: 0,
            rl: 0,
            rr: 0
        };
    };

    if (!telemetry.route.pacenote) {
        return false;
    };

    if (!route.briefing) {
        if (distance <= 0) {
            const briefing_point = telemetry.route.pacenote.find(function(point) {
                return point.distance === -1;
            });
    
            if (briefing_point) {
                audio.points.push(briefing_point.distance);
                audio.playlist = audio.playlist.concat(briefing_point.tracks);
            };
        };

        route.briefing = true;
    };

    const points = telemetry.route.pacenote.filter(function(point) {
        return !audio.points.includes(point.distance) && point.distance > distance && point.distance < (distance + 2);
    });

    if (points.length > 0) {
        audio.points.push(points[0].distance);
        audio.playlist = audio.playlist.concat(points[0].tracks);
    };

    if (telemetry.vehicle?.tyre_state) {
        for (let [tyre, state] of Object.entries(telemetry.vehicle.tyre_state)) {
            if (vehicle.tyre_state[tyre] !== state) {
                if (state === 1 || (state === 2 && vehicle.tyre_state[tyre] !== 1)) {
                    audio.playlist.push(`puncture_${tyre}`);
                };
    
                vehicle.tyre_state[tyre] = state;
            };
        };
    };
});

window.electronAPI.onAppReady(async function() {
    elements.preloader.container.remove();

    if (config.voice) {
        await loadVoice(config.voice);
    };

    const voice_filters = await window.electronAPI.voices.filters();

    for (const author of voice_filters.authors) {
        let option = document.createElement(`option`);
            option.setAttribute(`value`, author);
            option.innerText = author;
    
        elements.voices.author.append(option);
    };

    for (const language of voice_filters.languages) {
        let option = document.createElement(`option`);
            option.setAttribute(`value`, language);
            option.innerText = language.toUpperCase();
    
        elements.voices.language.append(option);
    };

    await loadVoices();

    setInterval(function() {
        if (audio.playlist.length < 1 || (audio.element.currentTime > 0 && !audio.element.ended)) {
            return false;
        };
    
        if (audio.voice.tracks?.[audio.playlist[0]]) {
            audio.element.setAttribute(`src`, `data:audio/webm;base64,${audio.voice.tracks[audio.playlist[0]]}`);
            audio.element.load();
    
            audio.element.volume = parseInt(config.volume) / 100;

            if (config.rate) {
                audio.element.playbackRate = parseInt(config.rate) / 100;
            };

            audio.element.play();
        };
    
        audio.playlist.splice(0, 1);
    }, 50);
});


if (config.game) {
    elements.settings.game.value = config.game;
};

if (config.volume) {
    elements.settings.volume.value = config.volume;
    elements.settings.volume.nextElementSibling.innerText = `${config.volume}%`;
};

if (config.rate) {
    elements.settings.rate.value = config.rate;
    elements.settings.rate.nextElementSibling.innerText = `${config.rate}%`;
};