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
    }
};

const dom = {
    header: {
        version: document.querySelector(`header .draggable .logo .version`),
        status: document.querySelector(`header .draggable .status`),
        menu: {
            minimize: document.querySelector(`header .menu button[action=minimizeWindow]`),
            close: document.querySelector(`header .menu button[action=closeWindow]`)
        }
    }
};


dom.header.menu.close.addEventListener(`click`, async function() {
    await window.electronAPI.closeWindow();
});


window.electronAPI.onStartupStatus(async function(code) {
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

    // запрашиваем базовую информацию в одном запросе к ноде
    app.data = await window.electronAPI.getAppData();

    console.log(app.data);

    // устанавливаем версию приложения в хедере

    // выбираем игру в селекторе
    // устанавливаем скорость воспроизведения в инпуте
    // устанавливаем громкость в инпуте

    // for (const voice of app.data.voices) {
        // заполняем селектор озвучки
        // выбираем озвучку в селекторе
    // };

    // for (const command of app.data.commands) {
        // заполняем список всех команд
    // };

    // закрываем/удаляем загрузочный экран

    // аудио обработчик
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

        const statusText = `${telemetry.route.location} - ${telemetry.route.name} - ${Math.round(telemetry.stage.distance)}м`;

        if (dom.header.status.innerText !== statusText) {
            dom.header.status.innerText = statusText;
        };

        if (telemetry.commands.length > 0) {
            console.log(telemetry.stage.distance, JSON.stringify(telemetry.commands));
            app.audio.playlist = app.audio.playlist.concat(telemetry.commands);
        };
    });
});