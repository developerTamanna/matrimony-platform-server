

const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
dotenv.config();
const app = express();
//today new
const jwt = require('jsonwebtoken');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@testingc.xpwe350.mongodb.net/?retryWrites=true&w=majority&appName=TestingC`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


app.post('/api/auth/login', async (req, res) => {
  const { email, name } = req.body;
  if (!email || !name) return res.send({ role: null });

  let result = await db.collection('user_role').findOne({ role_email: email });

  if (!result) {
    await db.collection('user_role').insertOne({
      role_email: email,
      name: name,
      role: 'user',
    });
    result = { role: 'user' };
  }

  const payload = { name, email, role: result.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  console.log('token', token);

  res.json({ role: result.role });
});
