"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useAction } from "@/lib/api";
import { useStore } from "./providers";
import { Logo, Photo, Form, InputField, Check, Button, Notice } from "./ui";
import { authTitles } from "@/lib/navigation";
export function safeNext(value: string | undefined, fallback = "/account") {
  return value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f]/.test(value)
    ? value
    : fallback;
}
export function AuthView({
  mode,
  query,
}: {
  mode: string;
  query: Record<string, string>;
}) {
  const a = useAction(),
    store = useStore(),
    router = useRouter();
  const [token] = useState(query.token || "");
  const consumed = useRef(false);
  const admin = mode === "admin-sign-in";
  useEffect(() => {
    if (query.token) {
      const u = new URL(window.location.href);
      u.searchParams.delete("token");
      u.searchParams.delete("email");
      history.replaceState(null, "", u.pathname + u.search);
    }
  }, [query.token]);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.currentTarget));
    const email = String(d.email || query.email || "");
    let endpoint = "",
      body: Record<string, unknown> = {};
    if (mode === "sign-in" || admin) {
      endpoint = "auth/" + (admin ? "admin-login" : "login");
      body = { email, password: d.password, remember: d.remember === "on" };
    }
    if (mode === "create-account") {
      endpoint = "auth/register";
      body = {
        name: d.name,
        email,
        password: d.password,
        password_confirmation: d.password_confirmation,
        marketing_opt_in: d.marketing_opt_in === "on",
      };
    }
    if (mode === "forgot-password") {
      endpoint = "auth/forgot-password";
      body = { email };
    }
    if (mode === "reset-password") {
      endpoint = "auth/reset-password";
      body = {
        email,
        token,
        password: d.password,
        password_confirmation: d.password_confirmation,
      };
    }
    if (mode === "verify-email" || mode === "change-email") {
      if (consumed.current) return;
      endpoint = "auth/consume/" + mode;
      body = { token };
    }
    await a.run(
      async () => {
        const result = await api<{ message?: string }>(endpoint, {
          method: "POST",
          body,
        });
        if (mode === "verify-email" || mode === "change-email")
          consumed.current = true;
        if (["sign-in", "admin-sign-in", "create-account"].includes(mode)) {
          await store.refreshUser();
          await store.refreshCart();
          router.replace(
            safeNext(
              query.next,
              admin
                ? "/admin"
                : mode === "create-account"
                  ? "/verify-email"
                  : "/account",
            ),
          );
          router.refresh();
        }
        if (mode === "reset-password" || mode === "change-email") {
          router.replace("/sign-in");
          router.refresh();
        }
        return result;
      },
      mode === "forgot-password"
        ? "If the account exists, a reset link has been sent."
        : mode === "verify-email"
          ? "Your email has been verified."
          : "Saved.",
    );
  };
  return (
    <div className="auth-layout">
      <div className="auth-editorial">
        <Photo
          src="/images/editorial-hero.png"
          alt="A quiet afternoon, in everyday clothing"
          priority
        />
      </div>
      <section className="auth-card">
        <Logo />
        <p className="eyebrow">
          {admin ? "Nella & Vale / Operations" : "Nella & Vale / Your account"}
        </p>
        <h1>{authTitles[mode]}</h1>
        <p className="muted">
          {mode === "forgot-password"
            ? "Enter your email and we’ll send you a secure reset link."
            : mode === "verify-email"
              ? "Confirm the link sent to your email to finish setting up your account."
              : mode === "change-email"
                ? "Confirm this link to update your email. You will then sign in again."
                : mode === "reset-password"
                  ? "Use at least 12 characters, including letters and numbers."
                  : admin
                    ? "Sign in with your authorized store account."
                    : "Your orders, saved pieces, and everyday favourites, all in one place."}
        </p>
        <Form
          onSubmit={submit}
          error={a.error}
          busy={a.busy}
          message={a.message}
        >
          {mode === "create-account" ? (
            <InputField
              label="Full name"
              name="name"
              autoComplete="name"
              required
              maxLength={120}
            />
          ) : null}
          {[
            "sign-in",
            "admin-sign-in",
            "create-account",
            "forgot-password",
            "reset-password",
          ].includes(mode) ? (
            <InputField
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={query.email || ""}
              required
              maxLength={254}
            />
          ) : null}
          {[
            "sign-in",
            "admin-sign-in",
            "create-account",
            "reset-password",
          ].includes(mode) ? (
            <InputField
              label={mode === "reset-password" ? "New password" : "Password"}
              name="password"
              type="password"
              autoComplete={
                ["create-account", "reset-password"].includes(mode)
                  ? "new-password"
                  : "current-password"
              }
              required
              minLength={
                ["create-account", "reset-password"].includes(mode)
                  ? 12
                  : undefined
              }
              maxLength={255}
            />
          ) : null}
          {["create-account", "reset-password"].includes(mode) ? (
            <InputField
              label="Confirm password"
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
            />
          ) : null}
          {["sign-in", "admin-sign-in"].includes(mode) ? (
            <Check name="remember">Keep me signed in</Check>
          ) : null}
          {mode === "create-account" ? (
            <Check name="marketing_opt_in">
              I would like to receive store news by email.
            </Check>
          ) : null}
          {mode === "verify-email" && !token ? (
            <>
              <Notice>
                Open the verification link in your email. If you need a new
                link, request one below.
              </Notice>
              <Button
                type="button"
                busy={a.busy}
                onClick={() =>
                  a.run(
                    () => api("auth/resend-verification", { method: "POST" }),
                    "A verification email has been requested.",
                  )
                }
              >
                Resend verification email
              </Button>
            </>
          ) : (
            <Button
              busy={a.busy}
              disabled={
                (["verify-email", "change-email", "reset-password"].includes(
                  mode,
                ) &&
                  !token) ||
                consumed.current
              }
            >
              {mode === "forgot-password"
                ? "Send reset link"
                : mode === "reset-password"
                  ? "Save password"
                  : mode === "create-account"
                    ? "Create account"
                    : mode === "verify-email"
                      ? "Verify email"
                      : mode === "change-email"
                        ? "Confirm email change"
                        : "Sign in"}
            </Button>
          )}
        </Form>
        <div className="auth-links">
          {mode === "sign-in" ? (
            <>
              <Link href="/forgot-password">Forgot password?</Link>
              <Link href="/create-account">Create account</Link>
            </>
          ) : (
            <Link href={admin ? "/admin/sign-in" : "/sign-in"}>
              Back to sign in
            </Link>
          )}
        </div>
        {mode === "verify-email" && a.message ? (
          <Link className="button secondary" href="/account">
            Continue to your account
          </Link>
        ) : null}
      </section>
    </div>
  );
}
