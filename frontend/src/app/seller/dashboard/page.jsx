'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useDispatch, useSelector } from 'react-redux';
import { setUser } from '@/store/slices/authSlice';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, DollarSign, Clock, CheckCircle, Loader2, Settings, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import Link from 'next/link';

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop';
const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=1200&h=400&fit=crop';

export default function SellerDashboard() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [tab, setTab] = useState('overview');
  const [products, setProducts] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Electronics',
    pricePerDay: '',
    securityDeposit: '',
    allowPickup: false,
    images: [],
    specImage: null,
  });

  const [isSmartAnalyzing, setIsSmartAnalyzing] = useState(false);

  // Shop settings form (avatar/banner as files or preview URLs)
  const [shopForm, setShopForm] = useState({
    bio: '',
    location: '',
    policies: '',
    avatarFile: null,
    bannerFile: null,
    avatarPreview: '',
    bannerPreview: '',
  });
  const [shopLoading, setShopLoading] = useState(false);
  const [shopSaving, setShopSaving] = useState(false);

  const loadShopProfile = useCallback(async () => {
    setShopLoading(true);
    try {
      const res = await api.get('/api/auth/me');
      const u = res.data.user;
      setShopForm((prev) => ({
        ...prev,
        bio: u.bio || '',
        location: u.location || '',
        policies: u.policies || '',
        avatarPreview: u.avatar || DEFAULT_AVATAR,
        bannerPreview: u.shopBanner || DEFAULT_BANNER,
      }));
    } catch {
      toast.error('Failed to load shop profile');
    } finally {
      setShopLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'shop') loadShopProfile();
  }, [tab, loadShopProfile]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, rentRes] = await Promise.all([
          api.get(`/api/products?seller=${user?.id}&approved=false`),
          api.get('/api/rentals'),
        ]);
        setProducts(prodRes.data.products);
        setRentals(rentRes.data.rentals);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('category', formData.category);
      data.append('pricePerDay', formData.pricePerDay);
      if (formData.securityDeposit !== '' && formData.securityDeposit != null) {
        data.append('securityDeposit', formData.securityDeposit);
      }
      data.append('allowPickup', formData.allowPickup ? 'true' : 'false');
      formData.images.forEach(img => data.append('images', img));

      await api.post('/api/products', data);
      toast.success('Product submitted for approval!');
      setIsModalOpen(false);
      const res = await api.get(`/api/products?seller=${user?.id}&approved=false`);
      setProducts(res.data.products);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShopSubmit = async (e) => {
    e.preventDefault();
    setShopSaving(true);
    try {
      const data = new FormData();
      data.append('bio', shopForm.bio);
      data.append('location', shopForm.location);
      data.append('policies', shopForm.policies);
      if (shopForm.avatarFile) data.append('avatar', shopForm.avatarFile);
      if (shopForm.bannerFile) data.append('shopBanner', shopForm.bannerFile);
      const res = await api.patch('/api/seller/profile', data);
      toast.success('Shop profile updated!');
      dispatch(setUser(res.data.user));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setShopSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-foreground mb-2">Seller Hub</h1>
            <p className="text-muted-foreground">Manage your rental inventory and track your earnings.</p>
          </div>
          {tab === 'overview' && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-8 py-4 bg-emerald-600 dark:bg-cyan-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-500 dark:hover:bg-cyan-500 transition-all shadow-xl shadow-emerald-500/20 dark:shadow-cyan-500/20"
            >
              <Plus size={20} /> Add New Listing
            </button>
          )}
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-10">
          <button
            onClick={() => setTab('overview')}
            className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${tab === 'overview' ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-card text-muted-foreground hover:bg-secondary border border-border'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab('shop')}
            className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all flex items-center gap-2 ${tab === 'shop' ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-card text-muted-foreground hover:bg-secondary border border-border'}`}
          >
            <Settings size={18} /> Shop Settings
          </button>
        </div>

        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { label: 'Total Earnings', value: `$${rentals.reduce((acc, r) => acc + (r.paymentStatus === 'paid' ? r.totalAmount : 0), 0)}`, icon: <DollarSign className="text-emerald-500 dark:text-cyan-400" />, color: 'bg-emerald-50 dark:bg-emerald-900/30' },
            { label: 'Active Products', value: products.filter((p) => p.isApproved).length, icon: <Package className="text-blue-500" />, color: 'bg-blue-50 dark:bg-blue-900/30' },
            { label: 'Pending Approval', value: products.filter((p) => !p.isApproved).length, icon: <Clock className="text-amber-500" />, color: 'bg-amber-50 dark:bg-amber-900/30' },
            { label: 'Rental Requests', value: rentals.length, icon: <CheckCircle className="text-purple-500" />, color: 'bg-purple-50 dark:bg-purple-900/30' },
          ].map((stat, i) => (
            <div key={i} className="bg-card p-8 rounded-[32px] border border-border shadow-sm dark:shadow-black/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-2xl font-black text-foreground">{stat.value}</p>
              </div>
              <div className={`p-4 ${stat.color} rounded-2xl`}>{stat.icon}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Inventory */}
          <section className="lg:col-span-2 bg-card rounded-[40px] border border-border shadow-sm dark:shadow-black/20 overflow-hidden">
            <div className="p-8 border-b border-border">
              <h2 className="text-xl font-black text-foreground">My Inventory</h2>
            </div>
            <div className="divide-y divide-border">
              {products.length > 0 ? products.map((product) => (
                <div key={product._id} className="p-8 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <img src={product.images[0]} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                    <div>
                      <h3 className="font-bold text-foreground">{product.title}</h3>
                      <p className="text-sm text-muted-foreground">{product.category} • ${product.pricePerDay}/day</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${product.isApproved ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                      {product.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="p-20 text-center text-muted-foreground italic">No products listed yet.</div>
              )}
            </div>
          </section>

          {/* Recent Orders */}
          <section className="bg-card rounded-[40px] border border-border shadow-sm dark:shadow-black/20 overflow-hidden">
            <div className="p-8 border-b border-border">
              <h2 className="text-xl font-black text-foreground">Recent Bookings</h2>
            </div>
            <div className="p-8 space-y-6">
              {rentals.slice(0, 5).map((rental) => (
                <div key={rental._id} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                    {rental.renter?.name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{rental.renter?.name}</p>
                    <p className="text-xs text-muted-foreground">{rental.product?.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600 dark:text-cyan-400">${rental.totalAmount}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">{rental.paymentStatus}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
            </motion.div>
          )}

          {tab === 'shop' && (
            <motion.div key="shop" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-10">
              <div className="bg-card rounded-[40px] border border-border shadow-sm dark:shadow-black/20 overflow-hidden p-8 md:p-10">
                <h2 className="text-2xl font-black text-foreground mb-2">Shop Settings</h2>
                <p className="text-muted-foreground mb-8">Edit your public shop profile. Renters see this on your storefront.</p>

                {shopLoading ? (
                  <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-emerald-600 dark:text-cyan-400" size={40} /></div>
                ) : (
                  <form onSubmit={handleShopSubmit} className="space-y-8">
                    {/* Banner */}
                    <div>
                      <label className="text-sm font-bold text-foreground ml-1 block mb-2">Shop Banner</label>
                      <div
                        className="relative h-48 rounded-2xl border-2 border-dashed border-border overflow-hidden bg-muted/50 flex items-center justify-center cursor-pointer hover:border-emerald-500 dark:hover:border-cyan-500 transition-colors"
                        onClick={() => document.getElementById('banner-input')?.click()}
                      >
                        {(shopForm.bannerPreview || shopForm.bannerFile) ? (
                          <img
                            src={shopForm.bannerFile ? URL.createObjectURL(shopForm.bannerFile) : shopForm.bannerPreview}
                            alt="Banner preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-muted-foreground">
                            <ImageIcon size={32} className="mx-auto mb-2 opacity-60" />
                            <span className="text-sm font-medium">Drop image or click</span>
                          </div>
                        )}
                        <input
                          id="banner-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setShopForm((p) => ({ ...p, bannerFile: f, bannerPreview: URL.createObjectURL(f) }));
                          }}
                        />
                      </div>
                    </div>

                    {/* Avatar */}
                    <div>
                      <label className="text-sm font-bold text-foreground ml-1 block mb-2">Profile Picture</label>
                      <div
                        className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-border overflow-hidden bg-muted/50 flex items-center justify-center cursor-pointer hover:border-emerald-500 dark:hover:border-cyan-500 transition-colors"
                        onClick={() => document.getElementById('avatar-input')?.click()}
                      >
                        {(shopForm.avatarPreview || shopForm.avatarFile) ? (
                          <img
                            src={shopForm.avatarFile ? URL.createObjectURL(shopForm.avatarFile) : shopForm.avatarPreview}
                            alt="Avatar preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon size={28} className="text-muted-foreground" />
                        )}
                        <input
                          id="avatar-input"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setShopForm((p) => ({ ...p, avatarFile: f, avatarPreview: URL.createObjectURL(f) }));
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-bold text-foreground ml-1 block mb-2">Location</label>
                      <input
                        type="text"
                        value={shopForm.location}
                        onChange={(e) => setShopForm((p) => ({ ...p, location: e.target.value }))}
                        className="w-full bg-input border border-border rounded-2xl px-6 py-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all"
                        placeholder="e.g. San Francisco, CA"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-foreground ml-1 block mb-2">About / Bio</label>
                      <textarea
                        value={shopForm.bio}
                        onChange={(e) => setShopForm((p) => ({ ...p, bio: e.target.value }))}
                        className="w-full bg-input border border-border rounded-2xl px-6 py-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all h-32"
                        placeholder="Tell renters about your shop and what you offer."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-bold text-foreground ml-1 block mb-2">Policies</label>
                      <textarea
                        value={shopForm.policies}
                        onChange={(e) => setShopForm((p) => ({ ...p, policies: e.target.value }))}
                        className="w-full bg-input border border-border rounded-2xl px-6 py-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all h-40 font-mono text-sm"
                        placeholder="Rental rules, cancellation, security deposit, etc. (one per line or short paragraphs)"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <Link href={user?.id ? `/seller/${user.id}` : '#'} className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold hover:bg-accent transition-all text-center">
                        View public shop
                      </Link>
                      <button
                        type="submit"
                        disabled={shopSaving}
                        className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-2"
                      >
                        {shopSaving ? <Loader2 className="animate-spin" size={20} /> : 'Save changes'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-card w-full max-w-2xl rounded-[40px] shadow-2xl dark:shadow-black/40 border border-border overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="p-10 flex-1 overflow-y-auto min-h-0">
                <h2 className="text-3xl font-black mb-2 text-foreground">List New Item</h2>
                <p className="text-muted-foreground mb-8">Fill in the details to submit your product for admin approval.</p>

                <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-bold text-foreground ml-1">Product Title</label>
                    <input 
                      required
                      type="text" 
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full bg-input border border-border rounded-2xl px-6 py-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all"
                      placeholder="e.g. Professional DJI Drone"
                    />
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-bold text-foreground ml-1">Description</label>
                    <textarea 
                      required
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-input border border-border rounded-2xl px-6 py-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all h-32"
                      placeholder="Describe the condition, features, and terms..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground ml-1">Category</label>
                    <select 
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-input border border-border rounded-2xl px-6 py-4 text-foreground focus:ring-2 focus:ring-ring outline-none transition-all appearance-none cursor-pointer"
                    >
                      <option>Electronics</option>
                      <option>Furniture</option>
                      <option>Photography</option>
                      <option>Outdoor</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground ml-1">Price / Day ($)</label>
                    <input 
                      required
                      type="number" 
                      value={formData.pricePerDay}
                      onChange={e => setFormData({...formData, pricePerDay: e.target.value})}
                      className="w-full bg-input border border-border rounded-2xl px-6 py-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all"
                      placeholder="25"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground ml-1">Security deposit ($, optional)</label>
                    <input 
                      type="number" 
                      min="0"
                      step="0.01"
                      value={formData.securityDeposit}
                      onChange={e => setFormData({...formData, securityDeposit: e.target.value})}
                      className="w-full bg-input border border-border rounded-2xl px-6 py-4 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all"
                      placeholder="0"
                    />
                    <p className="text-[11px] text-muted-foreground">Refundable after return verification.</p>
                  </div>

                  <div className="space-y-2 flex flex-col justify-end">
                    <label className="text-sm font-bold text-foreground ml-1 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.allowPickup}
                        onChange={e => setFormData({...formData, allowPickup: e.target.checked})}
                        className="rounded"
                      />
                      Allow self pickup
                    </label>
                    <p className="text-[11px] text-muted-foreground">Renters can choose to pick up at your location.</p>
                  </div>

                  <div className="col-span-2 space-y-2">
                    <label className="text-sm font-bold text-foreground ml-1">Product Images</label>
                    <input 
                      type="file" 
                      multiple
                      onChange={e => setFormData({...formData, images: Array.from(e.target.files || [])})}
                      className="w-full bg-input border border-dashed border-border rounded-2xl px-6 py-8 text-sm file:hidden cursor-pointer hover:border-emerald-500 dark:hover:border-cyan-500 transition-all"
                    />
                  </div>

                  <div className="col-span-2 grid grid-cols-2 gap-4 items-end">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground ml-1">
                        Spec sheet image (optional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            specImage: e.target.files?.[0] || null,
                          })
                        }
                        className="w-full bg-input border border-dashed border-border rounded-2xl px-6 py-4 text-sm file:hidden cursor-pointer hover:border-emerald-500 dark:hover:border-cyan-500 transition-all"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Upload a product photo and spec sheet to let AI suggest title, category, and description.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSmartAnalyzing || !formData.images.length}
                      onClick={async () => {
                        if (!formData.images.length) return;
                        setIsSmartAnalyzing(true);
                        try {
                          const fd = new FormData();
                          fd.append('main_image', formData.images[0]);
                          if (formData.specImage) {
                            fd.append('spec_image', formData.specImage);
                          }
                          const res = await api.post('/api/smart-listing', fd);
                          const data = res.data || {};
                          setFormData((prev) => ({
                            ...prev,
                            title: data.object || prev.title,
                            description: data.description || prev.description,
                            category: data.category || prev.category,
                          }));
                          toast.success('Form fields updated from AI suggestions');
                        } catch {
                          toast.error('Smart analyze failed. Please fill the form manually.');
                        } finally {
                          setIsSmartAnalyzing(false);
                        }
                      }}
                      className="h-12 mt-6 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSmartAnalyzing ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Analyzing…
                        </>
                      ) : (
                        'Smart fill from images'
                      )}
                    </button>
                  </div>

                  <div className="col-span-2 flex gap-4 pt-4">
                    <button 
                      type="button" 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 bg-secondary text-secondary-foreground rounded-2xl font-bold hover:bg-accent transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="flex-1 py-4 bg-primary text-primary-foreground rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : 'Submit Listing'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Footer />
    </main>
  );
}
