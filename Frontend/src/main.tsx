import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { store } from './Redux/store.ts';
import { Provider } from "react-redux";
import { SocketProvider } from './context/SocketProvider';
import { ThemeProvider } from './context/ThemeProvider.tsx';
import { dark } from "@clerk/themes";
import { useTheme } from './context/useTheme.ts';

export const Root = () => {
  const { theme } = useTheme();

  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY!}
      appearance={{
        baseTheme: theme === 'dark' ? dark : undefined,
      }}
    >
      <Provider store={store}>
        <SocketProvider>
          <App />
        </SocketProvider>
      </Provider>
    </ClerkProvider>
  );
};

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <ThemeProvider>
      <Root />
    </ThemeProvider>
  </BrowserRouter>
);
