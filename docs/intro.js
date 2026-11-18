// 소개 페이지: 보기 전환 데모를 그리고, 스크롤하면 요소가 나타나게 한다.
const CAT = {
  sermon: ['#FFE9E7', '#B3000F'], worship: ['#E5F0FF', '#004A9F'], dept: ['#E3F4E8', '#1B6B34'],
  visit: ['#FFF1DF', '#8A4500'], personal: ['#F1ECFB', '#5A3EA8'],
};
const chip = (cat, text) => `<span class="chip" style="--bg:${CAT[cat][0]};--fg:${CAT[cat][1]}">${text}</span>`;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const TODAY = 18; // 2026년 11월 18일(수) 예시

// 2026년 11월 예시 일정 { 날짜: [[분류, 제목], ...] }
const EV = {
  1: [['worship', '주일 예배']], 3: [['dept', '임원 회의']], 6: [['visit', '점심 미팅']],
  8: [['worship', '주일 예배'], ['dept', '찬양 연습']], 11: [['personal', '치과']],
  13: [['visit', '심방'], ['dept', '새벽 기도']],
  15: [['sermon', '설교 준비'], ['worship', '주일 예배'], ['dept', '교사 모임'], ['visit', '식사'], ['personal', '운동']],
  16: [['visit', '미팅']], 18: [['dept', '수요 기도회']], 20: [['worship', '금요 기도회']],
  21: [['dept', '청년부 모임']], 22: [['worship', '주일 예배']], 25: [['dept', '임원 회의']],
  27: [['personal', '가족 모임']], 29: [['worship', '주일 예배']],
};

const dowClass = (i) => (i === 0 ? 'red' : i === 6 ? 'blue' : '');

function month() {
  let h = '<div class="m-grid">' + DOW.map((d, i) => `<span class="dow ${dowClass(i)}">${d}</span>`).join('');
  for (let i = 0; i < 35; i++) {
    const day = i + 1; // 2026-11-01 은 일요일
    if (day > 30) { h += '<div class="m-cell"></div>'; continue; }
    const list = EV[day] || [];
    h += `<div class="m-cell"><span class="num ${dowClass(i % 7)} ${day === TODAY ? 'today' : ''}">${day}</span>`;
    h += list.slice(0, 3).map(([c, t]) => chip(c, t)).join('');
    if (list.length > 3) h += `<span class="more">+ 외 ${list.length - 3}개</span>`;
    h += '</div>';
  }
  return h + '</div>';
}

function year() {
  let h = '<div class="y-grid">';
  for (let m = 1; m <= 12; m++) {
    const first = new Date(2026, m - 1, 1).getDay();
    const last = new Date(2026, m, 0).getDate();
    h += `<div class="y-m"><b>${m}월</b><div class="y-d">`;
    for (let i = 0; i < first; i++) h += '<span></span>';
    for (let d = 1; d <= last; d++) {
      const has = m === 11 ? !!EV[d] : (d * 7 + m * 3) % 11 === 0;
      h += `<span class="${has ? 'has' : ''} ${dowClass((first + d - 1) % 7)} ${m === 11 && d === TODAY ? 'today' : ''}">${d}</span>`;
    }
    h += '</div></div>';
  }
  return h + '</div>';
}

function week() {
  let h = '<div class="w-grid">';
  for (let i = 0; i < 7; i++) {
    const day = 15 + i;
    const list = EV[day] || [];
    h += `<div class="w-col ${day === TODAY ? 'today-col' : ''}"><div class="h">${DOW[i]}<b class="${dowClass(i)}">${day}</b></div>`;
    h += list.map(([c, t]) => chip(c, t)).join('') + '</div>';
  }
  return h + '</div>';
}

// 보기마다 상단 제목 표기가 다르다: 연간 2026. / 월간 작은 2026. + 큰 11 / 주간 큰 11/15 - 21 + 작은 2026
const TITLES = { year: ['', '2026.', ''], month: ['2026.', '11', ''], week: ['', '11/15 - 21', '2026'] };
const panes = {};
document.querySelectorAll('.pane').forEach((p) => (panes[p.dataset.pane] = p));
panes.year.innerHTML = year();
panes.month.innerHTML = month();
panes.week.innerHTML = week();

const winLead = document.getElementById('win-lead');
const winTitle = document.getElementById('win-title');
const winSub = document.getElementById('win-sub');
const tabs = [...document.querySelectorAll('.seg button')];
function show(view) {
  tabs.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.view === view)));
  for (const [k, p] of Object.entries(panes)) p.hidden = k !== view;
  [winLead.textContent, winTitle.textContent, winSub.textContent] = TITLES[view];
}
tabs.forEach((b) => b.addEventListener('click', () => show(b.dataset.view)));

// 스크롤하면 나타남
const io = new IntersectionObserver(
  (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
  { threshold: 0.18 },
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
