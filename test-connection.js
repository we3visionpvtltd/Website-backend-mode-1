const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

const testConnection = async () => {
  try {
    console.log('Testing MongoDB connection...');
    console.log('MongoDB URI:', process.env.MONGODB_URI);
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ MongoDB connected successfully!');
    
    // Test if we can access the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Available collections:', collections.map(c => c.name));
    
    
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Connection closed');
  }
};

testConnection();
