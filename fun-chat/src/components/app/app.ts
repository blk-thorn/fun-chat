export default class App {
    private readonly mainElement: HTMLElement;

    constructor() {
        this.mainElement = this.createMainElement();
        document.body.appendChild(this.mainElement);
    }

    private createMainElement(): HTMLElement {
        const main: HTMLElement = document.createElement('main');
        main.id = 'main';
        return main;
    }

    public start(): void {
    }
}
