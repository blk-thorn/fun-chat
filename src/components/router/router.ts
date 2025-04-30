export default class Router {
    private routes: Record<string, () => void> = {};
    private currentPath: string = '/';
    rootElement: HTMLElement;

    constructor(rootElement: HTMLElement) {
        this.rootElement = rootElement;
        this.setupHashListener();
    }

    private setupHashListener(): void {
        window.addEventListener('hashchange', (): void => {
            const path = window.location.hash.substring(1) || '/auth';
            this.navigate(path, false);
        });
    }

    public addRoute(path: string, callback: () => void): void {
        this.routes[path] = callback;
    }

    public navigate(path: string, addToHistory: boolean = true): void {
        if (path === this.currentPath) return;

        if (path === '/main') {
            const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
            const currentUser = sessionStorage.getItem('currentUser');
            const userPassword = sessionStorage.getItem('userPassword');

            if (!isAuthenticated || !currentUser || !userPassword) {
                path = '/auth';
            }
        }

        if (addToHistory) {
            window.location.hash = `#${path}`;
        } else {
            this.currentPath = path;
            const routeCallback = this.routes[path];
            if (routeCallback) {
                routeCallback();
            } else {
                window.location.hash = '#/auth';
            }
        }
    }
}
