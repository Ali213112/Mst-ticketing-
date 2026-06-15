import './globals.css';

export const metadata = {
  title: 'TicketChain MST',
  description: 'NFT ticketing on MST Blockchain',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'TicketChain Scanner',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#6366f1" />
      </head>
      <body>{children}</body>
    </html>
  );
}

