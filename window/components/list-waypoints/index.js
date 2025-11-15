export function init(host) {
    const placeholderAttributeValue = host.hasAttribute(`placeholder`) ? host.getAttribute(`placeholder`) : null;

    const selectItem = function(selectedElement) {
        for (const listItemElement of host.querySelectorAll(`.item`)) {
            listItemElement.classList.remove(`selected`);
        };

        selectedElement.classList.add(`selected`);

        host.value = selectedElement.getAttribute(`value`);

        host.dispatchEvent(new Event(`change`, {
            bubbles: true
        }));
    };

    const repositionItem = function(targetElement) {
        const targetValue = parseInt(targetElement.getAttribute(`value`));

        for (const listItemElement of host.querySelectorAll(`.item`)) {
            if (parseInt(listItemElement.getAttribute(`value`)) > targetValue) {
                listItemElement.before(targetElement);
                return;
            };
        };

        host.append(targetElement);
    };

    host.addItem = function(value, description, select = false) {
        const placeholderElement = host.querySelector(`.placeholder`);

        if (placeholderElement) {
            placeholderElement.remove();
        };

        const itemElement = document.createElement(`div`);
        itemElement.classList.add(`item`);
        itemElement.setAttribute(`value`, value);
        itemElement.innerHTML = `<div class="value">${value}</div><span>${description || ``}</span>`;

        itemElement.addEventListener(`click`, function() {
            selectItem(this);
        });

        host.appendChild(itemElement);

        if (select) {
            selectItem(itemElement);
            repositionItem(itemElement);

            itemElement.scrollIntoView({
                block: `center`,
                behavior: `smooth`
            });
        };
    };

    host.editItemValue = function(currentValue, newValue) {
        const itemElement = host.querySelector(`.item[value="${currentValue}"]`);

        itemElement.setAttribute(`value`, newValue);
        itemElement.querySelector(`.value`).innerText = newValue;

        repositionItem(itemElement);

        itemElement.scrollIntoView({
            block: `center`,
            behavior: `smooth`
        });
    };

    host.editItemDescription = function(value, description) {
        host.querySelector(`.item[value="${value}"] span`).innerText = description;
    };

    host.removeItem = function(value) {
        const itemElement = host.querySelector(`.item[value="${value}"]`);

        if (itemElement) {
            itemElement.remove();
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