const express = require('express');
const router = express.Router();
const verifyJWT = require('./verifyjwt');
const mongo = require('./mongoDB');
const { ObjectId } = require('mongodb');

router.use(verifyJWT)
let db;
(async () => {
  try {
    db = await mongo();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
  }
})();
    router.post('/contactRequest', async (req, res) => {
      try {
        const paymentInfo = req.body; // { biodataId, email, paymentId, status }
        console.log(paymentInfo);

        const result = await db.collection('contactRequests').insertOne({
          ...paymentInfo,
          status: 'pending', // by default pending, until admin routerroves
          createdAt: new Date(),
        });
        console.log(result);

        res.send({ success: true, insertedId: result.insertedId });
      } catch (error) {
        console.log(error);
        res.status(500).send({ success: false, message: error.message });
      }
    });

        router.post('/favourite', async (req, res) => {
          const { email, id } = req.body;
          try {
            console.log(email, id);
            const ck = await db
              .collection('favourite')
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
            const result = await db.collection('favourite').insertOne({
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
        });
    router.post('/bioDatas', async (req, res) => {
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
        const result = await db.collection('bioDatas').insertOne(newBioData);

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
    });

        router.get('/bioDatas/:id', async (req, res) => {
          try {
            const id = req.params.id;

            if (!ObjectId.isValid(id)) {
              return res
                .status(400)
                .send({ success: false, message: 'Invalid ID format' });
            }

            const bioData = await db.collection('bioDatas').findOne({
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
        });

module.exports = router;
