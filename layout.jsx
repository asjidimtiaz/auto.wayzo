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
