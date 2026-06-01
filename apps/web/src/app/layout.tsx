import './globals.css';

export const metadata = {
  title: 'TicketChain MST',
  description: 'NFT ticketing on MST Blockchain',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

