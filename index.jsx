// Entry point
const mountApp = () => {
    const { ReactDOM, React, App } = window;

    if (!ReactDOM || !React || !App) {
        console.error("Dependencies not loaded yet");
        return;
    }

    const rootElement = document.getElementById('root');
    if (!rootElement) {
      throw new Error("Could not find root element to mount to");
    }

    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
};

// Check if modules are already loaded, otherwise wait for event
if (window.__MODULES_LOADED__) {
    mountApp();
} else {
    document.addEventListener('modules-loaded', mountApp);
}
