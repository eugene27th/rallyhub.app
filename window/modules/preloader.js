const preloaderElement = document.querySelector(`.preloader`);
const preloaderImageElement = document.querySelector(`.preloader .center svg`);
const preloaderMessageElement = document.querySelector(`.preloader .center .message`);

const errorMessages = {
    majorUpdate: `Вышло крупное обновление, которое нельзя обновить автоматически.<br>Удалите текущее приложение и загрузите новое с сайта.`,
    networkError: `Не удалось подключиться к серверу.<br>Проверьте интернет-соединение и попробуйте снова.`,
    fileSystemError: `Не удалось получить доступ к файлам.<br>Проверьте права доступа или место на диске.`,
    updateError: `Не удалось завершить обновление.<br>Попробуйте выполнить обновление позже.`,
    startupError: `Произошла ошибка при запуске.<br>Попробуйте перезапустить приложение.`,
    unknownError: `Произошла неизвестная ошибка при запуске.<br>Попробуйте перезапустить приложение.`
};


export const setPreloaderError = function(errorCode) {
    preloaderImageElement.classList.add(`broken`);
    preloaderImageElement.style.animationPlayState = `paused`;
    preloaderMessageElement.innerHTML = errorMessages[errorCode] || errorMessages.unknownError;
};

export const removePreloader = function() {
    preloaderElement.style.opacity = `0`;

    setTimeout(function() {
        preloaderElement.remove();
    }, 250);
};