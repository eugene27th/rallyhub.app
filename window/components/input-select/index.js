export function init(host) {
    host.addOption = function(value, name, selected = false) {
        const displayName = host.querySelector(`.display .name`);

        const option = document.createElement(`div`);

        option.classList.add(`option`);
        option.setAttribute(`value`, value);
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

        host.querySelector(`.options`).appendChild(option);
    };

    host.setDisplayName = function(name) {
        host.querySelector(`.display .name`).innerText = name;
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