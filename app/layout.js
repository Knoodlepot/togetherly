import './globals.css';

export const metadata = {
  title: 'Togetherly',
  description: 'Family check-in app — stay connected with the people you love',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Togetherly',
  },
};

export const viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div id="app-root">
          {children}
        </div>
      </body>
    </html>
  );
}
