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
      alarmTone: 'pulse',
    }),
    streaks: load('streaks', { current: 0, best: 0, lastDate: null }),
    notionDatabaseId: load('notionDatabaseId', null),
    notionDatabaseUrl: load('notionDatabaseUrl', null),
    notionShiftsDatabaseId: load('notionShiftsDatabaseId', null),
    notionShiftsDatabaseUrl: load('notionShiftsDatabaseUrl', null),
    notionSubDatabaseId: load('notionSubDatabaseId', null),
    notionSubDatabaseUrl: load('notionSubDatabaseUrl', null),
    notionTasksDatabaseId: load('notionTasksDatabaseId', null),
    notionGoalsDatabaseId: load('notionGoalsDatabaseId', null),
    notionSyncBacklog: load('notionSyncBacklog', []), // List of log IDs that failed to sync to Notion
    notionShiftSyncBacklog: load('notionShiftSyncBacklog', []), // List of shift definition IDs that need sync
    chatHistory: load('chatHistory', []),
    tasks: load('tasks', []),
    goals: load('goals', []),
  };

  function persist() {
    save('shifts', state.shifts);
    save('logs', state.logs);
    save('session', state.session);
    save('settings', state.settings);
    save('streaks', state.streaks);
    save('notionDatabaseId', state.notionDatabaseId);
    save('notionDatabaseUrl', state.notionDatabaseUrl);
    save('notionShiftsDatabaseId', state.notionShiftsDatabaseId);
    save('notionShiftsDatabaseUrl', state.notionShiftsDatabaseUrl);
    save('notionSubDatabaseId', state.notionSubDatabaseId);
    save('notionSubDatabaseUrl', state.notionSubDatabaseUrl);
    save('notionTasksDatabaseId', state.notionTasksDatabaseId);
    save('notionGoalsDatabaseId', state.notionGoalsDatabaseId);
    save('notionSyncBacklog', state.notionSyncBacklog);
    save('notionShiftSyncBacklog', state.notionShiftSyncBacklog);
    save('chatHistory', state.chatHistory);
    save('tasks', state.tasks);
    save('goals', state.goals);
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
        if (tab.dataset.tab === 'focus') {
          renderTodaySchedule();
          renderClockableShifts();
          renderClockTab();
          updateQuickStats();
        }
        if (tab.dataset.tab === 'tasks') {
          renderTasks();
        }
        if (tab.dataset.tab === 'guide') {
          renderChat();
        }
        if (tab.dataset.tab === 'oneview') {
          renderGoalsMap();
          renderShiftsList();
          renderStats();
          loadSettings();
        }
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
    const daysEl = $('#cat-days');
    const hoursEl = $('#cat-hours');
    const minsEl = $('#cat-mins');
    const secsEl = $('#cat-secs');
    const urgencyEl = $('#cat-urgency');
    if (!daysEl || !hoursEl || !minsEl || !secsEl || !urgencyEl) return;

    const catDateStr = state.settings.catDate || '2026-11-23';
    const catDate = new Date(catDateStr + 'T09:00:00');
    const diff = catDate - now;

    if (diff <= 0) {
      daysEl.textContent = '0';
      hoursEl.textContent = '00';
      minsEl.textContent = '00';
      secsEl.textContent = '00';
      urgencyEl.textContent = 'EXAM DAY';
      return;
    }

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    daysEl.textContent = days;
    hoursEl.textContent = pad(hours);
    minsEl.textContent = pad(mins);
    secsEl.textContent = pad(secs);

    if (days < 30) {
      urgencyEl.textContent = 'CRITICAL';
      urgencyEl.className = 'card-tag tag-danger';
    } else if (days < 90) {
      urgencyEl.textContent = 'URGENT';
      urgencyEl.className = 'card-tag tag-danger';
    } else if (days < 180) {
      urgencyEl.textContent = 'APPROACHING';
      urgencyEl.className = 'card-tag tag-urgent';
    } else {
      urgencyEl.textContent = days + ' DAYS';
      urgencyEl.className = 'card-tag tag-urgent';
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
    const statusDot = $('#duty-status-dot');
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
    const awolAlert = $('#awol-alert');
    if (!awolAlert) return;

    if (state.session) return; // Already clocked in

    const now = new Date();
    const activeShift = getActiveShift(now);
    if (!activeShift) {
      awolAlert.classList.add('hidden');
      return;
    }

    // Check if already logged for today
    const todayStr = getTodayStr();
    const log = state.logs.find(l => l.shiftId === activeShift.id && l.date === todayStr);
    if (log) {
      awolAlert.classList.add('hidden');
      return;
    }

    // Check if dismissed
    if (awolDismissed[activeShift.id] === todayStr) return;

    // Show alert
    const nameEl = $('#awol-shift-name');
    if (nameEl) nameEl.textContent = activeShift.name;
    awolAlert.classList.remove('hidden');

    // Try notification & Play alarm synthesizer
    sendNotification('SHIFT ALERT', `You should be on shift: ${activeShift.name}. Clock in NOW.`);
    playUrgentAlarm();
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
      stopAlarm();
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

      // Sync shift template changes to Notion
      syncNotionShift(shiftData);
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
    
    // 1. Instantly remove from local schedule state
    state.shifts = state.shifts.filter(s => s.id !== id);
    
    // 2. Queue the delete operation in Notion backlog
    if (state.notionShiftsDatabaseId && !state.notionShiftSyncBacklog.includes(id)) {
      state.notionShiftSyncBacklog.push(id);
    }
    
    // 3. Persist and redraw UI immediately
    persist();
    renderShiftsList();
    renderTodaySchedule();

    // 4. Force Notion to delete it now (will remove from backlog when done)
    syncNotionShift({ id }, true).then(success => {
      if (success) {
        state.notionShiftSyncBacklog = state.notionShiftSyncBacklog.filter(x => x !== id);
        persist();
        updateNotionUI();
      }
    });
  }

  // ========================
  // CLOCK IN / OUT
  // ========================
  function clockIn(shift) {
    const now = new Date();
    const logId = genId(); // Pre-generate log id
    state.session = {
      logId: logId,
      shiftId: shift.id,
      shiftName: shift.name,
      category: shift.category,
      clockIn: now.toISOString(),
      lastCheckin: now.toISOString(),
      notionPageId: null // Stores Notion page reference once synced
    };
    persist();
    renderClockTab();
    renderTodaySchedule();
    updateDutyCard(now);
    updateTopbarStatus(now);
    stopAlarm();

    // Create an in-progress draft log entry
    const draftLog = {
      id: logId,
      shiftId: shift.id,
      shiftName: shift.name,
      category: shift.category,
      date: getTodayStr(),
      clockIn: now.toISOString(),
      clockOut: null,
      duration: 0,
      notes: 'Active session...',
      rating: 0,
      status: 'in-progress'
    };
    
    // Sync draft log to Notion
    syncNotionLog(draftLog).then(success => {
      if (success && state.session && state.session.logId === logId) {
        // Find saved pageId from the synced log and store in active session
        const syncedLog = state.logs.find(l => l.id === logId);
        state.session.notionPageId = draftLog.notionPageId;
        persist();
      }
    });
  }

  function clockOut(notes, rating) {
    if (!state.session) return;
    const now = new Date();
    const clockInTime = new Date(state.session.clockIn);
    const duration = now - clockInTime;

    const log = {
      id: state.session.logId || genId(),
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
      notionPageId: state.session.notionPageId // Pass the draft page ID if synced
    };

    state.logs.push(log);
    state.session = null;
    updateStreaks();
    persist();
    renderClockTab();
    renderTodaySchedule();
    updateDutyCard(now);
    updateQuickStats();

    // Trigger async Notion sync (updates existing draft page or creates new if offline earlier)
    syncNotionLog(log);
  }

  function renderClockTab() {
    const noSession = $('#clock-no-session');
    const activeSession = $('#clock-active-session');
    const sessionCard = $('#session-card');

    if (!noSession || !activeSession || !sessionCard) return;

    if (state.session) {
      noSession.classList.add('hidden');
      activeSession.classList.remove('hidden');
      sessionCard.classList.add('active-session');

      const sShiftName = $('#session-shift-name');
      const sStartTime = $('#session-start-time');
      const sEndTime = $('#session-end-time');
      const checkinPrompt = $('#checkin-prompt');

      if (sShiftName) sShiftName.textContent = state.session.shiftName;
      const clockInDate = new Date(state.session.clockIn);
      if (sStartTime) sStartTime.textContent = timeStr(clockInDate);

      const shift = state.shifts.find(s => s.id === state.session.shiftId);
      if (sEndTime) sEndTime.textContent = shift ? shift.endTime : '--:--';

      // Reset checkin
      if (checkinPrompt) checkinPrompt.classList.add('hidden');
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
    const rateEl = $('#completion-rate');
    const completedEl = $('#stat-completed');
    const missedEl = $('#stat-missed');
    const totalHoursEl = $('#stat-total-hours');

    if (!rateEl || !completedEl || !missedEl || !totalHoursEl) return;

    const weekStart = getWeekStart();
    const weekLogs = state.logs.filter(l => new Date(l.date) >= weekStart);

    const completed = weekLogs.filter(l => l.status === 'completed').length;
    const missed = weekLogs.filter(l => l.status === 'missed').length;
    const total = completed + missed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const totalHours = weekLogs
      .filter(l => l.status === 'completed')
      .reduce((sum, l) => sum + (l.duration || 0), 0) / 3600000;

    rateEl.textContent = rate + '%';
    completedEl.textContent = completed;
    missedEl.textContent = missed;
    totalHoursEl.textContent = totalHours.toFixed(1) + 'h';

    // Update ring
    const circumference = 2 * Math.PI * 52; // r=52
    const offset = circumference - (rate / 100) * circumference;
    const ring = $('#completion-ring-fill');
    if (ring) ring.style.strokeDashoffset = offset;
  }

  function renderStreakStats() {
    const currentEl = $('#stat-current-streak');
    const bestEl = $('#stat-best-streak');
    if (currentEl) currentEl.textContent = state.streaks.current;
    if (bestEl) bestEl.textContent = state.streaks.best;
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

  function loadSettings() {
    $('#setting-name').value = state.settings.name || '';
    $('#setting-wake').value = state.settings.wakeTime || '06:00';
    $('#setting-sleep').value = state.settings.sleepTime || '00:00';
    $('#setting-cat-date').value = state.settings.catDate || '2026-11-23';
    $('#setting-alarm-tone').value = state.settings.alarmTone || 'pulse';

    const toggleBtn = $('#toggle-notifications');
    if (state.settings.notifications) {
      if (toggleBtn) toggleBtn.classList.add('active');
      $('#notif-status').textContent = 'Notifications enabled';
    } else {
      if (toggleBtn) toggleBtn.classList.remove('active');
      $('#notif-status').textContent = 'Notifications not enabled';
    }

    if ($('#setting-notion-tasks-id')) $('#setting-notion-tasks-id').value = state.notionTasksDatabaseId || '';
    if ($('#setting-notion-goals-id')) $('#setting-notion-goals-id').value = state.notionGoalsDatabaseId || '';
    if ($('#setting-notion-shifts-id')) $('#setting-notion-shifts-id').value = state.notionShiftsDatabaseId || '';
    if ($('#setting-notion-logs-id')) $('#setting-notion-logs-id').value = state.notionDatabaseId || '';
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

    const notionInputs = ['setting-notion-tasks-id', 'setting-notion-goals-id', 'setting-notion-shifts-id', 'setting-notion-logs-id'];
    notionInputs.forEach(id => {
      const el = $('#' + id);
      if (!el) return;
      el.addEventListener('change', () => {
        state.notionTasksDatabaseId = $('#setting-notion-tasks-id').value.trim() || null;
        state.notionGoalsDatabaseId = $('#setting-notion-goals-id').value.trim() || null;
        state.notionShiftsDatabaseId = $('#setting-notion-shifts-id').value.trim() || null;
        state.notionDatabaseId = $('#setting-notion-logs-id').value.trim() || null;
        persist();
        updateNotionUI();
      });
    });

    // Alarm tone select trigger
    const toneSelect = $('#setting-alarm-tone');
    if (toneSelect) {
      toneSelect.addEventListener('change', () => {
        state.settings.alarmTone = toneSelect.value;
        persist();
      });
    }

    // Alarm test button trigger
    const testBtn = $('#btn-test-alarm');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        playUrgentAlarm(true); // Test alarm tone once
      });
    }

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

    const indicator = $('#notion-sync-indicator');
    if (indicator) {
      indicator.style.background = '#f59e0b';
      indicator.setAttribute('title', 'Syncing log to Notion...');
    }

    try {
      const payload = {
        type: 'log',
        databaseId: state.notionDatabaseId,
        log: log,
        callsign: state.settings.name || 'Operator'
      };

      // Check if we have a saved Notion page ID from a clock-in draft
      if (log.notionPageId) {
        payload.pageId = log.notionPageId;
      }

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const res = await response.json();
      if (response.ok && res.success) {
        // Save the pageId locally so we can update it later if needed
        if (res.pageId && log.notionPageId !== res.pageId) {
          log.notionPageId = res.pageId;
          persist();
        }
        
        if (indicator) {
          indicator.style.background = '#00d4aa';
          indicator.setAttribute('title', 'Notion Synced');
        }
        state.notionSyncBacklog = state.notionSyncBacklog.filter(id => id !== log.id);
        persist();
        return true;
      } else {
        throw new Error(res.error || 'Failed to sync log');
      }
    } catch (e) {
      console.warn('Notion Log Sync Failed, queued:', e);
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

  async function syncNotionShift(shift, isDelete = false) {
    if (!state.notionShiftsDatabaseId) return false;

    const indicator = $('#notion-sync-indicator');
    if (indicator) {
      indicator.style.background = '#f59e0b';
      indicator.setAttribute('title', 'Syncing shift to Notion...');
    }

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: isDelete ? 'delete-shift' : 'shift',
          databaseId: state.notionShiftsDatabaseId,
          shift: shift
        })
      });

      const res = await response.json();
      if (response.ok && res.success) {
        if (indicator) {
          indicator.style.background = '#00d4aa';
          indicator.setAttribute('title', 'Notion Synced');
        }
        state.notionShiftSyncBacklog = state.notionShiftSyncBacklog.filter(id => id !== shift.id);
        persist();
        return true;
      } else {
        throw new Error(res.error || 'Failed to sync shift target');
      }
    } catch (e) {
      console.warn('Notion Shift Sync Failed, queued:', e);
      if (indicator) {
        indicator.style.background = '#ef4444';
        indicator.setAttribute('title', 'Sync Error: Queued');
      }
      if (!state.notionShiftSyncBacklog.includes(shift.id) && !isDelete) {
        state.notionShiftSyncBacklog.push(shift.id);
        persist();
      }
      return false;
    }
  }

  // ========================
  // WEB AUDIO SYNTHESIZED ALARMS
  // ========================
  let audioCtx = null;
  let alarmInterval = null;

  function playUrgentAlarm(isTest = false) {
    const tone = state.settings.alarmTone || 'pulse';
    if (tone === 'none') return;

    // Initialize Audio Context on user gesture
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Stop existing alarms
    if (alarmInterval) {
      clearInterval(alarmInterval);
      alarmInterval = null;
    }

    const duration = isTest ? 1500 : 10000; // Limit tests to 1.5s, active alerts to 10s

    if (tone === 'slack') {
      // Slack Huddle Ringtone: Pleasant, wooden double-pop chime sequence
      const playChime = (time, freq, length, type = 'sine') => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.18, time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + length);

        osc.start(time);
        osc.stop(time + length);
      };

      const triggerPattern = () => {
        const now = audioCtx.currentTime;
        // Slack huddle ringtone has a distinctive bouncy up-and-down chime melody:
        playChime(now, 587.33, 0.25, 'triangle');       // D5
        playChime(now + 0.12, 659.25, 0.25, 'triangle');  // E5
        playChime(now + 0.24, 783.99, 0.35, 'sine');      // G5
        playChime(now + 0.36, 587.33, 0.2, 'triangle');   // D5
        playChime(now + 0.48, 659.25, 0.4, 'sine');       // E5
      };

      let offset = 0;
      alarmInterval = setInterval(() => {
        triggerPattern();
        offset += 1500;
        if (offset >= duration) clearInterval(alarmInterval);
      }, 1500);
      triggerPattern();

    } else if (tone === 'pulse') {
      // Pleasant yet Urgent: Double high-pitch sweet chime pulses
      let startTime = audioCtx.currentTime;
      const playPulse = (time, freq, length) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'triangle'; // Softer, rounder sound
        osc.frequency.setValueAtTime(freq, time);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.15, time + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + length);

        osc.start(time);
        osc.stop(time + length);
      };

      // Play double chime pattern repeating
      let offset = 0;
      alarmInterval = setInterval(() => {
        const t = audioCtx.currentTime;
        playPulse(t, 880, 0.4); // A5 Chime
        playPulse(t + 0.15, 1046.5, 0.5); // C6 Chime
        offset += 1200;
        if (offset >= duration) clearInterval(alarmInterval);
      }, 1200);
      
      // Trigger first run immediately
      playPulse(audioCtx.currentTime, 880, 0.4);
      playPulse(audioCtx.currentTime + 0.15, 1046.5, 0.5);

    } else if (tone === 'echo') {
      // Calm and Strategic: Deep ambient sonar echos
      let startTime = audioCtx.currentTime;
      const playEcho = (time, freq) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        // Frequency sweep echo
        osc.frequency.exponentialRampToValueAtTime(freq / 2, time + 1.2);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.2, time + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.5);

        osc.start(time);
        osc.stop(time + 1.5);
      };

      let offset = 0;
      alarmInterval = setInterval(() => {
        playEcho(audioCtx.currentTime, 440);
        offset += 2000;
        if (offset >= duration) clearInterval(alarmInterval);
      }, 2000);
      playEcho(audioCtx.currentTime, 440);

    } else if (tone === 'klaxon') {
      // High Alert: Emergency modulation siren
      let offset = 0;
      const playSiren = () => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(600, audioCtx.currentTime + 0.4);
        osc.frequency.linearRampToValueAtTime(300, audioCtx.currentTime + 0.8);

        gain.gain.setValueAtTime(0, audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.8);
      };

      alarmInterval = setInterval(() => {
        playSiren();
        offset += 1000;
        if (offset >= duration) clearInterval(alarmInterval);
      }, 1000);
      playSiren();
    }
  }

  function stopAlarm() {
    if (alarmInterval) {
      clearInterval(alarmInterval);
      alarmInterval = null;
    }
  }

  async function processSyncBacklog() {
    if (!state.notionDatabaseId) {
      updateNotionUI();
      return;
    }

    // Process shift templates backlog first
    if (state.notionShiftsDatabaseId && state.notionShiftSyncBacklog.length > 0) {
      const shiftBacklog = [...state.notionShiftSyncBacklog];
      for (const id of shiftBacklog) {
        const shift = state.shifts.find(s => s.id === id);
        if (shift) {
          const success = await syncNotionShift(shift);
          if (!success) break;
        } else {
          // If deleted locally, trigger delete on Notion backend
          const success = await syncNotionShift({ id }, true);
          if (success) {
            state.notionShiftSyncBacklog = state.notionShiftSyncBacklog.filter(x => x !== id);
            persist();
          } else {
            break;
          }
        }
      }
    }

    // Process operations log backlog
    if (state.notionSyncBacklog.length > 0) {
      const logBacklog = [...state.notionSyncBacklog];
      for (const logId of logBacklog) {
        const log = state.logs.find(l => l.id === logId);
        if (log) {
          const success = await syncNotionLog(log);
          if (!success) break;
        } else {
          state.notionSyncBacklog = state.notionSyncBacklog.filter(id => id !== logId);
          persist();
        }
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
    const shiftsDbUrl = $('#notion-shifts-db-url');
    const pullBtn = $('#btn-pull-notion');

    if (!indicator) return;

    const totalBacklog = state.notionSyncBacklog.length + state.notionShiftSyncBacklog.length;

    if (state.notionDatabaseId) {
      if (totalBacklog > 0) {
        indicator.style.background = '#ef4444';
        indicator.setAttribute('title', `${totalBacklog} items pending sync`);
        if (statusText) statusText.textContent = `PENDING SYNC (${totalBacklog})`;
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
      if (shiftsDbUrl && state.notionShiftsDatabaseUrl) {
        shiftsDbUrl.href = state.notionShiftsDatabaseUrl;
      }
      if (pullBtn) pullBtn.classList.remove('hidden');
    } else {
      indicator.style.background = '#6b7280';
      indicator.setAttribute('title', 'Notion Unlinked');
      if (statusText) statusText.textContent = 'UNLINKED';
      if (initBtn) initBtn.textContent = 'LINK NOTION DATABASE';
      if (linkContainer) linkContainer.classList.add('hidden');
      if (pullBtn) pullBtn.classList.add('hidden');
    }
  }

  async function pullNotionShifts(quiet = false) {
    if (!state.notionShiftsDatabaseId) return;
    const pullBtn = $('#btn-pull-notion');
    if (pullBtn && !quiet) {
      pullBtn.disabled = true;
      pullBtn.textContent = 'PULLING...';
    }

    try {
      const response = await fetch('/api/pull-shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          databaseId: state.notionShiftsDatabaseId
        })
      });

      const res = await response.json();
      if (response.ok && res.success) {
        // Merge downloaded shifts into local state shifts
        const incomingShifts = res.shifts || [];
        
        if (incomingShifts.length === 0) {
          if (!quiet) alert('No shift targets found in Notion database.');
          return;
        }

        // Loop through and update or insert
        incomingShifts.forEach(incoming => {
          const idx = state.shifts.findIndex(s => s.id === incoming.id);
          if (idx >= 0) {
            state.shifts[idx] = incoming;
          } else {
            state.shifts.push(incoming);
          }
        });

        // Also clean up any shifts locally that are no longer in Notion database
        const incomingIds = incomingShifts.map(s => s.id);
        state.shifts = state.shifts.filter(localShift => {
          // If this shift is pending delete sync, don't restore it!
          const isPendingDelete = state.notionShiftSyncBacklog.includes(localShift.id);
          if (isPendingDelete) return false;

          // Keep if it matches an incoming ID, or if we haven't synced it to Notion yet
          const inIncoming = incomingIds.includes(localShift.id);
          const hasNotSyncedToNotionYet = !localShift.id.includes('-') && !localShift.id.startsWith('ntn_'); // Notion page IDs always contain hyphens
          return inIncoming || hasNotSyncedToNotionYet;
        });

        persist();
        renderShiftsList();
        renderTodaySchedule();
        updateQuickStats();
        if (!quiet) alert(`Successfully synced ${incomingShifts.length} shifts from Notion!`);
      } else {
        if (!quiet) alert(`Failed to pull shifts: ${res.error || 'Unknown error'}`);
      }
    } catch (e) {
      if (!quiet) alert(`Network error pulling shifts: ${e.message}`);
    } finally {
      if (pullBtn && !quiet) {
        pullBtn.disabled = false;
        pullBtn.textContent = '↓ PULL NOTION';
      }
    }
  }

  // ========================
  // CHAT & AI PERSONA
  // ========================
  function renderChat() {
    const chatMessages = $('#chat-messages');
    if (!chatMessages) return;

    chatMessages.innerHTML = '';

    if (state.chatHistory.length === 0) {
      // Initialize with default Sita Ramji command/greeting
      state.chatHistory.push({
        role: 'assistant',
        content: 'Open the book. Start now. Tell me what you are working on.',
        timestamp: Date.now()
      });
      persist();
    }

    state.chatHistory.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${msg.role === 'assistant' ? 'guide-bubble' : 'user-bubble'}`;
      
      const sender = document.createElement('span');
      sender.className = 'chat-sender';
      sender.textContent = msg.role === 'assistant' ? 'Sita Ramji' : (state.settings.name || 'Operator');
      
      const text = document.createElement('p');
      text.className = 'chat-text';
      text.textContent = msg.content;

      bubble.appendChild(sender);
      bubble.appendChild(text);
      chatMessages.appendChild(bubble);
    });

    // Scroll to bottom
    const container = $('.card-chat-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function initChatEvents() {
    const sendBtn = $('#btn-chat-send');
    const chatInput = $('#chat-input');
    if (!sendBtn || !chatInput) return;

    const sendMessage = async () => {
      const text = chatInput.value.trim();
      if (!text) return;

      // Add user message
      state.chatHistory.push({
        role: 'user',
        content: text,
        timestamp: Date.now()
      });
      persist();
      renderChat();
      chatInput.value = '';

      // Disable inputs during API call
      chatInput.disabled = true;
      sendBtn.disabled = true;

      // Show thinking bubble
      const chatMessages = $('#chat-messages');
      const thinkingBubble = document.createElement('div');
      thinkingBubble.className = 'chat-bubble guide-bubble thinking-bubble';
      thinkingBubble.innerHTML = '<span class="chat-sender">Sita Ramji</span><p class="chat-text">...</p>';
      chatMessages.appendChild(thinkingBubble);
      
      const container = $('.card-chat-container');
      if (container) container.scrollTop = container.scrollHeight;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: state.chatHistory,
            userContext: {
              name: state.settings.name || 'Operator'
            }
          })
        });

        const res = await response.json();
        
        // Remove thinking bubble
        const thinking = $('.thinking-bubble');
        if (thinking) thinking.remove();

        if (response.ok && res.reply) {
          state.chatHistory.push({
            role: 'assistant',
            content: res.reply,
            timestamp: Date.now()
          });
          persist();
        } else {
          state.chatHistory.push({
            role: 'assistant',
            content: `Error: ${res.error || 'Failed to get response.'}`,
            timestamp: Date.now()
          });
        }
      } catch (e) {
        const thinking = $('.thinking-bubble');
        if (thinking) thinking.remove();
        state.chatHistory.push({
          role: 'assistant',
          content: `Connection failed: ${e.message}`,
          timestamp: Date.now()
        });
      } finally {
        chatInput.disabled = false;
        sendBtn.disabled = false;
        renderChat();
        chatInput.focus();
      }
    };

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }

  // ========================
  // TASKMASTER & NOTION SYNC
  // ========================
  let dragSrcIndex = null;

  function renderTasks() {
    const nextTaskCard = $('#next-task-card');
    const nextTaskName = $('#next-task-name');
    const nextTaskSlot = $('#next-task-slot');
    const nextTaskMeta = $('#next-task-meta');
    const nextTaskActions = $('#next-task-actions');
    const taskList = $('#task-list');

    if (!taskList) return;

    // Filter active incomplete tasks
    const activeTasks = state.tasks.filter(t => !t.completed);

    // 1. Render Next Up Focus Card
    if (activeTasks.length > 0) {
      const nextTask = activeTasks[0];
      nextTaskName.textContent = nextTask.name;
      nextTaskSlot.textContent = nextTask.slot ? nextTask.slot.toUpperCase() : 'NO SLOT';
      const goalName = state.goals?.find(g => g.id === nextTask.goalId)?.name || 'None';
      nextTaskMeta.textContent = `Goal: ${goalName}`;
      if (nextTaskActions) nextTaskActions.style.display = 'block';
      if (nextTaskCard) nextTaskCard.style.borderLeftColor = 'var(--accent)';
    } else {
      nextTaskName.textContent = 'All tasks completed. Fulfill your dharma.';
      nextTaskSlot.textContent = '—';
      nextTaskMeta.textContent = 'Goal: None';
      if (nextTaskActions) nextTaskActions.style.display = 'none';
      if (nextTaskCard) nextTaskCard.style.borderLeftColor = 'var(--border)';
    }

    // Attach click to nextTaskCard for edit
    if (nextTaskCard) {
      nextTaskCard.onclick = (e) => {
        if (e.target.closest('#btn-complete-next') || e.target.closest('#btn-delete-next')) return;
        const activeTasksList = state.tasks.filter(t => !t.completed);
        if (activeTasksList.length > 0) {
          openTaskModal(activeTasksList[0].id);
        }
      };
    }

    // 2. Render Checklist (items 1 onwards)
    taskList.innerHTML = '';
    const remainingTasks = activeTasks.slice(1);

    if (remainingTasks.length === 0) {
      taskList.innerHTML = '<div class="empty-state">No other active tasks. Click "+ NEW TASK" to plan.</div>';
      return;
    }

    remainingTasks.forEach((task, index) => {
      // Offset by 1 because activeTasks[0] is in the Next Up focus card
      const actualIndex = state.tasks.indexOf(task);

      const item = document.createElement('div');
      item.className = 'task-item';
      item.draggable = true;
      item.dataset.index = actualIndex;

      // Drag handle
      const handle = document.createElement('div');
      handle.className = 'task-drag-handle';
      handle.textContent = '⋮⋮';

      // Checkbox
      const checkWrapper = document.createElement('div');
      checkWrapper.className = 'task-checkbox-wrapper';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-checkbox-input';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => toggleTaskComplete(task.id));
      checkWrapper.appendChild(checkbox);

      // Content
      const content = document.createElement('div');
      content.className = 'task-content-wrapper';
      content.style.cursor = 'pointer';
      content.addEventListener('click', () => {
        openTaskModal(task.id);
      });
      
      const name = document.createElement('p');
      name.className = 'task-item-name';
      name.textContent = task.name;

      const meta = document.createElement('p');
      meta.className = 'task-item-meta';
      const goalName = state.goals?.find(g => g.id === task.goalId)?.name || 'None';
      meta.textContent = `${task.slot ? '[' + task.slot + '] ' : ''}Goal: ${goalName}`;

      content.appendChild(name);
      content.appendChild(meta);

      // Actions (Delete only, edit is triggered by clicking task body)
      const actions = document.createElement('div');
      actions.className = 'task-actions-wrapper';
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.marginLeft = 'auto';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-task-action btn-task-delete';
      deleteBtn.textContent = '🗑️';
      deleteBtn.style.background = 'none';
      deleteBtn.style.border = 'none';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.fontSize = '12px';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTask(task.id);
      });

      actions.appendChild(deleteBtn);

      item.appendChild(handle);
      item.appendChild(checkWrapper);
      item.appendChild(content);
      item.appendChild(actions);

      // HTML5 Drag-and-Drop Handlers
      item.addEventListener('dragstart', (e) => {
        dragSrcIndex = actualIndex;
        item.classList.add('dragging');
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        const targetIndex = parseInt(item.dataset.index);
        if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
          const moved = state.tasks.splice(dragSrcIndex, 1)[0];
          state.tasks.splice(targetIndex, 0, moved);
          persist();
          renderTasks();
        }
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        dragSrcIndex = null;
      });

      taskList.appendChild(item);
    });
  }

  async function pullNotionGoals() {
    try {
      const dbParam = state.notionGoalsDatabaseId ? `?databaseId=${state.notionGoalsDatabaseId}` : '';
      const response = await fetch(`/api/sync-goals${dbParam}`);
      const res = await response.json();
      if (response.ok && res.success) {
        state.goals = res.goals;
        persist();
        populateGoalsDropdown();
      }
    } catch (e) {
      console.warn('Failed to pull goals:', e);
    }
  }

  function populateGoalsDropdown() {
    const goalSelect = $('#task-goal');
    if (!goalSelect) return;
    goalSelect.innerHTML = '<option value="">No Goal</option>';
    state.goals.forEach(goal => {
      const opt = document.createElement('option');
      opt.value = goal.id;
      opt.textContent = goal.name;
      goalSelect.appendChild(opt);
    });
  }

  function populateParentTasksDropdown(excludeTaskId) {
    const parentSelect = $('#task-parent');
    if (!parentSelect) return;
    parentSelect.innerHTML = '<option value="">No Parent (Top Level Task)</option>';
    state.tasks.filter(t => !t.completed && t.id !== excludeTaskId).forEach(task => {
      const opt = document.createElement('option');
      opt.value = task.id;
      opt.textContent = task.name;
      parentSelect.appendChild(opt);
    });
  }

  function renderGoalsMap() {
    const container = $('#goals-progress-list');
    if (!container) return;

    if (!state.goals || state.goals.length === 0) {
      container.innerHTML = '<div class="empty-state">No goals active. Link your Notion goals database.</div>';
      return;
    }

    container.innerHTML = state.goals.map(goal => {
      // Find all tasks associated with this goal
      const goalTasks = state.tasks.filter(t => t.goalId === goal.id);
      const completed = goalTasks.filter(t => t.completed).length;
      const total = goalTasks.length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      return `
        <div class="goal-progress-card">
          <div class="goal-progress-header">
            <span class="goal-progress-name">${goal.name.toUpperCase()}</span>
            <span class="goal-progress-counts">${completed}/${total} Tasks (${pct}%)</span>
          </div>
          <div class="goal-progress-track">
            <div class="goal-progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function initSettingsDrawer() {
    const toggleBtn = $('#btn-toggle-settings');
    const content = $('#settings-drawer-content');
    const arrow = $('#settings-drawer-arrow');
    if (toggleBtn && content) {
      toggleBtn.addEventListener('click', () => {
        content.classList.toggle('hidden');
        if (content.classList.contains('hidden')) {
          if (arrow) arrow.style.transform = 'rotate(0deg)';
        } else {
          if (arrow) arrow.style.transform = 'rotate(180deg)';
        }
      });
    }
  }

  function openTaskModal(taskId = null) {
    const modal = $('#task-modal');
    const title = $('#task-modal-title');
    const form = $('#task-form');
    const editIdInput = $('#task-edit-id');
    const nameInput = $('#task-name');
    const slotSelect = $('#task-slot');
    const goalSelect = $('#task-goal');
    const parentSelect = $('#task-parent');
    const doDateInput = $('#task-do-date');
    const prioritySelect = $('#task-priority');
    const statusSelect = $('#task-status');
    const descriptionInput = $('#task-description');

    if (!modal) return;

    // Load options
    populateGoalsDropdown();
    populateParentTasksDropdown(taskId);

    if (taskId) {
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) return;

      title.textContent = 'EDIT TASK';
      editIdInput.value = task.id;
      nameInput.value = task.name;
      slotSelect.value = task.slot || '';
      goalSelect.value = task.goalId || '';
      parentSelect.value = task.parentTaskId || '';
      
      if (task.doDate) {
        let dStr = task.doDate;
        if (dStr.length === 10) {
          dStr += 'T09:00'; // Default 9 AM
        } else if (dStr.includes('Z')) {
          dStr = dStr.substring(0, 16);
        } else if (dStr.includes('+')) {
          dStr = dStr.substring(0, 16);
        }
        if (doDateInput) doDateInput.value = dStr;
      } else {
        if (doDateInput) doDateInput.value = '';
      }

      if (prioritySelect) prioritySelect.value = task.priority || '';
      if (statusSelect) statusSelect.value = task.status || 'Not started';
      if (descriptionInput) descriptionInput.value = task.description || '';
    } else {
      title.textContent = 'DEFINE NEW TASK';
      if (form) form.reset();
      editIdInput.value = '';
    }

    modal.classList.remove('hidden');
  }

  function closeTaskModal() {
    const modal = $('#task-modal');
    if (modal) modal.classList.add('hidden');
  }

  function editTaskName(taskId) {
    openTaskModal(taskId);
  }

  async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const [deletedTask] = state.tasks.splice(taskIndex, 1);
    persist();
    renderTasks();

    if (deletedTask.id && !deletedTask.id.startsWith('local_')) {
      try {
        await fetch('/api/sync-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'update',
            id: deletedTask.id,
            archived: true,
            databaseId: state.notionTasksDatabaseId || undefined
          })
        });
      } catch (e) {
        console.warn('Failed to archive task in Notion:', e);
      }
    }
  }

  async function toggleTaskComplete(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = true;
    persist();
    renderTasks();

    // Trigger Sita Ramji command acknowledging completion
    if (state.chatHistory.length > 0) {
      state.chatHistory.push({
        role: 'user',
        content: `Completed task: ${task.name}`,
        timestamp: Date.now()
      });
      persist();
      if ($('#panel-guide')?.classList.contains('active')) renderChat();
      
      // Call chat proxy to get Sita Ramji's reaction
      fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: state.chatHistory,
          userContext: { name: state.settings.name || 'Operator' }
        })
      }).then(r => r.json()).then(res => {
        if (res.reply) {
          state.chatHistory.push({
            role: 'assistant',
            content: res.reply,
            timestamp: Date.now()
          });
          persist();
          if ($('#panel-guide')?.classList.contains('active')) renderChat();
        }
      }).catch(err => console.warn('Chat trigger error:', err));
    }

    // Sync completion to Notion
    if (task.id && !task.id.startsWith('local_')) {
      try {
        await fetch('/api/sync-tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'update',
            id: task.id,
            completed: true,
            databaseId: state.notionTasksDatabaseId || undefined
          })
        });
      } catch (e) {
        console.warn('Failed to sync task completion to Notion:', e);
      }
    }
  }

  async function pullNotionTasks(quiet = false) {
    const syncBtn = $('#btn-sync-tasks');
    if (syncBtn && !quiet) {
      syncBtn.disabled = true;
      syncBtn.textContent = 'SYNCING...';
    }

    try {
      const dbParam = state.notionTasksDatabaseId ? `&databaseId=${state.notionTasksDatabaseId}` : '';
      const response = await fetch(`/api/sync-tasks?type=pull${dbParam}`);
      const res = await response.json();
      if (response.ok && res.success) {
        // Merge Notion tasks with local tasks
        const notionTasks = res.tasks;
        
        // Remove locally cached active tasks that aren't in Notion's active list
        // (but keep purely offline local tasks starting with 'local_')
        state.tasks = state.tasks.filter(t => t.id.startsWith('local_'));
        
        // Append Notion tasks
        notionTasks.forEach(nt => {
          if (!state.tasks.some(t => t.id === nt.id)) {
            state.tasks.push(nt);
          }
        });

        persist();
        renderTasks();
      } else {
        console.warn('Failed to pull tasks:', res.error);
      }
    } catch (e) {
      console.warn('Network error pulling tasks:', e);
    } finally {
      if (syncBtn && !quiet) {
        syncBtn.disabled = false;
        syncBtn.textContent = 'SYNC NOTION';
      }
    }
  }

  function initTaskmasterEvents() {
    const addTaskBtn = $('#btn-add-task');
    const syncTasksBtn = $('#btn-sync-tasks');
    const completeNextBtn = $('#btn-complete-next');
    const editNextBtn = $('#btn-edit-next');
    const deleteNextBtn = $('#btn-delete-next');

    const modalCloseBtn = $('#task-modal-close');
    const cancelTaskBtn = $('#btn-cancel-task');
    const taskForm = $('#task-form');

    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => openTaskModal());
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeTaskModal);
    if (cancelTaskBtn) cancelTaskBtn.addEventListener('click', closeTaskModal);

    if (taskForm) {
      taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const editId = $('#task-edit-id').value;
        const name = $('#task-name').value.trim();
        const slot = $('#task-slot').value || null;
        const goalId = $('#task-goal').value || null;
        const parentTaskId = $('#task-parent').value || null;
        const doDate = $('#task-do-date').value || null;
        const priority = $('#task-priority').value || null;
        const status = $('#task-status').value || 'Not started';
        const description = $('#task-description').value.trim() || null;

        if (!name) return;

        if (editId) {
          // Edit Mode
          const task = state.tasks.find(t => t.id === editId);
          if (task) {
            task.name = name;
            task.slot = slot;
            task.goalId = goalId;
            task.parentTaskId = parentTaskId;
            task.doDate = doDate;
            task.priority = priority;
            task.status = status;
            task.description = description;
            persist();
            renderTasks();
          }

          closeTaskModal();

          // Sync edit to Notion
          if (editId && !editId.startsWith('local_')) {
            try {
              await fetch('/api/sync-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'update',
                  id: editId,
                  name,
                  slot,
                  goalId,
                  parentTaskId,
                  doDate,
                  priority,
                  status,
                  description,
                  databaseId: state.notionTasksDatabaseId || undefined
                })
              });
            } catch (err) {
              console.warn('Failed to sync task update:', err);
            }
          }
        } else {
          // Create Mode
          const tempId = 'local_' + Date.now();
          const newTask = {
            id: tempId,
            name,
            completed: false,
            slot,
            parentTaskId,
            goalId,
            doDate,
            priority,
            status,
            description
          };

          state.tasks.push(newTask);
          persist();
          renderTasks();
          closeTaskModal();

          // Sync create to Notion
          try {
            const res = await fetch('/api/sync-tasks', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'create',
                name,
                slot,
                goalId,
                parentTaskId,
                doDate,
                priority,
                status,
                description,
                databaseId: state.notionTasksDatabaseId || undefined
              })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              const localTask = state.tasks.find(t => t.id === tempId);
              if (localTask) {
                localTask.id = data.task.id;
                persist();
                renderTasks();
              }
            }
          } catch (err) {
            console.warn('Failed to create task in Notion, kept local:', err);
          }
        }
      });
    }

    if (completeNextBtn) {
      completeNextBtn.addEventListener('click', () => {
        const activeTasks = state.tasks.filter(t => !t.completed);
        if (activeTasks.length > 0) {
          toggleTaskComplete(activeTasks[0].id);
        }
      });
    }

    if (editNextBtn) {
      editNextBtn.addEventListener('click', () => {
        const activeTasks = state.tasks.filter(t => !t.completed);
        if (activeTasks.length > 0) {
          editTaskName(activeTasks[0].id);
        }
      });
    }

    if (deleteNextBtn) {
      deleteNextBtn.addEventListener('click', () => {
        const activeTasks = state.tasks.filter(t => !t.completed);
        if (activeTasks.length > 0) {
          deleteTask(activeTasks[0].id);
        }
      });
    }

    if (syncTasksBtn) {
      syncTasksBtn.addEventListener('click', pullNotionTasks);
    }
  }

  function initNotionEvents() {
    const btn = $('#btn-init-notion');
    const pullBtn = $('#btn-pull-notion');
    
    if (pullBtn) {
      pullBtn.addEventListener('click', pullNotionShifts);
    }

    if (!btn) return;

    btn.addEventListener('click', async () => {
      if (state.notionDatabaseId) {
        if (!confirm('Unlink Notion Database? Stored data will not be deleted, but sync will stop.')) return;
        state.notionDatabaseId = null;
        state.notionDatabaseUrl = null;
        state.notionShiftsDatabaseId = null;
        state.notionShiftsDatabaseUrl = null;
        state.notionSubDatabaseId = null;
        state.notionSubDatabaseUrl = null;
        state.notionSyncBacklog = [];
        state.notionShiftSyncBacklog = [];
        persist();
        updateNotionUI();
        return;
      }

      btn.disabled = true;
      btn.textContent = 'CREATING NOTION DATABASES...';

      try {
        const response = await fetch('/api/init-database', {
          method: 'POST'
        });

        const res = await response.json();
        if (response.ok && res.success) {
          state.notionDatabaseId = res.logsDatabaseId;
          state.notionDatabaseUrl = res.logsDatabaseUrl;
          state.notionShiftsDatabaseId = res.shiftsDatabaseId;
          state.notionShiftsDatabaseUrl = res.shiftsDatabaseUrl;
          state.notionSubDatabaseId = res.subDatabaseId;
          state.notionSubDatabaseUrl = res.subDatabaseUrl;
          
          // Load existing logs and shift definitions to backfill
          state.notionSyncBacklog = state.logs.map(l => l.id);
          state.notionShiftSyncBacklog = state.shifts.map(s => s.id);
          persist();
          
          alert('Notion Databases (Logs, Targets & Devices) created and linked successfully!');
          loadSettings();
          processSyncBacklog();
          
          // Request Web Push registration immediately after linking Notion
          requestPushSubscription();
        } else {
          alert(`Error initializing databases: ${res.error || 'Unknown error'}`);
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

    // Trigger background Web Push for all registered devices
    if (state.notionSubDatabaseId) {
      fetch('/api/trigger-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subDatabaseId: state.notionSubDatabaseId,
          title: title,
          body: body
        })
      }).catch(err => console.error('Failed to trigger background push notification:', err));
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
  // SERVICE WORKER & WEB PUSH
  // ========================
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          // If Notion is linked, attempt push subscription registration
          if (state.notionSubDatabaseId) {
            requestPushSubscription(reg);
          }
        })
        .catch(() => {});
    }
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function requestPushSubscription(registration = null) {
    if (!state.notionSubDatabaseId) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported in this browser.');
      return;
    }

    try {
      const reg = registration || await navigator.serviceWorker.ready;
      
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const vapidPublicKey = 'BNcSdR4DbQoLVsMJCDZH7NsetvTCf8J2-kcLMCOCCBfNDUFKGFohbQrYSNqv_oFhVoLFhb2IVcRN8za-Z2mw-6g';
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // Send the subscription payload to Notion Device register endpoint
      const devName = navigator.userAgent.includes('Mobile') ? 'Mobile PWA' : 'Desktop PWA';
      await fetch('/api/register-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          databaseId: state.notionSubDatabaseId,
          subscription: subscription,
          deviceName: `${devName} (${navigator.platform || 'Unknown OS'})`,
          callsign: state.settings.name || 'Operator'
        })
      });
      
      console.log('Background push registration completed successfully.');
    } catch (err) {
      console.warn('Failed to subscribe browser to Web Push:', err);
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
    initChatEvents();
    initTaskmasterEvents();
    initSettings();
    initSettingsDrawer();
    initAWOL();
    loadSettings();
    rotateQuote();
    initPeriodicCheckins();
    initNotionEvents();
    updateNotionUI();
    processSyncBacklog();

    // Initial renders
    renderTodaySchedule();
    renderClockableShifts();
    renderClockTab();
    renderTasks();
    renderGoalsMap();
    renderShiftsList();
    pullNotionGoals();
    pullNotionTasks();
    updateQuickStats();
    renderStats();
    updateClocks();

    // Fast tick — every second
    setInterval(tick, 1000);

    // Slow tick — every 15 seconds
    setInterval(() => {
      slowTick();
      processSyncBacklog();
      pullNotionShifts(true); // Quiet auto-pull on tick
      pullNotionGoals().then(() => renderGoalsMap()); // Pull goals and render map
      pullNotionTasks(true);  // Quiet task pull
    }, 15000);

    // Quote rotation — every 60 seconds
    setInterval(rotateQuote, 60000);

    // Initial slow tick
    setTimeout(() => {
      slowTick();
      processSyncBacklog();
      pullNotionShifts(true); // Quiet pull on init
      pullNotionGoals().then(() => renderGoalsMap()); // Pull goals on init
      pullNotionTasks(true);  // Quiet task pull on init
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
