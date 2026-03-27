import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// ─── Nav Mega Menu ───
// Dropdown panel inspired by Midday. Hooks into Webflow via data-nav-* attributes.
// Handles: hamburger morph, MENU/CLOSE label, dropdown reveal, card hover,
// click-outside close, nav scroll state.

// ─── Craft Easings ───
const EASE = {
  fantasy: "cubic-bezier(0.19, 1, 0.22, 1)", // nav items, underlines
  expo: "expo.out", // reveals, entrances
  quart: "power2.out", // hover, micro
  quartIn: "power2.in", // hover exit
  morphInOut: "power2.inOut", // symmetric morph (hamburger)
};

export function initNav() {
  const nav = document.querySelector("[data-nav]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const overlay = document.querySelector("[data-nav-overlay]");
  const menuLabel = document.querySelector(".nav__menu-label");
  const lines = {
    top: document.querySelector('[data-nav-line="1"]'),
    mid: document.querySelector('[data-nav-line="2"]'),
    bot: document.querySelector('[data-nav-line="3"]'),
  };
  const navCta = document.querySelector("[data-nav-cta]");

  // Links: query buttons inside the links container (no data-nav-link attr on them)
  const linksContainer = overlay
    ? overlay.querySelector(".nav-overlay__links")
    : null;
  const navLinks = linksContainer
    ? linksContainer.querySelectorAll(".button")
    : [];

  // Cards: query by class (nav-card elements inside overlay)
  const navCards = overlay ? overlay.querySelectorAll(".nav-card") : [];

  if (!nav || !toggle || !overlay) {
    console.log(
      "%c[nav] %cMissing nav elements, skipping",
      "color: #b8860b; font-weight: bold",
      "color: #f59e0b",
    );
    return;
  }

  console.log(
    "%c[nav] %cInit — %d links, %d cards, dropdown ready",
    "color: #b8860b; font-weight: bold",
    "color: #22c55e",
    navLinks.length,
    navCards.length,
  );

  let isOpen = false;

  // ─── Hamburger → X timeline (paused) ───
  // Symmetric morph — power2.inOut is correct here (equal in/out weight)
  const hamburgerTl = gsap.timeline({ paused: true });

  if (lines.top && lines.mid && lines.bot) {
    hamburgerTl
      .to(
        lines.top,
        {
          rotation: 45,
          y: function () {
            const topRect = lines.top.getBoundingClientRect();
            const midRect = lines.mid.getBoundingClientRect();
            return midRect.top - topRect.top;
          },
          duration: 0.4,
          ease: EASE.morphInOut,
        },
        0,
      )
      .to(
        lines.mid,
        {
          autoAlpha: 0,
          duration: 0.15,
          ease: EASE.morphInOut,
        },
        0,
      )
      .to(
        lines.bot,
        {
          rotation: -45,
          y: function () {
            const botRect = lines.bot.getBoundingClientRect();
            const midRect = lines.mid.getBoundingClientRect();
            return midRect.top - botRect.top;
          },
          duration: 0.4,
          ease: EASE.morphInOut,
        },
        0,
      );
  }

  // ─── Dropdown reveal timeline (paused) ───
  const dropdownTl = gsap.timeline({
    paused: true,
    onReverseComplete: function () {
      overlay.style.display = "none";
      overlay.style.pointerEvents = "none";
    },
  });

  // Initial hidden state
  gsap.set(overlay, {
    clipPath: "inset(0 0 100% 0)",
    display: "none",
    pointerEvents: "none",
  });

  if (navLinks.length) {
    gsap.set(navLinks, { y: 20, autoAlpha: 0 });
  }
  if (navCards.length) {
    gsap.set(navCards, { y: 20, autoAlpha: 0 });
  }
  if (navCta) {
    gsap.set(navCta, { y: 15, autoAlpha: 0 });
  }

  // Panel clips open — expo.out for the main reveal (~400ms dropdown)
  dropdownTl.to(overlay, {
    clipPath: "inset(0 0 0 0)",
    duration: 0.4,
    ease: EASE.expo,
  });

  // Nav links stagger in with fantasy easing (nav items)
  if (navLinks.length) {
    dropdownTl.to(
      navLinks,
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.25,
        ease: EASE.fantasy,
        stagger: { each: 0.04, from: "start" },
      },
      "-=0.15",
    );
  }

  // Cards are reveals — expo.out, ~400ms
  if (navCards.length) {
    dropdownTl.to(
      navCards,
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.4,
        ease: EASE.expo,
        stagger: { each: 0.08, from: "start" },
      },
      "-=0.15",
    );
  }

  // CTA fades in — quart for micro element
  if (navCta) {
    dropdownTl.to(
      navCta,
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.25,
        ease: EASE.quart,
      },
      "-=0.1",
    );
  }

  // ─── Nav card hover (reveal overlay from bottom) ───
  initCardHovers(navCards);

  // ─── MENU/CLOSE label crossfade ───
  function crossfadeLabel(newText) {
    if (!menuLabel) return;
    gsap.to(menuLabel, {
      autoAlpha: 0,
      duration: 0.15,
      ease: EASE.quartIn,
      onComplete: function () {
        menuLabel.textContent = newText;
        gsap.to(menuLabel, {
          autoAlpha: 1,
          duration: 0.15,
          ease: EASE.quart,
        });
      },
    });
  }

  // ─── Open / Close ───
  function openDropdown() {
    isOpen = true;
    overlay.style.display = "block";
    overlay.style.pointerEvents = "auto";
    nav.classList.add("is-overlay-open");
    crossfadeLabel("CLOSE");
    hamburgerTl.play();
    dropdownTl.play();
  }

  function closeDropdown() {
    isOpen = false;
    nav.classList.remove("is-overlay-open");
    crossfadeLabel("MENU");
    hamburgerTl.reverse();
    dropdownTl.reverse();
  }

  function toggleDropdown() {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  // ─── Accessibility ───
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open menu");
  overlay.setAttribute("aria-hidden", "true");

  function updateAria() {
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    toggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
    overlay.setAttribute("aria-hidden", isOpen ? "false" : "true");
  }

  // ─── Event listeners ───
  toggle.addEventListener("click", function () {
    toggleDropdown();
    updateAria();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isOpen) {
      closeDropdown();
      updateAria();
    }
  });

  navLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      if (isOpen) {
        closeDropdown();
        updateAria();
      }
    });
  });

  document.addEventListener("click", function (e) {
    if (isOpen && !nav.contains(e.target) && !overlay.contains(e.target)) {
      closeDropdown();
      updateAria();
    }
  });

  // ─── Nav scroll state ───
  const hero =
    document.querySelector("[data-hero]") ||
    document.querySelector("[data-hero-image]")?.closest("section");

  if (hero) {
    ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "bottom top",
      onLeave: function () {
        if (!isOpen) nav.classList.add("is-scrolled");
      },
      onEnterBack: function () {
        nav.classList.remove("is-scrolled");
      },
    });
  } else {
    ScrollTrigger.create({
      trigger: document.body,
      start: "top -80px",
      onEnter: function () {
        if (!isOpen) nav.classList.add("is-scrolled");
      },
      onLeaveBack: function () {
        nav.classList.remove("is-scrolled");
      },
    });
  }
}

