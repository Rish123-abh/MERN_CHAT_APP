import { createContext, useContext, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { io, Socket } from "socket.io-client";
import type { RootState } from '../Redux/store';

type props={
    children:React.ReactNode
}
const SocketContext=createContext<Socket|null>(null);
export const SocketProvider=({children}:props)=>{
    
    const [socket,setSocket]=useState<Socket|null>(null);
    const currentUser=useSelector((state:RootState)=>state.userSlice.currentUser);
    
    useEffect(()=>{
       if (!currentUser?._id) return;
        const newSocket =io(`${import.meta.env.VITE_BACKEND_URL}`,{
        query:{
          userId:currentUser?._id
        }
      });
      setSocket(newSocket);

          // cleanup on unmount   This will run whether it is about to re run or unmount
        return () => {
      newSocket.disconnect();
    };

    },[currentUser?._id]);
    return(
        <SocketContext.Provider value={socket}>
          {children}
        </SocketContext.Provider>
    )
}

export const useSocket=()=>{
  return useContext(SocketContext);
}