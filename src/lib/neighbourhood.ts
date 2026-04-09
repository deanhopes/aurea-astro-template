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

function crossfadeMaps(state: NeighbourhoodState, id: string, instant: boolean) {
  state.maps.forEach((panel) => {
    const isActive = panel.dataset.neighbourhoodMap === id;

    // Lazy-load iframe src on first activation
    if (isActive) {
      const iframe = panel.querySelector<HTMLIFrameElement>('iframe');
      if (iframe && !iframe.src && iframe.dataset.src) {
        iframe.src = iframe.dataset.src;
      }
    }

    if (instant) {
      gsap.set(panel, { opacity: isActive ? 1 : 0, filter: 'saturate(1) brightness(1)' });
      panel.classList.toggle('is-active', isActive);
    } else if (isActive) {
      panel.classList.add('is-active');
      const tl = gsap.timeline({ overwrite: true });
      tl.fromTo(
        panel,
        { opacity: 0, filter: 'saturate(0.3) brightness(1.02)' },
        { opacity: 1, duration: 0.4, ease: 'expo.out' },
      );
      tl.to(
        panel,
        { filter: 'saturate(1) brightness(1)', duration: 0.8, ease: 'power1.out' },
        '-=0.2',
      );
    } else {
      gsap.to(panel, {
        opacity: 0,
        duration: 0.3,
        overwrite: true,
        onComplete: () => {
          panel.classList.remove('is-active');
          gsap.set(panel, { filter: 'none' });
        },
      });
    }
  });
}

function crossfadeText(state: NeighbourhoodState, id: string, instant: boolean, newIndex: number) {
  const tabDistance = Math.abs(newIndex - state.activeIndex);
  const yOffset = 8 + tabDistance * 3;

  state.texts.forEach((panel) => {
    const isActive = panel.dataset.neighbourhoodText === id;
    if (instant) {
      gsap.set(panel, { opacity: isActive ? 1 : 0, y: 0 });
      const children = panel.querySelectorAll('.neighbourhood__body, .neighbourhood__cta');
      gsap.set(children, { opacity: isActive ? 1 : 0, y: 0 });
      panel.classList.toggle('is-active', isActive);
    } else if (isActive) {
      panel.classList.add('is-active');
      const children = panel.querySelectorAll('.neighbourhood__body, .neighbourhood__cta');
      gsap.set(panel, { opacity: 1 });
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
    } else {
      gsap.to(panel, {
        opacity: 0,
        duration: 0.3,
        overwrite: true,
        onComplete: () => panel.classList.remove('is-active'),
      });
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
            ease: 'expo.inOut',
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

  // Desktop: tab clicks
  function onTabClick(e: Event) {
    const id = (e.currentTarget as HTMLElement).dataset.neighbourhoodTab;
    if (id) setActive(state, id);
  }

  tabs.forEach((tab) => tab.addEventListener('click', onTabClick));

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

  cleanup = () => {
    tabs.forEach((tab) => tab.removeEventListener('click', onTabClick));
    lines.forEach((line) => line.removeEventListener('click', onLineClick));
    mobileQuery.removeEventListener('change', onBreakpoint);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    cleanup = null;
  };
}

export function destroyNeighbourhood() {
  cleanup?.();
}
