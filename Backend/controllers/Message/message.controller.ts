import { Request, Response } from "express";
import Conversation from "../../models/conversation.model.js";
import Message from "../../models/message.model.js";
import User from "../../models/user.model.js";
import mongoose from "mongoose";
import { uploadToCloudinary } from "../../utils/cloudinary.js"
import { getReceiverSocketId, io } from "../../socket/socket.js";


export const sendMessage = async (req: Request, res: Response) => {
    try {
        let senderClerkId = req.auth?.().userId;
        let { receiver } = req.params;
        let { message,nonce } = req.body;

        if (!mongoose.Types.ObjectId.isValid(receiver)) {
            return res.status(400).json({ error: "Invalid receiver id" });
        }

        const receiverId = new mongoose.Types.ObjectId(receiver);

        const senderUser = await User.findOne({ clerkId: senderClerkId });
        if (!senderUser) {
            return res.status(404).json({ error: "Sender not found" });
        }
        let image;
        if (req.file) {
            image = await uploadToCloudinary(req.file.path);
        }
        let conversation = await Conversation.findOne({
            participants: { $all: [senderUser._id, receiverId] }
        })
        let newMessage = await Message.create({
            sender: senderUser._id,
            receiver: receiverId,
            message,
            nonce,
            image:image?.secure_url
        });
        await newMessage.populate("sender", "publicKey name username");
        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderUser._id, receiverId],
                messages: [newMessage._id]
            })
        }
        else {
            conversation.messages.push(newMessage._id as any);
            await conversation.save();
        }
        const receiverSocketId=getReceiverSocketId(receiver);
        console.log("RecieverIdFrom",receiverSocketId);
        if(receiverSocketId){
            io.to(receiverSocketId).emit("newMessage",newMessage);
        }
        return res.status(201).json(newMessage);
    } catch (error) {
        return res.status(500).json({ message: `Send Message Error:${error}` })
    }

}

export const getMessages = async (req: Request, res: Response) => {

    try {
        const { receiver } = req.params;
        const senderClerkId = req.auth?.().userId;
        if (!mongoose.Types.ObjectId.isValid(receiver)) {
            return res.status(400).json({ error: "Invalid receiver id" });
        }

        const receiverId = new mongoose.Types.ObjectId(receiver);
        const sender = await User.findOne({ clerkId: senderClerkId });
        if (!sender) {
            return res.status(400).json("Sender not found");
        }

          const conversation = await Conversation.findOne({
      participants: { $all: [sender._id, receiverId] }
    }).populate({
      path: "messages",
      populate: {
        path: "sender",
        select: "publicKey name username" // include only what is needed
      }
    });
        if (!conversation) {
            return res.status(400).json({ message: "Conversation not found" })
        }
        return res.status(200).json(conversation?.messages)
    } catch (error) {
        return res.status(500).json({ message: `Internal Server error : ${error} ` })
    }


}