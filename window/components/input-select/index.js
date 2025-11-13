export function init(host) {
    const displayName = host.querySelector(`.display .name`);
    const displayAttributeValue = host.hasAttribute(`display`) ? host.getAttribute(`display`) : null;

    const optionsContainer = host.querySelector(`.options`);

    host.addOption = function(value, name) {
        const option = document.createElement(`div`);
        option.classList.add(`option`);
        option.setAttribute(`value`, value);
        option.innerText = name;

        option.addEventListener(`click`, function() {
            displayName.innerText = this.innerText;
            host.value = this.getAttribute(`value`);

            host.removeAttribute(`opened`);

            host.dispatchEvent(new Event(`change`, {
                bubbles: true
            }));
        });

        optionsContainer.appendChild(option);
    };

    host.selectOption = function(value) {
        const option = optionsContainer.querySelector(`.option[value="${value}"]`);

        if (!option) {
            return;
        };

        displayName.innerText = option.innerText;
        host.value = value;
    };

    host.removeOptions = function() {
        if (displayAttributeValue) {
            displayName.innerText = displayAttributeValue;
        };

        optionsContainer.innerHTML = ``;
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

    if (displayAttributeValue) {
        displayName.innerText = displayAttributeValue;
    };
};