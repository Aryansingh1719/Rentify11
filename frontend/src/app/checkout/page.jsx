'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearCart } from '@/store/slices/cartSlice';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  MapPin,
  Truck,
  CreditCard,
  Banknote,
  Smartphone,
  Loader2,
  ChevronRight,
  Info,
} from 'lucide-react';

function getTotalForItem(item) {
  const start = new Date(item.startDate).getTime();
  const end = new Date(item.endDate).getTime();
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  if (item.duration === 'week') {
    const weeks = Math.ceil(days / 7);
    return weeks * (item.product?.pricePerWeek ?? item.product?.pricePerDay * 7);
  }
  if (item.duration === 'month') {
    const months = Math.ceil(days / 30);
    return months * (item.product?.pricePerMonth ?? item.product?.pricePerDay * 30);
  }
  return days * (item.product?.pricePerDay || 0);
}

const DAMAGE_PROTECTION_FEE = 2.99;

export default function CheckoutPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);

  const [step, setStep] = useState(1);
  const [addresses, setAddresses] = useState([]);
  const [productsExtra, setProductsExtra] = useState({});
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formAddress, setFormAddress] = useState({
    name: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  });

  const [fulfillmentType, setFulfillmentType] = useState('delivery');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [damageProtection, setDamageProtection] = useState(false);

  const productIds = [...new Set(items.map((i) => i.productId))];
  const anyAllowPickup = Object.values(productsExtra).some((p) => p?.allowPickup);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (items.length === 0) {
      router.push('/cart');
      return;
    }
    const load = async () => {
      try {
        const [addrRes, ...productResList] = await Promise.all([
          api.get('/api/user/addresses'),
          ...productIds.map((id) => api.get(`/api/products/${id}`).catch(() => ({ data: {} }))),
        ]);
        setAddresses(addrRes.data?.addresses || []);
        const byId = {};
        productResList.forEach((r, idx) => {
          const id = productIds[idx];
          if (r.data?.product) byId[id] = r.data.product;
        });
        setProductsExtra(byId);
        const defaultAddr = (addrRes.data?.addresses || []).find((a) => a.isDefault) || (addrRes.data?.addresses || [])[0];
        if (defaultAddr) setSelectedAddress(defaultAddr);
        if ((addrRes.data?.addresses || []).length === 0) setShowAddAddress(true);
      } catch (e) {
        toast.error('Failed to load checkout data');
        router.push('/cart');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, items.length, router]);

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.patch(`/api/user/addresses/${editId}`, formAddress);
        toast.success('Address updated');
      } else {
        await api.post('/api/user/addresses', formAddress);
        toast.success('Address added');
      }
      const res = await api.get('/api/user/addresses');
      setAddresses(res.data?.addresses || []);
      const updated = (res.data?.addresses || []).find((a) => a._id === editId) || (res.data?.addresses || []).slice(-1)[0];
      if (updated) setSelectedAddress(updated);
      setShowAddAddress(false);
      setEditId(null);
      setFormAddress({ name: '', phone: '', street: '', city: '', state: '', pincode: '', isDefault: false });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address');
    }
  };

  const subtotal = items.reduce((s, it) => s + getTotalForItem(it), 0);
  const totalDeposit = items.reduce((s, it) => s + (Number(productsExtra[it.productId]?.securityDeposit) || 0), 0);
  const protectionFee = damageProtection ? DAMAGE_PROTECTION_FEE : 0;
  const totalPayable = subtotal + totalDeposit + protectionFee;

  const canProceedPayment = selectedAddress != null;
  const addressSnapshot = selectedAddress
    ? {
        name: selectedAddress.name,
        phone: selectedAddress.phone,
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        pincode: selectedAddress.pincode,
      }
    : null;

  const handlePlaceOrder = async () => {
    if (!canProceedPayment) {
      toast.error('Please select or add an address');
      return;
    }
    setPlacing(true);
    try {
      const payload = {
        items: items.map((it) => ({
          productId: it.productId,
          startDate: it.startDate,
          endDate: it.endDate,
          totalAmount: getTotalForItem(it),
        })),
        selectedAddress: addressSnapshot,
        paymentMethod,
        fulfillmentType,
        damageProtectionFee: damageProtection ? DAMAGE_PROTECTION_FEE : 0,
      };
      const res = await api.post('/api/rentals/checkout-cart', payload);
      if (res.data.cod) {
        dispatch(clearCart());
        toast.success('Order placed! Cash on delivery.');
        router.push('/rentals/success?cod=1');
        return;
      }
      if (res.data.url) {
        dispatch(clearCart());
        window.location.href = res.data.url;
        return;
      }
      toast.error(res.data?.message || 'Checkout failed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Checkout failed');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="animate-spin text-emerald-600 dark:text-cyan-400" size={40} />
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-20">
        <h1 className="text-3xl font-black tracking-tighter text-foreground mb-8">Checkout</h1>

        {/* Step 1: Address */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-border p-6 sm:p-8 mb-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="text-emerald-600 dark:text-cyan-400" size={24} />
            <h2 className="text-xl font-bold text-foreground">Delivery address</h2>
          </div>

          {showAddAddress ? (
            <form onSubmit={handleSaveAddress} className="space-y-4">
              <input
                type="text"
                placeholder="Full name"
                value={formAddress.name}
                onChange={(e) => setFormAddress((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground"
                required
              />
              <input
                type="tel"
                placeholder="Phone"
                value={formAddress.phone}
                onChange={(e) => setFormAddress((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground"
                required
              />
              <input
                type="text"
                placeholder="Street address"
                value={formAddress.street}
                onChange={(e) => setFormAddress((p) => ({ ...p, street: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="City"
                  value={formAddress.city}
                  onChange={(e) => setFormAddress((p) => ({ ...p, city: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground"
                  required
                />
                <input
                  type="text"
                  placeholder="State"
                  value={formAddress.state}
                  onChange={(e) => setFormAddress((p) => ({ ...p, state: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground"
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Pincode"
                value={formAddress.pincode}
                onChange={(e) => setFormAddress((p) => ({ ...p, pincode: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-border bg-input text-foreground"
                required
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formAddress.isDefault}
                  onChange={(e) => setFormAddress((p) => ({ ...p, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-muted-foreground">Set as default</span>
              </label>
              <div className="flex gap-3">
                <button type="submit" className="px-6 py-3 bg-emerald-600 dark:bg-cyan-600 text-white rounded-xl font-bold">
                  Save address
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddAddress(false); setEditId(null); setFormAddress({ name: '', phone: '', street: '', city: '', state: '', pincode: '', isDefault: false }); }}
                  className="px-6 py-3 border border-border rounded-xl font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              {addresses.length > 0 && (
                <div className="space-y-3 mb-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr._id}
                      onClick={() => setSelectedAddress(addr)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                        selectedAddress?._id === addr._id
                          ? 'border-emerald-600 dark:border-cyan-400 bg-emerald-50/50 dark:bg-cyan-900/20'
                          : 'border-border hover:border-emerald-400 dark:hover:border-cyan-500'
                      }`}
                    >
                      <p className="font-bold text-foreground">{addr.name}</p>
                      <p className="text-sm text-muted-foreground">{addr.street}, {addr.city}, {addr.state} {addr.pincode}</p>
                      <p className="text-sm text-muted-foreground">{addr.phone}</p>
                      {addr.isDefault && (
                        <span className="inline-block mt-1 text-xs font-medium text-emerald-600 dark:text-cyan-400">Default</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => { setShowAddAddress(true); setEditId(null); setFormAddress({ name: '', phone: '', street: '', city: '', state: '', pincode: '', isDefault: false }); }}
                className="text-emerald-600 dark:text-cyan-400 font-bold text-sm"
              >
                + Add new address
              </button>
            </>
          )}
        </motion.section>

        {/* Step 2: Delivery / Pickup */}
        {anyAllowPickup && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-3xl border border-border p-6 sm:p-8 mb-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Truck className="text-emerald-600 dark:text-cyan-400" size={24} />
              <h2 className="text-xl font-bold text-foreground">Fulfillment</h2>
            </div>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setFulfillmentType('delivery')}
                className={`flex-1 py-3 px-4 rounded-2xl border-2 font-medium ${
                  fulfillmentType === 'delivery' ? 'border-emerald-600 dark:border-cyan-400 bg-emerald-50/50 dark:bg-cyan-900/20' : 'border-border'
                }`}
              >
                Home delivery
              </button>
              <button
                type="button"
                onClick={() => setFulfillmentType('pickup')}
                className={`flex-1 py-3 px-4 rounded-2xl border-2 font-medium ${
                  fulfillmentType === 'pickup' ? 'border-emerald-600 dark:border-cyan-400 bg-emerald-50/50 dark:bg-cyan-900/20' : 'border-border'
                }`}
              >
                Self pickup
              </button>
            </div>
          </motion.section>
        )}

        {/* Step 3: Payment method */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-border p-6 sm:p-8 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="text-emerald-600 dark:text-cyan-400" size={24} />
            <h2 className="text-xl font-bold text-foreground">Payment method</h2>
          </div>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left ${
                paymentMethod === 'card' ? 'border-emerald-600 dark:border-cyan-400 bg-emerald-50/50 dark:bg-cyan-900/20' : 'border-border'
              }`}
            >
              <CreditCard size={22} />
              <span className="font-medium">Debit / Credit card</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('upi')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left ${
                paymentMethod === 'upi' ? 'border-emerald-600 dark:border-cyan-400 bg-emerald-50/50 dark:bg-cyan-900/20' : 'border-border'
              }`}
            >
              <Smartphone size={22} />
              <span className="font-medium">UPI</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('cod')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left ${
                paymentMethod === 'cod' ? 'border-emerald-600 dark:border-cyan-400 bg-emerald-50/50 dark:bg-cyan-900/20' : 'border-border'
              }`}
            >
              <Banknote size={22} />
              <span className="font-medium">Cash on delivery (COD)</span>
            </button>
          </div>
        </motion.section>

        {/* Step 4: Order summary */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-3xl border border-border p-6 sm:p-8 mb-6"
        >
          <h2 className="text-xl font-bold text-foreground mb-4">Order summary</h2>
          <div className="space-y-2 text-muted-foreground mb-4">
            <div className="flex justify-between">
              <span>Rental total</span>
              <span className="text-foreground font-medium">${subtotal.toFixed(2)}</span>
            </div>
            {totalDeposit > 0 && (
              <div className="flex justify-between items-start gap-2">
                <span className="flex items-center gap-1">
                  Security deposit (refundable)
                  <span title="Security deposit is refundable after return verification." className="text-muted-foreground/80">
                    <Info size={14} />
                  </span>
                </span>
                <span className="text-foreground font-medium">${totalDeposit.toFixed(2)}</span>
              </div>
            )}
            <label className="flex justify-between items-center cursor-pointer py-2">
              <span className="flex items-center gap-1">
                Damage protection add-on
                <span title="Damage protection reduces deposit deductions in case of damage." className="text-muted-foreground/80">
                  <Info size={14} />
                </span>
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={damageProtection}
                  onChange={(e) => setDamageProtection(e.target.checked)}
                  className="rounded"
                />
                <span className="text-foreground font-medium">+${DAMAGE_PROTECTION_FEE.toFixed(2)}</span>
              </div>
            </label>
          </div>
          <div className="border-t border-border pt-4 flex justify-between text-lg font-bold text-foreground">
            <span>Total payable</span>
            <span>${totalPayable.toFixed(2)}</span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={!canProceedPayment || placing}
            className="mt-6 w-full py-4 bg-emerald-600 dark:bg-cyan-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {placing ? (
              <Loader2 className="animate-spin" size={22} />
            ) : paymentMethod === 'cod' ? (
              'Place order (Cash on delivery)'
            ) : (
              <>Pay ${totalPayable.toFixed(2)} <ChevronRight size={20} /></>
            )}
          </button>
          {!canProceedPayment && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">Please select or add an address above to continue.</p>
          )}
        </motion.section>

        <Link href="/cart" className="text-muted-foreground hover:text-foreground text-sm">← Back to cart</Link>
      </div>
      <Footer />
    </main>
  );
}
