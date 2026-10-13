import { Logo, LinkButton } from "@/components/ui";
export default function NotFound() {
  return (
    <section className="not-found">
      <Logo />
      <p className="eyebrow">404 / A little off the path</p>
      <h1>This page has moved on.</h1>
      <p className="muted">Let’s get you back to the collection.</p>
      <div
        className="actions"
        style={{ justifyContent: "center", marginTop: 28 }}
      >
        <LinkButton href="/">Return home</LinkButton>
        <LinkButton href="/new-arrivals" variant="secondary">
          Explore new arrivals
        </LinkButton>
      </div>
    </section>
  );
}
