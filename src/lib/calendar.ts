/**
 * Calendar UI — dual-month date-range picker + flexible dates (nights + month pills).
 *
 * State machine (resetOnSelect pattern):
 *   EMPTY  → click → HALF { from }
 *   HALF   → click → COMPLETE { from, to } (or deselect if same day)
 *   COMPLETE → click → HALF { from: newDate } (reset)
 *
 * Hover preview is visual-only in HALF state.
 */

let cleanup: (() => void) | null = null;

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ── State ─────────────────────────────────────────────────────────────

interface CalendarState {
  baseYear: number;
  baseMonth: number;
  mode: 'specific' | 'flexible';
  selStart: Date | null;
  selEnd: Date | null;
  hovered: Date | null;
  nights: number;
  flexMonth: string | null;
}

const now = new Date();
const state: CalendarState = {
  baseYear: now.getFullYear(),
  baseMonth: now.getMonth(),
  mode: 'specific',
  selStart: null,
  selEnd: null,
  hovered: null,
  nights: 1,
  flexMonth: null,
};

// ── Helpers ───────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(s: string): Date {
  const parts = s.split('-').map(Number);
  return new Date(parts[0]!, parts[1]! - 1, parts[2]!);
}

function isBeforeToday(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayStart(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function isInRange(d: Date, start: Date, end: Date): boolean {
  const t = dayStart(d);
  return t >= dayStart(start) && t <= dayStart(end);
}

function isStrictlyBetween(d: Date, start: Date, end: Date): boolean {
  const t = dayStart(d);
  return t > dayStart(start) && t < dayStart(end);
}

// ── Render ────────────────────────────────────────────────────────────

const GRID_ROWS = 6;

function renderMonth(container: HTMLElement, year: number, month: number): void {
  container.replaceChildren();

  const grid = document.createElement('div');
  grid.className = 'calendar__day-grid';

  for (const day of DAYS) {
    const dh = document.createElement('span');
    dh.className = 'calendar__day-header';
    dh.textContent = day;
    grid.appendChild(dh);
  }

  const firstDay = firstDayOfMonth(year, month);
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('span');
    empty.className = 'calendar__day calendar__day--empty';
    grid.appendChild(empty);
  }

  const totalDays = daysInMonth(year, month);
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, month, d);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calendar__day';
    btn.textContent = String(d);
    btn.dataset.date = dateKey(date);

    if (isBeforeToday(date)) {
      btn.classList.add('is-disabled');
      btn.disabled = true;
    }

    if (sameDay(date, now)) {
      btn.classList.add('is-today');
    }

    applyDayClasses(btn, date);
    grid.appendChild(btn);
  }

  const cellsUsed = firstDay + totalDays;
  const totalCells = GRID_ROWS * 7;
  for (let i = cellsUsed; i < totalCells; i++) {
    const empty = document.createElement('span');
    empty.className = 'calendar__day calendar__day--empty';
    grid.appendChild(empty);
  }

  container.appendChild(grid);
}

function applyHoverPreview(btn: HTMLElement, date: Date, selStart: Date, hovered: Date): void {
  if (sameDay(hovered, selStart)) return;
  const a = dayStart(selStart) < dayStart(hovered) ? selStart : hovered;
  const b = dayStart(selStart) < dayStart(hovered) ? hovered : selStart;
  if (isInRange(date, a, b) && !sameDay(date, selStart)) {
    btn.classList.add('is-in-range-preview');
  }
}

function applyDayClasses(btn: HTMLElement, date: Date): void {
  btn.classList.remove(
    'is-selected-start',
    'is-selected-end',
    'is-in-range',
    'is-in-range-preview',
  );

  const { selStart, selEnd, hovered } = state;

  if (selStart && sameDay(date, selStart)) btn.classList.add('is-selected-start');
  if (selEnd && sameDay(date, selEnd)) btn.classList.add('is-selected-end');
  if (selStart && selEnd && isStrictlyBetween(date, selStart, selEnd)) {
    btn.classList.add('is-in-range');
  }
  if (selStart && !selEnd && hovered) applyHoverPreview(btn, date, selStart, hovered);
}

