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
        const items = host.querySelectorAll(`.item`);
        const value = string.trim().toLowerCase();

        if (value.length < 1) {
            for (const item of items) {
                item.style.display = `flex`;
            };

            return;
        };

        for (const item of items) {
            item.style.display = item.innerText.toLowerCase().includes(value) ? `flex` : `none`;
        };
    };

    if (placeholderAttributeValue) {
        host.innerHTML = `<div class="placeholder">${placeholderAttributeValue}</div>`;
    };
};