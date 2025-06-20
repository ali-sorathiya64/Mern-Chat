import { InitializeIndexedDbWrapper } from "@/components/auth/InitializeIndexedDbWrapper";
import { ModalWrapper } from "@/components/modal/ModalWrapper";
import { ThemeInitializer } from "@/components/theme/ThemeInitializer";
import { SocketProvider } from "@/context/socket.context";
import StoreProvider from "@/lib/client/store/StoreProvider";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import Head from "next/head";
import { Toaster as SonnerToaster } from "@/components/ui/Sonner";

// Load fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// JSON-LD structured metadata
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Chat App",
  "url": "https://yourdomain.com",
  "author": {
    "@type": "Person",
    "name": "Your Name",
    "url": "https://yourportfolio.com"
  },
  "sameAs": [
    "https://github.com/yourgithub",
    "https://twitter.com/yourhandle",
    "https://www.linkedin.com/in/yourlinkedin/",
    "https://yourblog.com"
  ],
  "applicationCategory": "SocialNetworkingApplication",
  "operatingSystem": "All"
};

export const metadata: Metadata = {
  title: "Secure & Encrypted Chat App",
  description: "A privacy-first chat app offering end-to-end encryption for private and real-time messaging.",
  keywords: [
    "secure chat", "end-to-end encryption", "private messaging",
    "encrypted chat", "real-time chat", "safe messaging app"
  ],
  generator: "Next.js",
  applicationName: "ChatApp",
  authors: [{ name: "Your Name", url: "https://yourportfolio.com" }],
  creator: "Your Name",
  publisher: "Your Name",
  metadataBase: new URL("https://yourdomain.com"),
  icons: {
    apple: {
      url: "https://yourdomain.com/images/apple-touch-icon.png",
    },
  },
  openGraph: {
    title: "Secure & Encrypted Chat App",
    description: "A privacy-first chat app offering end-to-end encryption for secure messaging.",
    url: "https://yourdomain.com",
    siteName: "ChatApp",
    images: [
      {
        url: "https://yourdomain.com/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Secure & Encrypted Chat App",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Secure & Encrypted Chat App",
    description: "A privacy-first chat app offering end-to-end encryption for secure messaging.",
    images: ["https://yourdomain.com/images/og-image.png"],
    creator: "@yourhandle",
    site: "@yourhandle",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://yourdomain.com",
  },
  other: {
    jsonLd: JSON.stringify(jsonLd)
  }
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Head>
        <link rel="preload" href="https://yourdomain.com/images/og-image.png" as="image" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </Head>
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          <div id="modal-root"></div>
          <StoreProvider>
            <SocketProvider>
              <Toaster />
              <SonnerToaster />
              <InitializeIndexedDbWrapper />
              <ThemeInitializer />
              <ModalWrapper />
              {children}
            </SocketProvider>
          </StoreProvider>
        </body>
      </html>
    </>
  );
}
