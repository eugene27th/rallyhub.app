const voiceInputComponent = document.getElementById(`voiceInputComponent`);
const voiceListenButton = document.getElementById(`voiceListenButton`);
const playbackRateInputComponent = document.getElementById(`playbackRateInputComponent`);
const playbackVolumeInputComponent = document.getElementById(`playbackVolumeInputComponent`);

const audioElement = new Audio();

let audioWorkerVoice = {};
let audioWorkerPlaying = false;
let audioWorkerPlaylist = [];


const setVoice = async function(voiceId) {
    if (globalThis.app.data.config.voice !== voiceId) {
        globalThis.app.data.config.voice = voiceId;
        await window.electronAPI.setConfig(app.data.config);
    };

    if (parseInt(voiceInputComponent.value) !== voiceId) {
        voiceInputComponent.selectOption(voiceId);
    };

    audioWorkerVoice = globalThis.app.data.voices.find(function(i) {
        return i.id === voiceId;
    });
};

const setPlaybackRate = async function(value) {
    if (globalThis.app.data.config.rate !== value) {
        globalThis.app.data.config.rate = value;
        await window.electronAPI.setConfig(app.data.config);
    };
};

const setPlaybackVolume = async function(value) {
    if (globalThis.app.data.config.volume !== value) {
        globalThis.app.data.config.volume = value;
        await window.electronAPI.setConfig(app.data.config);
    };
};


const playCommand = async function(command) {
    audioElement.src = `data:audio/webm;base64,${audioWorkerVoice.commands[command]}`;
    audioElement.load();

    audioElement.volume = globalThis.app.data.config.volume / 100;
    audioElement.playbackRate = globalThis.app.data.config.rate / 100;

    if (audioWorkerPlaylist.length > 5 && globalThis.app.data.config.rate < 110) {
        audioElement.playbackRate = 1.1;
    };

    audioWorkerPlaying = true;

    try {
        await audioElement.play();
    } catch (error) {
        audioWorkerPlaying = false;
        return;
    };

    await new Promise(function(resolve) {
        return audioElement.onended = function() {
            return resolve();
        };
    });

    audioWorkerPlaying = false;
};

const playRandomCommand = async function() {
    const allCommands = Object.keys(audioWorkerVoice.commands);
    const randomCommand = allCommands[Math.floor(Math.random() * allCommands.length)];

    audioElement.src = `data:audio/webm;base64,${audioWorkerVoice.commands[randomCommand]}`;
    audioElement.load();

    audioElement.volume = globalThis.app.data.config.volume / 100;
    audioElement.playbackRate = globalThis.app.data.config.rate / 100;

    try {
        await audioElement.play();
    } catch (error) {
        return;
    };
};

const audioWorker = async function() {
    while (true) {
        if (audioWorkerPlaylist.length === 0) {
            await new Promise(function(resolve) {
                return setTimeout(resolve, 100);
            });

            continue;
        };

        if (!audioWorkerPlaying) {
            await playCommand(audioWorkerPlaylist.shift());
        };
    };
};


export const addCommandsToPlaylist = function(commands) {
    audioWorkerPlaylist = audioWorkerPlaylist.concat(commands);
};


export const initAudioModule = async function() {
    for (const voice of globalThis.app.data.voices) {
        voiceInputComponent.addOption(voice.id, voice.name);
    };

    setVoice(globalThis.app.data.config.voice);

    playbackRateInputComponent.setValue(globalThis.app.data.config.rate);
    playbackVolumeInputComponent.setValue(globalThis.app.data.config.volume);

    voiceInputComponent.addEventListener(`change`, async function() {
        await setVoice(parseInt(this.value));
    });

    playbackRateInputComponent.addEventListener(`input`, async function() {
        await setPlaybackRate(parseInt(this.value));
    });

    playbackVolumeInputComponent.addEventListener(`input`, async function() {
        await setPlaybackVolume(parseInt(this.value));
    });

    voiceListenButton.addEventListener(`click`, async function() {
        await playRandomCommand();
    });

    audioWorker();
};