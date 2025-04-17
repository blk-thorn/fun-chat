import AuthPage from '../pages/auth-page';

export default class App {
    private readonly mainElement: HTMLElement;
    authPage: AuthPage | null = null;

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
        this.showAuthPage();
    }

    private showAuthPage(): void {
        this.clearMainElement();
        this.authPage = new AuthPage(this.mainElement);
    }

    private clearMainElement(): void {
        this.mainElement.innerHTML = '';
    }
}
