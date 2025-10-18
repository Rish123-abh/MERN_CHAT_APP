import { useSelector } from "react-redux";
import { toast } from "react-hot-toast";

import type { RootState } from "../Redux/store";
import { IoMdArrowRoundBack } from "react-icons/io";
import { setSelectedUser } from "../Redux/userSlice";
import { useDispatch } from "react-redux";
import { GrEmoji } from "react-icons/gr";
import { IoVideocam } from "react-icons/io5";
import { FcAddImage } from "react-icons/fc";
import { GrSend } from "react-icons/gr";
import { PiUser } from "react-icons/pi";
import EmojiPicker, { SkinTonePickerLocation } from "emoji-picker-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import SenderMessage from "./SenderMessage.tsx";
import ReceiverMessage from "./ReceiverMessage.tsx";
import axios from "axios";
import { useAuth } from "@clerk/clerk-react";
import { setConversationMessage, type Message } from "../Redux/messageSlice.ts";
import Loader from "./Loader.tsx";
import { useSocket } from "../context/SocketProvider.tsx";
import { useClickOutside } from "../customHooks/useClickOutside.ts";
import { debounce } from 'lodash';
import Lottie from "react-lottie";
import animationData from "../assets/animation/typing.json";
import { useTheme } from "../context/useTheme.ts";
import { decryptMessage, encryptMessage } from "../customHooks/useKeys.ts";

const MessageArea = () => {
  const {theme}=useTheme();
  const {currentUser,selectedUser,onlineUsers,otherUsers} = useSelector(
    (state: RootState) => state.userSlice
  );
  const Messages = useSelector(
    (state: RootState) => state.messageSlice.messages
  );
  const socket=useSocket();
  // Inside your MessageArea component
const [localStream, setLocalStream] = useState<MediaStream | null>(null);
const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const { getToken } = useAuth();
  const dispatch = useDispatch();
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [typing,setTyping]=useState<boolean>(false);
  const [isTyping,setIsTyping]=useState<boolean>(false);
  const [message, setMessage] = useState("");
  const [frontendImage, setFrontendImage] = useState<string>("");
  const [backendImage, setBackendImage] = useState<File>();
  const [loading,setLoading]=useState<boolean>(false);
  const [isCalling, setIsCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit }|null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callerName, setCallerName] = useState("");
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);

  const image=useRef<HTMLInputElement>(null);
  const pickerRef=useClickOutside(()=>{
    setShowPicker(false);
  })
  function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };
useEffect(() => {
    if (!selectedUser || Messages.length === 0) return;

    const markMessagesAsRead = () => {
        // Get all unread messages from the selected user (messages I received)
        const unreadMessages = Messages.filter(
            (msg) => 
                msg.receiver === currentUser?._id && 
                msg.sender._id === selectedUser._id && 
                msg.status !== "read"
        );

        if (unreadMessages.length === 0) return;

        const messageIds = unreadMessages.map(msg => msg._id);

        // Notify sender via socket that messages are read
        socket?.emit("messages-read", {
            messageIds,
            senderId: selectedUser._id
        });

        // Update local state immediately
        const updatedMessages = Messages.map(msg => 
            messageIds.includes(msg._id) 
                ? { ...msg, status: "read" as const }
                : msg
        );
        dispatch(setConversationMessage(updatedMessages));
    };

    
    // Mark as read after a short delay (to ensure user actually saw them)
    const timer = setTimeout(markMessagesAsRead, 500);
    return () => clearTimeout(timer);
}, [selectedUser, Messages, currentUser, socket, dispatch]);
// Add at the top with other useRef declarations
const messagesRef = useRef(Messages);

// Keep messagesRef in sync with Messages
useEffect(() => {
    messagesRef.current = Messages;
}, [Messages]);

