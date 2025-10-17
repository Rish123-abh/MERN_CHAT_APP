import { Request, Response } from 'express';
import User, { IUser } from '../../models/user.model.js';
import { Webhook } from 'svix';
import Conversation from '../../models/conversation.model.js';

export const verifyClerkWebhook = (req: Request, res: Response) => {
  const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || '';

  try {
    // Convert raw body to string
    if (!req.body) {
      throw new Error('Request body is null');
    }
    const payload = req.body.toString('utf8');
    // Extract required headers as strings
    const svixHeaders = {
      'svix-id': req.headers['svix-id'] as string,
      'svix-timestamp': req.headers['svix-timestamp'] as string,
      'svix-signature': req.headers['svix-signature'] as string,
    };

    // Verify the signature using Svix
    const webhook = new Webhook(CLERK_WEBHOOK_SECRET);
    const event = webhook.verify(payload, svixHeaders) as { type: string; data: any };

    const { type, data } = event;
    console.log('Received event:', type,data);
    switch (type) {
      case 'user.created': {
        const { id, username, email_addresses, profile_image_url } = data;
        const email = email_addresses?.[0]?.email_address || '';
        User.create({
          clerkId: id,
          username: username || 'Anonymous',
          email,
          image: profile_image_url
        })
          .then(() => console.log('User created in DB:', id))
          .catch(err => console.error('Error creating user:', err));
        break;
      }

      case 'user.updated': {
        const { id, username, email_addresses, profile_image_url } = data;
        const email = email_addresses?.[0]?.email_address || '';
        User.findOneAndUpdate(
          { clerkId: id },
          { username, email, image: profile_image_url },
          { new: true, upsert: true } // upsert:true will create a new user if not found
        )
          .then(user => console.log('User updated in DB:', user?.clerkId))
          .catch(err => console.error('Error updating user:', err));
        break;
      }

      case 'user.deleted': {
        const { id } = data;
        User.findOneAndDelete({ clerkId: id })
          .then(() => console.log('User deleted from DB:', id))
          .catch(err => console.error('Error deleting user:', err));
        break;
      }

      default:
        console.log('Unhandled event type:', type);
    }

    res.status(200).send('ok');
  } catch (err) {
    console.error('❌ Signature verification failed:', err);
    res.status(400).send('Invalid signature');
  }
};
export const publicKeySaveinDb= async (req:Request, res:Response) => {
  const { publicKey } = req.body;
  const clerkId = req.auth?.().userId as any; // middleware or token from Clerk
  if (!publicKey) return res.status(400).send("Missing publicKey");

  await User.findOneAndUpdate({ clerkId }, { publicKey });
  res.status(200).send("Public key saved");
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const userId = req.auth?.().userId as any;
    const users = await User.findOne({
      clerkId: userId
    });
    if (!users?._id) {
      return res.status(404).json({ message: "User not found" });
    }
    const conversations = await Conversation.find({
      participants: { $in: [users?._id] }
    }).populate('participants');
    console.log("Conversation", conversations);


    const friendsIds =
      conversations && conversations.length > 0 ? conversations.flatMap((convo) =>
        convo.participants.filter((participant: any) =>
          participant._id.toString() !== users?._id?.toString()
        )
          .map((p: any) => p._id)
      ) : []

    console.log("FriendId", friendsIds);
    const allUsers = await User.find({
      _id: { $in: friendsIds },
    });
    console.log("allUsers", allUsers);
    // console.log("Populated Friends:", JSON.stringify(friends, null, 2));
    res.status(200).json(allUsers);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const clerkId = req.auth?.().userId as any;
    if (!clerkId) {
      return res.status(401).json({ message: "Unauthorized: Clerk ID not found" });
    }
    const user = await User.findOne({
      clerkId: clerkId
    })
    if (!user) {
      return res.status(401).json({ message: " User not found " });

    }
    return res.status(200).json(user);
  }
  catch (error) {
    return res.status(500).json({ message: `Internal Server Error ${error}` })
  }
}


export const searchUsers = async (req: Request, res: Response) => {
  const clerkId = req.auth?.().userId as any;
  if (!clerkId) {
    return res.status(401).json({ message: "Unauthorized: Clerk ID not found" });
  }
  const user = await User.findOne({
    clerkId: clerkId
  })
  if (!user) {
    return res.status(401).json({ message: " User not found " });

  }

  try {

    const query = req.query.search;
    console.log("Query", query);
    if (!query) {
      return res.status(400).json({ message: "Query is Required For Search" })
    }

    const users = await User.find({
      _id: { $ne: user._id },
      $or: [
        // Thisi used for case insensitive 
        { username: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } }
      ]
    })

    return res.status(200).json(users);


  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: `Something is wrong ${error}` })
  }

}