import '@testing-library/jest-dom/vitest';

// jsdom no implementa scrollTo, y el router lo llama al navegar para restaurar el scroll.
window.scrollTo = () => undefined;
