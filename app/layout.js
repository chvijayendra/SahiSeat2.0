import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import LoginModal from "@/components/LoginModal";

export const metadata = {
  title: "SahiSeat | JoSAA & CSAB College Predictor",
  description:
    "Predict your JoSAA & CSAB college admissions instantly. Enter your JEE rank, category, home state and preferred branches to discover eligible NITs, IIITs and GFTIs with real closing-rank data.",
  keywords: [
    "JoSAA predictor",
    "CSAB predictor",
    "JEE college predictor",
    "NIT predictor",
    "IIIT predictor",
    "GFTI predictor",
    "JEE rank college",
    "JoSAA cutoff",
    "CSAB cutoff",
    "SahiSeat",
  ],
  authors: [{ name: "SahiSeat Team" }],
  creator: "SahiSeat",
  publisher: "SahiSeat",
  metadataBase: new URL("https://sahiseat.vercel.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SahiSeat | JoSAA & CSAB College Predictor",
    description:
      "Predict your JoSAA & CSAB college admissions instantly. Discover eligible NITs, IIITs and GFTIs based on your JEE rank, category, home state and preferred branches.",
    url: "https://sahiseat.vercel.app",
    siteName: "SahiSeat",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SahiSeat – JoSAA & CSAB College Predictor",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SahiSeat | JoSAA & CSAB College Predictor",
    description:
      "Predict your JoSAA & CSAB college admissions instantly. Real cutoff data for NITs, IIITs and GFTIs.",
    images: ["/og-image.png"],
    creator: "@sahiseat",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ToastProvider>
            {children}
            <LoginModal />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
