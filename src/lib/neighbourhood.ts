import gsap from 'gsap';

let cleanup: (() => void) | null = null;

interface NeighbourhoodState {
  section: HTMLElement;
  tabs: NodeListOf<HTMLElement>;
  images: NodeListOf<HTMLElement>;
  maps: NodeListOf<HTMLElement>;
  texts: NodeListOf<HTMLElement>;
  items: NodeListOf<HTMLElement>;
  lines: NodeListOf<HTMLElement>;
  content: HTMLElement | null;
  restaurants: HTMLElement | null;
  indicator: HTMLElement | null;
  tabIds: string[];
  layoutMap: Record<string, string>;
  activeId: string;
  activeIndex: number;
  isMobile: boolean;
}

function crossfadeImages(state: NeighbourhoodState, id: string, instant: boolean) {
  state.images.forEach((img) => {
    const isActive = img.dataset.neighbourhoodImage === id;
    if (instant) {
      gsap.set(img, { opacity: isActive ? 1 : 0, scale: isActive ? 1 : 1.03 });
      img.classList.toggle('is-active', isActive);
    } else if (isActive) {
      gsap.fromTo(
        img,
        { opacity: 0, scale: 1.03 },
        { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out', overwrite: true },
      );
      img.classList.add('is-active');
    } else {
      gsap.to(img, {
        opacity: 0,
        duration: 0.3,
        overwrite: true,
        onComplete: () => img.classList.remove('is-active'),
      });
    }
  });
}

function fadeInOnLoad(iframe: HTMLIFrameElement, panel: HTMLElement, instant: boolean) {
  const ext = iframe as HTMLIFrameElement & { _loaded?: boolean };

  if (ext._loaded) {
    // Already loaded from a previous visit — show immediately
    if (instant) {
      gsap.set(panel, { opacity: 1 });
    } else {
      gsap.fromTo(
        panel,
        { opacity: 0 },
        { opacity: 1, duration: 0.5, ease: 'expo.out', overwrite: true },
      );
    }
    return;
  }

  // Check if iframe already loaded before JS ran (first tab with src in HTML)
  if (iframe.src && iframe.contentWindow) {
    try {
      // If we can access contentWindow without error, it's loaded
      // (cross-origin will throw, but that means it loaded)
      void iframe.contentWindow.location;
      ext._loaded = true;
      gsap.set(panel, { opacity: 1 });
      panel.classList.add('is-active');
      return;
    } catch {
      // Cross-origin = loaded
      ext._loaded = true;
      gsap.set(panel, { opacity: 1 });
      panel.classList.add('is-active');
      return;
    }
  }

  // Keep hidden until the iframe content loads
  gsap.set(panel, { opacity: 0 });
  panel.classList.add('is-active');

  function onLoad() {
    iframe.removeEventListener('load', onLoad);
    ext._loaded = true;
    gsap.to(panel, { opacity: 1, duration: 0.5, ease: 'expo.out', overwrite: true });
  }
  iframe.addEventListener('load', onLoad);
}

function crossfadeMaps(state: NeighbourhoodState, id: string, instant: boolean) {
  state.maps.forEach((panel) => {
    const isActive = panel.dataset.neighbourhoodMap === id;
    const iframe = panel.querySelector<HTMLIFrameElement>('iframe');

    // Lazy-load iframe src on first activation
    if (isActive && iframe && !iframe.src && iframe.dataset.src) {
      iframe.src = iframe.dataset.src;
    }

    if (isActive) {
      panel.classList.add('is-active');
      if (iframe) {
        fadeInOnLoad(iframe, panel, instant);
      } else {
        gsap.set(panel, { opacity: instant ? 1 : 0 });
        if (!instant) {
          gsap.to(panel, { opacity: 1, duration: 0.5, ease: 'expo.out', overwrite: true });
        }
      }
    } else {
      if (instant) {
        gsap.set(panel, { opacity: 0 });
        panel.classList.remove('is-active');
      } else {
        gsap.to(panel, {
          opacity: 0,
          duration: 0.3,
          overwrite: true,
          onComplete: () => panel.classList.remove('is-active'),
        });
      }
    }
  });
}

function crossfadeText(state: NeighbourhoodState, id: string, instant: boolean, newIndex: number) {
  const tabDistance = Math.abs(newIndex - state.activeIndex);
  const yOffset = 8 + tabDistance * 3;

  state.texts.forEach((panel) => {
    const isActive = panel.dataset.neighbourhoodText === id;
    const children = panel.querySelectorAll('.neighbourhood__body, .neighbourhood__cta');
    if (instant) {
      gsap.set(panel, { opacity: isActive ? 1 : 0, y: 0 });
      if (children.length) gsap.set(children, { opacity: isActive ? 1 : 0, y: 0 });
      panel.classList.toggle('is-active', isActive);
    } else if (isActive) {
      panel.classList.add('is-active');
      gsap.set(panel, { opacity: 1 });
      if (children.length) {
        gsap.fromTo(
          children,
          { opacity: 0, y: yOffset },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'expo.out',
            stagger: 0.08,
            overwrite: true,
          },
        );
      }
    } else {
      gsap.set(panel, { opacity: 0, y: 0 });
      if (children.length) gsap.set(children, { opacity: 0, y: 0 });
      panel.classList.remove('is-active');
    }
  });
}

