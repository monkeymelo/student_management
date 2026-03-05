import test from 'node:test';
import assert from 'node:assert/strict';

import { getDateByWeekday, getResetWeekStartForToday, getWeekStartMonday } from '../../frontend/week_utils.mjs';

test('周一基准日期与 weekday 映射正确', () => {
  const weekStart = getWeekStartMonday(new Date('2026-03-05T12:00:00'));
  assert.equal(getDateByWeekday(weekStart, 1), '2026-03-02');
  assert.equal(getDateByWeekday(weekStart, 7), '2026-03-08');
});

test('“今天”按钮对应的重置逻辑会回到当前周周一', () => {
  const reset = getResetWeekStartForToday(new Date('2026-03-05T09:00:00'));
  assert.equal(reset.getDay(), 1);
  assert.equal(reset.toISOString().slice(0, 10), '2026-03-02');
});
