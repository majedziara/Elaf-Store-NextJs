"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, MotionConfig, useReducedMotion } from "motion/react";
import { api } from "@/lib/api";
import type { Cart, Settings, User } from "@/lib/types";
type Store = {
  settings: Settings;
  user: User | null;
  cart: Cart | null;
  authLoading: boolean;
  refreshUser: () => Promise<void>;
  refreshCart: () => Promise<void>;
  addItem: (id: number, quantity: number) => Promise<void>;
  setQuantity: (id: number, n: number) => Promise<void>;
  logout: () => Promise<void>;
  toast: (s: string) => void;
};
const Context = createContext<Store | null>(null);
export function Providers({
  children,
  settings,
}: {
  children: ReactNode;
  settings: Settings;
}) {
  const [user, setUser] = useState<User | null>(null),
    [authLoading, setAuthLoading] = useState(true),
    [cart, setCart] = useState<Cart | null>(null),
    [notice, setNotice] = useState("");
  const reduced = useReducedMotion();
  const adding = useRef(false);
  const refreshUser = async () => {
    try {
      setUser((await api<{ data: User }>("auth/me")).data);
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };
  const refreshCart = async () => {
    try {
      setCart((await api<{ data: Cart }>("cart")).data);
    } catch {
      setCart(null);
    }
  };
  useEffect(() => {
    void refreshUser();
    void refreshCart();
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  const addItem = async (id: number, quantity: number) => {
    if (adding.current) return;
    adding.current = true;
    try {
      let current = cart;
      if (!current || current.status !== "open") {
        current = (await api<{ data: Cart }>("cart", { method: "POST" })).data;
        setCart(current);
      }
      const existing =
        current.items.find((i) => i.variant_id === id)?.quantity || 0;
      setCart(
        (
          await api<{ data: Cart }>("cart/items", {
            method: "PUT",
            body: { variant_id: id, quantity: existing + quantity },
          })
        ).data,
      );
      setNotice("Added to your bag.");
    } finally {
      adding.current = false;
    }
  };
  const setQuantity = async (id: number, n: number) => {
    setCart(
      (
        await api<{ data: Cart }>("cart/items", {
          method: "PUT",
          body: { variant_id: id, quantity: n },
        })
      ).data,
    );
  };
  const logout = async () => {
    await api("auth/logout", { method: "POST" });
    setUser(null);
    setCart(null);
  };
  return (
    <MotionConfig reducedMotion="user">
      <Context.Provider
        value={{
          settings,
          user,
          cart,
          authLoading,
          refreshUser,
          refreshCart,
          addItem,
          setQuantity,
          logout,
          toast: setNotice,
        }}
      >
        {children}
        <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
          <AnimatePresence initial={false}>
            {notice ? (
              <motion.div className="toast" key={notice} initial={reduced ? false : { opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: reduced ? 0 : 8 }} transition={{ duration: reduced ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}>
                <span className="toast-mark" aria-hidden="true">✓</span>
                {notice}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </Context.Provider>
    </MotionConfig>
  );
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Store provider missing.");
  return value;
}
