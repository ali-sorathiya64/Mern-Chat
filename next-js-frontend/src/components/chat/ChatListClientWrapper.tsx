"use client";

import { useSwipe } from "@/hooks/useUtils/useSwipe";
import { selectChatBar, setChatBar } from "@/lib/client/slices/uiSlice";
import { useAppSelector } from "@/lib/client/store/hooks";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import { useEffect, useState } from "react";

type PropTypes = {
  children: React.ReactNode;
};

export const ChatListClientWrapper = ({ children }: PropTypes) => {
  const dispatch = useDispatch();
  const chatBar = useAppSelector(selectChatBar);

  // Track client-side only rendering
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Always call the hook
  const swipeHandlers = useSwipe(
    75,
    1024,
    () => dispatch(setChatBar(false)),
    () => {}
  );

  const { onTouchStart, onTouchMove, onTouchEnd } = isClient
    ? swipeHandlers
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
