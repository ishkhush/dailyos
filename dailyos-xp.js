(function(root) {
  const values = { habit: 20, importantHabit: 30, goal: 25, prayer: 30, water: 5, supplement: 10, workout: 40, learned: 15 };
  const requirement = level => 120 + (level - 1) * 30;
  function progress(total) {
    let level = 1, current = Math.max(0, total);
    while (current >= requirement(level)) current -= requirement(level++);
    return { total, level, current, required: requirement(level) };
  }
  function awards(data) {
    const result = {};
    const add = (kind, date, id, amount = values[kind]) => { result[JSON.stringify([kind,date,String(id)])] = amount; };
    Object.entries(data.habitChecked || {}).forEach(([date, marks]) => Object.entries(marks).forEach(([id, done]) => {
      if (done) {
        const habit = [...(data.habits || []), ...(data.planner?.[date]?.habits || [])].find(h => String(h.id) === id);
        add('habit', date, id, habit?.important ? values.importantHabit : values.habit);
      }
    }));
    [['prayer',data.prayerChecked],['supplement',data.suppChecked],['workout',data.attend]].forEach(([kind, days]) => {
      Object.entries(days || {}).forEach(([date, marks]) => Object.entries(marks).forEach(([id, done]) => { if (done) add(kind,date,id); }));
    });
    (data.urgent || []).forEach(r => {
      Object.entries(r.completedDates || {}).forEach(([date, done]) => { if (done) add('goal',date,r.id); });
      if (r.done && !Object.keys(r.completedDates || {}).length) add('goal',r.startDate || 'legacy',r.id);
    });
    const waterDays = { ...(data.water?.days || {}) };
    if (data.water?.date && waterDays[data.water.date] === undefined) waterDays[data.water.date] = data.water.count;
    Object.entries(waterDays).forEach(([date, count]) => { for (let i = 1; i <= Math.min(100, Math.max(0, Number(count) || 0)); i++) add('water',date,i); });
    (data.learned || []).forEach(w => add('learned', w.learnedDate || w.date || 'legacy', w.word || w.id || w));
    return result;
  }
  root.DailyXP = { values, requirement, progress, awards };
  if (typeof module !== 'undefined') module.exports = root.DailyXP;
})(typeof window !== 'undefined' ? window : globalThis);