// ─── Card hover: sunrise reveal ───
// Sunrise sweeps through, bar follows, text blurs in. Inner shadow on card.
// Luxury pacing — unhurried, considered. Three properties max per element.
function initCardHovers(cards) {
  cards.forEach(function (card) {
    var hoverEl = card.querySelector(".nav-card__hover");
    if (!hoverEl) return;

    var sunrise = hoverEl.querySelector(".nav-card__sunrise");
    var videoWrap = card.querySelector(".inline-video-component");
    var label = hoverEl.querySelector(".btn-text");

    // Bar: hidden below card
    gsap.set(hoverEl, { y: "100%" });

    // Video: slightly scaled up at rest
    if (videoWrap) gsap.set(videoWrap, { scale: 1.05 });

    // Label: hidden for blur-in reveal
    if (label) gsap.set(label, { autoAlpha: 0, filter: "blur(8px)" });

    // Sunrise: hidden below
    if (sunrise) gsap.set(sunrise, { y: "300%", opacity: 0 });

    // Card inner shadow (off at rest)
    card.style.boxShadow = "inset 0 0 0 0 rgba(0,0,0,0)";

    var tl = null;

    card.addEventListener("mouseenter", function () {
      if (tl) tl.kill();
      tl = gsap.timeline();

      // Video recedes — subtle dim, scale settles (1.01 not 1.0 to prevent
      // sub-pixel gap at card border-radius edges)
      if (videoWrap) {
        tl.to(videoWrap, {
          scale: 1.01,
          filter: "brightness(0.92)",
          duration: 0.9,
          ease: EASE.expo,
        }, 0);
      }

      // Card inner shadow fades in
      tl.to(card, {
        boxShadow: "inset 0 -40px 60px -20px rgba(0,0,0,0.35)",
        duration: 0.9,
        ease: EASE.expo,
      }, 0);

      // Sunrise: travel + fade + radius flip. Nothing else.
      if (sunrise) {
        gsap.set(sunrise, { y: "300%", opacity: 0, borderRadius: "50% 50% 0% 0%" });
        tl.to(sunrise, { opacity: 1, duration: 0.15, ease: EASE.quart }, 0);
        tl.to(sunrise, {
          y: "-800%",
          duration: 0.7,
          ease: "sine.inOut",
          onUpdate: function () {
            var p = this.progress();
            sunrise.style.borderRadius = p < 0.5
              ? "50% 50% 0% 0%"
              : "0% 0% 50% 50%";
          },
        }, 0);
        tl.to(sunrise, {
          opacity: 0,
          duration: 0.2,
          ease: EASE.quartIn,
        }, 0.5);
      }

      // Bar arrives after sunrise is gone
      tl.to(hoverEl, {
        y: "0%",
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        duration: 0.9,
        ease: EASE.expo,
      }, 0.2);

      // Label blurs in — the payoff after motion settles
      if (label) {
        tl.to(label, {
          autoAlpha: 1,
          filter: "blur(0px)",
          duration: 0.5,
          ease: EASE.expo,
        }, 0.6);
      }
    });

    card.addEventListener("mouseleave", function () {
      if (tl) tl.kill();
      tl = gsap.timeline();

      // Video returns
      if (videoWrap) {
        tl.to(videoWrap, {
          scale: 1.05,
          filter: "brightness(1)",
          duration: 0.3,
          ease: EASE.quartIn,
        }, 0);
      }

      // Inner shadow fades
      tl.to(card, {
        boxShadow: "inset 0 0 0 0 rgba(0,0,0,0)",
        duration: 0.3,
        ease: EASE.quartIn,
      }, 0);

      // Bar drops
      tl.to(hoverEl, {
        y: "100%",
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        duration: 0.3,
        ease: EASE.quartIn,
      }, 0);

      // Label hides instantly
      if (label) gsap.set(label, { autoAlpha: 0, filter: "blur(8px)" });

      // Sunrise resets
      if (sunrise) gsap.set(sunrise, { y: "300%", opacity: 0 });
    });
  });

  var count = 0;
  cards.forEach(function (c) {
    if (c.querySelector(".nav-card__hover")) count++;
  });
  if (count) {
    console.log(
      "%c[nav] %cCard hovers: %d cards with sunrise reveal",
      "color: #b8860b; font-weight: bold",
      "color: #888",
      count,
    );
  }
}
