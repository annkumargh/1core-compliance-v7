// changeLog.js — Field-level change log for 1Core Compliance Module
// localStorage key : 1core_compliance_v6_changelog
// Schema           : { [centerId]: Entry[] }   newest-first, capped at MAX_PER_CENTER
//
// Entry shape:
// {
//   ts         : ISO string          — when the change was committed
//   role       : string              — user role at time of change
//   fieldKey   : string              — canonical dataKey (matches complianceFields.js)
//   fieldLabel : string              — human label stored at write time
//   domain     : string              — "D1" … "D7"
//   section    : string              — subTab slug (licensing / physical / personnel …)
//   oldValue   : string              — previous value (empty string if first entry)
//   newValue   : string              — value after change
// }

import { getFieldByKey } from './complianceFields';

const STORAGE_KEY      = '1core_compliance_v6_changelog';
const MAX_PER_CENTER   = 500;   // prune oldest when exceeded
const DEBOUNCE_DELAY   = 2000;  // ms — for text / number inputs

// ─── pending debounce timers  { "[centerId]:[fieldKey]": timerId } ────────────
const _timers = {};

// ─── last-known values cache  { "[centerId]:[fieldKey]": value }   ────────────
// Populated on first log call so we always have an "old" value even on first edit.
const _prev = {};

// ─── read / write helpers ─────────────────────────────────────────────────────

function _load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function _save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ─── internal: commit a single entry immediately ─────────────────────────────

function _commit(centerId, role, fieldKey, oldValue, newValue) {
  if (oldValue === newValue) return;                       // nothing actually changed
  if (newValue === undefined || newValue === null) return; // ignore non-values

  const fieldDef   = getFieldByKey(fieldKey) || {};
  const fieldLabel = fieldDef.label   || fieldKey;
  const domain     = fieldDef.fieldNum ? fieldDef.fieldNum.split('-')[0] : 'D?';
  const section    = fieldDef.subTab   || '';

  const entry = {
    ts:         new Date().toISOString(),
    role:       role || 'Unknown',
    fieldKey,
    fieldLabel,
    domain,
    section,
    oldValue:   oldValue  ?? '',
    newValue:   newValue  ?? '',
  };

  const all = _load();
  if (!Array.isArray(all[centerId])) all[centerId] = [];

  all[centerId].unshift(entry);                            // newest first

  if (all[centerId].length > MAX_PER_CENTER) {
    all[centerId] = all[centerId].slice(0, MAX_PER_CENTER);
  }

  _save(all);
}

// ─── public: logFieldChange ───────────────────────────────────────────────────
// Call this from DataEntryTab on every set(key, val).
//
// fieldType: 'text' | 'number'  → debounced (user may still be typing)
//            anything else       → committed immediately (YesNo, date, select)
//
// The caller passes currentStoredValue as oldValue so we capture before/after
// correctly even if the user edits the same field multiple times.

export function logFieldChange(centerId, role, fieldKey, currentStoredValue, newValue, fieldType) {
  const cacheKey = `${centerId}:${fieldKey}`;

  // Seed the prev cache with the value in storage on first encounter
  if (!(_prev[cacheKey] !== undefined)) {
    _prev[cacheKey] = currentStoredValue ?? '';
  }

  const isTyping = fieldType === 'text' || fieldType === 'number';

  if (isTyping) {
    // Debounce — cancel any pending timer for this field, restart it
    if (_timers[cacheKey]) clearTimeout(_timers[cacheKey]);

    _timers[cacheKey] = setTimeout(() => {
      _commit(centerId, role, fieldKey, _prev[cacheKey], newValue);
      _prev[cacheKey] = newValue;           // update prev to settled value
      delete _timers[cacheKey];
    }, DEBOUNCE_DELAY);
  } else {
    // Discrete change (YesNo, date, select, checkbox) — commit immediately
    _commit(centerId, role, fieldKey, currentStoredValue ?? '', newValue);
    _prev[cacheKey] = newValue;
  }
}

// ─── public: getChangeLog ─────────────────────────────────────────────────────
// Returns entries for a center, newest first.
// Optional filters: { domain, fieldKey, role, fromDate, toDate }

export function getChangeLog(centerId, filters = {}) {
  const all = _load();
  let entries = all[centerId] || [];

  if (filters.domain)   entries = entries.filter(e => e.domain   === filters.domain);
  if (filters.fieldKey) entries = entries.filter(e => e.fieldKey === filters.fieldKey);
  if (filters.role)     entries = entries.filter(e => e.role     === filters.role);
  if (filters.fromDate) {
    const from = new Date(filters.fromDate).setHours(0,0,0,0);
    entries = entries.filter(e => new Date(e.ts).getTime() >= from);
  }
  if (filters.toDate) {
    const to = new Date(filters.toDate).setHours(23,59,59,999);
    entries = entries.filter(e => new Date(e.ts).getTime() <= to);
  }

  return entries;
}

// ─── public: getFieldAsOf ─────────────────────────────────────────────────────
// Returns the value of a specific field as it was at a given date/time.
// Pass a Date object or ISO string for asOfDate.
// Returns null if no history exists for that field before the given date.

export function getFieldAsOf(centerId, fieldKey, asOfDate) {
  const cutoff  = new Date(asOfDate).getTime();
  const all     = _load();
  const entries = (all[centerId] || []).filter(e => e.fieldKey === fieldKey);

  // entries are newest-first; find the last one that was committed ON OR BEFORE asOfDate
  const match = entries.find(e => new Date(e.ts).getTime() <= cutoff);
  return match ? match.newValue : null;
}

// ─── public: clearChangeLog ───────────────────────────────────────────────────
// Admin / test utility — clears all log entries for a center.

export function clearChangeLog(centerId) {
  const all = _load();
  delete all[centerId];
  _save(all);
}
