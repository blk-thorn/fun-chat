import AuthPage from '../pages/auth-page/auth-page';
import MainPage from '../pages/main-page/main-page';

export default class App {
    private readonly mainElement: HTMLElement;
    public authPage: AuthPage | null = null;
    private mainPage: MainPage | null = null;

    constructor() {
        this.mainElement = this.createMainElement();
        document.body.append(this.mainElement);
    }

    private createMainElement(): HTMLElement {
        const mainContainer: HTMLElement = document.createElement('div');
        mainContainer.id = 'root';
        return mainContainer;
    }

    public start(): void {
        this.showAuthPage();

        setTimeout(() => {
            this.showMainPage();
        }, 3000);
    }

    private showAuthPage(): void {
        this.clearMainElement();
        this.mainPage = null;
        this.authPage = new AuthPage(this.mainElement);
    }

    private showMainPage(): void {
        this.clearMainElement();
        this.authPage = null;
        this.mainPage = new MainPage('main-page');
        this.mainElement.appendChild(this.mainPage.render());
    }

    private clearMainElement(): void {
        this.mainElement.innerHTML = '';
    }
}
