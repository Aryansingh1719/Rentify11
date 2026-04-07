'use client';

import { useDispatch, useSelector } from 'react-redux';
import { removeFromCart, updateCartItemDates, clearCart } from '@/store/slices/cartSlice';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ShoppingCart, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'react-hot-toast';

function getTotalForItem(item) {
  const start = new Date(item.startDate).getTime();
  const end = new Date(item.endDate).getTime();
  const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  if (item.duration === 'week') {
    const weeks = Math.ceil(days / 7);
    return weeks * (item.product.pricePerWeek ?? item.product.pricePerDay * 7);
  }
  if (item.duration === 'month') {
    const months = Math.ceil(days / 30);
    return months * (item.product.pricePerMonth ?? item.product.pricePerDay * 30);
  }
  return days * item.product.pricePerDay;
}

export default function CartPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const { items } = useSelector((state) => state.cart);

  const subtotal = items.reduce((sum, it) => sum + getTotalForItem(it), 0);

  const handleCheckout = () => {
    if (!user) {
      toast.error('Please login to checkout');
      return router.push('/login');
    }
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    router.push('/checkout');
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
        <h1 className="text-3xl font-black tracking-tighter text-foreground mb-8 flex items-center gap-2">
          <ShoppingCart size={32} /> Cart ({items.length})
        </h1>

        {items.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-24 text-center bg-card rounded-3xl border border-dashed border-border"
          >
            <ShoppingCart className="mx-auto text-muted-foreground mb-4" size={56} />
            <p className="text-muted-foreground font-medium mb-4">Your cart is empty</p>
            <Link href="/products" className="inline-block px-8 py-3 bg-emerald-600 dark:bg-cyan-600 text-white rounded-2xl font-bold hover:bg-emerald-500 dark:hover:bg-cyan-500">
              Browse rentals
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {items.map((item) => (
              <motion.div
                key={item.productId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-3xl border border-border p-6 shadow-sm dark:shadow-black/20 flex flex-col sm:flex-row gap-6"
              >
                <div className="relative w-full sm:w-32 aspect-square rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                  <Image src={item.product.images[0]} alt={item.product.title} fill className="object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.productId}`} className="font-bold text-lg text-foreground hover:text-emerald-600 dark:hover:text-cyan-400 line-clamp-1">
                    {item.product.title}
                  </Link>
                  <p className="text-sm text-muted-foreground mb-4">${item.product.pricePerDay}/day</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase">Start</label>
                      <input
                        type="date"
                        value={item.startDate}
                        onChange={(e) =>
                          dispatch(
                            updateCartItemDates({
                              productId: item.productId,
                              startDate: e.target.value,
                              endDate: item.endDate,
                              duration: item.duration,
                            })
                          )
                        }
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase">End</label>
                      <input
                        type="date"
                        value={item.endDate}
                        onChange={(e) =>
                          dispatch(
                            updateCartItemDates({
                              productId: item.productId,
                              startDate: item.startDate,
                              endDate: e.target.value,
                              duration: item.duration,
                            })
                          )
                        }
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-muted-foreground uppercase">Duration</label>
                      <select
                        value={item.duration}
                        onChange={(e) =>
                          dispatch(
                            updateCartItemDates({
                              productId: item.productId,
                              startDate: item.startDate,
                              endDate: item.endDate,
                              duration: e.target.value,
                            })
                          )
                        }
                        className="w-full mt-1 px-3 py-2 rounded-xl border border-border bg-input text-foreground text-sm"
                      >
                        <option value="day">Daily</option>
                        <option value="week">Weekly</option>
                        <option value="month">Monthly</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex sm:flex-col justify-between sm:items-end gap-2">
                  <p className="text-xl font-black text-foreground">${getTotalForItem(item).toFixed(2)}</p>
                  <button
                    onClick={() => dispatch(removeFromCart(item.productId))}
                    className="p-2 rounded-xl text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}

            <div className="bg-card rounded-3xl border border-border p-8 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-6">
              <div>
                <p className="text-muted-foreground font-medium">Subtotal</p>
                <p className="text-3xl font-black text-foreground">${subtotal.toFixed(2)}</p>
              </div>
              <button
                onClick={handleCheckout}
                className="px-10 py-4 bg-emerald-600 dark:bg-cyan-600 text-white rounded-2xl font-bold hover:bg-emerald-500 dark:hover:bg-cyan-500 flex items-center justify-center gap-2"
              >
                Proceed to checkout
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
