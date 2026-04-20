import gsap from 'gsap';

let cleanup: (() => void) | null = null;
const loadedIframes = new WeakSet<HTMLIFrameElement>();

interface NeighbourhoodState {
  section: HTMLElement;
  tabs: NodeListOf<HTMLElement>;
  images: NodeListOf<HTMLElement>;
  maps: NodeListOf<HTMLElement>;
  texts: NodeListOf<HTMLElement>;
  items: NodeListOf<HTMLElement>;
  lines: NodeListOf<HTMLElement>;
  content: HTMLElement | null;
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
  if (loadedIframes.has(iframe)) {
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

  if (iframe.src && iframe.contentWindow) {
    loadedIframes.add(iframe);
    gsap.set(panel, { opacity: 1 });
    panel.classList.add('is-active');
    return;
  }

  gsap.set(panel, { opacity: 0 });
  panel.classList.add('is-active');

  function onLoad() {
    iframe.removeEventListener('load', onLoad);
    loadedIframes.add(iframe);
    gsap.to(panel, { opacity: 1, duration: 0.5, ease: 'expo.out', overwrite: true });
  }
  iframe.addEventListener('load', onLoad);
}

function crossfadeMaps(state: NeighbourhoodState, id: string, instant: boolean) {
  state.maps.forEach((panel) => {
    const isActive = panel.dataset.neighbourhoodMap === id;
    const iframe = panel.querySelector<HTMLIFrameElement>('iframe');

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
    } else if (instant) {
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
    } else if (instant) {
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

function setActive(state: NeighbourhoodState, id: string, instant = false) {
  if (id === state.activeId && !instant) return;

  const newIndex = state.tabIds.indexOf(id);

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
    crossfadeMaps(state, id, instant);
    crossfadeText(state, id, instant, newIndex);
    if (state.content) {
      state.content.dataset.layout = state.layoutMap[id] ?? 'a';
    }
  }

  state.activeIndex = newIndex;
  state.activeId = id;
}

function stashAndObserveMaps(
  state: NeighbourhoodState,
  section: HTMLElement,
): IntersectionObserver {
  const stashedMapSrcs = new Map<HTMLIFrameElement, string>();
  state.maps.forEach((panel) => {
    const iframe = panel.querySelector<HTMLIFrameElement>('iframe');
    if (iframe?.dataset.src) {
      stashedMapSrcs.set(iframe, iframe.dataset.src);
      delete iframe.dataset.src;
    }
  });

  const obs = new IntersectionObserver(
    (entries) => {
      if (!entries[0]?.isIntersecting) return;
      obs.disconnect();
      stashedMapSrcs.forEach((src, iframe) => {
        iframe.dataset.src = src;
      });
      const currentPanel = Array.from(state.maps).find(
        (m) => m.dataset.neighbourhoodMap === state.activeId,
      );
      const iframe = currentPanel?.querySelector<HTMLIFrameElement>('iframe');
      if (iframe && !iframe.src && iframe.dataset.src) iframe.src = iframe.dataset.src;
    },
    { rootMargin: '600px 0px' },
  );
  obs.observe(section);
  return obs;
}

function bindEvents(
  state: NeighbourhoodState,
  section: HTMLElement,
  mobileQuery: MediaQueryList,
  measureIfDesktop: () => void,
): () => void {
  const { tabs, lines } = state;

  function onTabHover(e: Event) {
    if (state.isMobile) return;
    const id = (e.currentTarget as HTMLElement).dataset.neighbourhoodTab;
    if (!id) return;
    const panel = Array.from(state.maps).find((m) => m.dataset.neighbourhoodMap === id);
    const iframe = panel?.querySelector<HTMLIFrameElement>('iframe');
    if (iframe && !iframe.src && iframe.dataset.src) iframe.src = iframe.dataset.src;
  }

  function onTabClick(e: Event) {
    const id = (e.currentTarget as HTMLElement).dataset.neighbourhoodTab;
    if (id) setActive(state, id);
  }

  tabs.forEach((tab) => {
    tab.addEventListener('mouseenter', onTabHover);
    tab.addEventListener('click', onTabClick);
  });

  function onLineClick(e: Event) {
    const item = (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-neighbourhood-item]');
    const id = item?.dataset.neighbourhoodItem;
    if (id) setActive(state, id);
  }
  lines.forEach((line) => line.addEventListener('click', onLineClick));

  function onBreakpoint(e: MediaQueryListEvent) {
    state.isMobile = e.matches;
    if (!e.matches) measureIfDesktop();
    setActive(state, state.activeId, true);
  }
  mobileQuery.addEventListener('change', onBreakpoint);

  function onResize() {
    if (!state.isMobile) moveIndicator(state, state.activeId, true);
  }
  window.addEventListener('resize', onResize);

  function onVisibility() {
    if (!document.hidden) setActive(state, state.activeId, true);
  }
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    tabs.forEach((tab) => {
      tab.removeEventListener('mouseenter', onTabHover);
      tab.removeEventListener('click', onTabClick);
    });
    lines.forEach((line) => line.removeEventListener('click', onLineClick));
    mobileQuery.removeEventListener('change', onBreakpoint);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
  };
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

  const tabIds = Array.from(tabs).map((el) => el.dataset.neighbourhoodTab!);
  if (!tabIds.length) {
    if (!Array.from(items).length) return;
  }

  const layoutMap: Record<string, string> = {};
  tabs.forEach((tab) => {
    layoutMap[tab.dataset.neighbourhoodTab!] = tab.dataset.layout ?? 'a';
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
    content: section.querySelector<HTMLElement>('.neighbourhood__content'),
    indicator: section.querySelector<HTMLElement>('[data-neighbourhood-indicator]'),
    tabIds,
    layoutMap,
    activeId: tabIds[0] ?? Array.from(items)[0]?.dataset.neighbourhoodItem ?? '',
    activeIndex: 0,
    isMobile: mobileQuery.matches,
  };

  function measureIfDesktop() {
    if (state.isMobile) return;
    const textWrap = section.querySelector<HTMLElement>('.neighbourhood__text');
    if (textWrap) measureTextPanels(texts, textWrap);
  }

  if (document.fonts) {
    void document.fonts.ready.then(measureIfDesktop).catch(measureIfDesktop);
  } else {
    measureIfDesktop();
  }

  const sectionLoadObserver = stashAndObserveMaps(state, section);
  setActive(state, state.activeId, true);

  const unbindEvents = bindEvents(state, section, mobileQuery, measureIfDesktop);

  cleanup = () => {
    sectionLoadObserver.disconnect();
    unbindEvents();
    cleanup = null;
  };
}

export function destroyNeighbourhood() {
  cleanup?.();
}
