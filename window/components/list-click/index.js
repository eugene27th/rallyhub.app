export function init(host) {
    const placeholderAttributeValue = host.hasAttribute(`placeholder`) ? host.getAttribute(`placeholder`) : null;

    host.addItem = function(value, content) {
        const placeholder = host.querySelector(`.placeholder`);

        if (placeholder) {
            placeholder.remove();
        };

        const item = document.createElement(`div`);

        item.classList.add(`item`);
        item.setAttribute(`value`, value);
        item.innerHTML = content;

        item.addEventListener(`click`, function() {
            host.value = this.getAttribute(`value`);
            host.dispatchEvent(new Event(`change`, { bubbles: false }));
        });

        host.appendChild(item);
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

    host.removeItems = function() {
        host.innerHTML = placeholderAttributeValue ? `<div class="placeholder">${placeholderAttributeValue}</div>` : ``;
        host.value = null;
    };

    if (placeholderAttributeValue) {
        host.innerHTML = `<div class="placeholder">${placeholderAttributeValue}</div>`;
    };
};