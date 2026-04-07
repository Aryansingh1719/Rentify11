import dbConnect from '../lib/mongodb.js';
import Product from '../models/Product.js';
import { getAuthUser } from '../lib/auth.js';
import cloudinary from '../lib/cloudinary.js';

export async function listProducts(req, res) {
  try {
    await dbConnect();
    const category = req.query.category;
    const seller = req.query.seller;
    const approvedOnly = req.query.approved !== 'false';

    let query = {};
    if (category) query.category = category;
    if (seller) query.seller = seller;
    if (approvedOnly) query.isApproved = true;

    const products = await Product.find(query).populate('seller', 'name avatar location');
    return res.json({ products });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function createProduct(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user || user.role !== 'seller') {
      return res.status(403).json({ message: 'Only sellers can list products' });
    }

    if (!user.isApproved) {
      return res.status(403).json({ message: 'Seller profile must be approved by admin' });
    }

    const title = req.body.title;
    const description = req.body.description;
    const category = req.body.category;
    const pricePerDay = parseFloat(req.body.pricePerDay);
    const pricePerWeek = req.body.pricePerWeek ? parseFloat(req.body.pricePerWeek) : undefined;
    const pricePerMonth = req.body.pricePerMonth ? parseFloat(req.body.pricePerMonth) : undefined;
    const securityDeposit = req.body.securityDeposit ? parseFloat(req.body.securityDeposit) : 0;
    const allowPickup = req.body.allowPickup === 'true' || req.body.allowPickup === '1';
    const rawFiles = req.files?.images;
    const files = rawFiles ? (Array.isArray(rawFiles) ? rawFiles : [rawFiles]) : [];

    if (!title || !description || !category || !pricePerDay || files.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const imageUrls = await Promise.all(
      files.map((file) => {
        const buffer = file.buffer;
        return new Promise((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'luxe-rent/products' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          ).end(buffer);
        });
      })
    );

    await dbConnect();
    const product = await Product.create({
      title,
      description,
      category,
      pricePerDay,
      pricePerWeek,
      pricePerMonth,
      securityDeposit: securityDeposit >= 0 ? securityDeposit : 0,
      allowPickup: !!allowPickup,
      images: imageUrls,
      seller: user._id,
      isApproved: false,
    });

    return res.status(201).json({ message: 'Product submitted for approval', product });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function getProduct(req, res) {
  try {
    await dbConnect();
    const { id } = req.params;
    const product = await Product.findById(id).populate('seller', 'name avatar bio location joinedAt');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    return res.json({ product });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function updateProduct(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    await dbConnect();
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const data = req.body;

    if (user.role === 'seller') {
      data.isApproved = false;
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, data, { new: true });
    return res.json({ message: 'Product updated', product: updatedProduct });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

export async function deleteProduct(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    await dbConnect();
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.seller.toString() !== user._id.toString() && user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Product.findByIdAndDelete(id);
    return res.json({ message: 'Product deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}
