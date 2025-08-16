const mongo = require('./mongoDB');
const rolecheck = async (req, res, next) => {
  try {
    const db = await mongo();
    const email = req?.user?.email;

    if (!email) {
      return res
        .status(401)
        .json({ message: 'Unauthorized: No email found in token' });
    }

    console.log('Admin check for email:', email);

    const result = await db.collection('user_role').findOne({role_email:email });

    if (!result) {
      return res.status(404).json({ message: 'No role found for this user' });
    }
     console.log('roleeee',result);

    req.role = result?.role;
    next();
  } catch (error) {
    console.error('Failed to find user role:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
module.exports = rolecheck;
