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
            host.value = this.getAttribute(`value`);

            host.dispatchEvent(new Event(`change`, {
                bubbles: false
            }));
        });

        host.appendChild(itemElement);
    };

    host.searchItems = function(string) {
        const searchValue = string.trim().toLowerCase();
        const listItemElements = host.querySelectorAll(`.item`);

        if (searchValue.length < 1) {
            for (const listItemElement of listItemElements) {
                listItemElement.style.display = `flex`;
            };

            return;
        };

        for (const listItemElement of listItemElements) {
            listItemElement.style.display = listItemElement.innerText.toLowerCase().includes(searchValue) ? `flex` : `none`;
        };
    };

    if (placeholderAttributeValue) {
        host.innerHTML = `<div class="placeholder">${placeholderAttributeValue}</div>`;
    };
};