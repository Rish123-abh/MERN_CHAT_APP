import dotenv from 'dotenv';
dotenv.config();
import express, { Application } from 'express';
import cors from 'cors';
import dbConnect from './config/db.js';
import userRoutes from './routes/UserRoutes/user.routes.js';
import bodyParser from 'body-parser';
import { verifyClerkWebhook } from './controllers/Users/user.controller.js';
import messageRoutes from './routes/MessageRoutes/message.routes.js'
import { app, server } from './socket/socket.js';



const port:number= Number(process.env.PORT) || 5000;
app.use(cors({
  origin:process.env.FRONTEND_URL,
  // origin: "*" ,
  credentials:true
}));

app.use(
  '/clerk-webhook',
  bodyParser.raw({ type: 'application/json' }),
  verifyClerkWebhook
);
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/message',messageRoutes); 

server.listen(port, () => {
     dbConnect();
    console.log(`✅ Server started at http://localhost:${port}`);
});
