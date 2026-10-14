import "./globals.css";

export const metadata = {
  title: "Piko Beats — Your music, your space",
  description: "A calm, ad-free home for your authorized music library and playlists."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
