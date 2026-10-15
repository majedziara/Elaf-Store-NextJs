"use client";

import dynamic from "next/dynamic";

export const AuthView = dynamic(() => import("./auth").then(module => module.AuthView));
export const BagView = dynamic(() => import("./checkout").then(module => module.BagView));
export const CheckoutView = dynamic(() => import("./checkout").then(module => module.CheckoutView));
export const PaymentView = dynamic(() => import("./checkout").then(module => module.PaymentView));
export const GuestLookup = dynamic(() => import("./checkout").then(module => module.GuestLookup));
export const AccountView = dynamic(() => import("./account").then(module => module.AccountView));
export const OrderDetails = dynamic(() => import("./account").then(module => module.OrderDetails));
export const ReturnCreate = dynamic(() => import("./account").then(module => module.ReturnCreate));
export const ReturnDetails = dynamic(() => import("./account").then(module => module.ReturnDetails));
