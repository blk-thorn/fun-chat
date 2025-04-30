import App from '../src/app/app';
import '../src/global.css';

const app = new App();

function handleNavigate(event: Event): void {
    if (event instanceof CustomEvent && typeof event.detail === 'string') {
        app.router.navigate(event.detail);
    }
}

globalThis.addEventListener('navigate', handleNavigate);

app.start();
