import AuthWebsocket from '../pages/auth-page/auth-websocket';
import MainPage from '../pages/main-page/main-page';

export default class App {
    private readonly mainElement: HTMLElement;
    public authPage: AuthWebsocket | null = null;
    private mainPage: MainPage | null = null;
    private currentUser: string = '';
    private readonly ws: WebSocket;
    private currentUserPassword: string = '';

    constructor() {
        this.mainElement = this.createMainElement();
        document.body.append(this.mainElement);
        this.ws = new WebSocket('ws://localhost:4000');
    }

    private createMainElement(): HTMLElement {
        const mainContainer: HTMLElement = document.createElement('div');
        mainContainer.id = 'root';
        mainContainer.className = 'root';
        return mainContainer;
    }

    public start(): void {
        this.setupWebSocket();
        this.showAuthPage();
    }

    private setupWebSocket(): void {
        this.ws.onopen = () => {
            console.log('WebSocket working');
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket is not working');
        };
    }

    private showAuthPage(): void {
        this.clearMainElement();
        this.mainPage = null;
        this.authPage = new AuthWebsocket(this.mainElement, this.ws);

        this.authPage.setOnAuthSuccess((userData: {login: string, password: string}) => {
            this.currentUser = userData.login;
            this.currentUserPassword = userData.password;
            this.showMainPage();
        });
    }

    private showMainPage(): void {
        this.clearMainElement();
        this.authPage = null;
        this.mainPage = new MainPage('main-page', this.currentUser, this.currentUserPassword, this.ws, () => this.showAuthPage());
        this.mainElement.appendChild(this.mainPage.render());
    }

    private clearMainElement(): void {
        this.mainElement.innerHTML = '';
    }

    public destroy(): void {
        this.ws.close();
        this.clearMainElement();
    }
}
