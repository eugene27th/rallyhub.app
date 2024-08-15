const elements = {
    header: {
        status: document.querySelector(`.header .title .status`)
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
        list: document.querySelector(`.voices .list`)
    },
    settings: {
        game: document.getElementById(`game`),
        volume: document.getElementById(`volume`)
    }
};

let config = await window.electronAPI.config.get();
let voices_filters = await window.electronAPI.voices.filters();

let audio = {
    tracks: {},
    playlist: [],
    points: []
};


const editConfig = async function(data) {
    config = {
        ...config,
        ...data
    };

    await window.electronAPI.config.set(config); 
};

const loadVoice = async function(voice_id) {
    elements.voice.content.classList.add(`loading`);

    elements.voice.name.innerText = `Downloading...`;
    elements.voice.author.innerText = ``;
    elements.voice.language.innerText = ``;
    elements.voice.gender.innerText = ``;

    elements.voice.listen.disabled = true;

    for (const button of elements.voices.list.querySelectorAll(`button[action]`)) {
        button.disabled = true;
    };

    let voice = await window.electronAPI.voice.get(voice_id);

    if (!voice) {
        return false;
    };

    if (voice_id !== config.voice) {
        await editConfig({
            voice: voice_id
        });
    };

    elements.voice.name.innerText = voice.name;
    elements.voice.author.innerText = `by ${voice.author}`;
    elements.voice.language.innerText = voice.language.toUpperCase();
    elements.voice.gender.innerText = voice.gender.toUpperCase();

    audio.tracks = {};

    for (let [key, value] of Object.entries(voice.audio)) {
        audio.tracks[key] = new Audio(`data:audio/wav;base64,${value}`);

        audio.tracks[key].addEventListener(`ended`, function() {
            if (audio.playlist.length < 1) {
                return false;
            };

            audio.playlist.splice(0, 1);

            if (audio.playlist.length > 0) {
                audio.tracks[audio.playlist[0]].volume = parseInt(config.volume) / 100;
                audio.tracks[audio.playlist[0]].play();
            };
        });
    };

    elements.voice.content.classList.remove(`loading`);
    elements.voice.listen.disabled = false;

    for (const button of elements.voices.list.querySelectorAll(`button[action]`)) {
        button.disabled = false;
    };
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
    
    let voices = await window.electronAPI.voices.get(Object.keys(options).length > 0 ? options : null);

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

const listenVoice = async function(voice_id) {
    if (voice_id === config.voice) {
        let tracks = Object.keys(audio.tracks);

        let track = audio.tracks[tracks[Math.floor(Math.random() * tracks.length)]];
            track.volume = parseInt(config.volume) / 100;
            track.play();
    } else {
        for (const button of elements.voices.list.querySelectorAll(`button[action]`)) {
            button.disabled = true;
        };

        let voice = await window.electronAPI.voice.get(voice_id);

        if (!voice) {
            return false;
        };

        let tracks = Object.keys(voice.audio);

        let track = new Audio(`data:audio/wav;base64,${voice.audio[tracks[Math.floor(Math.random() * tracks.length)]]}`);
            track.volume = parseInt(config.volume) / 100;
            track.play();

        for (const button of elements.voices.list.querySelectorAll(`button[action]`)) {
            button.disabled = false;
        };
    };
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


elements.voice.listen.addEventListener(`click`, async function() {
    await listenVoice(config.voice);
});

elements.voices.list.addEventListener(`click`, async function(event) {
    if (event.target.tagName !== `BUTTON`) {
        return false;
    };

    let action = event.target.getAttribute(`action`);
    let voice_id = event.target.getAttribute(`voice`);

    if (!action || !voice_id) {
        return false;
    };

    event.target.classList.add(`loading`);
    event.target.parentElement.classList.add(`loading`);

    if (action === `voice-listen`) {
        await listenVoice(voice_id);
    };

    if (action === `voice-select`) {
        await loadVoice(voice_id);
    };

    event.target.classList.remove(`loading`);
    event.target.parentElement.classList.remove(`loading`);
});


document.querySelector(`button[action=voices-load]`).addEventListener(`click`, async function() {
    await loadVoices();
});

document.querySelector(`button[action=window-close]`).addEventListener(`click`, async function() {
    await window.electronAPI.window.close();
});

document.querySelector(`button[action=window-minimize]`).addEventListener(`click`, async function() {
    await window.electronAPI.window.minimize();
});


window.electronAPI.onUpdateTelemetry(function(telemetry) {
    let header = `${telemetry.route.location} - ${telemetry.route.name}`;

    if (elements.header.status.innerText !== header) {
        elements.header.status.innerText = header;
    };

    let distance = telemetry.stage.distance;

    let points = telemetry.route.pacenote.filter(function(point) {
        return !audio.points.includes(point.distance) && (point.distance < (distance + 300) && point.distance > distance);
    });

    if (points.length < 1) {
        return false;
    };

    let point = points[0];

    if (audio.playlist.length > 0 && (point.distance - distance) > 10) {
        return false;
    };

    audio.playlist = [];
    audio.points.push(point.distance);

    if ((point.distance - distance) >= 100) {
        let round = Math.round((point.distance - distance) / 10) * 10;

        if (round > 150) {
            round = Math.round(round / 50) * 50;
        };

        audio.playlist.push(round);
    };

    audio.playlist = audio.playlist.concat(point.tracks);

    audio.tracks[audio.playlist[0]].volume = parseInt(config.volume) / 100;
    audio.tracks[audio.playlist[0]].play();
});


if (config.game) {
    elements.settings.game.value = config.game;
};

if (config.volume) {
    elements.settings.volume.value = config.volume;
    elements.settings.volume.nextElementSibling.innerText = `${config.volume}%`;
};

if (config.voice) {
    await loadVoice(config.voice);
};


for (const author of voices_filters.authors) {
    let option = document.createElement(`option`);
        option.setAttribute(`value`, author);
        option.innerText = author;

    elements.voices.author.append(option);
};

for (const language of voices_filters.languages) {
    let option = document.createElement(`option`);
        option.setAttribute(`value`, language);
        option.innerText = language.toUpperCase();

    elements.voices.language.append(option);
};


await loadVoices();