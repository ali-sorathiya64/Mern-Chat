import { fetchUserFriendRequestResponse } from "@/lib/server/services/userService";
import Image from "next/image";

type PropTypes = {
    user:fetchUserFriendRequestResponse
    friendRequestHandler:(requestId: fetchUserFriendRequestResponse['id'], action: "accept" | "reject") => void
    isLoading: boolean
}
export const FriendRequestItem = ({user,friendRequestHandler,isLoading}:PropTypes) => {


  return (
    <div className="bg-secondary-dark hover:bg-secondary flex justify-between p-2">

        <div className="flex gap-x-3">
            <Image className="h-16 w-16 rounded-full object-cover" src={user.sender.avatar} width={100} height={100} alt={`${user.sender.username} avatar`} />
            <p className="text-lg ">{user.sender.username}</p>
        </div>
        <div className="flex items-center gap-x-2">
            <button onClick={()=>friendRequestHandler(user.id,"accept")} disabled={isLoading}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-violet-500">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            </button>

            <button onClick={()=>friendRequestHandler(user.id,"reject")}  disabled={isLoading}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
            </button>
        </div>
    </div>
  )
}
