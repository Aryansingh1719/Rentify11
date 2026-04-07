import express from 'express';
import multer from 'multer';
import * as authController from '../controllers/authController.js';
import * as productsController from '../controllers/productsController.js';
import * as rentalsController from '../controllers/rentalsController.js';
import * as adminController from '../controllers/adminController.js';
import * as aiController from '../controllers/aiController.js';
import * as miscController from '../controllers/miscController.js';

const upload = multer({ storage: multer.memoryStorage() });
const productImagesUpload = upload.fields([{ name: 'images', maxCount: 30 }]);
const sellerProfileUpload = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'shopBanner', maxCount: 1 },
]);
const smartAnalyzeUpload = upload.fields([
  { name: 'main_image', maxCount: 1 },
  { name: 'spec_image', maxCount: 1 },
]);

const router = express.Router();

router.post('/api/auth/register', authController.register);
router.post('/api/auth/login', authController.login);
router.post('/api/auth/login-otp', authController.loginOtp);
router.post('/api/auth/verify-login-otp', authController.verifyLoginOtp);
router.get('/api/auth/me', authController.me);
router.post('/api/auth/logout', authController.logout);
router.post('/api/auth/forgot-password', authController.forgotPassword);
router.post('/api/auth/reset-password', authController.resetPassword);
router.post('/api/auth/verify-email', authController.verifyEmail);
router.post('/api/auth/resend-verification-otp', authController.resendVerificationOtp);
router.get('/api/auth/google', authController.googleAuthStart);
router.get('/api/auth/google/callback', authController.googleAuthCallback);

router.get('/api/products', productsController.listProducts);
router.post('/api/products', productImagesUpload, productsController.createProduct);
router.get('/api/products/:id', productsController.getProduct);
router.put('/api/products/:id', productsController.updateProduct);
router.delete('/api/products/:id', productsController.deleteProduct);

router.get('/api/rentals', rentalsController.listRentals);
router.post('/api/rentals', rentalsController.createRental);
router.put('/api/rentals/:id', rentalsController.updateRental);
router.post('/api/rentals/checkout', rentalsController.checkoutSingle);
router.post('/api/rentals/checkout-cart', rentalsController.checkoutCart);
router.get('/api/rentals/:id/invoice', rentalsController.rentalInvoice);

router.get('/api/admin/users', adminController.adminUsersGet);
router.put('/api/admin/users', adminController.adminUsersPut);
router.delete('/api/admin/users', adminController.adminUsersDelete);
router.get('/api/admin/stats', adminController.adminStats);
router.get('/api/admin/reports', adminController.adminReports);
router.put('/api/admin/approvals', adminController.adminApprovals);

router.post('/api/ai/chat', aiController.aiChat);
router.get('/api/ai/similar', aiController.aiSimilar);
router.post('/api/ai/smart-analyze', smartAnalyzeUpload, aiController.aiSmartAnalyze);

router.post('/api/chatbot', miscController.chatbot);
router.post('/api/smart-listing', smartAnalyzeUpload, miscController.smartListing);

router.post('/api/report', miscController.reportUser);

router.get('/api/reviews', miscController.getReviews);
router.post('/api/reviews', miscController.postReview);
router.post('/api/reviews/reply', miscController.replyToReview);

router.get('/api/seller/:id', miscController.getSeller);
router.patch('/api/seller/profile', sellerProfileUpload, miscController.patchSellerProfile);

router.get('/api/user/addresses', miscController.getAddresses);
router.post('/api/user/addresses', miscController.postAddress);
router.patch('/api/user/addresses/:id', miscController.patchAddress);
router.delete('/api/user/addresses/:id', miscController.deleteAddress);

export default router;
