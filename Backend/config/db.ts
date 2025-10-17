import mongoose from "mongoose";

const dbConnect = async (): Promise<void> => {
  try {
    const mongoUrl = process.env.MONGODB_URL;

    if (!mongoUrl) {
      throw new Error("MONGODB_URL environment variable is not defined");
    }

    await mongoose.connect(mongoUrl);
    console.log("✅ Database connection established");
  } catch (error) {
    console.error("❌ Database connection error:", error);
    process.exit(1); // Exit process if DB connection fails
  }
};

export default dbConnect;
