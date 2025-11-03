const addItem = function(host, value, content) {
    const placeholder = host.querySelector(`.placeholder`);

    if (placeholder) {
        placeholder.remove();
    };

    const item = document.createElement(`div`);

    item.classList.add(`item`);
    item.setAttribute(`value`, value);
    item.setAttribute(`title`, content);
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


export function init(host) {
    if (host.hasAttribute(`placeholder`)) {
        host.innerHTML = `<div class="placeholder">${host.getAttribute(`placeholder`)}</div>`;
    };

    host.addItem = function(value, content) {
        return addItem(host, value, content);
    };

    host.removeItems = function() {
        if (host.hasAttribute(`placeholder`)) {
            host.innerHTML = `<div class="placeholder">${host.getAttribute(`placeholder`)}</div>`;
        } else {
            host.innerHTML = ``;
        };

        host.value = null;
    };
};