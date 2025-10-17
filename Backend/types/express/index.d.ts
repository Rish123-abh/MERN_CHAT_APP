import { AuthObject } from '@clerk/express';

declare global {
  namespace Express {
    interface Request {
      auth?: ()=>AuthObject & {userId:string}; // Optional since not all routes have Clerk
    }
  }
}