function setActiveTabs(state: NeighbourhoodState, id: string) {
  state.tabs.forEach((tab) => {
    const isActive = tab.dataset.neighbourhoodTab === id;
    tab.classList.toggle('is-active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });
}

function moveIndicator(state: NeighbourhoodState, id: string, instant: boolean) {
  const { indicator, tabs } = state;
  if (!indicator) return;

  const activeTab = Array.from(tabs).find((t) => t.dataset.neighbourhoodTab === id);
  if (!activeTab) return;

  const tabsContainer = indicator.parentElement;
  if (!tabsContainer) return;

  const containerRect = tabsContainer.getBoundingClientRect();
  const tabRect = activeTab.getBoundingClientRect();
  const left = tabRect.left - containerRect.left;
  const width = tabRect.width;

  if (instant) {
    gsap.set(indicator, { left, width });
  } else {
    gsap.to(indicator, {
      left,
      width,
      duration: 0.5,
      ease: 'expo.out',
      overwrite: true,
    });
  }
}

function getAutoHeight(el: HTMLElement): number {
  const prev = el.style.height;
  el.style.height = 'auto';
  const h = el.scrollHeight;
  el.style.height = prev;
  return h;
}

function animateAccordion(state: NeighbourhoodState, id: string, instant: boolean) {
  state.items.forEach((item) => {
    const itemId = item.dataset.neighbourhoodItem;
    const isActive = itemId === id;
    const content = item.querySelector<HTMLElement>('[data-neighbourhood-inline]');
    if (!content) return;

    if (isActive) {
      item.classList.add('is-active');
      const targetH = getAutoHeight(content);
      if (instant) {
        gsap.set(content, { height: targetH });
      } else {
        gsap.fromTo(
          content,
          { height: content.offsetHeight },
          {
            height: targetH,
            duration: 0.5,
            ease: 'expo.out',
            overwrite: true,
            onComplete: () => {
              content.style.height = 'auto';
            },
          },
        );
      }
    } else {
      if (instant) {
        gsap.set(content, { height: 0 });
        item.classList.remove('is-active');
      } else {
        gsap.fromTo(
          content,
          { height: content.offsetHeight },
          {
            height: 0,
            duration: 0.4,
            ease: 'expo.out',
            overwrite: true,
            onComplete: () => item.classList.remove('is-active'),
          },
        );
      }
    }
  });
}

function measureTextPanels(texts: NodeListOf<HTMLElement>, textWrap: HTMLElement) {
  let maxH = 0;
  texts.forEach((panel) => {
    const wasActive = panel.classList.contains('is-active');
    panel.classList.add('is-active');
    maxH = Math.max(maxH, panel.getBoundingClientRect().height);
    if (!wasActive) panel.classList.remove('is-active');
  });
  textWrap.style.minHeight = `${maxH}px`;
}

function crossfadeRestaurants(state: NeighbourhoodState, isDining: boolean, instant: boolean) {
  const { content, restaurants } = state;
  if (!content || !restaurants) return;

  content.classList.toggle('is-dining', isDining);

  if (isDining) {
    restaurants.classList.add('is-active');
    if (instant) {
      gsap.set(restaurants, { opacity: 1 });
    } else {
      gsap.fromTo(
        restaurants,
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'expo.out', overwrite: true },
      );
    }
  } else {
    if (instant) {
      gsap.set(restaurants, { opacity: 0 });
      restaurants.classList.remove('is-active');
    } else {
      gsap.to(restaurants, {
        opacity: 0,
        duration: 0.3,
        overwrite: true,
        onComplete: () => restaurants.classList.remove('is-active'),
      });
    }
  }
}

function setActive(state: NeighbourhoodState, id: string, instant = false) {
  if (id === state.activeId && !instant) return;

  const newIndex = state.tabIds.indexOf(id);
  const isDining = id === 'dining';

  if (state.isMobile) {
    state.items.forEach((item) => {
      const line = item.querySelector<HTMLElement>('.neighbourhood__line');
      if (line) line.style.opacity = item.dataset.neighbourhoodItem === id ? '1' : '';
    });
    animateAccordion(state, id, instant);
  } else {
    setActiveTabs(state, id);
    moveIndicator(state, id, instant);
    crossfadeImages(state, id, instant);
    crossfadeRestaurants(state, isDining, instant);
    if (!isDining) {
      crossfadeMaps(state, id, instant);
      crossfadeText(state, id, instant, newIndex);
    }
    // Update grid layout variant
    if (state.content) {
      state.content.dataset.layout = state.layoutMap[id] ?? 'a';
    }
  }

  state.activeIndex = newIndex;
  state.activeId = id;
}

export function initNeighbourhood() {
  cleanup?.();

  const section = document.querySelector<HTMLElement>('[data-neighbourhood]');
  if (!section) return;

  const tabs = section.querySelectorAll<HTMLElement>('[data-neighbourhood-tab]');
  const images = section.querySelectorAll<HTMLElement>('[data-neighbourhood-image]');
  const maps = section.querySelectorAll<HTMLElement>('[data-neighbourhood-map]');
  const texts = section.querySelectorAll<HTMLElement>('[data-neighbourhood-text]');
  const items = section.querySelectorAll<HTMLElement>('[data-neighbourhood-item]');
  const lines = section.querySelectorAll<HTMLElement>('.neighbourhood__line');

  const content = section.querySelector<HTMLElement>('.neighbourhood__content');
  const restaurants = section.querySelector<HTMLElement>('[data-neighbourhood-restaurants]');
  const indicator = section.querySelector<HTMLElement>('[data-neighbourhood-indicator]');

  const tabIds = Array.from(tabs).map((el) => el.dataset.neighbourhoodTab!);
  if (!tabIds.length) {
    const accIds = Array.from(items).map((el) => el.dataset.neighbourhoodItem!);
    if (!accIds.length) return;
  }

  // Build layout map from tab data attributes
  const layoutMap: Record<string, string> = {};
  tabs.forEach((tab) => {
    const id = tab.dataset.neighbourhoodTab!;
    layoutMap[id] = tab.dataset.layout ?? 'a';
  });

  const mobileQuery = window.matchMedia('(max-width: 767px)');

  const state: NeighbourhoodState = {
    section,
    tabs,
    images,
    maps,
    texts,
    items,
    lines,
    content,
    restaurants,
    indicator,
    tabIds,
    layoutMap,
    activeId: tabIds[0] ?? Array.from(items)[0]?.dataset.neighbourhoodItem ?? '',
    activeIndex: 0,
    isMobile: mobileQuery.matches,
  };

  // Measure text panel heights for stable layout
  function measureIfDesktop() {
    if (state.isMobile) return;
    const textWrap = section.querySelector<HTMLElement>('.neighbourhood__text');
    if (textWrap) measureTextPanels(texts, textWrap);
  }

  if (document.fonts?.ready) {
    document.fonts.ready.then(measureIfDesktop).catch(measureIfDesktop);
  } else {
    measureIfDesktop();
  }

  setActive(state, state.activeId, true);

  // Desktop: preload map iframe on tab hover so it's ready by click
  function onTabHover(e: Event) {
    if (state.isMobile) return;
    const id = (e.currentTarget as HTMLElement).dataset.neighbourhoodTab;
    if (!id) return;
    const panel = Array.from(state.maps).find((m) => m.dataset.neighbourhoodMap === id);
    const iframe = panel?.querySelector<HTMLIFrameElement>('iframe');
    if (iframe && !iframe.src && iframe.dataset.src) {
      iframe.src = iframe.dataset.src;
    }
  }

  // Desktop: tab clicks
  function onTabClick(e: Event) {
    const id = (e.currentTarget as HTMLElement).dataset.neighbourhoodTab;
    if (id) setActive(state, id);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('mouseenter', onTabHover);
    tab.addEventListener('click', onTabClick);
  });

  // Mobile: accordion clicks
  function onLineClick(e: Event) {
    const item = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-neighbourhood-item]');
    const id = item?.dataset.neighbourhoodItem;
    if (id) setActive(state, id);
  }

  lines.forEach((line) => line.addEventListener('click', onLineClick));

  // Respond to breakpoint crossing
  function onBreakpoint(e: MediaQueryListEvent) {
    state.isMobile = e.matches;
    if (!e.matches) measureIfDesktop();
    setActive(state, state.activeId, true);
  }
  mobileQuery.addEventListener('change', onBreakpoint);

  // Reposition indicator on resize
  function onResize() {
    if (!state.isMobile) {
      moveIndicator(state, state.activeId, true);
    }
  }
  window.addEventListener('resize', onResize);

  // Visibility restore
  function onVisibility() {
    if (!document.hidden) setActive(state, state.activeId, true);
  }
  document.addEventListener('visibilitychange', onVisibility);

  // Restaurant hover — indicator bar, dimming, image crossfade (desktop only)
  const restaurantRows = restaurants
    ? Array.from(restaurants.querySelectorAll<HTMLElement>('.neighbourhood__restaurant'))
    : [];
  const restaurantIndicator = restaurants?.querySelector<HTMLElement>(
    '[data-restaurant-indicator]',
  );
  const diningImage = section.querySelector<HTMLElement>('[data-neighbourhood-image="dining"] img');
  const diningImageSrc = diningImage?.getAttribute('src') ?? '';
  const hoverQuery = window.matchMedia('(hover: hover)');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function onRestaurantEnter(this: HTMLElement) {
    if (state.isMobile || state.activeId !== 'dining' || !hoverQuery.matches) return;

    const imgSrc = this.dataset.restaurantImage;

    // Dim non-hovered rows
    restaurantRows.forEach((row) => {
      gsap.to(row, {
        opacity: row === this ? 1 : 0.35,
        duration: reducedMotion.matches ? 0 : 0.3,
        ease: 'expo.out',
        overwrite: true,
      });
    });

    // Move indicator bar
    if (restaurantIndicator) {
      const top = this.offsetTop;
      const height = this.offsetHeight;
      gsap.to(restaurantIndicator, {
        top,
        height,
        opacity: 1,
        duration: reducedMotion.matches ? 0 : 0.4,
        ease: 'expo.out',
        overwrite: true,
      });
    }

    // Crossfade image
    if (diningImage && imgSrc) {
      diningImage.setAttribute('src', imgSrc);
    }
  }

  function onRestaurantsLeave() {
    if (state.isMobile || state.activeId !== 'dining') return;

    // Reset all rows
    restaurantRows.forEach((row) => {
      gsap.to(row, {
        opacity: 1,
        duration: reducedMotion.matches ? 0 : 0.3,
        ease: 'expo.out',
        overwrite: true,
      });
    });

    // Hide indicator
    if (restaurantIndicator) {
      gsap.to(restaurantIndicator, {
        opacity: 0,
        duration: reducedMotion.matches ? 0 : 0.3,
        ease: 'expo.out',
        overwrite: true,
      });
    }

    // Restore original image
    if (diningImage && diningImageSrc) {
      diningImage.setAttribute('src', diningImageSrc);
    }
  }

  restaurantRows.forEach((row) => row.addEventListener('mouseenter', onRestaurantEnter));
  restaurants?.addEventListener('mouseleave', onRestaurantsLeave);

  cleanup = () => {
    tabs.forEach((tab) => {
      tab.removeEventListener('mouseenter', onTabHover);
      tab.removeEventListener('click', onTabClick);
    });
    lines.forEach((line) => line.removeEventListener('click', onLineClick));
    restaurantRows.forEach((row) => row.removeEventListener('mouseenter', onRestaurantEnter));
    restaurants?.removeEventListener('mouseleave', onRestaurantsLeave);
    mobileQuery.removeEventListener('change', onBreakpoint);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    cleanup = null;
  };
}

export function destroyNeighbourhood() {
  cleanup?.();
}
