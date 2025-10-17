import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface User{
    _id: string;
  clerkId: string;
  username: string;
  email: string;
  image: string;
  publicKey:string|undefined;
  createdAt: string; // or Date if you convert it
  updatedAt: string; // or Date if you convert it
  __v: number;
}

interface UserState {
  otherUsers:User[],
  selectedUser:User|null 
  currentUser:User|null,
  onlineUsers:string[],
}

const initialState: UserState = {
  currentUser:null,
  otherUsers: [],
  selectedUser:null,
  onlineUsers:[]
};

const userSlice = createSlice({
  name: "userSlice",
  initialState,
  reducers: {
    setCurrentUser:(state,action:PayloadAction<User|null>)=>{
      state.currentUser=action.payload
    },
    setOtherUsers: (state, action: PayloadAction<User[]>) => {
      state.otherUsers = action.payload;
    },
    setSelectedUser: (state, action: PayloadAction<User|null>) => {
      state.selectedUser = action.payload;
    },
    setOnlineUsers: (state, action: PayloadAction<string[]>) => {
      state.onlineUsers = action.payload;
    },
  },
});

export const { setCurrentUser,setOtherUsers ,setSelectedUser,setOnlineUsers} = userSlice.actions;
export default userSlice.reducer;
