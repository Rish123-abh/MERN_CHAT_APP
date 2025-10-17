import mongoose,{Document,Schema} from   "mongoose";

export interface IMessage extends Document{
    sender:Schema.Types.ObjectId | string,
    receiver:Schema.Types.ObjectId |string,
    message?:string,
    nonce:string,
    image?:string,
    createdAt?:Date,
    updatedAt?:Date,
    status:"sent" | "read"
}

const messageSchema=new Schema<IMessage>({
    sender:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    receiver:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    message: { type: String, required: true },
    nonce: { type: String, required: true },   
    image:{
        type:String,
        default:""

    },
    status:{
        type:String,
        enum:["sent","read"],
        default:"sent"
    }

},{timestamps:true});

 const Message=mongoose.model<IMessage>('Message',messageSchema);
 export default Message;