/**
 * Update day classes in-place without destroying/recreating DOM.
 * Prevents the bug where mouseover re-renders → click fires on detached element.
 */
function refreshDayClasses(): void {
  const days = document.querySelectorAll<HTMLElement>('.calendar__day[data-date]');
  for (const btn of days) {
    const date = parseDate(btn.dataset.date!);
    applyDayClasses(btn, date);
  }
}

function updateHeaderLabels(): void {
  const left = document.querySelector<HTMLElement>('[data-calendar-header-left]');
  const right = document.querySelector<HTMLElement>('[data-calendar-header-right]');

  if (left) left.textContent = `${MONTHS[state.baseMonth]} ${state.baseYear}`;

  let nextMonth = state.baseMonth + 1;
  let nextYear = state.baseYear;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear++;
  }
  if (right) right.textContent = `${MONTHS[nextMonth]} ${nextYear}`;
}

function renderBothMonths(): void {
  const m0 = document.querySelector<HTMLElement>('[data-calendar-month="0"]');
  const m1 = document.querySelector<HTMLElement>('[data-calendar-month="1"]');
  if (!m0 || !m1) return;

  renderMonth(m0, state.baseYear, state.baseMonth);

  let nextMonth = state.baseMonth + 1;
  let nextYear = state.baseYear;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear++;
  }
  renderMonth(m1, nextYear, nextMonth);
  updateHeaderLabels();
}

// ── Flexible dates ────────────────────────────────────────────────────

function renderFlexibleMonths(): void {
  const grid = document.querySelector<HTMLElement>('[data-months-grid]');
  if (!grid) return;
  grid.replaceChildren();

  const today = new Date();
  for (let i = 0; i < 12; i++) {
    let m = today.getMonth() + i;
    let y = today.getFullYear();
    while (m > 11) {
      m -= 12;
      y++;
    }

    const key = `${y}-${String(m + 1).padStart(2, '0')}`;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'calendar__month-pill';
    btn.dataset.monthKey = key;
    btn.textContent = `${MONTHS[m]!.slice(0, 3)} ${y}`;

    if (state.flexMonth === key) btn.classList.add('is-active');

    grid.appendChild(btn);
  }
}

// ── Event handling ────────────────────────────────────────────────────

/**
 * Date selection state machine (resetOnSelect pattern):
 *   EMPTY    → click → HALF { selStart = date }
 *   HALF     → click same day → EMPTY
 *   HALF     → click different day → COMPLETE { selStart, selEnd } (ordered)
 *   COMPLETE → click → HALF { selStart = date } (reset)
 */
function handleDayClick(e: Event): void {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.calendar__day[data-date]');
  if (!btn || btn.disabled) return;

  const date = parseDate(btn.dataset.date!);

  // COMPLETE or EMPTY → start new selection
  if (state.selEnd || !state.selStart) {
    state.selStart = date;
    state.selEnd = null;
    state.hovered = null;
    renderBothMonths();
    return;
  }

  // HALF → click same day → deselect
  if (sameDay(date, state.selStart)) {
    state.selStart = null;
    state.selEnd = null;
    state.hovered = null;
    renderBothMonths();
    return;
  }

  // HALF → click different day → COMPLETE (order by date)
  if (dayStart(date) < dayStart(state.selStart)) {
    state.selEnd = state.selStart;
    state.selStart = date;
  } else {
    state.selEnd = date;
  }
  state.hovered = null;
  renderBothMonths();
}

/**
 * Hover preview — only update classes in-place, never re-render DOM.
 * This prevents the detached-element bug where mouseover re-renders
 * and the subsequent click fires on a destroyed button.
 */
function handleDayHover(e: Event): void {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('.calendar__day[data-date]');
  if (!state.selStart || state.selEnd) return;

  if (!btn) {
    if (state.hovered) {
      state.hovered = null;
      refreshDayClasses();
    }
    return;
  }

  const date = parseDate(btn.dataset.date!);
  if (state.hovered && sameDay(date, state.hovered)) return;

  state.hovered = date;
  refreshDayClasses();
}

