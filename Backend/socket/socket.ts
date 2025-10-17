import http from 'http';
import express from 'express';
import { Server } from 'socket.io';
import Message from '../models/message.model.js';
const app=express();
import dotenv from 'dotenv';
dotenv.config();

const server=http.createServer(app);

const io=new Server(server,{
   cors:{
    origin:process.env.FRONTEND_URL,
    // origin:"*"
   } 
});
type mapType={
    [userId:string]:string
}
 const userSocketMap:mapType={};

 export const getReceiverSocketId=(receiver:string):string=>{
    return userSocketMap[receiver];
 }
io.on("connection",(socket)=>{  
    // const userParamId=socket.handshake.query.userId;
    //  const userId = Array.isArray(userParamId) ? userParamId[0] : userParamId;
    // // This keeps track of online users
    //  if(userId!=undefined){
    //     userSocketMap[userId]=socket.id;
    // }
    socket.on("setup", (userId: string) => {
      socket.data.userId = userId;
    userSocketMap[userId] = socket.id;

    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });

    // io.emit("getOnlineUsers",Object.keys(userSocketMap));

    // socket.on("disconnect",()=>{
    //        if (userId !== undefined) {
    //   delete userSocketMap[userId]; // remove from map
    // }

    // // Notify everyone about the updated online list
    // // first parameter is name of event
    // io.emit("getOnlineUsers", Object.keys(userSocketMap));
    // })
      socket.on("disconnect", () => {
    for (const id in userSocketMap) {
      if (userSocketMap[id] === socket.id) {
        delete userSocketMap[id];
      }
    }
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });


    socket.on("typing",(receiverId)=>{
      socket.to(getReceiverSocketId(receiverId)).emit("typing");
    })
    socket.on("stop typing",(receiverId)=>{
      console.log("Stop typing event received for receiverId:", receiverId);
      socket.to(getReceiverSocketId(receiverId)).emit("stop typing");
    })
  socket.on("messages-read", async ({ messageIds, senderId }) => {
    await Message.updateMany(
    { _id: { $in: messageIds } },
    { $set: { status: "read" } }
  );
        const senderSocketId = getReceiverSocketId(senderId);
        if (senderSocketId) {
            io.to(senderSocketId).emit("messages-read-update", {
                messageIds,
                status: "read"
            });
        }
    });
      socket.on("call-user", ({ to, offer }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("incoming-call", {
        from: socket.data.userId,
        offer,
      });
    }
  });

  // 2️⃣ Callee sends an answer
  socket.on("answer-call", ({ to, answer }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-answered", { answer });
    }
  });

  // 3️⃣ Both users exchange ICE candidates
  socket.on("ice-candidate", ({ to, candidate }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("ice-candidate", { candidate });
    }
  });
    socket.on("end-call", ({ to }) => {
    const receiverSocketId = getReceiverSocketId(to);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("call-ended");
    }
  });
    socket.on("reject-call", ({ to }) => {
    const receiverSocket = getReceiverSocketId(to);
    if (receiverSocket) {
      io.to(receiverSocket).emit("call-rejected", { from: socket.data.userId});
    }
  });
})
export{app,server,io};
