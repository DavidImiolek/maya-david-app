import { test } from 'node:test'
import assert from 'node:assert/strict'
import { expandEvent, buildRule, parseRule, dateKey } from './recurrence.js'

const nov = (d, h = 0, m = 0) => new Date(2026, 10, d, h, m) // November 2026

test('Regel bauen und lesen', () => {
  const r = buildRule({ freq: 'WEEKLY', byday: [4, 2], until: '2027-03-31' })
  assert.equal(r, 'FREQ=WEEKLY;BYDAY=TU,TH;UNTIL=20270331')
  assert.deepEqual(parseRule(r), { freq: 'WEEKLY', byday: [2, 4], until: '2027-03-31' })
  assert.equal(buildRule({ freq: 'NONE' }), null)
})

test('jeden Dienstag 18-19:30 im November', () => {
  const ev = { start_at: nov(3, 18).toISOString(), end_at: nov(3, 19, 30).toISOString(), all_day: false, recurrence_rule: 'FREQ=WEEKLY;BYDAY=TU' }
  const occ = expandEvent(ev, nov(1), new Date(2026, 11, 1))
  assert.deepEqual(occ.map((o) => o.datum), ['2026-11-03', '2026-11-10', '2026-11-17', '2026-11-24'])
  assert.equal(occ[1].start.getHours(), 18)
  assert.equal(occ[1].end.getMinutes(), 30)
})

test('Ausnahme und Enddatum', () => {
  const ev = { start_at: nov(3, 18).toISOString(), end_at: nov(3, 19).toISOString(), all_day: false, recurrence_rule: 'FREQ=WEEKLY;BYDAY=TU;UNTIL=20261117' }
  const occ = expandEvent(ev, nov(1), new Date(2026, 11, 1), new Set(['2026-11-10']))
  assert.deepEqual(occ.map((o) => o.datum), ['2026-11-03', '2026-11-17'])
})

test('Serie beginnt nicht vor ihrem Startdatum', () => {
  const ev = { start_at: nov(12, 9).toISOString(), end_at: nov(12, 10).toISOString(), all_day: false, recurrence_rule: 'FREQ=DAILY' }
  const occ = expandEvent(ev, nov(9), nov(16))
  assert.deepEqual(occ.map((o) => o.datum), ['2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'])
})

test('Open End läuft bis Mitternacht', () => {
  const ev = { start_at: nov(4, 20).toISOString(), end_at: null, all_day: false, recurrence_rule: null }
  const [o] = expandEvent(ev, nov(1), new Date(2026, 11, 1))
  assert.equal(dateKey(o.end), '2026-11-05')
  assert.equal(o.end.getHours(), 0)
})

test('Ganztägig über Zeitumstellung, monatlich', () => {
  const ev = { start_at: new Date(2026, 9, 25).toISOString(), end_at: new Date(2026, 9, 26).toISOString(), all_day: true, recurrence_rule: 'FREQ=MONTHLY' }
  const occ = expandEvent(ev, nov(1), new Date(2027, 1, 1))
  assert.deepEqual(occ.map((o) => o.datum), ['2026-11-25', '2026-12-25', '2027-01-25'])
  assert.equal(dateKey(occ[0].end), '2026-11-26')
})

test('mehrtägiger Termin aus dem Vormonat ragt hinein', () => {
  const ev = { start_at: new Date(2026, 9, 30).toISOString(), end_at: nov(3).toISOString(), all_day: true, recurrence_rule: null }
  assert.equal(expandEvent(ev, nov(1), nov(8)).length, 1)
})
