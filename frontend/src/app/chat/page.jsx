'use client';

import { useState } from 'react';
import api from '@/lib/api';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2 } from 'lucide-react';

export default function ChatbotPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      text: input.trim(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/api/chatbot', { query: userMessage.text });
      const data = res.data;

      const botText =
        typeof data.text === 'string'
          ? data.text
          : typeof data.response === 'string'
          ? data.response
          : 'Sorry, I could not understand that.';

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: botText,
          items: data.items || null,
          source: data.source || null,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'assistant',
          text: 'The chat service is currently unavailable. Please try again later.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <header className="mb-8">
          <h1 className="text-4xl font-black tracking-tighter text-foreground mb-2">Assistant</h1>
          <p className="text-muted-foreground">
            Ask about rental policies or get item suggestions. The assistant is grounded in your policy
            document and live inventory.
          </p>
        </header>

        <div className="bg-card rounded-[40px] border border-border shadow-sm dark:shadow-black/20 flex flex-col h-[70vh] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-cyan-400 mt-1">
                      <Bot size={16} />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.source === 'policy' && (
                      <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        From policy
                      </p>
                    )}
                    {Array.isArray(msg.items) && msg.items.length > 0 && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {msg.items.map((item) => (
                          <div
                            key={item._id || item.id}
                            className="bg-muted/50 border border-border rounded-xl p-3 text-xs text-foreground"
                          >
                            <div className="font-bold truncate">{item.title}</div>
                            {item.category && (
                              <div className="text-[11px] text-muted-foreground mt-1">{item.category}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mt-1">
                      <User size={16} />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Try asking &quot;What is the late return policy?&quot; or &quot;Show me cameras under
                ₹1000/day&quot;.
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-border p-4 flex gap-3 bg-card">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about policies or items..."
              className="flex-1 bg-input border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-3 rounded-2xl bg-emerald-600 dark:bg-cyan-600 text-white flex items-center gap-2 text-sm font-bold hover:bg-emerald-500 dark:hover:bg-cyan-500 disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </main>
  );
}

