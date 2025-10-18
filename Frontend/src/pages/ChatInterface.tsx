import Sidebar from '../component/Sidebar'
import MessageArea from '../component/MessageArea'
import { useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react';
import axios from 'axios';
import { useDispatch, } from 'react-redux';
import { setCurrentUser } from '../Redux/userSlice';
import { useKeys } from '../customHooks/useKeys';
const ChatInterface = () => {
  const {publicKey,privateKey}=useKeys();
  function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((b) => binary += String.fromCharCode(b));
  return btoa(binary);
}

// Convert base64 back to Uint8Array

// Usage
if (privateKey) {
  localStorage.setItem('privateKey', uint8ArrayToBase64(privateKey));
}
  const { isSignedIn, getToken } = useAuth();
  const dispatch=useDispatch();

  const getCurrentUser = async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/users/getUser`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if(!response){
        throw new Error("User not found");
      }
      dispatch(setCurrentUser(response.data));
    } catch (error) {
        console.log(error);
    }
  }
  useEffect(() => {
    if (isSignedIn) {
      getCurrentUser();
    }
  }, [isSignedIn])

  useEffect(() => {
  const savePublicKey = async () => {
    if (!publicKey) return; // wait until keys are generated

    try {
      const token = await getToken();
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/users/setPublicKey`, {
        publicKey,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.error("Failed to save public key:", err);
    }
  };

  if (isSignedIn) savePublicKey();
}, [isSignedIn, publicKey]);

  return (
    <div className='flex w-full h-full overflow-hidden fixed top-20 left-0 right-0'>
      <Sidebar />
      <MessageArea  />
    </div>
  )
}

export default ChatInterface