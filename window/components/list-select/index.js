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
            for (const item of host.querySelectorAll(`.item`)) {
                item.removeAttribute(`selected`);
            };

            this.setAttribute(`selected`, ``);

            host.value = this.getAttribute(`value`);
            host.dispatchEvent(new Event(`change`, { bubbles: true }));
        });

        host.appendChild(item);
    };

    host.removeItems = function() {
        host.innerHTML = placeholderAttributeValue ? `<div class="placeholder">${placeholderAttributeValue}</div>` : ``;
        host.value = null;
    };

    if (placeholderAttributeValue) {
        host.innerHTML = `<div class="placeholder">${placeholderAttributeValue}</div>`;
    };
};