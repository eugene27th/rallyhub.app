export function init(host) {
    const placeholderAttributeValue = host.hasAttribute(`placeholder`) ? host.getAttribute(`placeholder`) : null;

    host.addItem = function(value, name) {
        const placeholder = host.querySelector(`.placeholder`);

        if (placeholder) {
            placeholder.remove();
        };

        const itemElement = document.createElement(`div`);
        itemElement.classList.add(`item`);
        itemElement.setAttribute(`value`, value);
        itemElement.setAttribute(`draggable`, true);
        
        const nameElement = document.createElement(`div`);
        nameElement.classList.add(`name`);
        nameElement.innerText = name;

        const xmarkElement = document.createElement(`img`);
        xmarkElement.setAttribute(`src`, `./assets/images/xmark.svg`);

        xmarkElement.addEventListener(`click`, function() {
            this.parentElement.remove(); 
        });

        itemElement.appendChild(nameElement);
        itemElement.appendChild(xmarkElement);

        host.appendChild(itemElement);
    };

    host.removeItems = function() {
        host.innerHTML = placeholderAttributeValue ? `<div class="placeholder">${placeholderAttributeValue}</div>` : ``;
        host.value = null;
    };

    host.addEventListener(`dragstart`, function(event) {
        event.target.setAttribute(`selected`, ``);
    })

    host.addEventListener(`dragend`, function(event) {
        event.target.removeAttribute(`selected`);
    });

    host.addEventListener(`dragover`, function(event) {
        event.preventDefault();
    
        const movedElement = host.querySelector(`[selected]`);
        const underElement = event.target;

        if (movedElement === underElement || !underElement.classList.contains(`item`)) {
            return false;
        };

        const underElementPosition = underElement.getBoundingClientRect();
        
        const nextElement = (event.clientY < (underElementPosition.y + underElementPosition.height / 2)) ? underElement : underElement.nextElementSibling;
    
        if (nextElement && movedElement === nextElement.previousElementSibling || movedElement === nextElement) {
            return false;
        };

        host.insertBefore(movedElement, nextElement);

        // отсылать ивент в хендлер
    });

    if (placeholderAttributeValue) {
        host.innerHTML = `<div class="placeholder">${placeholderAttributeValue}</div>`;
    };
};