const express = require('express');
const router = express.Router();
const verifyJWT = require('./verifyjwt');
const mongo = require('./mongoDB');
const rolecheck = require('./checkRole');
const { ObjectId } = require('mongodb');

router.use(verifyJWT);
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
  if (req.role !== 'admin') {
    return res
      .status(403)
      .json({ message: 'Only admins can access this route' });
  }
  next();
});

// Admin Dashboard Counter
router.get('/addmin-dashboard-counter', async (req, res) => {
  try {
    const result = await db.collection('bioDatas').find({}).toArray();
    const total = result.length;
    const male = result.filter((v) => v.biodataType === 'Male').length;
    const female = total - male;

    const premium = await db
      .collection('user_role')
      .countDocuments({ role: 'premium' });

    const totalrevenue =
      (await db.collection('contactRequests').countDocuments()) * 5;

    res
      .status(201)
      .json({ male, female, totalbio: total, totalrevenue, premium });
  } catch (err) {
    console.error('❌ Error in dashboard counter:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get all premium requests
router.get('/premiumRequests', async (req, res) => {
  try {
    const requests = await db.collection('premium').find().toArray();
    res.send(requests);
  } catch (error) {
    res.status(500).send({ message: 'Failed to fetch premium requests' });
  }
});

// Accept premium user
router.post('/acceptPremium', async (req, res) => {
  const { email, biodataId } = req.body;

  try {
    const result = await db.collection('premium').deleteOne({
      biodataId,
      premium_email: email,
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: 'Premium request not found.' });
    }

    await db
      .collection('user_role')
      .updateOne({ role_email: email }, { $set: { role: 'premium' } });

    res.status(200).send({ success: true, message: 'User is now premium.' });
  } catch (error) {
    console.error('Error in /acceptPremium:', error);
    res.status(500).send({ message: 'Failed to make premium.' });
  }
});

router.get('/contactRequests', async (req, res) => {
  try {
    console.log("ccccccccc");

    const requests = await db
      .collection('contactRequests')
      .find({ status: 'pending' })
      .toArray();
    console.log(requests);
    res.send(requests);
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .send({ message: 'Failed to fetch contactRequests requests' });
  }
});

// Approve contact request
router.post('/approveContactRequest', async (req, res) => {
  const { email, biodataId } = req.body;

  try {
    await db
      .collection('contactRequests')
      .updateOne(
        { email, biodataId: biodataId.toString() },
        { $set: { status: 'approved' } }
      );

    res.status(200).send({ success: true, message: 'Request granted.' });
  } catch (error) {
    console.error('Error in /approveContactRequest:', error);
    res.status(500).send({ message: 'Failed to approve request.' });
  }
});

// Get users with optional search
router.get('/users', async (req, res) => {
  try {
    const search = req.query.search || '';
    const query = search ? { name: { $regex: new RegExp(search, 'i') } } : {};
    const users = await db.collection('user_role').find(query).toArray();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Promote to Admin
router.post('/users/admin', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const result = await db
      .collection('user_role')
      .updateOne({ role_email: email }, { $set: { role: 'admin' } });

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: 'User not found or already admin' });
    }

    res.json({ message: 'User promoted to admin successfully', result });
  } catch (error) {
    console.error('Error making user admin:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Promote to Premium
router.post('/users/premium', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const result = await db
      .collection('user_role')
      .updateOne({ role_email: email }, { $set: { role: 'premium' } });

    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: 'User not found or already premium' });
    }

    res.json({ message: 'User promoted to premium successfully', result });
  } catch (error) {
    console.error('Error making user premium:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Add Success Story
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
      return res.status(400).json({ message: 'Missing required fields' });
    }

    story.createdAt = new Date();
    const result = await db.collection('successStories').insertOne(story);

    res.status(201).json({
      message: '✅ Success story submitted!',
      insertedId: result.insertedId,
    });
  } catch (error) {
    console.error('❌ Error submitting story:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get Success Stories
router.get('/success-stories', async (req, res) => {
  try {
    const stories = await db
      .collection('successStories')
      .find()
      .sort({ createdAt: -1 })
      .toArray();

    res.send(stories);
  } catch (error) {
    console.error('❌ Failed to fetch success stories:', error);
    res.status(500).send({ message: 'Internal server error' });
  }
});

// Delete Contact Request
router.delete('/contact-requests/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.collection('contactRequests').deleteOne({
      _id: new ObjectId(id),
    });

    res.send({ success: result.deletedCount > 0 });
  } catch (error) {
    console.error('Failed to delete contact request:', error);
    res.status(500).send({ message: 'Failed to delete' });
  }
});

module.exports = router;
