import AuthWebsocket from '../components/pages/auth-page/auth-websocket';
import MainPage from '../components/pages/main-page/main-page';
import InfoPage from '../components/pages/info-page/info-page';
import Router from '../components/router/router';

export default class App {
    public authPage: AuthWebsocket | null = null;
    public router: Router;

    private readonly mainElement: HTMLElement;
    private mainPage: MainPage | null = null;
    private readonly ws: WebSocket;

    constructor() {
        this.mainElement = App.createMainElement();
        document.body.append(this.mainElement);
        this.ws = new WebSocket('ws://localhost:4000');
        this.router = new Router(this.mainElement);
        this.setupRoutes();
    }

    private static createMainElement(): HTMLElement {
        const mainContainer = document.createElement('div');
        mainContainer.id = 'root';
        mainContainer.className = 'root';
        return mainContainer;
    }

    public start(): void {
        this.setupWebSocket();
        this.handleInitialRoute();
    }

    public destroy(): void {
        this.ws.close();
        this.clearMainElement();
    }

    private handleInitialRoute(): void {
        const hash = globalThis.location.hash.slice(1) || '/auth';
        const isAuthenticated =
            sessionStorage.getItem('isAuthenticated') === 'true';
        const currentUser = sessionStorage.getItem('currentUser');
        const userPassword = sessionStorage.getItem('userPassword');

        switch (hash) {
            case '/auth': {
                this.router.navigate('/auth', false);

                break;
            }
            case '/info': {
                this.router.navigate('/info', false);

                break;
            }
            case '/main': {
                if (isAuthenticated && currentUser && userPassword) {
                    this.router.navigate('/main', false);
                } else {
                    globalThis.location.hash = '#/auth';
                }

                break;
            }
            default: {
                globalThis.location.hash = '#/auth';
            }
        }
    }

    private setupRoutes(): void {
        this.router.addRoute('/auth', () => this.showAuthPage());
        this.router.addRoute('/main', () => this.showMainPage());
        this.router.addRoute('/info', () => this.showInfoPage());
    }

    private setupWebSocket(): void {
        this.ws.addEventListener('open', () => {
            const isAuthenticated =
                sessionStorage.getItem('isAuthenticated') === 'true';
            const currentUser = sessionStorage.getItem('currentUser');
            const userPassword = sessionStorage.getItem('userPassword');

            if (isAuthenticated && currentUser && userPassword) {
                const reAuthRequest = {
                    id: `reauth_${Date.now()}`,
                    type: 'USER_LOGIN',
                    payload: {
                        user: { login: currentUser, password: userPassword },
                    },
                };
                this.ws.send(JSON.stringify(reAuthRequest));
            }
        });

        this.ws.addEventListener('error', (error: Event) => {
            console.error('WebSocket error:', error);
        });

        this.ws.addEventListener('close', () => {
            console.log('WebSocket closed');
        });
    }

    private showInfoPage(): void {
        this.clearMainElement();
        const infoPage = new InfoPage();
        this.mainElement.append(infoPage.render());
        sessionStorage.setItem('last-visited-path', '/info');
    }

    private showAuthPage(): void {
        this.clearMainElement();
        this.mainPage = null;
        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('userPassword');
        this.authPage = new AuthWebsocket(this.mainElement, this.ws);

        this.authPage.setOnAuthSuccess(
            (userData: { login: string; password: string }) => {
                sessionStorage.setItem('isAuthenticated', 'true');
                sessionStorage.setItem('currentUser', userData.login);
                sessionStorage.setItem('userPassword', userData.password);
                this.router.navigate('/main');
            }
        );

        this.authPage.setOnAuthError((error: string) => {
            console.error('Auth error:', error);
        });
    }

    private showMainPage(): void {
        this.clearMainElement();
        this.authPage = null;
        const currentUser = sessionStorage.getItem('currentUser');
        const userPassword = sessionStorage.getItem('userPassword');

        if (!currentUser || !userPassword) {
            this.router.navigate('/auth');
            return;
        }

        this.mainPage = new MainPage(
            'main-page',
            currentUser,
            userPassword,
            this.ws,
            () => this.handleLogout()
        );
        this.mainElement.append(this.mainPage.render());
        sessionStorage.setItem('last-visited-path', '/main');
    }

    private handleLogout(): void {
        sessionStorage.removeItem('isAuthenticated');
        sessionStorage.removeItem('currentUser');
        sessionStorage.removeItem('userPassword');
        sessionStorage.removeItem('last-visited-path');
        sessionStorage.removeItem('lastSelectedUser');
        this.mainPage?.destroy?.();
        this.mainPage = null;
        this.router.navigate('/auth');
    }

    private clearMainElement(): void {
        this.authPage?.destroy?.();
        this.authPage = null;
        this.mainPage?.destroy?.();
        this.mainPage = null;
        this.mainElement.innerHTML = '';
    }
}
