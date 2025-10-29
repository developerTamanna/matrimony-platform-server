const express = require("express");
const mongo = require("./mongoDB");
const adminRoutes = require("./adminpath");
const userRoutes = require("./userpath");
const alluserRoutes = require("./alluserpath");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const OpenAI = require("openai");
dotenv.config();
const app = express();
//today new
const jwt = require("jsonwebtoken");
//next
const port = process.env.PORT || 3000;
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-user",
      "authorization",
    ],
  })
);

// ai api
const clients = {
  gemini: new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/",
  }),
};

// model map
const modelMap = {
  gemini: "gemini-1.5-flash",
};

app.use(cookieParser());
let db;
(async () => {
  try {
    db = await mongo();
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
})();

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    /*     await client.connect();
    const db = client.db('matrimonyDB'); //database name
    const bioDataCollection = db.collection('bioDatas'); //collection
    const premium = db.collection('premium');
    const favourite = db.collection('favourite');
    await bioDataCollection.createIndex({ biodataId: 1 }, { unique: true }); */

    // ai related api

    app.post("/api/chat", async (req, res) => {
      const { model, messages } = req.body;

      if (!model || !clients[model]) {
        return res.status(400).send({ error: "Invalid or unsupported model." });
      }

      try {
        const client = clients[model];
        const response = await client.chat.completions.create({
          model: modelMap[model],
          messages: messages,
        });

        return res.send(response);
      } catch (error) {
        console.error(`${model.toUpperCase()} API Error:`, error.message);
        return res.status(500).send({ error: "AI response failed." });
      }
    });

    ///admin path
    app.use("/admin", adminRoutes);
    app.use("/user", userRoutes);
    app.use("/alluser", alluserRoutes);

    app.post("/api/auth/login", async (req, res) => {
      const { email, name } = req.body;
      if (!email || !name) return res.send({ role: null });

      let result = await db
        .collection("user_role")
        .findOne({ role_email: email });

      if (!result) {
        await db.collection("user_role").insertOne({
          role_email: email,
          name: name,
          role: "user",
        });
        result = { role: "user" };
      }

      const payload = { name, email, role: result.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });
      res.cookie("token", token, {
        httpOnly: true,
        secure: true /* process.env.NODE_ENV === 'production', */,
        sameSite: "none",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      console.log("token", token);

      res.json({ role: result.role });
    });

    // GET /bioDatas?page=1&limit=6
    app.get("/pagination", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const skip = (page - 1) * limit;

        // Optional: if you want to support filtering in future
        const query = {}; // add conditions like { gender: req.query.gender } if needed

        const biodatas = await db
          .collection("bioDatas")
          .find(query)
          .skip(skip)
          .limit(limit)
          .toArray();

        const count = await db.collection("bioDatas").countDocuments(query);

        res.send({ biodatas, count });
      } catch (error) {
        console.error("Pagination Error:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    // add to favourite

    // ✅ Corrected backend route
    /*     app.post('/contactRequest', async (req, res) => {
      try {
        const paymentInfo = req.body; // { biodataId, email, paymentId, status }
        console.log(paymentInfo);

        const result = await db.collection('contactRequests').insertOne({
          ...paymentInfo,
          status: 'pending', // by default pending, until admin approves
          createdAt: new Date(),
        });
        console.log(result);

        res.send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        console.log(error);
        res.status(500).send({ success: false, message: error.message });
      }
    }); */
    /*app.delete('/contact-requests/:id', async (req, res) => {
      const { id } = req.params;
      try {
        console.log(id);
        const result = await db.collection('contactRequests').deleteOne({
          _id: new ObjectId(id),
        });
        console.log(result);

        res.send({ success: result.deletedCount > 0 });
      } catch (error) {
        console.error('Failed to delete contactRequest:', error);
        res.status(500).send({ message: 'Failed to delete' });
      }
    }); */

    /*  app.get('/contact-requests', async (req, res) => {
      try {
        const email = req.query.email;
        console.log('mmmm', email);

        if (!email) {
          return res.status(400).send({ message: 'Email is required' });
        }

        // Step 1: Get all contact requests made by this user
        const contactRequests = await db
          .collection('contactRequests')
          .find({ email: email }) // ✅ filter by requesting user's email
          .toArray();
        console.log('ccc', contactRequests);

        if (contactRequests.length === 0) {
          console.log('llll00');

          return res.send([]); // No contact requests
        }

        // Step 2: Extract biodataIds as ObjectId
        const ids = contactRequests.map((r) => new ObjectId(r.biodataId));
        console.log('ids', ids);

        // Step 3: Get biodata documents for those IDs
        const bioDataList = await bioDataCollection
          .find({ _id: { $in: ids } })
          .toArray();

        // Step 4: Combine results
        const response = bioDataList.map((biodata) => {
          const request = contactRequests.find(
            (r) => r.biodataId === biodata._id.toString()
          );

          return {
            _id: request._id,
            name: biodata.name,
            biodataId: biodata.biodataId,
            status: request?.status === 'approved' ? 'Approved' : 'Pending',
            mobile:
              request?.status === 'approved'
                ? biodata.mobileNumber
                : 'Not visible',
            email:
              request?.status === 'approved'
                ? biodata.contactEmail
                : 'Not visible',
          };
        });
        console.log('resss', response);

        res.send(response);
      } catch (err) {
        console.error('❌ Error in /contact-requests:', err);
        res.status(500).send({ message: 'Something went wrong' });
      }
    }); */

    /*   app.post('/favourite', async (req, res) => {
      const { email, id } = req.body;
      try {
        console.log(email, id);
        const ck = await favourite
          .find({
            email: email,
            id: id,
          })
          .toArray();
        console.log(ck);
        if (ck.length > 0) {
          console.log('⚠️ Already added to  favourite:', email);
          return res
            .status(409)
            .send({ message: '⚠️ Already added to  favourite' });
        }
        const result = await favourite.insertOne({
          email: email,
          id: id,
        });
        res.status(200).send({
          message: 'successfully added to favourite',
          data: result,
        });
      } catch (error) {
        console.error('❌ Error making premium:', error);
        res.status(500).send({ message: 'Failed to add to favourite' });
      }
    }); */
    /*     app.delete('/favourite/:id', async (req, res) => {
      const { id } = req.params;
      const { email } = req.query;

      try {
        console.log(id, email);
        const result = await favourite.deleteOne({
          email,
          id,
        });
        console.log(result);

        res.send({ success: result.deletedCount > 0 });
      } catch (error) {
        console.error('Failed to delete favourite:', error);
        res.status(500).send({ message: 'Failed to delete' });
      }
    });
    app.get('/getfavourite', async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res.status(400).send({ message: 'Email is required' });
        }

        // Step 1: Get all favourites by user
        const favourites = await favourite.find({ email }).toArray();

        // Step 2: Extract all biodata ObjectIds
        const ids = favourites.map((data) => new ObjectId(data.id));

        // Step 3: Get all matching biodata entries
        const bioDataList = await bioDataCollection
          .find({ _id: { $in: ids } })
          .toArray();
        console.log(bioDataList);

        res.send(bioDataList);
      } catch (err) {
        console.error('❌ Error in /getfavourite:', err);
        res.status(500).send({ message: 'Something went wrong' });
      }
    }); */

    ///this is for home page show 6 primium bio
    app.get("/getpremium", async (req, res) => {
      try {
        // Step 1: Get all favourites by user
        const premiumusers = await db
          .collection("user_role")
          .find({ role: "premium" })
          .toArray();

        // Step 2: Extract all biodata ObjectIds
        const emails = premiumusers.map((data) => data.role_email);

        // Step 3: Get all matching biodata entries
        const bioDataList = await db
          .collection("bioDatas")
          .find({ contactEmail: { $in: emails } })
          .sort({ createdAt: 1 })
          .limit(6)
          .toArray();
        console.log(bioDataList);

        res.send(bioDataList);
      } catch (err) {
        console.error("❌ Error in /get Premium:", err);
        res.status(500).send({ message: "Something went wrong" });
      }
    });

    //primiam er jonno

    /*     app.post('/makePremium', async (req, res) => {
      const { email, name, biodataId } = req.body;

      try {
        console.log(email);
        const ck = await premium.find({ premium_email: email }).toArray();
        console.log(ck);
        if (ck.length > 0) {
          console.log('⚠️ Already requested for premium:', email);
          return res
            .status(409)
            .send({ message: 'You already requested for premium' });
        }

        const result = await premium.insertOne({
          premium_email: email,
          premium_name: name,
          biodataId: biodataId,
          premium_status: 'pending',
        });

        res.status(200).send({
          message: 'Premium request submitted',
          data: result,
        });
      } catch (error) {
        console.error('❌ Error making premium:', error);
        res.status(500).send({ message: 'Failed to update' });
      }
    }); */

    // POST: create a new bioData
    /*     app.post('/bioDatas', async (req, res) => {
      try {
        const newBioData = req.body;
        // await db.collection("id_counter").insertOne({ _id: 'biodataIdCounter', seq: 0 });

        // Step 1: Safely increment and fetch counter
        const counterDoc = await db.collection('id_counter').findOneAndUpdate(
          { _id: 'biodataIdCounter' },
          { $inc: { seq: 1 } },
          {
            upsert: true,
            returnOriginal: false, // Use this for MongoDB v3
            projection: { seq: 1 }, // Limit to what we need
          }
        );
        console.log(counterDoc);
        if (counterDoc.seq == null) {
          throw new Error('❌ Counter document not returned or seq is missing');
        }

        newBioData.biodataId = counterDoc.seq;

        // Step 2: Insert the actual biodata
        const result = await bioDataCollection.insertOne(newBioData);

        res.status(201).send({
          success: true,
          data: {
            insertedId: result.insertedId,
            biodataId: newBioData.biodataId,
          },
          message: '✅ Biodata created successfully!',
        });
      } catch (error) {
        console.error('❌ Error inserting bioData:', error);
        res.status(500).send({
          success: false,
          message: error.message || 'Failed to create biodata',
        });
      }
    }); */

    //get all boi for all bio page
    app.get("/bioDatas", async (req, res) => {
      try {
        const bioData = await db.collection("bioDatas").find().toArray();
        res.send(bioData);
      } catch (error) {
        console.error("Error fetching biodata:", error);
        res.status(500).send({ message: "Failed to fetch biodata" });
      }
    });
    // update a biodata by _id
    /*     app.put('/bioDatas/:id', async (req, res) => {
      const { id } = req.params;
      const updatedData = req.body;

      try {
        const result = await bioDataCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedData }
        );

        res.send({
          success: true,
          modifiedCount: result.modifiedCount,
          message: 'Biodata updated successfully!',
        });
      } catch (error) {
        console.error('Error updating biodata:', error);
        res.status(500).send({ message: 'Failed to update biodata' });
      }
    }); */

    // ✅ Get biodata by MongoDB _id
    /*     app.get('/bioDatas/:id', async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res
            .status(400)
            .send({ success: false, message: 'Invalid ID format' });
        }

        const bioData = await bioDataCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!bioData) {
          return res
            .status(404)
            .send({ success: false, message: 'Biodata not found' });
        }

        res.send({ success: true, data: bioData });
      } catch (error) {
        console.error('Error fetching biodata:', error);
        res.status(500).send({ success: false, message: 'Server Error' });
      }
    }); */

    /*     app.delete('/bioDatas/:id', async (req, res) => {
      const { id } = req.params;
      const result = await bioDataCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    }); */

    ///user role setup

    //payment related apis

    // Express backend - contactRequestCollection (or যেটা তুমার কলেকশন)

    //
    // Backend: Stripe payment intent
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

    app.post("/create-payment-intent", async (req, res) => {
      const { amount } = req.body;

      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.send({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });

    //success stories apis

    // ✅ POST: Submit Got Married Success Story
    /*     app.post('/success-stories', async (req, res) => {
      try {
        const story = req.body;

        if (
          !story.selfBiodataId ||
          !story.partnerBiodataId ||
          !story.coupleImage ||
          !story.marriageDate ||
          !story.story
        ) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        story.createdAt = new Date(); // optional timestamp

        const result = await db.collection('successStories').insertOne(story);

        res.status(201).json({
          message: '✅ Success story submitted!',
          insertedId: result.insertedId,
        });
      } catch (error) {
        console.error('❌ Error submitting story:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }); */

    // ✅ GET: Fetch All Success Stories
    app.get("/success-stories", async (req, res) => {
      try {
        const stories = await db
          .collection("successStories")
          .find()
          .sort({ createdAt: -1 }) // latest first
          .toArray();

        res.send(stories);
      } catch (error) {
        console.error("❌ Failed to fetch success stories:", error);
        res.status(500).send({ message: "Internal server error" });
      }
    });

    app.get("/count-up", async (req, res) => {
      try {
        const result = await db.collection("bioDatas").find({}).toArray();
        const total = result.length;
        const result1 = result.filter((v) => v.biodataType === "Male");
        const male = result1.length;
        const female = total - male;
        const result2 = await db
          .collection("user_role")
          .find({
            role: "premium",
          })
          .toArray();
        const premium = result2.length;
        const result3 = await db
          .collection("contactRequests")
          .find({})
          .toArray();
        const totalrevenue = result3.length * 5;
        const result4 = await db
          .collection("successStories")
          .find({})
          .toArray();
        const successStories = result4.length;
        res.status(201).json({
          male: male,
          female: female,
          totalbio: total,
          totalrevenue: totalrevenue,
          premium: premium,
          successStories: successStories,
        });
      } catch (err) {
        console.error("❌ Error submitting story:", err);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // GET all pending premium requests

    /*     app.get('/contactRequests', async (req, res) => {
      try {
        const requests = await db
          .collection('contactRequests')
          .find({ status: 'pending' })
          .toArray();
        res.send(requests);
      } catch (error) {
        res
          .status(500)
          .send({ message: 'Failed to fetch contactRequests requests' });
      }
    }); */

    // POST to make a biodata premium
    // app.post('/approveContactRequest', async (req, res) => {
    //   const { email, biodataId } = req.body;

    //   try {
    //     // Step 1: Delete the request from the premium collection
    //     console.log(email, biodataId);

    //     // Step 2: Update the user's role to 'premium'
    //     await db.collection('contactRequests').updateOne(
    //       { email: email, biodataId: biodataId.toString() },
    //       {
    //         $set: {
    //           status: 'approved',
    //         },
    //       }
    //     );

    //     // Step 3: Respond to client
    //     return res
    //       .status(200)
    //       .send({ success: true, message: 'Request granted.' });
    //   } catch (error) {
    //     console.error('Error in /acceptPremium:', error);
    //     return res
    //       .status(500)
    //       .send({ message: 'Failed to make approveContactRequest.' });
    //   }
    // });

    /*   app.get('/premiumRequests', async (req, res) => {
      try {
        const requests = await db.collection('premium').find().toArray();
        res.send(requests);
      } catch (error) {
        res.status(500).send({ message: 'Failed to fetch premium requests' });
      }
    });  */

    // POST to make a biodata premium
    // app.post('/acceptPremium', async (req, res) => {
    //   const { email, biodataId } = req.body;

    //   try {
    //     // Step 1: Delete the request from the premium collection
    //     console.log(email, biodataId);
    //     const result = await db.collection('premium').deleteOne({
    //       biodataId: biodataId,
    //       premium_email: email,
    //     });

    //     if (result.deletedCount === 0) {
    //       // If no document was deleted, exit early and don't continue
    //       return res
    //         .status(404)
    //         .send({ message: 'Premium request not found.' });
    //     }

    //     // Step 2: Update the user's role to 'premium'
    //     await db
    //       .collection('user_role')
    //       .updateOne({ role_email: email }, { $set: { role: 'premium' } });

    //     // Step 3: Respond to client
    //     return res
    //       .status(200)
    //       .send({ success: true, message: 'User is now premium.' });
    //   } catch (error) {
    //     console.error('Error in /acceptPremium:', error);
    //     return res.status(500).send({ message: 'Failed to make premium.' });
    //   }
    // });

    ///manage user
    // server/routes/users.js
    /*     app.get('/users', async (req, res) => {
      try {
        const search = req.query.search || '';
        const query = search
          ? { name: { $regex: new RegExp(search, 'i') } }
          : {};

        const users = await db.collection('user_role').find(query).toArray();
        res.json(users);
      } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users' });
      }
    }); */

    /*     app.post('/users/admin', async (req, res) => {
      try {
        const { email } = req.body;
        console.log('jfkfhfjfdfdfdfj', email);

        if (!email) {
          return res.status(400).json({ message: 'Email is required' });
        }

        const result = await db
          .collection('user_role')
          .updateOne({ role_email: email }, { $set: { role: 'admin' } });

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: 'User not found or already admin' });
        }

        res.json({
          message: 'User promoted to admin successfully',
          result,
        });
      } catch (error) {
        console.error('Error making user admin:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }); */
    /*     app.post('/users/premium', async (req, res) => {
      try {
        const { email } = req.body;
        console.log('jfkfhfjfdfdfdfj', email);

        if (!email) {
          return res.status(400).json({ message: 'Email is required' });
        }

        const result = await db
          .collection('user_role')
          .updateOne({ role_email: email }, { $set: { role: 'premium' } });

        if (result.modifiedCount === 0) {
          return res
            .status(404)
            .json({ message: 'User not found or already admin' });
        }

        res.json({
          message: 'User promoted to admin successfully',
          result,
        });
      } catch (error) {
        console.error('Error making user admin:', error);
        res.status(500).json({ message: 'Internal server error' });
      }
    }); */

    //new
     


    // GET all pending premium requests

    //end api creation

    // Send a ping to confirm a successful connection
    /*     await client.db('admin').command({ ping: 1 });
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    ); */
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//simple route
app.get("/", (req, res) => {
  res.send("Matrimony  server is running");
});

//start the server
app.listen(port, () => {
  console.log(`server is listening on port ${port}`);
});
module.exports = app;
