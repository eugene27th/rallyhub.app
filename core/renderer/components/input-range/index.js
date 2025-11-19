export function init(host) {
    const inputElement = host.querySelector(`input`);
    const valueElement = host.querySelector(`.value`);

    host.setValue = function(value) {
        valueElement.innerText = `${value}%`;

        host.value = value;
        inputElement.value = value;

        host.dispatchEvent(new Event(`input`, {
            bubbles: true
        }));
    };

    inputElement.addEventListener(`input`, async function() {
        valueElement.innerText = `${this.value}%`;

        host.value = this.value;

        host.dispatchEvent(new Event(`input`, {
            bubbles: true
        }));
    });

    for (const attribute of [`min`, `max`, `step`, `value`]) {
        const attributeValue = host.getAttribute(attribute);

        if (attributeValue !== null) {
            inputElement.setAttribute(attribute, attributeValue);
        };
    };

    valueElement.innerText = `${inputElement.value}%`;
};