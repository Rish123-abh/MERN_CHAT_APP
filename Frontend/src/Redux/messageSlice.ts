import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
export interface Sender {
  _id: string;
  publicKey: string;  // base64
  name?: string;
  username?: string;
}
export interface Message {
  _id: string;
  sender: Sender;      // userId
  receiver: string;    // userId
  message: string;     // text content
  nonce:string;
  image: string | null; // URL or null if no image
  status: "sent" | "read"; // Updated status to include all states
  createdAt: string;   // ISO date string
  updatedAt: string;   // ISO date string   
  __v: number;
}
const initialState:{messages:Message[]}={
    messages:[],
}
const messageSlice=createSlice({
    name:"messageSlice",
    initialState,
    reducers:{
        setConversationMessage:(state,action:PayloadAction<Message[]>)=>{
            state.messages=action.payload
        }
    }
});
export const {setConversationMessage} = messageSlice.actions;
export default messageSlice.reducer;