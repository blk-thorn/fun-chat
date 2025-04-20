import './info-page.css'

export default class InfoPage {
    private headerClass: string = 'about__header';
    private mainClass: string = 'about';
    private infoClass: string = 'about__info';
    private linkClass: string = 'about__link';
    private buttonClass: string = 'button';
    private readonly onBack: () => void;

    constructor(onBack: () => void) {
        this.onBack = onBack;
    }

    createInfoPage(): HTMLElement {
        const main: HTMLElement = document.createElement('main');
        main.className = this.mainClass;

        const title: HTMLHeadingElement = document.createElement('h2');
        title.className = this.headerClass;
        title.textContent = 'Fun Chat';
        main.appendChild(title);

        const info: HTMLLabelElement = document.createElement('label');
        info.className = this.infoClass;
        info.textContent = 'Fun Chat is a Single Page Application(SPA) developed as part of the RSSchool JS/FE 2024Q4 course, designed to demonstrate modern web development techniques while addressing common privacy concerns in messaging platforms.';
        main.appendChild(info);

        const link: HTMLAnchorElement = document.createElement('a');
        link.className = this.linkClass;
        link.href = 'https://github.com/blk-thorn';
        link.textContent = 'Author: Blk-thorn';
        main.appendChild(link);

        const button: HTMLButtonElement = document.createElement('button');
        button.className = this.buttonClass;
        button.type = 'button';
        button.textContent = 'Back';
        button.addEventListener('click', this.onBack);
        main.appendChild(button);

        return main;
    }

    render(): HTMLElement {
        const page: HTMLElement = this.createInfoPage();
        const backButton: HTMLButtonElement | null = page.querySelector(`.${this.buttonClass}`);
        if (backButton) {
            backButton.addEventListener('click', (): void => {
                window.dispatchEvent(new CustomEvent('navigate', { detail: '/main' }));
            });
        }
        return page;
    }
}
