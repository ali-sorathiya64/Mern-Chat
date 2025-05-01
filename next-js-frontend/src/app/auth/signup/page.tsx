import { SignupForm } from "@/components/auth/SignupForm";
import { SocialLogin } from "@/components/auth/SocialLogin";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up - Mernchat",
  description: "Create a secure account on Mernchat and start chatting with end-to-end encryption.",
  keywords: [
    "MernChat sign up", 
    "create Mernchat account", 
    "secure chat registration", 
    "encrypted messaging signup", 
    "private chat signup"
  ],
  openGraph: {
    title: "Sign Up - Mernchat",
    description: "Create a secure account on MernChat and start chatting with end-to-end encryption.",
    url: "https://mernchat.in/auth/signup",
    siteName: "Mernchat",
    type: "website",
    images: [
      {
        url: "https://mernchat.in/images/og/og-image.png",
        width: 1200,
        height: 630,
        alt: "Mernchat - Secure & Encrypted Chat App",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sign Up - Mernchat",
    description: "Create a secure account on MernChat and start chatting with end-to-end encryption.",
    images: ["https://mernchat.in/images/og/og-image.png"], // Add Twitter image
  },
};


const page = () => {
  return (
    <>
      <div className="flex flex-col gap-y-8">
        <h3 className="text-4xl font-bold text-fluid-h4">Signup</h3>
        <SocialLogin
          googleLink={`${process.env.NEXT_PUBLIC_BASE_URL}/auth/google`}
        />
      </div>
      <SignupForm/>
    </>
  );
};

export default page;
