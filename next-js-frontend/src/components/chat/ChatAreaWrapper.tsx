"use client";

import { useMediaQuery } from "@/hooks/useUtils/useMediaQuery";
import { useSwipe } from "@/hooks/useUtils/useSwipe";
import { updateSelectedChatDetails } from "@/lib/client/slices/chatSlice";
import {
  selectChatBar,
  selectChatDetailsBar,
  setChatBar,
  setChatDetailsBar,
} from "@/lib/client/slices/uiSlice";
import { useAppDispatch, useAppSelector } from "@/lib/client/store/hooks";

type PropTypes = {
  children: React.ReactNode;
};

export const ChatAreaWrapper = ({ children }: PropTypes) => {
  const chatBar = useAppSelector(selectChatBar);
  const dispatch = useAppDispatch();
  const is1024 = useMediaQuery(1024);

  const chatLeftSwipe = () => {
    if (chatBar) {
      dispatch(setChatBar(false));
    } else {
      dispatch(setChatDetailsBar(true));
    }
  };

  const chatDetailsBar = useAppSelector(selectChatDetailsBar);

  const chatRightSwipe = () => {
    if (chatDetailsBar) {
      dispatch(setChatDetailsBar(false));
    } else if (is1024) {
      dispatch(updateSelectedChatDetails(null));
      dispatch(setChatBar(true));
    }
  };

  const {
    onTouchStart: onTouchStartChat,
    onTouchMove: onTouchMoveChat,
    onTouchEnd: onTouchEndChat,
  } = useSwipe(75, 1536, chatLeftSwipe, chatRightSwipe);

  return (
    <div
      onTouchEnd={onTouchEndChat}
      onTouchStart={onTouchStartChat}
      onTouchMove={onTouchMoveChat}
      className="flex-[1.6]"
    >
      {children}
    </div>
  );
};
