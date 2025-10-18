import { useSelector } from "react-redux";
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
import { IoCall } from "react-icons/io5";
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
          console.log("Decrypting message:", msg);
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
      console.log("Get Message",result.data);
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
  if (localVideoRef.current && localStream) {
    console.log("Attaching local stream to video element.");
    localVideoRef.current.srcObject = localStream;
  }
}, [localStream]);

// This effect handles attaching the remote stream
useEffect(() => {
  if (remoteVideoRef.current && remoteStream) {
    console.log("Attaching remote stream to video element.");
    remoteVideoRef.current.srcObject = remoteStream;
    // We still force play here just in case
    remoteVideoRef.current.play().catch(e => console.error("Remote play failed", e));
  }
}, [remoteStream]);

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

  const createPeerConnection = (isInitiator: boolean) => {
    const pc = new RTCPeerConnection({ 
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ] 
    });

    pc.ontrack = event => {
  console.log("Remote track received", event.streams[0]);
  setRemoteStream(event.streams[0]);
  if (remoteVideoRef.current && event.streams[0]) {
    // 1. Attach the stream to the video element
    remoteVideoRef.current.srcObject = event.streams[0];

    // 2. Explicitly tell the video to play
    const playPromise = remoteVideoRef.current.play();

    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error("Autoplay was prevented:", error);
        // As a fallback, you could show a "Click to play" button here
      });
    }
  }
};

    pc.onicecandidate = event => {
      if (event.candidate) {
        const targetId = isInitiator ? selectedUser?._id : incomingCall?.from;
        console.log("Sending ICE candidate to:", targetId);
        socket?.emit("ice-candidate", { 
          to: targetId, 
          candidate: event.candidate 
        });
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE Connection State:", pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || 
          pc.iceConnectionState === 'failed' ||
          pc.iceConnectionState === 'closed') {
        handleEndCall();
      }
    };

    return pc;
  };

  const handleStartVideoCall = async () => {
    if (!selectedUser) return;

    try {
      cleanupPeerConnection();
      setIsCalling(true);

      // Request media with mobile-friendly constraints
      const localStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      setLocalStream(localStream);
      localStreamRef.current = localStream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      const pc = createPeerConnection(true);
      peerConnectionRef.current = pc;

      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log("Sending call to:", selectedUser._id);
      socket?.emit("call-user", { 
        to: selectedUser._id, 
        offer,
        from: currentUser?._id 
      });

    } catch (error) {
      console.error("Error starting video call:", error);
      alert("Failed to access camera/microphone. Please check permissions.");
      setIsCalling(false);
      cleanupPeerConnection();
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    try {
      cleanupPeerConnection();
      setCallAccepted(true);

      // Request media with mobile-friendly constraints
      const localStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      setLocalStream(localStream);
      localStreamRef.current = localStream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
      }

      const pc = createPeerConnection(false);
      peerConnectionRef.current = pc;

      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });

      // Set remote description first
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));

      // Add any pending ICE candidates
      for (const candidate of pendingCandidatesRef.current) {
        try {
          await pc.addIceCandidate(candidate);
        } catch (err) {
          console.error("Error adding pending candidate:", err);
        }
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("Sending answer to:", incomingCall.from);
      socket?.emit("answer-call", { 
        to: incomingCall.from, 
        answer 
      });

      setIncomingCall(null);

    } catch (error) {
      console.error("Error accepting call:", error);
      alert("Failed to accept call. Please check permissions.");
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
    cleanupPeerConnection();

    if (emit && selectedUser?._id) {
      socket?.emit("end-call", { to: selectedUser._id });
    }

    setIsCalling(false);
    setCallAccepted(false);
    setIncomingCall(null);
  };

  useEffect(()=>{
    if(selectedUser){
      getAllMessages();
    }
  },[selectedUser]);

  useEffect(()=>{
    socket?.on("newMessage",async (message)=>{
      console.log("New message received via socket:", message);
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
      console.log("Incoming call from:", from);
      setIncomingCall({ from, offer });
      
      const caller = otherUsers.find((user) => user._id === from);
      if (caller) {
        setCallerName(caller.username);
      }
    };

    const handleCallAnswered = async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
      console.log("Call answered");
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
      console.log("Received ICE candidate");
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
      console.log("Call ended by remote peer");
      handleEndCall(false);
    };

    const handleCallRejected = () => {
      console.log("Call rejected");
      handleEndCall();
      setIsCalling(false);
      alert("Call was rejected by the user.");
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
      console.log("Stopped typing");
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
      console.log(result.data);
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
              <IoCall className="w-7 h-7 cursor-pointer text-white" />
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
          {isCalling && !callAccepted && (
            <div className="fixed inset-0 bg-black/60 flex flex-col items-center justify-center z-50">
              <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl text-center animate-pulse">
                <h2 className="text-xl mb-2">📞 Calling...</h2>
                <p className="text-lg">{selectedUser?.username}</p>
                <button
                  onClick={() => {
                    handleEndCall();
                  }}
                  className="mt-4 bg-red-500 px-5 py-2 rounded-lg hover:bg-red-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Video Chat */}
          {callAccepted && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-40">
              <div className="relative w-full h-full flex items-center justify-center">
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline
                  className="w-full h-full object-cover" 
                />
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline
                  muted
                  className="absolute bottom-4 right-4 w-32 h-24 md:w-40 md:h-32 rounded-md border-2 border-white object-cover" 
                />
                <button
                  onClick={()=>handleEndCall()}
                  className="absolute top-3 right-3 bg-red-500 px-3 py-2 rounded-md text-white hover:bg-red-600"
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