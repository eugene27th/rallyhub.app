export function init(host) {
    const displayNameElement = host.querySelector(`.display .name`);
    const displayAttributeValue = host.hasAttribute(`display`) ? host.getAttribute(`display`) : null;
    const optionsContainerElement = host.querySelector(`.options`);

    host.addOption = function(value, name) {
        const optionElement = document.createElement(`div`);
        optionElement.classList.add(`option`);
        optionElement.setAttribute(`value`, value);
        optionElement.innerText = name;

        optionElement.addEventListener(`click`, function() {
            displayNameElement.innerText = this.innerText;
            host.value = this.getAttribute(`value`);

            host.classList.remove(`opened`);

            host.dispatchEvent(new Event(`change`, {
                bubbles: true
            }));
        });

        optionsContainerElement.appendChild(optionElement);
    };

    host.selectOption = function(value) {
        const option = optionsContainerElement.querySelector(`.option[value="${value}"]`);

        if (!option) {
            return;
        };

        displayNameElement.innerText = option.innerText;
        host.value = value;
    };

    host.removeOptions = function() {
        displayNameElement.innerText = displayAttributeValue ? displayAttributeValue : ``;

        optionsContainerElement.innerHTML = ``;
        host.value = null;
    };

    host.querySelector(`.display`).addEventListener(`click`, function() {
        if (host.classList.contains(`opened`)) {
            host.classList.remove(`opened`);
        } else {
            host.classList.add(`opened`);
        };
    });

    // todo: не нравится дублирование этих листенеров, потом надо подумать
    document.addEventListener(`click`, function(event) {
        if (!host.contains(event.target)) {
            host.classList.remove(`opened`);
        };
    });

    if (displayAttributeValue) {
        displayNameElement.innerText = displayAttributeValue;
    };
};