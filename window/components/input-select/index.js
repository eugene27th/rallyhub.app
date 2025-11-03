const addOption = function(host, value, name, selected = false, display = false) {
    const displayBlock = host.querySelector(`.display`);
    const displayName = displayBlock.querySelector(`.name`);

    if (display) {
        displayName.innerText = name;
        return;
    };

    const optionsContainer = host.querySelector(`.options`);

    const option = document.createElement(`div`);

    option.classList.add(`option`);
    option.setAttribute(`value`, value);
    option.setAttribute(`title`, name);
    option.innerText = name;

    if (selected) {
        option.setAttribute(`selected`, ``);
        displayName.innerText = name;
        host.value = value;
    };

    option.addEventListener(`click`, function() {
        host.removeAttribute(`opened`);
        displayName.innerText = this.innerText;

        host.value = this.getAttribute(`value`);
        host.dispatchEvent(new Event(`change`, { bubbles: true }));
    });

    optionsContainer.appendChild(option);
};


export function init(host) {
    host.addOption = function(value, name, selected, display) {
        return addOption(host, value, name, selected, display);
    };

    host.removeOptions = function() {
        host.querySelector(`.options`).innerHTML = ``;
        host.value = null;
    };

    host.querySelector(`.display`).addEventListener(`click`, function() {
        if (host.getAttribute(`opened`) !== null) {
            host.removeAttribute(`opened`);
        } else {
            host.setAttribute(`opened`, ``);
        };
    });

    // todo: не нравится дублирование этих листенеров, потом надо подумать
    document.addEventListener(`click`, function(event) {
        if (!host.contains(event.target)) {
            host.removeAttribute(`opened`);
        };
    });
};