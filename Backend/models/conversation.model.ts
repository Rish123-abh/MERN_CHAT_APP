import mongoose,{Document,Schema} from "mongoose";
import { IUser } from "./user.model";

export  interface IConversation extends Document{
participants:(Schema.Types.ObjectId|string|IUser)[],
messages:(Schema.Types.ObjectId|string)[],
createdAt?:Date,
    updatedAt?:Date
}
const conversationSchema=new Schema<IConversation>({
participants:[
    {
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    }
],
messages:[
    {
        type:Schema.Types.ObjectId,
        ref:"Message",
        required:true
    }
]
},{timestamps:true});

const Conversation=mongoose.model<IConversation>('Conversation',conversationSchema);
export default Conversation;