const express = require('express');
const router = express.Router();
const verifyJWT = require('./verifyjwt');
const mongo = require('./mongoDB');
const rolecheck = require('./checkRole');
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
router.use(rolecheck);
router.use(async (req, res, next) => {
  if (req.role !== 'user' && req.role !== 'premium') {
    return res
      .status(403)
      .json({ message: 'Only admins can access this route' });
  }
  next();
});

    router.delete('/contact-requests/:id', async (req, res) => {
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
    });

    router.get('/contact-requests', async (req, res) => {
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
        const bioDataList = await db.collection('bioDatas')
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
            status: request?.status === 'approved' ? 'approved' : 'Pending',
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
    });

    router.delete('/favourite/:id', async (req, res) => {
      const { id } = req.params;
      const { email } = req.query;

      try {
        console.log(id, email);
        const result = await db.collection('favourite').deleteOne({
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
    router.get('/getfavourite', async (req, res) => {
      try {
        const email = req.query.email;
        if (!email) {
          return res.status(400).send({ message: 'Email is required' });
        }

        // Step 1: Get all favourites by user
        const favourites = await db.collection('favourite')
          .find({ email })
          .toArray();

        // Step 2: Extract all biodata ObjectIds
        const ids = favourites.map((data) => new ObjectId(data.id));

        // Step 3: Get all matching biodata entries
        const bioDataList = await db.collection('bioDatas')
          .find({ _id: { $in: ids } })
          .toArray();
        console.log(bioDataList);

        res.send(bioDataList);
      } catch (err) {
        console.error('❌ Error in /getfavourite:', err);
        res.status(500).send({ message: 'Something went wrong' });
      }
    });

        router.post('/makePremium', async (req, res) => {
          const { email, name, biodataId } = req.body;

          try {
            console.log(email);
            const ck = await db.collection('premium')
              .find({ premium_email: email })
              .toArray();
            console.log(ck);
            if (ck.length > 0) {
              console.log('⚠️ Already requested for premium:', email);
              return res
                .status(409)
                .send({ message: 'You already requested for premium' });
            }

            const result = await db.collection('premium').insertOne({
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
        });


     router.post('/success-stories', async (req, res) => {
                  try {
                    const story = req.body;

                    if (
                      !story.selfBiodataId ||
                      !story.partnerBiodataId ||
                      !story.coupleImage ||
                      !story.marriageDate ||
                      !story.story
                    ) {
                      return res
                        .status(400)
                        .json({ message: 'Missing required fields' });
                    }

                    story.createdAt = new Date(); // optional timestamp

                    const result = await db
                      .collection('successStories')
                      .insertOne(story);

                    res.status(201).json({
                      message: '✅ Success story submitted!',
                      insertedId: result.insertedId,
                    });
                  } catch (error) {
                    console.error('❌ Error submitting story:', error);
                    res.status(500).json({ message: 'Internal server error' });
                  }
                });

                    router.delete('/bioDatas/:id', async (req, res) => {
                      const { id } = req.params;
                      const result = await db.collection('bioDatas').deleteOne({
                        _id: new ObjectId(id),
                      });
                      res.send(result);
                    });
                        router.put('/bioDatas/:id', async (req, res) => {
                          const { id } = req.params;
                          const updatedData = req.body;

                          try {
                            const result = await db
                              .collection('bioDatas')
                              .updateOne(
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
                            res
                              .status(500)
                              .send({ message: 'Failed to update biodata' });
                          }
                        });

module.exports = router;
