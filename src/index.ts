import App from '../src/components/app/app';
import '../src/global.css';

const app = new App();

window.addEventListener('navigate', ((event: CustomEvent<string>) => {
    app.router.navigate(event.detail);
}) as EventListener);

app.start();

