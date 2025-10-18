import Sidebar from '../component/Sidebar';
import MessageArea from '../component/MessageArea';
import { useAuth } from '@clerk/clerk-react';
import { useEffect } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { setCurrentUser } from '../Redux/userSlice';
import { useKeys } from '../customHooks/useKeys';

const ChatInterface = () => {
  const { publicKey, privateKey } = useKeys();
  const { isSignedIn, getToken } = useAuth();
  const dispatch = useDispatch();

  // Helper to convert Uint8Array to a URL-safe Base64 string
  const uint8ArrayToBase64 = (bytes: Uint8Array) => {
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  };

  useEffect(() => {
    // This single function now handles everything
    const syncUserWithBackend = async (key: string) => {
      if (!key) return; // Exit if the public key isn't generated yet

      try {
        const token = await getToken();

        // Use a single POST request to a "get-or-create" endpoint
        const response = await axios.post(
          `${import.meta.env.VITE_BACKEND_URL}/api/users/get-or-create-user`,
          {
            // Send the public key in the request body
            publicKey,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // The backend returns the complete user object, which we save to Redux
        dispatch(setCurrentUser(response.data));

        // Now that user is synced, save the private key securely in localStorage
        if (privateKey) {
          localStorage.setItem('privateKey', uint8ArrayToBase64(privateKey));
        }
      } catch (error) {
        console.error("Error syncing user with backend:", error);
      }
    };

    // This effect runs only when the user is signed in AND the public key has been generated
    if (isSignedIn && publicKey) {
      syncUserWithBackend(publicKey);
    }
  }, [isSignedIn, publicKey, privateKey, getToken, dispatch]); // Add all dependencies

  return (
    <div className='flex w-full h-full overflow-hidden fixed top-20 left-0 right-0'>
      <Sidebar />
      <MessageArea />
    </div>
  );
};

export default ChatInterface;