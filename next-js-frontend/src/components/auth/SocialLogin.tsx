import Image from "next/image";
import { googlePng } from "../../assets";

type PropTypes = {
  googleLink: string;
};

export const SocialLogin = ({ googleLink }: PropTypes) => {
  return (
    <a href={googleLink} className="w-full">
      <button className="px-6 py-2 outline outline-1 rounded-sm outline-secondary-dark hover:outline hover:outline-1 hover:outline-primary/50 flex items-center gap-x-2 w-full">
        <Image
          width={100}
          height={100}
          src={googlePng}
          className="w-7"
          alt="google"
        />
        <p className="text-fluid-p">Continue with google</p>
      </button>
    </a>
  );
};
