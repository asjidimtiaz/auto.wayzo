import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { NotificationProvider } from '@/lib/notification';
import { ConfirmProvider } from '@/lib/confirm';

export const metadata = {
  title: 'Auto-École Maroc',
  description: "Application de gestion d'auto-école au Maroc",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet" />
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
