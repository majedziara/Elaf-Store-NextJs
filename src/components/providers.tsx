"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MotionConfig } from "motion/react";
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
        <div className="toast" role="status" aria-live="polite">
          {notice}
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
