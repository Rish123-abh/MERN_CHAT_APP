import {Routes,Route, Navigate} from 'react-router-dom'
import Home from './pages/Home.tsx'
import ChatInterface from './pages/ChatInterface.tsx';
import { useUser } from '@clerk/clerk-react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from './Redux/store';
import { setOnlineUsers } from './Redux/userSlice.ts';
import { useSocket } from './context/SocketProvider.tsx';
const App = () => {
  const {currentUser}=useSelector((state:RootState)=>state.userSlice);
  const dispatch=useDispatch();
  const {isSignedIn} =useUser();

  const socket=useSocket();
useEffect(() => {
  if (!socket) return; // wait until socket is initialized
 socket.emit("setup", currentUser?._id); 
  // connect event
  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });

  // online users event
  socket.on("getOnlineUsers", (users: string[]) => {
    dispatch(setOnlineUsers(users));
  });

  // cleanup to remove listeners on unmount or socket change
  return () => {
    socket.off("connect");
    socket.off("getOnlineUsers");
  };
}, [socket, dispatch]); // include socket here!

  return (
    <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Chat" element={ isSignedIn?<ChatInterface />:<Navigate to={"/"}/> } />
    </Routes>
)
}
export default App;
