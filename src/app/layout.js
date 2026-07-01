import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

export const metadata = {
  title: "Ledger | Withdraw Console",
  description: "Withdraw requests and admin review console.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-ink text-paper">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
