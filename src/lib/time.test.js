import test from 'node:test';
import assert from 'node:assert/strict';
import { endAfter } from './time.js';

test('종료 시간은 시작 2시간 뒤', () => {
  assert.equal(endAfter('11:00'), '13:00');
  assert.equal(endAfter('09:30'), '11:30');
  assert.equal(endAfter('21:30'), '23:30');
});

test('자정을 넘으면 종료 없음', () => {
  assert.equal(endAfter('22:00'), null);
  assert.equal(endAfter('23:30'), null);
  assert.equal(endAfter(null), null);
});
