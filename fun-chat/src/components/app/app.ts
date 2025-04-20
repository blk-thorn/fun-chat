import AuthWebsocket from '../pages/auth-page/auth-websocket';
import MainPage from '../pages/main-page/main-page';
import InfoPage from '../pages/info-page/info-page';
import Router from '../router/router';

export default class App {
    private readonly mainElement: HTMLElement;
    public authPage: AuthWebsocket | null = null;
    private mainPage: MainPage | null = null;
    private currentUser: string = '';
    private readonly ws: WebSocket;
    private currentUserPassword: string = '';
    public router: Router;

    constructor() {
        this.mainElement = this.createMainElement();
        document.body.append(this.mainElement);
        this.ws = new WebSocket('ws://localhost:4000');

        this.router = new Router(this.mainElement);
        this.setupRoutes();
        this.handleInitialRoute();
    }

    private handleInitialRoute(): void {
        const initialPath: string = window.location.pathname;
        if (initialPath === '/' || initialPath === '/auth') {
            this.router.navigate('/auth');
        } else if (initialPath === '/main' || initialPath === '/info') {
            if (!this.currentUser) {
                this.router.navigate('/auth');
            } else {
                this.router.navigate(initialPath);
            }
        } else {
            this.router.navigate('/auth');
        }
    }

    private createMainElement(): HTMLElement {
        const mainContainer: HTMLElement = document.createElement('div');
        mainContainer.id = 'root';
        mainContainer.className = 'root';
        return mainContainer;
    }

    private setupRoutes(): void {
        this.router.addRoute('/auth', (): void => this.showAuthPage());
        this.router.addRoute('/main', (): void => this.showMainPage());
        this.router.addRoute('/info', (): void => this.showInfoPage());
    }

    public start(): void {
        this.setupWebSocket();
        this.router.navigate('/auth');
    }

    private showInfoPage(): void {
        this.clearMainElement();
        const infoPage = new InfoPage((): void => this.router.navigate('/main'));
        this.mainElement.appendChild(infoPage.render());
    }

    private setupWebSocket(): void {
        this.ws.onopen = (): void => {
            console.log('WebSocket working');
        };

        this.ws.onerror = (error: Event): void => {
            console.error('WebSocket error:', error);
        };

        this.ws.onclose = (): void => {
            console.log('WebSocket is not working');
        };
    }

    private showAuthPage(): void {
        this.clearMainElement();
        this.mainPage = null;
        this.authPage = new AuthWebsocket(this.mainElement, this.ws);

        this.authPage.setOnAuthSuccess((userData: {login: string, password: string}): void => {
            this.currentUser = userData.login;
            this.currentUserPassword = userData.password;
            this.showMainPage();
        });
    }

    private showMainPage(): void {
        this.clearMainElement();
        this.authPage = null;
        this.mainPage = new MainPage('main-page', this.currentUser, this.currentUserPassword, this.ws, (): void => this.showAuthPage());
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
