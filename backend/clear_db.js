require('dotenv').config();
const mongoose = require('mongoose');

async function clearDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    console.log('Connecting to MongoDBAtlas to clear data...');
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
      console.log(`Cleared collection: ${key}`);
    }

    console.log('✅ Successfully cleared all hardcoded data from MongoDB Atlas!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error clearing database:', err.message);
    process.exit(1);
  }
}

clearDatabase();
