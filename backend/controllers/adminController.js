import dbConnect from '../lib/mongodb.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Rental from '../models/Rental.js';
import Report from '../models/Report.js';
import { getAuthUser } from '../lib/auth.js';

export async function adminUsersGet(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await dbConnect();
    const users = await User.find({}).select('-password -emailVerificationOTP -loginOTP -passwordResetToken').sort({ joinedAt: -1 });
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function adminUsersPut(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { userId, role, isApproved, isBlocked, isVerified } = req.body;
    await dbConnect();
    const update = {};
    if (typeof role === 'string') update.role = role;
    if (typeof isApproved === 'boolean') update.isApproved = isApproved;
    if (typeof isBlocked === 'boolean') update.isBlocked = isBlocked;
    if (typeof isVerified === 'boolean') update.isVerified = isVerified;

    const updatedUser = await User.findByIdAndUpdate(userId, update, { new: true }).select('-password');

    return res.json({ message: 'User updated', user: updatedUser });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function adminUsersDelete(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ message: 'Missing userId' });
    }

    await dbConnect();
    await User.findByIdAndDelete(userId);

    return res.json({ message: 'User deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function adminStats(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await dbConnect();
    const totalUsers = await User.countDocuments();
    const totalSellers = await User.countDocuments({ role: 'seller' });
    const totalProducts = await Product.countDocuments();
    const pendingProducts = await Product.countDocuments({ isApproved: false });
    const totalRentals = await Rental.countDocuments();
    const totalEarnings = await Rental.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);

    const stats = {
      totalUsers,
      totalSellers,
      totalProducts,
      pendingProducts,
      totalRentals,
      totalEarnings: totalEarnings[0]?.total || 0,
    };

    return res.json({ stats });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function adminReports(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await dbConnect();

    const reports = await Report.find({})
      .populate('reporter', 'name email')
      .populate('reportedUser', 'name email role isBlocked')
      .sort({ createdAt: -1 });

    const aggregated = await Report.aggregate([
      {
        $group: {
          _id: '$reportedUser',
          count: { $sum: 1 },
          lastReportAt: { $max: '$createdAt' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const userMap = new Map();
    reports.forEach((r) => {
      if (r.reportedUser?._id) {
        userMap.set(String(r.reportedUser._id), r.reportedUser);
      }
    });

    const summary = aggregated.map((row) => {
      const u = userMap.get(String(row._id));
      return {
        reportedUserId: row._id,
        count: row.count,
        lastReportAt: row.lastReportAt,
        user: u || null,
      };
    });

    return res.json({ reports, summary });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Failed to load reports' });
  }
}

export async function adminApprovals(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { type, id, isApproved } = req.body;
    await dbConnect();

    if (type === 'product') {
      await Product.findByIdAndUpdate(id, { isApproved });
    } else if (type === 'seller') {
      await User.findByIdAndUpdate(id, { isApproved });
    } else {
      return res.status(400).json({ message: 'Invalid approval type' });
    }

    return res.json({ message: `${type} approval status updated` });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