function handleMonthPillClick(e: Event): void {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.calendar__month-pill');
  if (!btn) return;

  state.flexMonth = btn.dataset.monthKey ?? null;
  document
    .querySelectorAll('.calendar__month-pill')
    .forEach((el) => el.classList.toggle('is-active', el === btn));
}

function handleNavPrev(): void {
  state.baseMonth--;
  if (state.baseMonth < 0) {
    state.baseMonth = 11;
    state.baseYear--;
  }
  const minYear = now.getFullYear();
  const minMonth = now.getMonth();
  if (state.baseYear < minYear || (state.baseYear === minYear && state.baseMonth < minMonth)) {
    state.baseYear = minYear;
    state.baseMonth = minMonth;
  }
  renderBothMonths();
}

function handleNavNext(): void {
  state.baseMonth++;
  if (state.baseMonth > 11) {
    state.baseMonth = 0;
    state.baseYear++;
  }
  renderBothMonths();
}

function handleModeToggle(e: Event): void {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-calendar-mode]');
  if (!btn) return;

  const mode = btn.dataset.calendarMode as 'specific' | 'flexible';
  if (mode === state.mode) return;

  state.mode = mode;

  document
    .querySelectorAll('.calendar__toggle-btn')
    .forEach((el) => el.classList.toggle('is-active', el === btn));

  const specificView = document.querySelector<HTMLElement>('[data-calendar-view="specific"]');
  const flexibleView = document.querySelector<HTMLElement>('[data-calendar-view="flexible"]');

  if (specificView) specificView.style.display = mode === 'specific' ? '' : 'none';
  if (flexibleView) flexibleView.style.display = mode === 'flexible' ? '' : 'none';

  if (mode === 'flexible') renderFlexibleMonths();
}

function handleNightsDec(): void {
  if (state.nights > 1) {
    state.nights--;
    updateNightsDisplay();
  }
}

function handleNightsInc(): void {
  if (state.nights < 30) {
    state.nights++;
    updateNightsDisplay();
  }
}

function updateNightsDisplay(): void {
  const el = document.querySelector<HTMLElement>('[data-nights-value]');
  if (el) el.textContent = String(state.nights);
}

// ── Public API ────────────────────────────────────────────────────────

export function initCalendar(): void {
  cleanup?.();

  renderBothMonths();

  const calendarEl = document.querySelector<HTMLElement>('[data-calendar]');
  if (!calendarEl) return;

  calendarEl.addEventListener('click', handleDayClick);
  calendarEl.addEventListener('mouseover', handleDayHover);
  calendarEl.addEventListener('click', handleModeToggle);

  const prevBtn = document.querySelector<HTMLButtonElement>('[data-calendar-prev]');
  const nextBtn = document.querySelector<HTMLButtonElement>('[data-calendar-next]');
  prevBtn?.addEventListener('click', handleNavPrev);
  nextBtn?.addEventListener('click', handleNavNext);

  const decBtn = document.querySelector<HTMLButtonElement>('[data-nights-dec]');
  const incBtn = document.querySelector<HTMLButtonElement>('[data-nights-inc]');
  decBtn?.addEventListener('click', handleNightsDec);
  incBtn?.addEventListener('click', handleNightsInc);

  const monthsGrid = document.querySelector<HTMLElement>('[data-months-grid]');
  monthsGrid?.addEventListener('click', handleMonthPillClick);

  cleanup = () => {
    calendarEl.removeEventListener('click', handleDayClick);
    calendarEl.removeEventListener('mouseover', handleDayHover);
    calendarEl.removeEventListener('click', handleModeToggle);
    prevBtn?.removeEventListener('click', handleNavPrev);
    nextBtn?.removeEventListener('click', handleNavNext);
    decBtn?.removeEventListener('click', handleNightsDec);
    incBtn?.removeEventListener('click', handleNightsInc);
    monthsGrid?.removeEventListener('click', handleMonthPillClick);
    cleanup = null;
  };
}

export function destroyCalendar(): void {
  cleanup?.();
}
