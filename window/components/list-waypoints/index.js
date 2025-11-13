export function init(host) {
    const placeholderAttributeValue = host.hasAttribute(`placeholder`) ? host.getAttribute(`placeholder`) : null;

    
    const selectItem = function(selectedElement) {
        for (const listItem of host.querySelectorAll(`.item`)) {
            listItem.classList.remove(`selected`);
        };

        selectedElement.classList.add(`selected`);

        host.value = selectedElement.getAttribute(`value`);

        host.dispatchEvent(new Event(`change`, {
            bubbles: true
        }));
    };

    const repositionItem = function(targetElement) {
        const targetValue = parseInt(targetElement.getAttribute(`value`));

        for (const listItem of host.querySelectorAll(`.item`)) {
            if (parseInt(listItem.getAttribute(`value`)) > targetValue) {
                listItem.before(targetElement);
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
        const itemElement = host.querySelector(`.item[value="${value}"]`);
        itemElement.querySelector(`span`).innerText = description;
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