/* ============================================
   SHIFT — COMMAND CENTER APPLICATION LOGIC
   All data persisted via localStorage
   ============================================ */

(function () {
  'use strict';

  // ========================
  // STOIC QUOTES
  // ========================
  const QUOTES = [
    { text: '"It is not that we have a short time to live, but that we waste a great deal of it."', author: '— Seneca, On the Shortness of Life' },
    { text: '"We suffer more often in imagination than in reality."', author: '— Seneca' },
    { text: '"No person would give up even an inch of their estate, and the slightest dispute with a neighbor can mean hell to pay; yet we easily let others encroach on our lives."', author: '— Seneca' },
    { text: '"How long are you going to wait before you demand the best for yourself?"', author: '— Epictetus' },
    { text: '"Waste no more time arguing about what a good man should be. Be one."', author: '— Marcus Aurelius' },
    { text: '"You could leave life right now. Let that determine what you do and say and think."', author: '— Marcus Aurelius' },
    { text: '"People are frugal in guarding their personal property; but as soon as it comes to squandering time, they are most wasteful of the one thing in which it is right to be stingy."', author: '— Seneca' },
    { text: '"The impediment to action advances action. What stands in the way becomes the way."', author: '— Marcus Aurelius' },
    { text: '"Discipline is the bridge between goals and accomplishment."', author: '— Jim Rohn' },
    { text: '"Begin at once to live, and count each separate day as a separate life."', author: '— Seneca' },
    { text: '"It is not because things are difficult that we do not dare; it is because we do not dare that things are difficult."', author: '— Seneca' },
    { text: '"Think of the life you have lived until now as over and done. Now see what\'s left and live it properly."', author: '— Marcus Aurelius' },
    { text: '"He who fears death will never do anything worth of a man who is alive."', author: '— Seneca' },
    { text: '"Putting things off is the biggest waste of life: it snatches away each day as it comes, and denies us the present by promising the future."', author: '— Seneca' },
    { text: '"The only way to do great work is to do it. Not tomorrow. Now."', author: '— Seneca (paraphrased)' },
    { text: '"Life is long, if you know how to use it."', author: '— Seneca' },
  ];

  // ========================
  // CATEGORY CONFIG
  // ========================
  const CATEGORIES = {
    'CAT Prep':  { color: '#00d4aa', icon: '📐' },
    'Fitness':   { color: '#f59e0b', icon: '💪' },
    'Coding':    { color: '#0ea5e9', icon: '💻' },
    'Reading':   { color: '#a78bfa', icon: '📚' },
    'Deep Work': { color: '#f472b6', icon: '🧠' },
    'Custom':    { color: '#6b7280', icon: '◆' },
  };

  const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  // ========================
  // STORAGE HELPERS
  // ========================
  function load(key, fallback) {
    try {
      const v = localStorage.getItem('shift_' + key);
      return v !== null ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }

  function save(key, data) {
    localStorage.setItem('shift_' + key, JSON.stringify(data));
  }

  // ========================
  // STATE
  // ========================
  let state = {
    shifts: load('shifts', []),
    logs: load('logs', []),          // {id, shiftId, date, clockIn, clockOut, duration, notes, rating, status:'completed'|'missed'}
    session: load('session', null),  // {shiftId, shiftName, clockIn, lastCheckin}
    settings: load('settings', {
      name: '',
      wakeTime: '06:00',
      sleepTime: '00:00',
      catDate: '2026-11-23',
      notifications: false,
    }),
    streaks: load('streaks', { current: 0, best: 0, lastDate: null }),
    notionDatabaseId: load('notionDatabaseId', null),
    notionDatabaseUrl: load('notionDatabaseUrl', null),
    notionSyncBacklog: load('notionSyncBacklog', []), // List of log IDs that failed to sync to Notion
  };

  function persist() {
    save('shifts', state.shifts);
    save('logs', state.logs);
    save('session', state.session);
    save('settings', state.settings);
    save('streaks', state.streaks);
    save('notionDatabaseId', state.notionDatabaseId);
    save('notionDatabaseUrl', state.notionDatabaseUrl);
    save('notionSyncBacklog', state.notionSyncBacklog);
  }

  // ========================
  // UTILITY
  // ========================
  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }
  function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function pad(n) { return String(n).padStart(2, '0'); }

  function timeStr(date) {
    let h = date.getHours();
    const m = pad(date.getMinutes());
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  }

  function dateStr(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  }

  function toMinutes(timeString) {
    const [h, m] = timeString.split(':').map(Number);
    return h * 60 + m;
  }

  function formatDuration(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  function formatHours(ms) {
    const h = ms / 3600000;
    return h.toFixed(1) + 'h';
  }

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function getWeekStart() {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  function catColor(cat) {
    return (CATEGORIES[cat] || CATEGORIES['Custom']).color;
  }

  // ========================
  // NAVIGATION
  // ========================
  function initNav() {
    $$('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.nav-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $$('.tab-panel').forEach(p => p.classList.remove('active'));
        const panelId = 'panel-' + tab.dataset.tab;
        const panel = $('#' + panelId);
        if (panel) panel.classList.add('active');
        // Refresh data on tab switch
        if (tab.dataset.tab === 'shifts') renderShiftsList();
        if (tab.dataset.tab === 'clock') renderClockTab();
        if (tab.dataset.tab === 'stats') renderStats();
        if (tab.dataset.tab === 'settings') loadSettings();
      });
    });
  }

  // ========================
  // REAL-TIME CLOCK
  // ========================
  function updateClocks() {
    const now = new Date();

    // Top bar clock
    const tbClock = $('#topbar-clock');
    if (tbClock) tbClock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    // Master clock
    const mc = $('#master-clock');
    const mp = $('#master-period');
    if (mc) {
      let h = now.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      mc.textContent = `${pad(h)}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      if (mp) mp.textContent = ampm;
    }

    // Date
    const cd = $('#current-date');
    if (cd) cd.textContent = dateStr(now);

    // Waking hours
    updateWakingHours(now);

    // CAT countdown
    updateCATCountdown(now);

    // Session timer
    updateSessionTimer(now);

    // Topbar status
    updateTopbarStatus(now);

    // Command center duty card
    updateDutyCard(now);
  }

  // ========================
  // WAKING HOURS
  // ========================
  function updateWakingHours(now) {
    const wakeStr = state.settings.wakeTime || '06:00';
    const sleepStr = state.settings.sleepTime || '00:00';
    const wakeMin = toMinutes(wakeStr);
    let sleepMin = toMinutes(sleepStr);

    // If sleep time is <= wake time, it means next day (e.g., 00:00 means midnight = 24:00)
    if (sleepMin <= wakeMin) sleepMin += 24 * 60;

    const totalWakingMin = sleepMin - wakeMin;
    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    let adjustedNow = nowMin;
    if (nowMin < wakeMin) adjustedNow += 24 * 60; // After midnight

    const elapsed = adjustedNow - wakeMin;
    const remaining = Math.max(0, totalWakingMin - elapsed);
    const pct = Math.max(0, Math.min(100, (remaining / totalWakingMin) * 100));

    const rHrs = Math.floor(remaining / 60);
    const rMin = Math.floor(remaining % 60);

    const whText = $('#waking-hours-text');
    if (whText) whText.textContent = `${rHrs}h ${rMin}m`;

    const bar = $('#waking-bar');
    const glow = $('#waking-bar-glow');
    if (bar) bar.style.width = pct + '%';
    if (glow) glow.style.width = pct + '%';

    // Update labels
    const wl = $('#wake-label');
    const sl = $('#sleep-label');
    if (wl) wl.textContent = wakeStr;
    if (sl) sl.textContent = sleepStr === '00:00' ? '24:00' : sleepStr;
  }

  // ========================
  // CAT COUNTDOWN
  // ========================
  function updateCATCountdown(now) {
    const catDateStr = state.settings.catDate || '2026-11-23';
    const catDate = new Date(catDateStr + 'T09:00:00');
    const diff = catDate - now;

    if (diff <= 0) {
      $('#cat-days').textContent = '0';
      $('#cat-hours').textContent = '00';
      $('#cat-mins').textContent = '00';
      $('#cat-secs').textContent = '00';
      $('#cat-urgency').textContent = 'EXAM DAY';
      return;
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    $('#cat-days').textContent = days;
    $('#cat-hours').textContent = pad(hours);
    $('#cat-mins').textContent = pad(mins);
    $('#cat-secs').textContent = pad(secs);

    if (days < 30) {
      $('#cat-urgency').textContent = 'CRITICAL';
      $('#cat-urgency').className = 'card-tag tag-danger';
    } else if (days < 90) {
      $('#cat-urgency').textContent = 'URGENT';
      $('#cat-urgency').className = 'card-tag tag-danger';
    } else if (days < 180) {
      $('#cat-urgency').textContent = 'APPROACHING';
      $('#cat-urgency').className = 'card-tag tag-urgent';
    } else {
      $('#cat-urgency').textContent = days + ' DAYS';
      $('#cat-urgency').className = 'card-tag tag-urgent';
    }
  }

  // ========================
  // SESSION TIMER
  // ========================
  function updateSessionTimer(now) {
    if (!state.session) return;
    const elapsed = now - new Date(state.session.clockIn);
    const timerEl = $('#session-timer');
    if (timerEl) timerEl.textContent = formatDuration(elapsed);

    // Duty card timer
    const dutyTimer = $('#duty-timer-value');
    if (dutyTimer) dutyTimer.textContent = formatDuration(elapsed);

    // Check-in every 30 minutes
    const lastCheckin = new Date(state.session.lastCheckin || state.session.clockIn);
    const sinceCheckin = now - lastCheckin;
    const prompt = $('#checkin-prompt');
    if (sinceCheckin >= 30 * 60 * 1000 && prompt) {
      prompt.classList.remove('hidden');
    }
  }

  // ========================
  // TOPBAR STATUS
  // ========================
  function updateTopbarStatus(now) {
    const statusDot = $('.status-dot');
    const statusLabel = $('.status-label');
    if (!statusDot || !statusLabel) return;

    if (state.session) {
      statusDot.className = 'status-dot online';
      statusLabel.textContent = 'ON DUTY';
    } else {
      const activeShift = getActiveShift(now);
      if (activeShift) {
        statusDot.className = 'status-dot danger';
        statusLabel.textContent = 'AWOL';
      } else {
        statusDot.className = 'status-dot offline';
        statusLabel.textContent = 'OFF DUTY';
      }
    }
  }

  // ========================
  // GET ACTIVE / TODAY'S SHIFTS
  // ========================
  function getTodayShifts() {
    const today = new Date().getDay();
    return state.shifts.filter(s => s.days && s.days.includes(today));
  }

  function getActiveShift(now) {
    const today = now.getDay();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return state.shifts.find(s => {
      if (!s.days || !s.days.includes(today)) return false;
      const start = toMinutes(s.startTime);
      const end = toMinutes(s.endTime);
      if (end > start) return nowMin >= start && nowMin < end;
      // Overnight shift
      return nowMin >= start || nowMin < end;
    });
  }

  function getShiftStatus(shift, now) {
    const todayStr = getTodayStr();
    const today = now.getDay();
    if (!shift.days || !shift.days.includes(today)) return 'inactive';

    const nowMin = now.getHours() * 60 + now.getMinutes();
    const start = toMinutes(shift.startTime);
    const end = toMinutes(shift.endTime);

    // Check if logged for today
    const log = state.logs.find(l => l.shiftId === shift.id && l.date === todayStr);
    if (log && log.status === 'completed') return 'completed';
    if (log && log.status === 'missed') return 'missed';

    // Check if currently clocked in to this shift
    if (state.session && state.session.shiftId === shift.id) return 'on-duty';

    let isActive;
    if (end > start) {
      isActive = nowMin >= start && nowMin < end;
    } else {
      isActive = nowMin >= start || nowMin < end;
    }

    if (isActive) return 'active'; // Should be clocked in
    if (nowMin >= end && end > start) return 'missed'; // Past end time, not clocked in
    if (nowMin < start) return 'upcoming';

    return 'upcoming';
  }

  // ========================
  // DUTY CARD (COMMAND CENTER)
  // ========================
  function updateDutyCard(now) {
    const card = $('#current-duty-card');
    const dutyInfo = $('#duty-info');
    const dutyStatus = $('#duty-status');
    if (!card || !dutyInfo || !dutyStatus) return;

    if (state.session) {
      card.classList.add('on-duty');
      const shift = state.shifts.find(s => s.id === state.session.shiftId);
      dutyStatus.textContent = 'ON DUTY';
      dutyStatus.className = 'card-tag tag-live pulse';
      dutyInfo.innerHTML = `
        <div class="duty-shift-name">${state.session.shiftName}</div>
        <div class="duty-shift-category">${shift ? shift.category : ''}</div>
        <div class="duty-timer" id="duty-timer-value">${formatDuration(now - new Date(state.session.clockIn))}</div>
      `;
    } else {
      card.classList.remove('on-duty');
      const activeShift = getActiveShift(now);
      if (activeShift) {
        dutyStatus.textContent = 'AWOL — NOT CLOCKED IN';
        dutyStatus.className = 'card-tag tag-danger';
        dutyInfo.innerHTML = `
          <div class="duty-shift-name">${activeShift.name}</div>
          <p class="duty-message" style="color:var(--danger)">You should be on shift right now. Clock in immediately.</p>
        `;
      } else {
        dutyStatus.textContent = 'NO ACTIVE SHIFT';
        dutyStatus.className = 'card-tag';
        dutyInfo.innerHTML = '<p class="duty-message">No shift currently active. Check your schedule below.</p>';
      }
    }
  }

  // ========================
  // TODAY'S SCHEDULE (COMMAND CENTER)
  // ========================
  function renderTodaySchedule() {
    const container = $('#today-schedule');
    if (!container) return;

    const todayShifts = getTodayShifts();
    const now = new Date();

    if (todayShifts.length === 0) {
      container.innerHTML = '<div class="empty-state">No shifts scheduled for today. Define your ops in SHIFTS tab.</div>';
      return;
    }

    // Sort by start time
    todayShifts.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    container.innerHTML = todayShifts.map(shift => {
      const status = getShiftStatus(shift, now);
      const color = catColor(shift.category);
      const statusText = {
        'upcoming': 'UPCOMING',
        'active': 'ACTIVE — CLOCK IN',
        'on-duty': 'ON DUTY',
        'completed': 'COMPLETE',
        'missed': 'AWOL',
      }[status] || 'UPCOMING';

      const statusClass = {
        'upcoming': 'upcoming',
        'active': 'active',
        'on-duty': 'on-duty',
        'completed': 'completed',
        'missed': 'missed',
      }[status] || 'upcoming';

      return `
        <div class="schedule-item ${statusClass}">
          <div class="sched-cat-dot" style="background:${color}"></div>
          <div class="sched-time">${shift.startTime} — ${shift.endTime}</div>
          <div class="sched-name">${shift.name}</div>
          <div class="sched-status ${statusClass}">${statusText}</div>
        </div>
      `;
    }).join('');
  }

  // ========================
  // QUICK STATS (COMMAND CENTER)
  // ========================
  function updateQuickStats() {
    const todayStr = getTodayStr();
    const todayLogs = state.logs.filter(l => l.date === todayStr);

    const completed = todayLogs.filter(l => l.status === 'completed').length;
    const missed = todayLogs.filter(l => l.status === 'missed').length;

    const tcEl = $('#today-completed');
    const tmEl = $('#today-missed');
    const csEl = $('#current-streak');

    if (tcEl) tcEl.textContent = completed;
    if (tmEl) tmEl.textContent = missed;
    if (csEl) csEl.textContent = state.streaks.current;
  }

  // ========================
  // AWOL ALERT
  // ========================
  let awolDismissed = {};

  function checkAWOL() {
    if (state.session) return; // Already clocked in

    const now = new Date();
    const activeShift = getActiveShift(now);
    if (!activeShift) {
      $('#awol-alert').classList.add('hidden');
      return;
    }

    // Check if already logged for today
    const todayStr = getTodayStr();
    const log = state.logs.find(l => l.shiftId === activeShift.id && l.date === todayStr);
    if (log) {
      $('#awol-alert').classList.add('hidden');
      return;
    }

    // Check if dismissed
    if (awolDismissed[activeShift.id] === todayStr) return;

    // Show alert
    $('#awol-shift-name').textContent = activeShift.name;
    $('#awol-alert').classList.remove('hidden');

    // Try notification
    sendNotification('SHIFT ALERT', `You should be on shift: ${activeShift.name}. Clock in NOW.`);
  }

  function initAWOL() {
    $('#awol-clock-in').addEventListener('click', () => {
      const now = new Date();
      const activeShift = getActiveShift(now);
      if (activeShift) clockIn(activeShift);
      $('#awol-alert').classList.add('hidden');
    });

    $('#awol-dismiss').addEventListener('click', () => {
      const now = new Date();
      const activeShift = getActiveShift(now);
      if (activeShift) awolDismissed[activeShift.id] = getTodayStr();
      $('#awol-alert').classList.add('hidden');
    });
  }

  // ========================
  // SHIFTS MANAGEMENT
  // ========================
  function initShiftForm() {
    const modal = $('#shift-modal');
    const form = $('#shift-form');

    $('#btn-add-shift').addEventListener('click', () => {
      form.reset();
      $('#shift-edit-id').value = '';
      $('#modal-title').textContent = 'DEFINE NEW SHIFT';
      $$('.day-btn').forEach(b => b.classList.remove('selected'));
      modal.classList.remove('hidden');
    });

    $('#modal-close').addEventListener('click', () => modal.classList.add('hidden'));
    $('#btn-cancel-shift').addEventListener('click', () => modal.classList.add('hidden'));

    // Day picker
    $$('.day-btn').forEach(btn => {
      btn.addEventListener('click', () => btn.classList.toggle('selected'));
    });

    // Form submit
    form.addEventListener('submit', e => {
      e.preventDefault();
      const editId = $('#shift-edit-id').value;
      const selectedDays = [];
      $$('.day-btn.selected').forEach(b => selectedDays.push(parseInt(b.dataset.day)));

      if (selectedDays.length === 0) {
        alert('Select at least one active day.');
        return;
      }

      const shiftData = {
        id: editId || genId(),
        name: $('#shift-name').value.trim(),
        category: $('#shift-category').value,
        startTime: $('#shift-start').value,
        endTime: $('#shift-end').value,
        days: selectedDays,
      };

      if (editId) {
        const idx = state.shifts.findIndex(s => s.id === editId);
        if (idx >= 0) state.shifts[idx] = shiftData;
      } else {
        state.shifts.push(shiftData);
      }

      persist();
      modal.classList.add('hidden');
      renderShiftsList();
      renderTodaySchedule();
      updateQuickStats();
    });

    // Close on overlay click
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  function renderShiftsList() {
    const container = $('#shifts-list');
    if (!container) return;

    if (state.shifts.length === 0) {
      container.innerHTML = '<div class="empty-state">No shifts defined. Your command center is empty.<br>Hit "+ NEW SHIFT" to begin operations.</div>';
      return;
    }

    container.innerHTML = state.shifts.map(shift => {
      const color = catColor(shift.category);
      const dayLabels = (shift.days || []).sort().map(d => DAYS_SHORT[d]).join(' · ');
      return `
        <div class="shift-card" data-id="${shift.id}">
          <div class="shift-cat-bar" style="background:${color}"></div>
          <div class="shift-info">
            <div class="shift-info-name">${shift.name}</div>
            <div class="shift-info-meta">${shift.startTime} — ${shift.endTime} · ${shift.category}</div>
            <div class="shift-info-days">${dayLabels}</div>
          </div>
          <div class="shift-actions">
            <button class="edit-btn" onclick="SHIFT.editShift('${shift.id}')" title="Edit">✎</button>
            <button class="delete-btn" onclick="SHIFT.deleteShift('${shift.id}')" title="Delete">✕</button>
          </div>
        </div>
      `;
    }).join('');
  }

  function editShift(id) {
    const shift = state.shifts.find(s => s.id === id);
    if (!shift) return;

    $('#shift-edit-id').value = shift.id;
    $('#shift-name').value = shift.name;
    $('#shift-category').value = shift.category;
    $('#shift-start').value = shift.startTime;
    $('#shift-end').value = shift.endTime;
    $('#modal-title').textContent = 'EDIT SHIFT';

    $$('.day-btn').forEach(b => {
      const day = parseInt(b.dataset.day);
      b.classList.toggle('selected', (shift.days || []).includes(day));
    });

    $('#shift-modal').classList.remove('hidden');
  }

  function deleteShift(id) {
    if (!confirm('Delete this shift? This action is permanent.')) return;
    state.shifts = state.shifts.filter(s => s.id !== id);
    persist();
    renderShiftsList();
    renderTodaySchedule();
  }

  // ========================
  // CLOCK IN / OUT
  // ========================
  function clockIn(shift) {
    const now = new Date();
    state.session = {
      shiftId: shift.id,
      shiftName: shift.name,
      category: shift.category,
      clockIn: now.toISOString(),
      lastCheckin: now.toISOString(),
    };
    persist();
    renderClockTab();
    renderTodaySchedule();
    updateDutyCard(now);
    updateTopbarStatus(now);
  }

  function clockOut(notes, rating) {
    if (!state.session) return;
    const now = new Date();
    const clockInTime = new Date(state.session.clockIn);
    const duration = now - clockInTime;

    const log = {
      id: genId(),
      shiftId: state.session.shiftId,
      shiftName: state.session.shiftName,
      category: state.session.category,
      date: getTodayStr(),
      clockIn: state.session.clockIn,
      clockOut: now.toISOString(),
      duration: duration,
      notes: notes || '',
      rating: rating || 0,
      status: 'completed',
    };

    state.logs.push(log);
    state.session = null;
    updateStreaks();
    persist();
    renderClockTab();
    renderTodaySchedule();
    updateDutyCard(now);
    updateQuickStats();

    // Trigger async Notion sync
    syncNotionLog(log);
  }

  function renderClockTab() {
    const noSession = $('#clock-no-session');
    const activeSession = $('#clock-active-session');
    const sessionCard = $('#session-card');

    if (state.session) {
      noSession.classList.add('hidden');
      activeSession.classList.remove('hidden');
      sessionCard.classList.add('active-session');

      $('#session-shift-name').textContent = state.session.shiftName;
      const clockInDate = new Date(state.session.clockIn);
      $('#session-start-time').textContent = timeStr(clockInDate);

      const shift = state.shifts.find(s => s.id === state.session.shiftId);
      $('#session-end-time').textContent = shift ? shift.endTime : '--:--';

      // Reset checkin
      $('#checkin-prompt').classList.add('hidden');
    } else {
      noSession.classList.remove('hidden');
      activeSession.classList.add('hidden');
      sessionCard.classList.remove('active-session');
    }

    renderClockableShifts();
  }

  function renderClockableShifts() {
    const container = $('#clockable-shifts');
    if (!container) return;

    const now = new Date();
    const today = now.getDay();
    const todayStr = getTodayStr();
    const todayShifts = state.shifts.filter(s => s.days && s.days.includes(today));

    if (todayShifts.length === 0) {
      container.innerHTML = '<div class="empty-state">No shifts scheduled for today.</div>';
      return;
    }

    todayShifts.sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    container.innerHTML = todayShifts.map(shift => {
      const status = getShiftStatus(shift, now);
      const isActive = status === 'active';
      const isOnDuty = state.session && state.session.shiftId === shift.id;
      const completed = state.logs.find(l => l.shiftId === shift.id && l.date === todayStr && l.status === 'completed');

      let actionHTML = '';
      if (isOnDuty) {
        actionHTML = '<span class="sched-status on-duty">ON DUTY</span>';
      } else if (completed) {
        actionHTML = '<span class="sched-status completed">DONE</span>';
      } else if (state.session) {
        actionHTML = '<span class="sched-status upcoming">BUSY</span>';
      } else {
        actionHTML = `<button class="btn btn-accent btn-sm" onclick="SHIFT.clockInById('${shift.id}')">CLOCK IN</button>`;
      }

      return `
        <div class="clockable-item ${isActive ? 'is-active' : ''}">
          <div class="sched-cat-dot" style="background:${catColor(shift.category)}"></div>
          <div class="ci-info">
            <div class="ci-name">${shift.name}</div>
            <div class="ci-time">${shift.startTime} — ${shift.endTime}</div>
          </div>
          ${actionHTML}
        </div>
      `;
    }).join('');
  }

  function clockInById(id) {
    const shift = state.shifts.find(s => s.id === id);
    if (shift) clockIn(shift);
  }

  function initClockEvents() {
    // Clock out button
    $('#btn-clock-out').addEventListener('click', () => {
      // Show debrief modal
      $('#debrief-modal').classList.remove('hidden');
      $('#debrief-notes').value = '';
      $$('.rating-btn').forEach(b => b.classList.remove('selected'));
    });

    // Debrief form
    let selectedRating = 0;
    $$('.rating-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedRating = parseInt(btn.dataset.rating);
        $$('.rating-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });

    $('#debrief-form').addEventListener('submit', e => {
      e.preventDefault();
      clockOut($('#debrief-notes').value, selectedRating);
      $('#debrief-modal').classList.add('hidden');
      selectedRating = 0;
    });

    $('#debrief-skip').addEventListener('click', () => {
      clockOut('', 0);
      $('#debrief-modal').classList.add('hidden');
    });

    // Debrief modal overlay click
    $('#debrief-modal').addEventListener('click', e => {
      if (e.target === $('#debrief-modal')) {
        // Don't close — force debrief or skip
      }
    });

    // Checkin prompt
    $('#checkin-yes').addEventListener('click', () => {
      state.session.lastCheckin = new Date().toISOString();
      persist();
      $('#checkin-prompt').classList.add('hidden');
    });

    $('#checkin-no').addEventListener('click', () => {
      // Clock out via debrief
      $('#debrief-modal').classList.remove('hidden');
      $('#checkin-prompt').classList.add('hidden');
    });
  }

  // ========================
  // MISSED SHIFT DETECTION
  // ========================
  function detectMissedShifts() {
    const now = new Date();
    const today = now.getDay();
    const todayStr = getTodayStr();
    const nowMin = now.getHours() * 60 + now.getMinutes();

    state.shifts.forEach(shift => {
      if (!shift.days || !shift.days.includes(today)) return;

      const endMin = toMinutes(shift.endTime);
      const startMin = toMinutes(shift.startTime);

      // Only mark missed for non-overnight shifts that have ended
      if (endMin > startMin && nowMin > endMin) {
        const existingLog = state.logs.find(l => l.shiftId === shift.id && l.date === todayStr);
        if (!existingLog && !(state.session && state.session.shiftId === shift.id)) {
          // Mark as missed
          const missedLog = {
            id: genId(),
            shiftId: shift.id,
            shiftName: shift.name,
            category: shift.category,
            date: todayStr,
            clockIn: null,
            clockOut: null,
            duration: 0,
            notes: '',
            rating: 0,
            status: 'missed',
          };
          state.logs.push(missedLog);
          persist();
          syncNotionLog(missedLog);
        }
      }
    });
  }

  // ========================
  // STREAKS
  // ========================
  function updateStreaks() {
    const todayStr = getTodayStr();
    const todayShifts = getTodayShifts();
    if (todayShifts.length === 0) return;

    const todayLogs = state.logs.filter(l => l.date === todayStr);
    const allCompleted = todayShifts.every(s =>
      todayLogs.some(l => l.shiftId === s.id && l.status === 'completed')
    );

    if (allCompleted) {
      if (state.streaks.lastDate === todayStr) return; // Already counted

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

      if (state.streaks.lastDate === yesterdayStr) {
        state.streaks.current += 1;
      } else if (state.streaks.lastDate !== todayStr) {
        state.streaks.current = 1;
      }

      state.streaks.lastDate = todayStr;
      state.streaks.best = Math.max(state.streaks.best, state.streaks.current);
      persist();
    }
  }

  // ========================
  // STATS / INTEL
  // ========================
  function renderStats() {
    renderTruth();
    renderCategoryChart();
    renderCompletionStats();
    renderStreakStats();
    renderWeeklyReview();
  }

  function renderTruth() {
    const container = $('#truth-content');
    if (!container) return;

    const weekStart = getWeekStart();
    const weekLogs = state.logs.filter(l => new Date(l.date) >= weekStart && l.status === 'completed');

    const totalMs = weekLogs.reduce((sum, l) => sum + (l.duration || 0), 0);
    const totalHrs = totalMs / 3600000;

    const catLogs = weekLogs.filter(l => l.category === 'CAT Prep');
    const catMs = catLogs.reduce((sum, l) => sum + (l.duration || 0), 0);
    const catHrs = catMs / 3600000;

    // Days elapsed this week
    const now = new Date();
    const daysElapsed = Math.max(1, Math.ceil((now - weekStart) / 86400000));
    const avgPerDay = totalHrs / daysElapsed;
    const catAvgPerDay = catHrs / daysElapsed;

    // Projected weekly
    const projectedWeekly = avgPerDay * 7;
    const catProjected = catAvgPerDay * 7;

    // CAT exam proximity
    const catDate = new Date((state.settings.catDate || '2026-11-23') + 'T09:00:00');
    const daysToCAT = Math.max(0, Math.floor((catDate - now) / 86400000));
    const weeksToCAT = Math.floor(daysToCAT / 7);

    let html = '';

    if (weekLogs.length === 0) {
      html = '<p class="truth-line">You\'ve logged <span class="truth-danger">zero hours</span> this week. The clock is ticking. <strong>' + daysToCAT + ' days</strong> to CAT.</p>';
    } else {
      html += `<p class="truth-line">This week: <span class="truth-accent">${totalHrs.toFixed(1)}h</span> total logged across all categories.</p>`;
      html += `<p class="truth-line">CAT Prep specifically: <span class="${catHrs > 0 ? 'truth-accent' : 'truth-danger'}">${catHrs.toFixed(1)}h</span> this week.</p>`;
      html += `<p class="truth-line">At your current pace of <span class="truth-accent">${catAvgPerDay.toFixed(1)}h/day</span> on CAT, you'll put in ~<strong>${catProjected.toFixed(0)}h/week</strong>.</p>`;

      if (catHrs < 2) {
        html += `<p class="truth-line" style="color:var(--danger)">⚠ That's embarrassingly low. You have <strong>${daysToCAT} days</strong>. At this rate, you're wasting them.</p>`;
      } else if (catAvgPerDay < 2) {
        html += `<p class="truth-line" style="color:var(--warning)">You need to push harder. 2h/day minimum. You're at <span class="truth-danger">${catAvgPerDay.toFixed(1)}h/day</span>.</p>`;
      } else {
        html += `<p class="truth-line" style="color:var(--accent)">Solid discipline. Keep this pace for <strong>${weeksToCAT} weeks</strong> and you'll be ready.</p>`;
      }

      const missedThisWeek = state.logs.filter(l => new Date(l.date) >= weekStart && l.status === 'missed').length;
      if (missedThisWeek > 0) {
        html += `<p class="truth-line"><span class="truth-danger">${missedThisWeek} shift${missedThisWeek > 1 ? 's' : ''} missed</span> this week. At HCL, you'd never miss a shift. Why is this different?</p>`;
      }
    }

    container.innerHTML = html;
  }

  function renderCategoryChart() {
    const container = $('#category-chart');
    if (!container) return;

    const weekStart = getWeekStart();
    const weekLogs = state.logs.filter(l => new Date(l.date) >= weekStart && l.status === 'completed');

    if (weekLogs.length === 0) {
      container.innerHTML = '<div class="empty-state">No data yet. Put in the hours.</div>';
      return;
    }

    // Aggregate by category
    const catHours = {};
    weekLogs.forEach(l => {
      const cat = l.category || 'Custom';
      catHours[cat] = (catHours[cat] || 0) + (l.duration || 0) / 3600000;
    });

    const maxHours = Math.max(...Object.values(catHours), 1);

    container.innerHTML = Object.entries(catHours)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, hrs]) => {
        const color = catColor(cat);
        const pct = (hrs / maxHours) * 100;
        return `
          <div class="chart-bar-row">
            <div class="chart-label">${cat.toUpperCase()}</div>
            <div class="chart-bar-container">
              <div class="chart-bar" style="width:${pct}%;background:${color}"></div>
            </div>
            <div class="chart-value">${hrs.toFixed(1)}h</div>
          </div>
        `;
      }).join('');
  }

  function renderCompletionStats() {
    const weekStart = getWeekStart();
    const weekLogs = state.logs.filter(l => new Date(l.date) >= weekStart);

    const completed = weekLogs.filter(l => l.status === 'completed').length;
    const missed = weekLogs.filter(l => l.status === 'missed').length;
    const total = completed + missed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const totalHours = weekLogs
      .filter(l => l.status === 'completed')
      .reduce((sum, l) => sum + (l.duration || 0), 0) / 3600000;

    $('#completion-rate').textContent = rate + '%';
    $('#stat-completed').textContent = completed;
    $('#stat-missed').textContent = missed;
    $('#stat-total-hours').textContent = totalHours.toFixed(1) + 'h';

    // Update ring
    const circumference = 2 * Math.PI * 52; // r=52
    const offset = circumference - (rate / 100) * circumference;
    const ring = $('#completion-ring-fill');
    if (ring) ring.style.strokeDashoffset = offset;
  }

  function renderStreakStats() {
    $('#stat-current-streak').textContent = state.streaks.current;
    $('#stat-best-streak').textContent = state.streaks.best;
  }

  function renderWeeklyReview() {
    const container = $('#weekly-review');
    if (!container) return;

    const weekStart = getWeekStart();
    const weekLogs = state.logs.filter(l => new Date(l.date) >= weekStart);
    const completed = weekLogs.filter(l => l.status === 'completed');
    const missed = weekLogs.filter(l => l.status === 'missed');

    if (weekLogs.length === 0) {
      container.innerHTML = '<p class="review-text">Complete a full week of operations to receive your performance review.</p>';
      return;
    }

    const totalHours = completed.reduce((sum, l) => sum + (l.duration || 0), 0) / 3600000;
    const avgRating = completed.length > 0
      ? (completed.reduce((sum, l) => sum + (l.rating || 0), 0) / completed.length).toFixed(1)
      : 'N/A';

    let grade = 'F';
    const rate = (completed.length + missed.length) > 0
      ? completed.length / (completed.length + missed.length)
      : 0;
    if (rate >= 0.95) grade = 'S';
    else if (rate >= 0.85) grade = 'A';
    else if (rate >= 0.7) grade = 'B';
    else if (rate >= 0.5) grade = 'C';
    else if (rate >= 0.3) grade = 'D';

    let review = `<p class="review-text"><strong>Grade: ${grade}</strong></p>`;
    review += `<p class="review-text">${completed.length} shifts completed · ${missed.length} missed · ${totalHours.toFixed(1)}h total · Avg rating: ${avgRating}/5</p>`;

    if (grade === 'S' || grade === 'A') {
      review += '<p class="review-text" style="color:var(--accent)">Outstanding performance. This is what discipline looks like. Maintain this tempo.</p>';
    } else if (grade === 'B') {
      review += '<p class="review-text" style="color:var(--warning)">Decent, but not where you need to be. You\'re leaving hours on the table.</p>';
    } else {
      review += '<p class="review-text" style="color:var(--danger)">Unacceptable. You wouldn\'t perform like this at work. Why do you accept it here? Fix it.</p>';
    }

    container.innerHTML = review;
  }

  // ========================
  // SETTINGS
  // ========================
  function loadSettings() {
    $('#setting-name').value = state.settings.name || '';
    $('#setting-wake').value = state.settings.wakeTime || '06:00';
    $('#setting-sleep').value = state.settings.sleepTime || '00:00';
    $('#setting-cat-date').value = state.settings.catDate || '2026-11-23';

    const toggleBtn = $('#toggle-notifications');
    if (state.settings.notifications) {
      toggleBtn.classList.add('active');
      $('#notif-status').textContent = 'Notifications enabled';
    } else {
      toggleBtn.classList.remove('active');
      $('#notif-status').textContent = 'Notifications not enabled';
    }
  }

  function initSettings() {
    // Auto-save on change
    const inputs = ['setting-name', 'setting-wake', 'setting-sleep', 'setting-cat-date'];
    inputs.forEach(id => {
      const el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', () => {
        state.settings.name = $('#setting-name').value.trim();
        state.settings.wakeTime = $('#setting-wake').value;
        state.settings.sleepTime = $('#setting-sleep').value;
        state.settings.catDate = $('#setting-cat-date').value;
        persist();
      });
    });

    // Notifications toggle
    $('#toggle-notifications').addEventListener('click', async () => {
      const btn = $('#toggle-notifications');
      if (state.settings.notifications) {
        state.settings.notifications = false;
        btn.classList.remove('active');
        $('#notif-status').textContent = 'Notifications not enabled';
      } else {
        if ('Notification' in window) {
          const perm = await Notification.requestPermission();
          if (perm === 'granted') {
            state.settings.notifications = true;
            btn.classList.add('active');
            $('#notif-status').textContent = 'Notifications enabled';
          } else {
            $('#notif-status').textContent = 'Permission denied by browser';
          }
        } else {
          $('#notif-status').textContent = 'Notifications not supported';
        }
      }
      persist();
    });

    // Export
    $('#btn-export').addEventListener('click', () => {
      const data = {
        shifts: state.shifts,
        logs: state.logs,
        settings: state.settings,
        streaks: state.streaks,
        exportDate: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shift-backup-${getTodayStr()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Clear data
    $('#btn-clear-data').addEventListener('click', () => {
      if (!confirm('⚠ PURGE ALL DATA? This cannot be undone. All shifts, logs, and streaks will be destroyed.')) return;
      if (!confirm('Are you absolutely sure? Last chance.')) return;
      localStorage.clear();
      state.shifts = [];
      state.logs = [];
      state.session = null;
      state.settings = { name: '', wakeTime: '06:00', sleepTime: '00:00', catDate: '2026-11-23', notifications: false };
      state.streaks = { current: 0, best: 0, lastDate: null };
      state.notionDatabaseId = null;
      state.notionDatabaseUrl = null;
      state.notionSyncBacklog = [];
      persist();
      location.reload();
    });
  }

  // ========================
  // NOTION DATABASE SYNC
  // ========================
  async function syncNotionLog(log) {
    if (!state.notionDatabaseId) return false;

    // Show sync indicator status as syncing
    const indicator = $('#notion-sync-indicator');
    if (indicator) {
      indicator.style.background = '#f59e0b';
      indicator.setAttribute('title', 'Syncing to Notion...');
    }

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          databaseId: state.notionDatabaseId,
          log: log,
          callsign: state.settings.name || 'Operator'
        })
      });

      const res = await response.json();
      if (response.ok && res.success) {
        // Successfully synced
        if (indicator) {
          indicator.style.background = '#00d4aa';
          indicator.setAttribute('title', 'Notion Synced');
        }
        // Remove from backlog if it was there
        state.notionSyncBacklog = state.notionSyncBacklog.filter(id => id !== log.id);
        persist();
        return true;
      } else {
        throw new Error(res.error || 'Failed to sync');
      }
    } catch (e) {
      console.warn('Notion Sync Failed, queued in backlog:', e);
      if (indicator) {
        indicator.style.background = '#ef4444';
        indicator.setAttribute('title', 'Sync Error: Queued');
      }
      if (!state.notionSyncBacklog.includes(log.id)) {
        state.notionSyncBacklog.push(log.id);
        persist();
      }
      return false;
    }
  }

  async function processSyncBacklog() {
    if (!state.notionDatabaseId || state.notionSyncBacklog.length === 0) {
      updateNotionUI();
      return;
    }

    const backlog = [...state.notionSyncBacklog];
    for (const logId of backlog) {
      const log = state.logs.find(l => l.id === logId);
      if (log) {
        const success = await syncNotionLog(log);
        if (!success) break; // Network offline or rate limit, stop and retry later
      } else {
        // Log doesn't exist anymore, remove it
        state.notionSyncBacklog = state.notionSyncBacklog.filter(id => id !== logId);
        persist();
      }
    }
    updateNotionUI();
  }

  function updateNotionUI() {
    const indicator = $('#notion-sync-indicator');
    const statusText = $('#notion-connection-status');
    const initBtn = $('#btn-init-notion');
    const linkContainer = $('#notion-link-container');
    const dbUrl = $('#notion-db-url');

    if (!indicator) return;

    if (state.notionDatabaseId) {
      if (state.notionSyncBacklog.length > 0) {
        indicator.style.background = '#ef4444';
        indicator.setAttribute('title', `${state.notionSyncBacklog.length} shifts pending sync`);
        if (statusText) statusText.textContent = `PENDING SYNC (${state.notionSyncBacklog.length})`;
      } else {
        indicator.style.background = '#00d4aa';
        indicator.setAttribute('title', 'Notion Connected & Synced');
        if (statusText) statusText.textContent = 'CONNECTED';
      }
      if (initBtn) initBtn.textContent = 'RESET CONNECTION';
      if (linkContainer) linkContainer.classList.remove('hidden');
      if (dbUrl && state.notionDatabaseUrl) {
        dbUrl.href = state.notionDatabaseUrl;
      }
    } else {
      indicator.style.background = '#6b7280';
      indicator.setAttribute('title', 'Notion Unlinked');
      if (statusText) statusText.textContent = 'UNLINKED';
      if (initBtn) initBtn.textContent = 'LINK NOTION DATABASE';
      if (linkContainer) linkContainer.classList.add('hidden');
    }
  }

  function initNotionEvents() {
    const btn = $('#btn-init-notion');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (state.notionDatabaseId) {
        if (!confirm('Unlink Notion Database? Stored data will not be deleted, but sync will stop.')) return;
        state.notionDatabaseId = null;
        state.notionDatabaseUrl = null;
        state.notionSyncBacklog = [];
        persist();
        updateNotionUI();
        return;
      }

      btn.disabled = true;
      btn.textContent = 'CREATING NOTION DATABASE...';

      try {
        const response = await fetch('/api/init-database', {
          method: 'POST'
        });

        const res = await response.json();
        if (response.ok && res.success) {
          state.notionDatabaseId = res.databaseId;
          state.notionDatabaseUrl = res.url;
          
          // Add all existing logs to backlog so history is backfilled into Notion
          state.notionSyncBacklog = state.logs.map(l => l.id);
          persist();
          
          alert('Notion Database constructed and connected successfully! Pushing existing history in background.');
          processSyncBacklog();
        } else {
          alert(`Error initializing database: ${res.error || 'Unknown error'}`);
        }
      } catch (e) {
        alert(`Request failed: ${e.message}`);
      } finally {
        btn.disabled = false;
        updateNotionUI();
      }
    });
  }


  // ========================
  // NOTIFICATIONS
  // ========================
  function sendNotification(title, body) {
    if (!state.settings.notifications) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // Use service worker for persistent notifications when possible
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(title, {
          body: body,
          icon: './icon-192.svg',
          badge: './icon-192.svg',
          vibrate: [200, 100, 200],
          tag: 'shift-alert-' + Date.now(),
          renotify: true,
          requireInteraction: true,
          actions: [
            { action: 'clock-in', title: 'CLOCK IN' },
            { action: 'dismiss', title: 'DISMISS' }
          ]
        });
      }).catch(() => {
        // Fallback to basic notification
        new Notification(title, { body, vibrate: [200, 100, 200] });
      });
    } else {
      try {
        new Notification(title, { body, vibrate: [200, 100, 200] });
      } catch (e) { /* ignore */ }
    }
  }

  // ========================
  // QUOTES ROTATION
  // ========================
  function rotateQuote() {
    const idx = Math.floor(Math.random() * QUOTES.length);
    const q = QUOTES[idx];
    const qt = $('#stoic-quote');
    const qa = $('#stoic-author');
    if (qt) qt.textContent = q.text;
    if (qa) qa.textContent = q.author;
  }

  // ========================
  // SERVICE WORKER
  // ========================
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    }
  }

  // ========================
  // SHIFT NOTIFICATION SCHEDULER
  // ========================
  let notifiedShifts = {};

  function checkShiftNotifications() {
    if (!state.settings.notifications) return;

    const now = new Date();
    const today = now.getDay();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const todayStr = getTodayStr();

    state.shifts.forEach(shift => {
      if (!shift.days || !shift.days.includes(today)) return;
      const startMin = toMinutes(shift.startTime);

      // Notify at shift start
      if (Math.abs(nowMin - startMin) < 1) {
        const key = shift.id + '_' + todayStr;
        if (!notifiedShifts[key]) {
          sendNotification('SHIFT STARTING', `${shift.name} — Report for duty NOW.`);
          notifiedShifts[key] = true;
        }
      }
    });
  }

  // ========================
  // PERIODIC CHECK-IN SYSTEM
  // "Someone is always watching"
  // ========================
  const CHECKIN_MESSAGES = [
    { title: '⚡ STATUS CHECK', body: 'What are you doing RIGHT NOW? Is this what you should be doing?' },
    { title: '👁 EYES ON YOU', body: 'Quick check — are you being productive or wasting time?' },
    { title: '⏳ TIME CHECK', body: 'Another hour passed. What did you do with it?' },
    { title: '🎯 ACCOUNTABILITY', body: 'At HCL you\'d be working right now. What about your own goals?' },
    { title: '💀 MEMENTO MORI', body: 'This hour is gone forever. Did you use it or lose it?' },
    { title: '🔥 REPORT IN', body: 'Soldier — what\'s your current status? On task or AWOL?' },
    { title: '⚠ REALITY CHECK', body: 'CAT exam isn\'t getting further away. Are you studying or scrolling?' },
    { title: '🪖 SHIFT CHECK', body: 'No one\'s watching? Wrong. YOU should be watching. What are you doing?' },
  ];

  let lastCheckinTime = Date.now();
  let checkinInterval = null;

  function getRandomCheckinDelay() {
    // Random interval between 45-90 minutes (in ms)
    return (45 + Math.floor(Math.random() * 45)) * 60 * 1000;
  }

  function isWithinWakingHours() {
    const now = new Date();
    const wakeStr = state.settings.wakeTime || '06:00';
    const sleepStr = state.settings.sleepTime || '00:00';
    const wakeMin = toMinutes(wakeStr);
    let sleepMin = toMinutes(sleepStr);
    if (sleepMin <= wakeMin) sleepMin += 24 * 60;

    let nowMin = now.getHours() * 60 + now.getMinutes();
    if (nowMin < wakeMin) nowMin += 24 * 60;

    return nowMin >= wakeMin && nowMin < sleepMin;
  }

  function periodicCheckin() {
    if (!state.settings.notifications) return;
    if (!isWithinWakingHours()) return;

    // Don't disturb if actively clocked in (they're already working)
    if (state.session) {
      scheduleNextCheckin();
      return;
    }

    const msg = CHECKIN_MESSAGES[Math.floor(Math.random() * CHECKIN_MESSAGES.length)];
    sendNotification(msg.title, msg.body);
    lastCheckinTime = Date.now();
    scheduleNextCheckin();
  }

  function scheduleNextCheckin() {
    if (checkinInterval) clearTimeout(checkinInterval);
    checkinInterval = setTimeout(periodicCheckin, getRandomCheckinDelay());
  }

  function initPeriodicCheckins() {
    if (state.settings.notifications) {
      scheduleNextCheckin();
    }

    // Also fire on visibility change — when user comes back to the app
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const sinceLastCheckin = now - lastCheckinTime;
        // If more than 30 min since last check and not clocked in, remind
        if (sinceLastCheckin > 30 * 60 * 1000 && !state.session && isWithinWakingHours()) {
          checkAWOL();
        }
      }
    });
  }

  // ========================
  // MAIN LOOP
  // ========================
  function tick() {
    updateClocks();
  }

  function slowTick() {
    renderTodaySchedule();
    updateQuickStats();
    detectMissedShifts();
    checkAWOL();
    checkShiftNotifications();
    renderClockableShifts();
  }

  // ========================
  // INITIALIZE
  // ========================
  function init() {
    registerSW();

    // Listen for messages from service worker (e.g., clock-in from notification)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data && e.data.type === 'CLOCK_IN_FROM_NOTIFICATION') {
          const now = new Date();
          const activeShift = getActiveShift(now);
          if (activeShift && !state.session) {
            clockIn(activeShift);
          }
        }
      });
    }

    initNav();
    initShiftForm();
    initClockEvents();
    initSettings();
    initAWOL();
    loadSettings();
    rotateQuote();
    initPeriodicCheckins();
    initNotionEvents();
    updateNotionUI();
    processSyncBacklog();

    // Initial renders
    renderShiftsList();
    renderTodaySchedule();
    renderClockTab();
    updateQuickStats();
    renderStats();
    updateClocks();

    // Fast tick — every second
    setInterval(tick, 1000);

    // Slow tick — every 15 seconds
    setInterval(() => {
      slowTick();
      processSyncBacklog();
    }, 15000);

    // Quote rotation — every 60 seconds
    setInterval(rotateQuote, 60000);

    // Initial slow tick
    setTimeout(() => {
      slowTick();
      processSyncBacklog();
    }, 1000);
  }

  // ========================
  // EXPOSE GLOBAL API
  // ========================
  window.SHIFT = {
    editShift,
    deleteShift,
    clockInById,
  };

  // Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
