import { render } from 'preact';
import './styles.css';
import { App } from './ui/App';
import { init } from './ui/store';

render(<App />, document.getElementById('app')!);
void init();

// Offline: a small hand-written service worker caches the app after the first load
// (ARCHITECTURE §7). Only in production builds, so dev reloads are never stale.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  addEventListener('load', () => void navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js'));
}
