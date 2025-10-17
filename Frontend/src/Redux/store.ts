import {configureStore} from '@reduxjs/toolkit';
import userSlice from './userSlice';
import messageSlice from './messageSlice';

export  const store=configureStore({
    reducer:{
        userSlice,
        messageSlice
    }
}) 

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;