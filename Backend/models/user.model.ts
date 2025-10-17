import mongoose, { Document, Schema } from 'mongoose';


// We are extending Document because mongoose internally uses it like save(), find() etc
// So if we don't extend it then we will get error while using those methods
export interface IUser extends Document {
    name?: string,
    username: string,
    email: string,
    // Below are optional fields because while creating user we are not using it , it will be done automatically by mongodb
    createdAt?: Date,
    updatedAt?: Date,
    image?: string,
    clerkId: string,
    publicKey:String
}

const userSchema = new Schema<IUser>({
    name: {
        type: String,
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        unique: true
    },
    image: {
        type: String,
        default: ""
    },
    clerkId: { type: String, required: true, unique: true },
    publicKey: { type: String, required: true },

}, {
    timestamps: true
})


const User = mongoose.model<IUser>('User', userSchema);

export default User;