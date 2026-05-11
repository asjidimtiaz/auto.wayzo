import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { NotificationProvider } from '@/lib/notification';
import { ConfirmProvider } from '@/lib/confirm';

export const metadata = {
  title: 'Auto-École Maroc',
  description: "Application de gestion d'auto-école au Maroc",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <NotificationProvider>
            <ConfirmProvider>
              {children}
            </ConfirmProvider>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
