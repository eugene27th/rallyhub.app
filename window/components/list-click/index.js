export function init(host) {
    if (host.hasAttribute(`placeholder`)) {
        host.innerHTML = `<div class="placeholder">${host.getAttribute(`placeholder`)}</div>`;
    };

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
        console.log(string);  
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