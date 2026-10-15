"use client";

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { ArrowDown, Pause, Play, Sparkle } from "lucide-react";
import { LinkButton, Photo } from "./ui";

function useAmbientMotion() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { amount: 0.08 });
  const reduced = useReducedMotion();
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(!document.hidden);
    updateVisibility();
    setReady(true);
    document.addEventListener("visibilitychange", updateVisibility);
    return () =>
      document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  return {
    ref,
    ready,
    reduced,
    paused,
    setPaused,
    running: ready && inView && visible && !reduced && !paused,
  };
}

function entranceDelay(seconds: number): CSSProperties {
  return { "--entrance-delay": `${seconds}s` } as CSSProperties;
}

const headline = "Good days start with what you wear.";
const headlineWords = headline.split(" ");

export function HomeHero() {
  const ambience = useAmbientMotion();
  const [desktop, setDesktop] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ambience.ref,
    offset: ["start start", "end start"],
  });
  const portraitY = useTransform(scrollYProgress, [0, 1], [0, 24]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1000px)");
    const update = () => setDesktop(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <section
      ref={ambience.ref}
      className="hero hero-motion"
      data-ready={ambience.ready}
      data-running={ambience.running}
      data-reduced={ambience.ready && Boolean(ambience.reduced)}
    >
      <div className="container hero-grid">
        <div className="hero-copy">
          <p className="eyebrow hero-enter" style={entranceDelay(0.06)}>
            Everyday, considered
          </p>
          <h1 aria-label={headline}>
            {headlineWords.map((word, index) => (
              <Fragment key={index}>
                <span className="hero-word-mask" aria-hidden="true">
                  <span
                    className="hero-title-word"
                    style={
                      { "--word-delay": `${0.14 + index * 0.055}s` } as CSSProperties
                    }
                  >
                    {word}
                  </span>
                </span>
                {index < headlineWords.length - 1 ? " " : null}
              </Fragment>
            ))}
          </h1>
          <p className="hero-enter" style={entranceDelay(0.5)}>
            Find your own rhythm in everyday clothing and intimates. Choose
            the pieces that feel like you.
          </p>
          <div className="actions hero-enter" style={entranceDelay(0.62)}>
            <LinkButton href="/new-arrivals">Shop new arrivals</LinkButton>
            <LinkButton href="/intimates" variant="secondary">
              Explore intimates
            </LinkButton>
          </div>
        </div>
        <div className="hero-picture hero-enter" style={entranceDelay(0.18)}>
          <div className="hero-ambient" aria-hidden="true">
            <span className="hero-ambient-ring" />
            <span className="hero-ambient-spark">
              <Sparkle size={26} strokeWidth={1} />
            </span>
          </div>
          <div className="hero-portrait">
            <motion.div
              className="hero-image-stage"
              style={{
                y:
                  desktop && !ambience.reduced && !ambience.paused
                    ? portraitY
                    : 0,
              }}
            >
              <Photo
                src="/images/editorial-hero.png"
                alt="Editorial portrait in warm afternoon light"
                priority
                sizes="(max-width: 999px) calc(100vw - 32px), 50vw"
              />
            </motion.div>
          </div>
          <div className="hero-detail">
            <Photo
              src="/images/editorial-detail.png"
              alt="A close view of soft fabric texture"
              sizes="150px"
            />
          </div>
        </div>
      </div>
      <div className="container hero-footnote">
        <a className="hero-scroll-cue" href="#latest-edit">
          <span className="hero-scroll-icon" aria-hidden="true">
            <ArrowDown size={16} strokeWidth={1.5} />
          </span>
          Discover the latest edit
        </a>
        {ambience.ready && !ambience.reduced ? (
          <button
            type="button"
            className="hero-motion-toggle"
            aria-pressed={ambience.paused}
            aria-label={
              ambience.paused ? "Resume hero animation" : "Pause hero animation"
            }
            onClick={() => ambience.setPaused((paused) => !paused)}
          >
            {ambience.paused ? (
              <Play size={13} aria-hidden="true" />
            ) : (
              <Pause size={13} aria-hidden="true" />
            )}
            {ambience.paused ? "Resume motion" : "Pause motion"}
          </button>
        ) : null}
      </div>
    </section>
  );
}

const ribbonPhrases = [
  "Everyday, considered",
  "Find your own rhythm",
  "Nella & Vale",
  "Choose the pieces that feel like you",
];

export function BrandRibbon() {
  const ambience = useAmbientMotion();

  return (
    <section
      ref={ambience.ref}
      className="brand-ribbon"
      aria-label="Nella & Vale"
      data-ready={ambience.ready}
      data-running={ambience.running}
      data-reduced={ambience.ready && Boolean(ambience.reduced)}
    >
      <div className="brand-ribbon-window">
        <div className="brand-ribbon-track">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              className="brand-ribbon-copy"
              aria-hidden={copy === 1 ? true : undefined}
            >
              {ribbonPhrases.map((phrase) => (
                <span className="brand-ribbon-phrase" key={phrase}>
                  <span>{phrase}</span>
                  <Sparkle size={15} strokeWidth={1} aria-hidden="true" />
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      {ambience.ready && !ambience.reduced ? (
        <button
          type="button"
          className="brand-ribbon-toggle"
          aria-pressed={ambience.paused}
          aria-label={
            ambience.paused
              ? "Resume moving brand ribbon"
              : "Pause moving brand ribbon"
          }
          onClick={() => ambience.setPaused((paused) => !paused)}
        >
          {ambience.paused ? (
            <Play size={14} aria-hidden="true" />
          ) : (
            <Pause size={14} aria-hidden="true" />
          )}
        </button>
      ) : null}
    </section>
  );
}
