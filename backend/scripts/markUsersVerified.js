import dotenv from 'dotenv';
import dbConnect from '../lib/mongodb.js';
import User from '../models/User.js';

dotenv.config();

async function run() {
  try {
    await dbConnect();
    const result = await User.updateMany(
      { isVerified: { $ne: true } },
      { $set: { isVerified: true } }
    );
    console.log(
      `[markUsersVerified] matched=${result.matchedCount} modified=${result.modifiedCount}`
    );
    process.exit(0);
  } catch (error) {
    console.error('[markUsersVerified] failed', error);
    process.exit(1);
  }
}

run();
