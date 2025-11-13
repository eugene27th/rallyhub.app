export const registerComponent = async function(name) {
    if (customElements.get(name)) {
        return;
    };

    const html = await (await fetch(`../window/components/${name}/index.html`)).text();

    const link = document.createElement(`link`);
    link.rel = `stylesheet`;
    link.href = `../window/components/${name}/index.css`;

    document.head.appendChild(link);

    const { init } = await import(`../components/${name}/index.js`);

    customElements.define(name,
        class extends HTMLElement {
            constructor() {
                super();
            };

            async connectedCallback() {
                this.originalChilds = [...this.childNodes];
                this.innerHTML = html;

                await init(this);
            };
        }
    );
};