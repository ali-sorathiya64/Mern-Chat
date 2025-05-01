"use client"; // Ensures this component is treated as client-side only
import { useSwipe } from "@/hooks/useUtils/useSwipe";
import { selectChatBar, setChatBar } from "@/lib/client/slices/uiSlice";
import { useAppSelector } from "@/lib/client/store/hooks";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";

type PropTypes = {
  children: React.ReactNode;
};

export const ChatListClientWrapper = ({ children }: PropTypes) => {
  const dispatch = useDispatch();
  const chatBar = useAppSelector(selectChatBar);

  // Prevent the use of `useSwipe` during SSR by adding a check for `window`
  const { onTouchStart, onTouchMove, onTouchEnd } =
    typeof window !== "undefined"
      ? useSwipe(
          75,
          1024,
          () => dispatch(setChatBar(false)),
          () => {}
        )
      : {
          onTouchStart: () => {},
          onTouchMove: () => {},
          onTouchEnd: () => {},
        };

  return (
    <motion.div
      onTouchEnd={onTouchEnd}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      variants={{ hide: { right: "65rem" }, show: { left: 0, right: 0 } }}
      initial="hide"
      animate={chatBar ? "show" : "hide"}
      transition={{ duration: 0.4, type: "spring" }}
      className="w-[22rem] max-sm:w-[auto] p-2 bg-background max-lg:fixed h-full max-lg:pb-20 overflow-y-auto z-10"
    >
      {children}
    </motion.div>
  );
};