// Fixed socket listener
useEffect(() => {
    if (!socket) return;

    const handleMessagesReadUpdate = ({ messageIds }: { messageIds: string[] }) => {
        // Use messagesRef.current instead of Messages
        const updatedMessages = messagesRef.current.map(msg => 
            messageIds.includes(msg._id) 
                ? { ...msg, status: "read" as const }
                : msg
        );
        dispatch(setConversationMessage(updatedMessages));
    };

    socket.on("messages-read-update", handleMessagesReadUpdate);

    return () => {
        socket.off("messages-read-update", handleMessagesReadUpdate);
    };
}, [socket, dispatch]); // Messages NOT in dependencies!
  const handleImageChange=(e:React.ChangeEvent<HTMLInputElement>)=>{
    if(e.target.files && e.target.files[0]){
      const file=e.target.files[0];
      setBackendImage(file);
      const imageUrl=URL.createObjectURL(file);
      setFrontendImage(imageUrl);
    }
  }

  const getAllMessages = async()=>{
    const privateKeyArray = localStorage.getItem('privateKey') 
  ? base64ToUint8Array(localStorage.getItem('privateKey')!) 
  : null;
    if(!privateKeyArray){
      return;
    }
    setLoading(true);
    setFrontendImage("")
    dispatch(setConversationMessage([]));
    const token=await getToken();
    try {
      const result=await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/message/get/${selectedUser?._id}`,
        {
          headers:{
            Authorization: `Bearer ${token}`
          }
        }
      )
      const decryptedMessages = await Promise.all(
      result.data.map(async (msg:Message) => {
        try {
             const keyToUse =
        msg.sender._id === currentUser?._id
          ? selectedUser?.publicKey // your own sent message → use receiver’s public key
          : msg.sender.publicKey;   // received message → use sender’s public key
          if(!keyToUse){
            return;
          }
          const plainText = await decryptMessage(
            msg.message,
            msg.nonce,
           keyToUse,
            privateKeyArray
          );
          return { ...msg, message: plainText };
        } catch(error) {
          console.log(error);
          return { ...msg, message: "[decryption failed]" };
        }
      })
    );
      dispatch(setConversationMessage(decryptedMessages));
    } catch (error) {
      dispatch(setConversationMessage([]));
      console.log(error);
    }
    finally{
      setLoading(false);
    }
  }

  // This effect handles attaching the local stream
useEffect(() => {
  const videoEl = localVideoRef.current;
  if (!videoEl || !localStream) return;

  if (videoEl.srcObject !== localStream) {
    videoEl.srcObject = localStream;
    videoEl.muted = true;
    
    // Ensure video plays
    const playVideo = async () => {
      try {
        await videoEl.play();
      } catch (err) {
        console.warn("⚠️ Local video autoplay prevented:", err);
      }
    };

    if (videoEl.readyState >= 2) {
      playVideo();
    } else {
      videoEl.onloadedmetadata = playVideo;
    }
  }

  return () => {
    if (videoEl) videoEl.onloadedmetadata = null;
  };
}, [localStream]);

useEffect(() => {
  const videoEl = remoteVideoRef.current;

  if (!videoEl || !remoteStream) return;

  // Prevent re-attaching the same stream
  if (videoEl.srcObject === remoteStream) {
    return;
  }


  videoEl.srcObject = remoteStream;

  // Use a more reliable play approach
  const playVideo = async () => {
    try {
      await videoEl.play();
    } catch (err) {
      console.warn("⚠️ Remote video autoplay prevented:", err);
      // Fallback: try again after a short delay
      setTimeout(async () => {
        try {
          await videoEl.play();
        } catch (retryErr) {
          console.error("❌ Failed to play remote video:", retryErr);
        }
      }, 500);
    }
  };

  // Wait for metadata to load before playing
  if (videoEl.readyState >= 2) { // HAVE_CURRENT_DATA or higher
    playVideo();
  } else {
    videoEl.onloadedmetadata = () => {
      playVideo();
    };
  }

  return () => {
    videoEl.onloadedmetadata = null;
  };
}, [remoteStream]);

useEffect(() => {
  const pc = peerConnectionRef.current;
  if (!pc) return;

  const logConnectionState = () => {
    console.log("🔗 Connection States:", {
      iceConnection: pc.iceConnectionState,
      connection: pc.connectionState,
      signaling: pc.signalingState,
      localDescription: !!pc.localDescription,
      remoteDescription: !!pc.remoteDescription
    });
  };

  pc.addEventListener('iceconnectionstatechange', logConnectionState);
  pc.addEventListener('connectionstatechange', logConnectionState);
  pc.addEventListener('signalingstatechange', logConnectionState);

  return () => {
    pc.removeEventListener('iceconnectionstatechange', logConnectionState);
    pc.removeEventListener('connectionstatechange', logConnectionState);
    pc.removeEventListener('signalingstatechange', logConnectionState);
  };
}, [peerConnectionRef.current]);
  const cleanupPeerConnection = () => {
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Stop all local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }

    // Clear video elements
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    // Clear pending candidates
    pendingCandidatesRef.current = [];
  };

const createPeerConnection = async (isInitiator: boolean) => {
  const response = 
  await fetch("https://samvaad.metered.live/api/v1/turn/credentials?apiKey=3939c2a4291d1ad57bf440ebba7b16f36534");

// Saving the response in the iceServers array
const iceServers = await response.json();
  const pc = new RTCPeerConnection({ 
    iceServers: [
        ...iceServers,
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun3.l.google.com:19302" },
      { urls: "stun:stun4.l.google.com:19302" },

    ],
    iceCandidatePoolSize: 10,
  });
    
  pc.ontrack = (event) => {
    const [stream] = event.streams;
    
    if (!stream) {
      console.error("❌ No stream in ontrack event!");
      return;
    }
    
    setRemoteStream(stream);
  };

  pc.onicecandidate = event => {
    if (event.candidate) {
      const targetId = isInitiator ? selectedUser?._id : incomingCall?.from;
      socket?.emit("ice-candidate", { 
        to: targetId, 
        candidate: event.candidate 
      });
    } else {
      console.log("✅ All ICE candidates have been sent");
    }
  };

  pc.oniceconnectionstatechange = () => {
    
    // Give more time before considering it failed
    if (pc.iceConnectionState === 'failed') {
      console.log("❌ ICE Connection failed - attempting restart");
      // Try to restart ICE
      pc.restartIce();
      
      // If still failing after 5 seconds, end call
      setTimeout(() => {
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          console.log("❌ ICE Connection permanently failed");
          handleEndCall();
        }
      }, 5000);
    } else if (pc.iceConnectionState === 'closed') {
      console.log("🔒 ICE Connection closed");
      handleEndCall(false);
    } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      console.log("✅ ICE Connection established successfully");
    }
  };

  pc.onconnectionstatechange = () => {
    console.log("🔗 Connection State:", pc.connectionState);
  };

  pc.onicegatheringstatechange = () => {
    console.log("🧊 ICE Gathering State:", pc.iceGatheringState);
  };

  return pc;
};
  const handleStartVideoCall = async () => {
  if (!selectedUser) return;

  try {
    cleanupPeerConnection();
    setIsCalling(true);

    // ✅ Step 1: Ensure camera/mic access with stable constraints
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

setLocalStream(localStream);
localStreamRef.current = localStream;

    // ✅ Step 2: Attach local video with slight delay (avoids autoplay AbortError)
    const localEl = localVideoRef.current;
    if (localEl) {
      localEl.srcObject = localStream;
      localEl.muted = true;
      await new Promise<void>((resolve) => {
        localEl.onloadedmetadata = () => {
          localEl.play().catch(() => {}); // ignore autoplay errors
          resolve();
        };
      });
    }

    // ✅ Step 3: Create peer connection before offer
    const pc = await createPeerConnection(true);
    peerConnectionRef.current = pc;

    // ✅ Step 4: Add local tracks before creating offer
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    // ✅ Step 5: Create and set offer only after tracks are added
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
    await pc.setLocalDescription(offer);

    // ✅ Step 6: Send offer through signaling
    socket?.emit("call-user", { 
      to: selectedUser._id, 
      offer,
      from: currentUser?._id 
    });

  } catch (error) {
    console.error("❌ Error starting video call:", error);
    setIsCalling(false);
    cleanupPeerConnection();
  }
};


  const handleAcceptCall = async () => {
  if (!incomingCall) return;

  try {
    cleanupPeerConnection();
    setCallAccepted(true);

    // Step 1: Get local stream first
    const localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    setLocalStream(localStream);
    localStreamRef.current = localStream;

    const localEl = localVideoRef.current;
    if (localEl) {
      localEl.srcObject = localStream;
      localEl.muted = true;
      await new Promise<void>((resolve) => {
        localEl.onloadedmetadata = () => {
          localEl.play().catch(() => {});
          resolve();
        };
      });
    }

    // Step 2: Create peer connection
    const pc = await createPeerConnection(false);
    peerConnectionRef.current = pc;

    // Step 3: Add local tracks FIRST (before setting remote description)
    localStream.getTracks().forEach(track => {
      const sender = pc.addTrack(track, localStream);
      console.log(`Added ${track.kind} track:`, sender);
    });

    // Step 4: Set remote description
    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

    // Step 5: Add pending ICE candidates
    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("Error adding pending candidate:", err);
      }
    }
    pendingCandidatesRef.current = [];

    // Step 6: Create and send answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket?.emit("answer-call", { 
      to: incomingCall.from, 
      answer 
    });

    setIncomingCall(null);
  } catch (error) {
    console.error("❌ Error accepting call:", error);
    handleRejectCall();
  }
};


  const handleRejectCall = () => {
    cleanupPeerConnection();

    if (incomingCall) {
      socket?.emit("reject-call", { to: incomingCall.from });
    }

    setIncomingCall(null);
    setCallAccepted(false);
    setIsCalling(false);
  };
const handleEndCall = (emit = true) => {
  
  if (emit && selectedUser?._id) {
    socket?.emit("end-call", { to: selectedUser._id });
  }

  // Use setTimeout to ensure cleanup happens after state updates
  setTimeout(() => {
    cleanupPeerConnection();
    setIsCalling(false);
    setCallAccepted(false);
    setIncomingCall(null);
    setLocalStream(null);
    setRemoteStream(null);
  }, 300); 
};

  useEffect(()=>{
    if(selectedUser){
      getAllMessages();
    }
  },[selectedUser]);

  useEffect(()=>{
    socket?.on("newMessage",async (message)=>{
       const storedPrivateKey = localStorage.getItem("privateKey");
    if (!storedPrivateKey) return; // cannot decrypt

    const privateKeyArray = base64ToUint8Array(storedPrivateKey);
      
    const decryptedMessage = { ...message };
    try {
      decryptedMessage.message = await decryptMessage(
        message.message,
        message.nonce,
        message.sender.publicKey,
        privateKeyArray
      );
    } catch {
      decryptedMessage.message = "[decryption failed]";
    }
      dispatch(setConversationMessage([...Messages,decryptedMessage]));
    });
    return ()=>{socket?.off("newMessage")};
  },[Messages,dispatch,socket]);

  // const listenersAdded = useRef(false);
  useEffect(() => {
    if (!socket ) return;

    const handleIncomingCall = ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
      setIncomingCall({ from, offer });
      
      const caller = otherUsers.find((user) => user._id === from);
      if (caller) {
        setCallerName(caller.username);
      }
    };

    const handleCallAnswered = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          
          // Add any pending ICE candidates
          for (const candidate of pendingCandidatesRef.current) {
            try {
              await peerConnectionRef.current.addIceCandidate(candidate);
            } catch (err) {
              console.error("Error adding pending candidate:", err);
            }
          }
          pendingCandidatesRef.current = [];
          
          setIsCalling(false);
          setCallAccepted(true);
        }
      } catch (error) {
        console.error("Error setting remote description:", error);
      }
    };

    const handleIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      try {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Queue candidates until remote description is set
          pendingCandidatesRef.current.push(new RTCIceCandidate(candidate));
        }
      } catch (error) {
        console.error("Error adding received ICE candidate", error);
      }
    };

    const handleCallEnded = () => {
  setTimeout(() => {
    handleEndCall(false);
  }, 200);
};

    const handleCallRejected = () => {
      handleEndCall();
      setIsCalling(false);
      toast.error(" Call was rejected by the user.", {
    duration: 3000,
    style: {
      borderRadius: "10px",
      background: "#333",
      color: "#fff",
    },
  });
    };

    const handleTyping = () => setIsTyping(true);
    const handleStopTyping = () => setIsTyping(false);

    socket.on("incoming-call", handleIncomingCall);
    socket.on("call-answered", handleCallAnswered);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("call-ended", handleCallEnded);
    socket.on("call-rejected", handleCallRejected);
    socket.on("typing", handleTyping);
    socket.on("stop typing", handleStopTyping);
    // listenersAdded.current = true;
    return () => {
      socket.off("incoming-call", handleIncomingCall);
      socket.off("call-answered", handleCallAnswered);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("call-ended", handleCallEnded);
      socket.off("call-rejected", handleCallRejected);
      socket.off("typing", handleTyping);
      socket.off("stop typing", handleStopTyping);
    };
  }, [socket,otherUsers]);

  const debouncedStopTyping = useMemo(() => {
    return debounce(() => {
      setTyping(false);
      socket?.emit("stop typing", selectedUser?._id);
    }, 2000);
  }, [socket, selectedUser]);

  useEffect(() => {
    return () => {
      debouncedStopTyping.cancel();
    };
  }, [debouncedStopTyping]);

  const handleSendMessage=async(e: React.FormEvent<HTMLFormElement>)=>{
    e.preventDefault();
    if(message==="" && frontendImage===""){
      return;
    }
     const privateKeyArray = localStorage.getItem('privateKey') 
  ? base64ToUint8Array(localStorage.getItem('privateKey')!) 
  : null;
    if(!privateKeyArray){
      return;
    }
    if(!selectedUser?.publicKey){
      return;
    }
      const { ciphertext, nonce } = await encryptMessage(message, selectedUser?.publicKey, privateKeyArray);
    const formData:FormData=new FormData();

    formData.append("message",ciphertext)  
      formData.append("nonce", nonce);  
    if(backendImage){
      formData.append("image",backendImage)
    }

    const token=await getToken();
    try {
      const result=await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/message/send/${selectedUser?._id}`,
        formData,{
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          }
        },
      );
        let plainTextMessage = message;
      plainTextMessage = await decryptMessage(
        ciphertext,
        nonce,
        selectedUser.publicKey,
        privateKeyArray
      );
          const normalizedMessage = {
      ...result.data,
      message: plainTextMessage,
    };
      dispatch(setConversationMessage([...Messages,normalizedMessage]));
      setMessage("");
      setFrontendImage("");
      setBackendImage(undefined);

    } catch (error) {
      console.log("Error while sending message",error);
    }
  }

  const OnEmojiClick = (emoji: EmojiClickData) => {
    setShowPicker((prev) => !prev);
    setMessage((prev) => prev + emoji?.emoji);
  };

  const handleMessageChange=( e: React.ChangeEvent<HTMLInputElement>)=>{
    setMessage(e.target.value);
    if(!typing){
      setTyping(true);
      socket?.emit("typing",selectedUser?._id);
    }
    debouncedStopTyping();
  }

  return (
    <div
      className={`${
        selectedUser ? "flex flex-col" : "hidden"
      } lg:flex lg:flex-col w-full lg:w-[70%] h-[94%] lg:h-[90%] ${theme==='dark'?"bg-gray-900":"bg-slate-300"}  border-l-2 border-gray-300`}
    >
      {selectedUser ? (
        <>
          {/* Top bar */}
          <div className={`w-full bg-gradient-to-r from-blue-400 to-indigo-500 h-[80px] shadow-lg ${theme==='dark'?"":"shadow-gray-500"}  rounded-b-2xl flex justify-between items-bottom p-6 gap-3`}>
            <div className="flex items-center p-4 gap-3">
              <div>
                <IoMdArrowRoundBack
                  className="font-bold h-6 w-6 cursor-pointer text-white"
                  onClick={() => dispatch(setSelectedUser(null))}
                />
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white">
                {selectedUser?.image ? (
                  <img
                    src={selectedUser.image}
                    alt={selectedUser.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <PiUser className="w-full h-full text-black" />
                )}
              </div>
              <div className="flex flex-col">
                <div className="font-bold text-white text-lg">
                  {selectedUser.username}
                </div>
                <div>
                  {onlineUsers.includes(selectedUser?._id) ? (
                    <span className="text-[#6fff00f4] font-bold">Online</span>
                  ) : (
                    <span className="text-[#4c514e] font-bold">Offline</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <IoVideocam className="w-7 h-7 cursor-pointer text-white" onClick={handleStartVideoCall} />
            </div>
          </div>

          {/* Incoming Call Modal */}
          {incomingCall && !callAccepted && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl text-center">
                <h2 className="text-xl mb-4">📞 Incoming Call</h2>
                <p className="text-lg mb-6">from {callerName || "Someone"}</p>
                <div className="flex justify-center gap-6">
                  <button
                    onClick={handleAcceptCall}
                    className="bg-green-500 px-5 py-2 rounded-lg text-white hover:bg-green-600"
                  >
                    Accept
                  </button>
                  <button
                    onClick={handleRejectCall}
                    className="bg-red-500 px-5 py-2 rounded-lg text-white hover:bg-red-600"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Calling Screen */}
          {/* Calling Screen - Only show if not yet accepted and no local stream */}
{/* Video Chat */}
{(callAccepted || isCalling) && localStream && (
  <div className="fixed inset-0 bg-black flex items-center justify-center z-40">
    <div className="relative w-full h-full">
      {/* Remote Video - Full Screen with proper aspect ratio */}
      {remoteStream ? (
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline
          className="w-full h-full object-contain bg-black" 
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
          <div className="animate-pulse">
            <IoVideocam className="w-20 h-20 text-gray-600 mb-4" />
          </div>
          <p className="text-white text-xl font-semibold">Connecting...</p>
          <p className="text-gray-400 text-sm mt-2">Waiting for {selectedUser?.username}</p>
        </div>
      )}
      
      {/* Local Video - Picture in Picture with better styling */}
      <div className="absolute top-4 right-4 md:bottom-4 md:top-auto">
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline
          muted
          className="w-32 h-24 md:w-64 md:h-48 rounded-xl border-4 border-white/30 object-cover shadow-2xl backdrop-blur-sm transform hover:scale-105 transition-transform duration-200" 
        />
        <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md">
          <p className="text-white text-xs font-semibold">You</p>
        </div>
      </div>
      
      {/* Call Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-4">
        <button
          onClick={()=>handleEndCall()}
          className="bg-red-500 hover:bg-red-600 px-8 py-4 rounded-full text-white font-semibold shadow-2xl transition-all duration-200 hover:scale-110 flex items-center gap-2"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
          </svg>
          End Call
        </button>
      </div>

      {/* Connection Status Indicator */}
      {remoteStream && (
        <div className="absolute top-4 left-4 bg-green-500/80 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          <span className="text-white text-sm font-semibold">Connected</span>
        </div>
      )}
    </div>
  </div>
)}

           {/* Video Chat */}
{(callAccepted || isCalling) && localStream && (
  <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40">
    <div className="relative w-full h-full flex items-center justify-center">
      {/* Remote Video - Full Screen */}
      {remoteStream ? (
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline
          className="w-full h-full object-cover" 
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-gray-900">
          <p className="text-white text-xl">Connecting...</p>
        </div>
      )}
      
      {/* Local Video - Picture in Picture */}
      <video 
        ref={localVideoRef} 
        autoPlay 
        playsInline
        muted
        className="absolute bottom-4 right-4 w-32 h-24 md:w-60 md:h-52 rounded-md border-2 border-white object-cover shadow-lg" 
      />
      
      <button
        onClick={()=>handleEndCall()}
        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-red-500 px-6 py-3 rounded-full text-white hover:bg-red-600 shadow-lg"
      >
        End Call
      </button>
    </div>
  </div>
)}

          {/* Messages Area */}
          <div className="p-4 flex gap-2 flex-1 flex-col overflow-y-auto">
            {loading ? (
              <Loader />
            ) : Messages.length === 0 ? (
              <p className="text-gray-600">
                Start chatting with {selectedUser?.username}...
              </p>
            ) : (
              <div className="flex flex-col gap-5 relative">
                {Messages && Messages.map((mess) =>
                  mess.sender._id === currentUser?._id ? (
                    // <SenderMessage key={mess._id} image={mess.image ?? ""} message={mess.message} time={mess.createdAt} status={status}/>
                    <SenderMessage key={mess._id} {...mess}/>
                  ) : (
                    // <ReceiverMessage key={mess._id} image={mess.image ?? ""} message={mess.message} />
                    <ReceiverMessage key={mess._id} {...mess} />
                  )
                )}

                {showPicker && (
                  <div ref={pickerRef} className="w-fit">
                    <EmojiPicker
                      skinTonePickerLocation={SkinTonePickerLocation.PREVIEW}
                      height={450}
                      className="shadow-lg shadow-gray-500"
                      onEmojiClick={OnEmojiClick}
                    />
                  </div>
                )}
              </div>
            )}
            {isTyping ? (
              <div>
                <Lottie
                  options={defaultOptions}
                  width={70}
                  style={{ marginBottom: 15, marginLeft: 0 }}
                />
              </div>
            ) : (
              <></>
            )}
          </div>

          {/* Message Field */}
          <div className="w-full flex flex-col items-center justify-center p-4">
            <form
              onSubmit={handleSendMessage}
              className={`w-full relative lg:w-[70%] flex gap-3 items-center justify-start rounded-2xl p-3 ${theme==="dark"?"":"shadow-gray-400"}  shadow-lg bg-gradient-to-r from-indigo-300 to-indigo-100`}
            >
              <GrEmoji
                className="cursor-pointer text-black h-7 w-7"
                onClick={() => {
                  setShowPicker((prev) => !prev);
                }}
              />
              <input
                type="text"
                name="message"
                value={message}
                onChange={handleMessageChange}
                className="text-black font-semibold w-full border-0 outline-0 p-2"
                placeholder="Write Message..."
              />
              <input
                type="file"
                accept="image/*"
                name="frontendImage"
                hidden
                ref={image}
                onChange={handleImageChange}
              />
              <FcAddImage
                className="cursor-pointer h-10 w-10"
                onClick={() => image.current?.click()}
              />
              {(message !== "" || frontendImage !== "") && (
                <button>
                  <GrSend className="cursor-pointer h-7 w-7 text-black" />
                </button>
              )}
              {frontendImage && (
                <img
                  src={frontendImage}
                  className="absolute h-40 w-40 rounded-2xl -top-44 left-1/2 -translate-x-1/2"
                />
              )}
            </form>
          </div>
        </>
      ) : (
        <div className="hidden lg:flex items-center justify-center h-screen font-bold text-gray-500 text-lg">
          Select a user to start chatting
        </div>
      )}
    </div>
  );
};

export default MessageArea;