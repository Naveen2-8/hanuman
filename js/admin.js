/* ============================================================
   HanumanFitness – admin.js
   One test member · Full CRUD · localStorage · Payment modal
   ============================================================ */

(function () {
  'use strict';

  /* ── Credentials ── */
  const ADMIN_USER  = 'admin';
  const ADMIN_PASS  = 'hanuman@2024';
  const STORE_KEY   = 'hf_members_v2';
  const SESSION_KEY = 'hf_session_v2';

  /* ── Plan durations in months ── */
  const DURATIONS = {
    'Monthly':     1,
    'Quarterly':   3,
    'Half Yearly': 6,
    'Yearly':      12,
  };

  /* ── ONE test member ── */
  const SEED = [
    {
      id: 1,
      name: 'Rahul Sharma',
      phone: '9876543210',
      email: 'rahul.sharma@gmail.com',
      plan: 'Cardio + Strength',
      duration: 'Monthly',
      joinDate: today(),
      expiryDate: addMonths(today(), 1),
    }
  ];

  /* ── Date helpers ── */
  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function addMonths(dateStr, m) {
    var d = new Date(dateStr + 'T00:00:00');
    d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
  }

  function daysLeft(dateStr) {
    var now = new Date(); now.setHours(0,0,0,0);
    var exp = new Date(dateStr + 'T00:00:00');
    return Math.floor((exp - now) / 86400000);
  }

  function fmtDate(dateStr) {
    if (!dateStr) return '—';
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function status(dateStr) {
    var d = daysLeft(dateStr);
    if (d < 0)  return 'expired';
    if (d <= 7) return 'expiring';
    return 'active';
  }

  function initials(name) {
    return (name || '').split(' ').map(function(w){ return w[0]; }).slice(0,2).join('').toUpperCase();
  }

  function esc(str) {
    return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Data store ── */
  var members = [];
  var nextId  = 100;

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        members = JSON.parse(raw);
        nextId  = Math.max.apply(null, members.map(function(m){ return m.id; }).concat([99])) + 1;
      } else {
        members = SEED.map(function(m){ return Object.assign({}, m); });
        nextId  = 2;
        save();
      }
    } catch(e) {
      members = SEED.map(function(m){ return Object.assign({}, m); });
      save();
    }
  }

  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(members));
  }

  /* ── Session ── */
  function loggedIn()  { return sessionStorage.getItem(SESSION_KEY) === '1'; }
  function doLogin()   { sessionStorage.setItem(SESSION_KEY, '1'); }
  function doLogout()  { sessionStorage.removeItem(SESSION_KEY); }

  /* ── Element shortcuts ── */
  function el(id) { return document.getElementById(id); }

  /* ── State ── */
  var currentTab = 'all';
  var query      = '';

  /* ── Init ── */
  function init() {
    load();
    if (loggedIn()) { showDash(); } else { showLogin(); }
    bindAll();
    if (window.lucide) window.lucide.createIcons();
  }

  function showLogin() {
    el('login-screen').style.display = 'flex';
    el('dashboard').classList.remove('visible');
  }

  function showDash() {
    el('login-screen').style.display = 'none';
    el('dashboard').classList.add('visible');
    renderTable();
    renderStats();
  }

  /* ── Bind all events ── */
  function bindAll() {

    /* Login form */
    el('login-form').addEventListener('submit', function(e) {
      e.preventDefault();
      var u = el('login-user').value.trim();
      var p = el('login-pass').value;
      if (u === ADMIN_USER && p === ADMIN_PASS) {
        el('login-error').style.display = 'none';
        doLogin(); showDash();
      } else {
        el('login-error').style.display = 'block';
        el('login-error').innerHTML     = '<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="x-circle" style="width:16px;height:16px;"></i> Invalid username or password.</div>';
        if (window.lucide) window.lucide.createIcons({ root: el('login-error') });
      }
    });

    /* Logout */
    el('logout-btn').addEventListener('click', function() {
      doLogout(); showLogin();
    });

    /* Tabs */
    el('tab-all').addEventListener('click', function() { switchTab('all'); });
    el('tab-exp').addEventListener('click', function() { switchTab('expiring'); });
    el('sb-all').addEventListener('click',  function() { switchTab('all'); });
    el('sb-exp').addEventListener('click',  function() { switchTab('expiring'); });

    /* Add member buttons */
    el('add-btn').addEventListener('click', function() { openMemberModal(null); });
    el('sb-add').addEventListener('click',  function() { openMemberModal(null); });

    /* Search */
    el('search-input').addEventListener('input', function() {
      query = this.value.toLowerCase();
      currentPage = 1; /* reset to first page on new search */
      renderTable();
    });
    el('top-search').addEventListener('input', function() {
      query = this.value.toLowerCase();
      el('search-input').value = this.value;
      currentPage = 1;
      renderTable();
    });

    /* Member form submit */
    el('member-form').addEventListener('submit', function(e) { e.preventDefault(); saveMember(); });
    el('save-member-btn').addEventListener('click', function() { saveMember(); });

    /* Payment confirm */
    el('confirm-pay-btn').addEventListener('click', confirmPay);

    /* Delete confirm */
    el('confirm-del-btn').addEventListener('click', deleteMember);

    /* Pay duration change → recalc */
    el('pay-duration').addEventListener('change', recalcExpiry);

    /* Form join/duration → auto-calc expiry */
    ['f-join','f-duration'].forEach(function(id) {
      var elem = el(id);
      if (elem) elem.addEventListener('change', autoExpiry);
    });

    /* Per-page selector */
    var perPageSel = el('pag-per-page');
    if (perPageSel) {
      perPageSel.addEventListener('change', function() {
        perPage     = parseInt(this.value) || 25;
        currentPage = 1;
        renderTable();
      });
    }

    /* All close buttons */
    document.querySelectorAll('.modal-x, .modal-x-btn').forEach(function(btn) {
      btn.addEventListener('click', closeModals);
    });

    /* Backdrop click to close */
    document.querySelectorAll('.backdrop').forEach(function(bd) {
      bd.addEventListener('click', function(e) {
        if (e.target === this) closeModals();
      });
    });
  }

  /* ── Switch tab ── */
  function switchTab(tab) {
    currentTab  = tab;
    currentPage = 1; /* reset to page 1 when changing tabs */

    /* Tab buttons */
    el('tab-all').classList.toggle('active',   tab === 'all');
    el('tab-exp').classList.toggle('active',   tab === 'expiring');

    /* Sidebar items */
    el('sb-all').classList.toggle('active',    tab === 'all');
    el('sb-exp').classList.toggle('active',    tab === 'expiring');

    /* Title */
    el('tb-title').innerHTML = tab === 'expiring' ? '<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="alert-triangle"></i> Expiring Soon</div>' : 'Member Directory';
    el('tb-sub').textContent   = tab === 'expiring' ? 'Members whose membership expires within 7 days' : 'Manage members, payments & renewals';
    if (window.lucide) window.lucide.createIcons({ root: el('tb-title') });

    renderTable();
  }

  /* ── Render stats ── */
  function renderStats() {
    var total    = members.length;
    var active   = members.filter(function(m){ return status(m.expiryDate) === 'active';   }).length;
    var expiring = members.filter(function(m){ return status(m.expiryDate) === 'expiring'; }).length;
    var expired  = members.filter(function(m){ return status(m.expiryDate) === 'expired';  }).length;

    el('stat-total').textContent    = total;
    el('stat-active').textContent   = active;
    el('stat-expiring').textContent = expiring;
    el('stat-expired').textContent  = expired;

    el('sq-total').textContent    = total;
    el('sq-active').textContent   = active;
    el('sq-expiring').textContent = expiring;
    el('sq-expired').textContent  = expired;

    el('tc-all').textContent = total;
    el('tc-exp').textContent = expiring;

    var badge = el('exp-badge');
    badge.textContent   = expiring || '';
    badge.style.display = expiring ? 'flex' : 'none';
  }

  /* ── PAGINATION state ── */
  var currentPage = 1;
  var perPage     = 25;

  /* ── Render table (paginated) ── */
  function renderTable() {
    var tbody = el('members-tbody');
    if (!tbody) return;
    renderStats();

    /* 1. Build filtered list */
    var list = members.slice();

    if (currentTab === 'expiring') {
      list = list.filter(function(m){ return status(m.expiryDate) === 'expiring'; });
    }
    if (query) {
      list = list.filter(function(m) {
        return m.name.toLowerCase().indexOf(query) !== -1
            || m.phone.indexOf(query) !== -1
            || (m.email||'').toLowerCase().indexOf(query) !== -1;
      });
    }

    var total  = list.length;
    var pages  = Math.max(1, Math.ceil(total / perPage));

    /* Clamp page */
    if (currentPage > pages) currentPage = pages;
    if (currentPage < 1)     currentPage = 1;

    /* 2. Slice — only render ONE page of rows into the DOM */
    var start    = (currentPage - 1) * perPage;
    var end      = Math.min(start + perPage, total);
    var pageList = list.slice(start, end);

    /* 3. Render rows */
    if (pageList.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7"><div class="empty"><div class="ei"><i data-lucide="search" style="width:32px;height:32px;"></i></div><p>No members found.</p></div></td></tr>';
    } else {
      var labels = { active:'Active', expiring:'Expiring', expired:'Expired' };

      tbody.innerHTML = pageList.map(function(m) {
        var st   = status(m.expiryDate);
        var days = daysLeft(m.expiryDate);
        var rc   = st === 'expiring' ? 'exp-row' : '';

        var hint = '';
        if (st === 'expiring') hint = '<br/><span style="font-size:.7rem;color:var(--amber);display:inline-flex;align-items:center;gap:4px;margin-top:4px;"><i data-lucide="alert-triangle" style="width:12px;height:12px;"></i> ' + days + ' day' + (days!==1?'s':'') + ' left</span>';
        if (st === 'expired')  hint = '<br/><span style="font-size:.7rem;color:var(--red);display:inline-flex;align-items:center;gap:4px;margin-top:4px;"><i data-lucide="x-circle" style="width:12px;height:12px;"></i> Expired ' + Math.abs(days) + ' day' + (Math.abs(days)!==1?'s':'') + ' ago</span>';

        return '<tr class="' + rc + '">'
          + '<td><div class="m-cell"><div class="m-av">' + esc(initials(m.name)) + '</div>'
          + '<div><div class="m-name">' + esc(m.name) + '</div>'
          + '<div class="m-plan">' + esc(m.plan) + ' · ' + esc(m.duration) + '</div></div></div></td>'
          + '<td>' + esc(m.phone) + '</td>'
          + '<td>' + esc(m.email || '—') + '</td>'
          + '<td>' + esc(m.plan) + '</td>'
          + '<td>' + fmtDate(m.expiryDate) + hint + '</td>'
          + '<td><span class="badge ' + st + '">' + labels[st] + '</span></td>'
          + '<td><div class="row-acts">'
          + '<button class="act-btn btn-edit" onclick="HF.edit(' + m.id + ')"><i data-lucide="edit-2" style="width:14px;height:14px;"></i> Edit</button>'
          + '<button class="act-btn btn-pay"  onclick="HF.pay(' + m.id + ')"><i data-lucide="credit-card" style="width:14px;height:14px;"></i> Renew</button>'
          + '<button class="act-btn btn-del"  onclick="HF.del(' + m.id + ')"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>'
          + '</div></td></tr>';
      }).join('');
    }

    if (window.lucide) window.lucide.createIcons({ root: tbody });

    /* 4. Render pagination controls */
    renderPagination(total, pages, start, end);
  }

  /* ── Render pagination bar ── */
  function renderPagination(total, pages, start, end) {
    var info = el('pag-info');
    var btns = el('pag-btns');
    if (!info || !btns) return;

    /* Info text */
    if (total === 0) {
      info.innerHTML = 'No results';
    } else {
      info.innerHTML = 'Showing <b>' + (start+1) + '–' + end + '</b> of <b>' + total + '</b> member' + (total!==1?'s':'');
    }

    /* Hide controls if only one page */
    if (pages <= 1) { btns.innerHTML = ''; return; }

    var html = '';

    /* Previous button */
    html += '<button class="pag-btn" onclick="HF.page(' + (currentPage-1) + ')" '
          + (currentPage === 1 ? 'disabled' : '') + ' aria-label="Previous page">‹</button>';

    /* Page number buttons with smart ellipsis */
    var WING = 2; /* pages to show either side of current */
    for (var i = 1; i <= pages; i++) {
      var show = (i === 1) || (i === pages)
              || (i >= currentPage - WING && i <= currentPage + WING);
      if (show) {
        html += '<button class="pag-btn' + (i === currentPage ? ' active' : '') + '" '
              + 'onclick="HF.page(' + i + ')" aria-label="Page ' + i + '">' + i + '</button>';
      } else if (i === currentPage - WING - 1 || i === currentPage + WING + 1) {
        html += '<span class="pag-ellipsis">…</span>';
      }
    }

    /* Next button */
    html += '<button class="pag-btn" onclick="HF.page(' + (currentPage+1) + ')" '
          + (currentPage === pages ? 'disabled' : '') + ' aria-label="Next page">›</button>';

    btns.innerHTML = html;
  }


  /* ── Member modal ── */
  function openMemberModal(id) {
    el('member-form').reset();
    el('f-join').value = today();

    if (id !== null) {
      var m = members.find(function(x){ return x.id === id; });
      if (!m) return;
      el('modal-title').innerHTML = '<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="edit-2"></i> Edit Member</div>';
      el('form-id').value    = m.id;
      el('f-name').value     = m.name;
      el('f-phone').value    = m.phone;
      el('f-email').value    = m.email || '';
      el('f-plan').value     = m.plan;
      el('f-duration').value = m.duration;
      el('f-join').value     = m.joinDate;
      el('f-expiry').value   = m.expiryDate;
    } else {
      el('modal-title').innerHTML = '<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="user-plus"></i> Add New Member</div>';
      el('form-id').value = '';
      el('f-expiry').value = addMonths(today(), 1);
    }
    if (window.lucide) window.lucide.createIcons({ root: el('modal-title') });
    el('member-modal').classList.add('open');
  }

  function autoExpiry() {
    var j = el('f-join').value;
    var d = el('f-duration').value;
    if (j && d) {
      el('f-expiry').value = addMonths(j, DURATIONS[d] || 1);
    }
  }

  function saveMember() {
    var id       = el('form-id').value ? parseInt(el('form-id').value) : null;
    var name     = el('f-name').value.trim();
    var phone    = el('f-phone').value.trim();
    var email    = el('f-email').value.trim();
    var plan     = el('f-plan').value;
    var duration = el('f-duration').value;
    var joinDate = el('f-join').value;
    var expiry   = el('f-expiry').value;

    if (!name || !phone || !plan || !duration || !joinDate || !expiry) {
      toast('<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="alert-triangle" style="width:16px;height:16px;"></i> Please fill all required fields.</div>', 'warning');
      return;
    }

    if (id) {
      var idx = members.findIndex(function(m){ return m.id === id; });
      if (idx !== -1) {
        members[idx] = Object.assign({}, members[idx], { name, phone, email, plan, duration, joinDate, expiryDate: expiry });
        toast('<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="check-circle" style="width:16px;height:16px;"></i> Member updated!</div>', 'success');
      }
    } else {
      members.push({ id: nextId++, name, phone, email, plan, duration, joinDate, expiryDate: expiry });
      toast('<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="check-circle" style="width:16px;height:16px;"></i> Member added!</div>', 'success');
    }

    save();
    closeModals();
    renderTable();
  }

  /* ── Payment modal ── */
  function openPayModal(id) {
    var m = members.find(function(x){ return x.id === id; });
    if (!m) return;
    el('pay-id').value           = m.id;
    el('pay-name').textContent   = m.name;
    el('pay-plan').textContent   = m.plan + ' – ' + m.duration;
    el('pay-expiry').textContent = fmtDate(m.expiryDate);
    el('pay-duration').value     = m.duration;
    el('pay-amount').value       = '';
    el('pay-method').value       = 'Cash';
    recalcExpiry();
    el('pay-modal').classList.add('open');
  }

  function recalcExpiry() {
    var id = parseInt(el('pay-id').value);
    var m  = members.find(function(x){ return x.id === id; });
    if (!m) return;
    var dur    = el('pay-duration').value;
    var months = DURATIONS[dur] || 1;
    var base   = m.expiryDate > today() ? m.expiryDate : today();
    var newExp = addMonths(base, months);
    el('pay-new-exp').innerHTML      = '<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="check-circle" style="width:16px;height:16px;"></i> New Expiry: ' + fmtDate(newExp) + '</div>';
    el('pay-new-exp').dataset.date   = newExp;
    if (window.lucide) window.lucide.createIcons({ root: el('pay-new-exp') });
  }

  function confirmPay() {
    var id  = parseInt(el('pay-id').value);
    var idx = members.findIndex(function(m){ return m.id === id; });
    if (idx === -1) return;
    var newExp = el('pay-new-exp').dataset.date;
    var dur    = el('pay-duration').value;
    members[idx].expiryDate = newExp;
    members[idx].duration   = dur;
    save();
    closeModals();
    renderTable();
    toast('<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="credit-card" style="width:16px;height:16px;"></i> Payment confirmed! Expiry: ' + fmtDate(newExp) + '</div>', 'success');
  }

  /* ── Delete modal ── */
  function openDeleteModal(id) {
    var m = members.find(function(x){ return x.id === id; });
    if (!m) return;
    el('del-id').value          = m.id;
    el('del-name').textContent  = m.name;
    el('delete-modal').classList.add('open');
  }

  function deleteMember() {
    var id = parseInt(el('del-id').value);
    members = members.filter(function(m){ return m.id !== id; });
    save();
    closeModals();
    renderTable();
    toast('<div style="display:flex;align-items:center;gap:6px;"><i data-lucide="trash-2" style="width:16px;height:16px;"></i> Member deleted.</div>', 'error');
  }

  /* ── Close all modals ── */
  function closeModals() {
    document.querySelectorAll('.backdrop').forEach(function(b){ b.classList.remove('open'); });
  }

  /* ── Toast ── */
  var toastTimer;
  function toast(msg, type) {
    var t = el('toast');
    t.innerHTML = msg;
    if (window.lucide) window.lucide.createIcons({ root: t });
    t.className   = 'toast ' + (type||'success') + ' show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 3200);
  }

  /* ── Public API for inline onclick ── */
  window.HF = {
    edit: function(id) { openMemberModal(id); },
    pay:  function(id) { openPayModal(id); },
    del:  function(id) { openDeleteModal(id); },
    page: function(n)  {
      /* Navigate to page n (clamped inside renderTable) */
      currentPage = n;
      renderTable();
      /* Scroll table back to top smoothly */
      var tbl = document.querySelector('.tbl-wrap');
      if (tbl) tbl.scrollTo({ top: 0, behavior: 'smooth' });
    },
  };

  /* ── Start ── */
  document.addEventListener('DOMContentLoaded', init);

})();
