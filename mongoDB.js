const { MongoClient, ServerApiVersion} = require('mongodb');
const dotenv = require('dotenv');
dotenv.config();
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@testingc.xpwe350.mongodb.net/?retryWrites=true&w=majority&appName=TestingC`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
let db;
const  mongo=async() => {
  try {
    if(db) return db
    /* await client.connect(); */
    db = client.db('matrimonyDB'); //database name
    // Ensure the collection is created
    // Optional: Create index
    // await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log("✅ MongoDB connected");
    return db;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
};

module.exports = mongo;
