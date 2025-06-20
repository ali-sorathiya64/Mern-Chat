import { Navbar } from "@/components/navbar/Navbar";
import { MessageInputProvider } from "@/context/message-input-ref.context";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure Chat App",
  description: "A privacy-first chat application with end-to-end encryption",
  keywords: [
    "secure chat",
    "end-to-end encryption",
    "private messaging",
    "chat app",
    "encrypted chat",
    "secure messaging",
    "real-time chat"
  ],
  generator: "Next.js",
  metadataBase: new URL("https://yourdomain.com"), // Replace with your domain

  openGraph: {
    title: "Secure Chat App",
    description: "A privacy-first chat application with end-to-end encryption",
    url: "https://yourdomain.com",
    siteName: "Secure Chat",
    images: [
      {
        url: "https://yourdomain.com/images/og/og-image.png",
        width: 1200,
        height: 630,
        alt: "Secure Chat Application",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Secure Chat App",
    description: "A privacy-first chat application with end-to-end encryption",
    images: ["https://yourdomain.com/images/og/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "https://yourdomain.com",
  },
};

export default function ChatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <header>
        <Navbar />
      </header>
      <main className="h-[calc(100vh-3.5rem)]">
        <MessageInputProvider>
          {children}
        </MessageInputProvider>
      </main>
    </>
  );
}