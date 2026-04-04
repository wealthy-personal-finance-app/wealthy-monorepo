


import mongoose from 'mongoose';

const connectDB = async (dbName) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: dbName
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host} | DB: ${dbName}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;