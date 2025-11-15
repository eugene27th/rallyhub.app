export function init(host) {
    const placeholderAttributeValue = host.hasAttribute(`placeholder`) ? host.getAttribute(`placeholder`) : null;

    host.draggingElement = null;
    host.draggingElementShiftY = 0;
    host.slotElement = null;

    const onMouseMove = function(event) {
        if (!host.draggingElement) {
            return;
        };

        event.preventDefault();

        host.draggingElement.style.top = `${event.clientY - host.getBoundingClientRect().top - host.draggingElementShiftY}px`;

        for (const listItemElement of host.querySelectorAll(`.item:not(.drag)`)) {
            const elementRect = listItemElement.getBoundingClientRect();
            const elementMiddle = elementRect.top + elementRect.height / 2;

            if (event.clientY < elementMiddle) {
                host.insertBefore(host.slotElement, listItemElement);
                return;
            };
        };

        host.appendChild(host.slotElement);
    };

    const onMouseUp = function() {
        if (!host.draggingElement) {
            return;
        };

        host.insertBefore(host.draggingElement, host.slotElement);

        host.draggingElement.classList.remove(`drag`);
        host.draggingElement.style = ``;
        host.draggingElement = null;

        host.slotElement.remove();
        host.slotElement = null;

        document.removeEventListener(`mousemove`, onMouseMove);
        document.removeEventListener(`mouseup`, onMouseUp);

        updateValue();
    };

    const updateValue = function() {
        host.value = [];

        for (const listItemElement of host.querySelectorAll(`.item`)) {
            host.value.push(listItemElement.getAttribute(`value`));
        };

        host.dispatchEvent(new Event(`change`, {
            bubbles: false
        }));
    };

    host.addItem = function(value, name) {
        const placeholderElement = host.querySelector(`.placeholder`);

        if (placeholderElement) {
            placeholderElement.remove();
        };

        const itemElement = document.createElement(`div`);
        itemElement.classList.add(`item`);
        itemElement.setAttribute(`value`, value);

        const nameElement = document.createElement(`div`);
        nameElement.classList.add(`name`);
        nameElement.innerText = name;

        const xmarkElement = document.createElement(`img`);
        xmarkElement.setAttribute(`src`, `./assets/images/xmark.svg`);
        xmarkElement.setAttribute(`draggable`, `false`);

        xmarkElement.addEventListener(`click`, function() {
            this.parentElement.remove();
            updateValue();
        });

        itemElement.appendChild(nameElement);
        itemElement.appendChild(xmarkElement);

        host.appendChild(itemElement);

        updateValue();
    };

    host.removeItems = function() {
        host.innerHTML = placeholderAttributeValue ? `<div class="placeholder">${placeholderAttributeValue}</div>` : ``;
        host.keys = null;
    };

    host.addEventListener(`mousedown`, function(event) {
        if (!event.target.classList.contains(`item`)) {
            return;
        };

        host.draggingElement = event.target;

        const dragElementRect = host.draggingElement.getBoundingClientRect();

        host.draggingElement.classList.add(`drag`);
        host.draggingElement.style.top = `${dragElementRect.top - host.getBoundingClientRect().top}px`;

        host.draggingElementShiftY = event.clientY - dragElementRect.top;

        host.slotElement = document.createElement(`div`);
        host.slotElement.classList.add(`item`, `slot`);
        host.slotElement.style.height = `${dragElementRect.height}px`;
        host.slotElement.innerHTML = `<div>${host.draggingElement.innerText}</div>`;

        host.insertBefore(host.slotElement, host.draggingElement.nextSibling);

        document.addEventListener(`mousemove`, onMouseMove);
        document.addEventListener(`mouseup`, onMouseUp);
    });

    if (placeholderAttributeValue) {
        host.innerHTML = `<div class="placeholder">${placeholderAttributeValue}</div>`;
    };
};