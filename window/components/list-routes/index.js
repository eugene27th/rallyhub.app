export function init(host) {
    const placeholderAttributeValue = host.hasAttribute(`placeholder`) ? host.getAttribute(`placeholder`) : null;

    host.addItem = function(value, name) {
        const placeholderElement = host.querySelector(`.placeholder`);

        if (placeholderElement) {
            placeholderElement.remove();
        };

        const itemElement = document.createElement(`div`);
        itemElement.classList.add(`item`);
        itemElement.setAttribute(`value`, value);
        itemElement.innerText = name;

        itemElement.addEventListener(`click`, function() {
            for (const listItem of host.querySelectorAll(`.item`)) {
                listItem.classList.remove(`selected`);
            };

            this.classList.add(`selected`);
            host.value = this.getAttribute(`value`);

            host.dispatchEvent(new Event(`change`, {
                bubbles: true
            }));
        });

        host.appendChild(itemElement);
    };

    host.selectItem = function(value) {
        const itemElement = host.querySelector(`.item[value="${value}"]`);

        if (!itemElement) {
            return;
        };

        for (const listItem of host.querySelectorAll(`.item`)) {
            listItem.classList.remove(`selected`);
        };

        itemElement.classList.add(`selected`);
        host.value = itemElement.getAttribute(`value`);

        itemElement.scrollIntoView({
            block: `center`,
            behavior: `smooth`
        });
    };

    host.removeItems = function() {
        host.innerHTML = placeholderAttributeValue ? `<div class="placeholder">${placeholderAttributeValue}</div>` : ``;
        host.value = null;
    };

    if (placeholderAttributeValue) {
        host.innerHTML = `<div class="placeholder">${placeholderAttributeValue}</div>`;
    };
};