import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { PLAN, pickIcon, ICONS } from '../lib/plan';

function iconSvg(key) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[key] || ICONS.dumbbell }} />
  );
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('training');
  const [phase, setPhase] = useState(1);
  const [dayIndex, setDayIndex] = useState(0);
  const [status, setStatus] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setChecking(false);
      if (!data.session) router.replace('/login');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) router.replace('/login');
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  function flash(msg) { setStatus(msg); setTimeout(() => setStatus((s) => (s === msg ? '' : s)), 1200); }

  if (checking || !session) return <div className="wrap"><p>Lädt…</p></div>;

  return (
    <div className="wrap">
      <h1>Trainingsnotizen</h1>
      <p className="subtitle">FitX · 102 → 80 kg</p>

      <div className="main-tabs">
        <button className={`main-tab ${tab === 'training' ? 'active' : ''}`} onClick={() => setTab('training')}>Training</button>
        <button className={`main-tab ${tab === 'verlauf' ? 'active' : ''}`} onClick={() => setTab('verlauf')}>Verlauf</button>
        <button className={`main-tab ${tab === 'einstellungen' ? 'active' : ''}`} onClick={() => setTab('einstellungen')}>Einstellungen</button>
      </div>

      {tab === 'training' && (
        <TrainingTab
          userId={session.user.id}
          phase={phase} setPhase={setPhase}
          dayIndex={dayIndex} setDayIndex={setDayIndex}
          flash={flash}
        />
      )}
      {tab === 'verlauf' && <VerlaufTab userId={session.user.id} />}
      {tab === 'einstellungen' && <EinstellungenTab userId={session.user.id} flash={flash} />}

      <div className="status" style={{ textAlign: 'center', marginTop: 10 }}>{status}</div>
    </div>
  );
}

/* ---------------- Training Tab ---------------- */
function TrainingTab({ userId, phase, setPhase, dayIndex, setDayIndex, flash }) {
  const [row, setRow] = useState(null); // today's workout_logs row for this phase/day
  const [photos, setPhotos] = useState({}); // item_index -> photo_url
  const [dayDoneMap, setDayDoneMap] = useState({});
  const [trainingStart, setTrainingStart] = useState(null); // Date.now() when "Start" pressed
  const [elapsedSec, setElapsedSec] = useState(0);
  const day = PLAN[phase][dayIndex];

  useEffect(() => {
    if (!trainingStart) return;
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - trainingStart) / 1000)), 1000);
    return () => clearInterval(id);
  }, [trainingStart]);

  function startTraining() {
    setTrainingStart(Date.now());
    setElapsedSec(0);
  }

  const loadRow = useCallback(async () => {
    const date = todayStr();
    const { data } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId).eq('date', date).eq('phase', phase).eq('day_index', dayIndex)
      .maybeSingle();
    if (data) setRow(data);
    else setRow({ items: day.items.map((text) => ({ text, checked: false, weight: '' })), calories: null });
  }, [userId, phase, dayIndex, day.items]);

  const loadPhotos = useCallback(async () => {
    const { data } = await supabase.from('exercise_photos').select('item_index, photo_url')
      .eq('user_id', userId).eq('phase', phase).eq('day_index', dayIndex);
    const map = {};
    (data || []).forEach((p) => { map[p.item_index] = p.photo_url; });
    setPhotos(map);
  }, [userId, phase, dayIndex]);

  const loadDoneMap = useCallback(async () => {
    const date = todayStr();
    const { data } = await supabase.from('workout_logs').select('day_index, items')
      .eq('user_id', userId).eq('date', date).eq('phase', phase);
    const map = {};
    (data || []).forEach((r) => {
      const total = PLAN[phase][r.day_index].items.length;
      const done = r.items.filter((it) => it.checked).length;
      map[r.day_index] = total > 0 && done === total;
    });
    setDayDoneMap(map);
  }, [userId, phase]);

  useEffect(() => { loadRow(); loadPhotos(); loadDoneMap(); }, [loadRow, loadPhotos, loadDoneMap]);

  async function saveRow(newItems) {
    const total = day.items.length;
    const done = newItems.filter((it) => it.checked).length;
    const complete = total > 0 && done === total;
    const calories = complete ? Math.round(day.metaMET * 90 * (day.duration / 60)) : null; // fallback weight 90 if profile missing

    const { data: profile } = await supabase.from('profiles').select('weight').eq('id', userId).maybeSingle();
    const bodyWeight = profile?.weight || 90;
    const realCalories = complete ? Math.round(day.metaMET * bodyWeight * (day.duration / 60)) : null;

    const payload = {
      user_id: userId, date: todayStr(), phase, day_index: dayIndex,
      title: day.title, items: newItems, calories: realCalories,
    };
    const { data, error } = await supabase.from('workout_logs')
      .upsert(payload, { onConflict: 'user_id,date,phase,day_index' })
      .select().single();
    if (!error) { setRow(data); flash('Gespeichert'); loadDoneMap(); }
    else flash('Fehler beim Speichern');
  }

  function toggleItem(i) {
    const newItems = row.items.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it);
    setRow({ ...row, items: newItems });
    saveRow(newItems);
  }

  function changeWeight(i, val) {
    const newItems = row.items.map((it, idx) => idx === i ? { ...it, weight: val, checked: val.trim() !== '' } : it);
    setRow({ ...row, items: newItems });
    saveRow(newItems);
  }

  async function resetDay() {
    await supabase.from('workout_logs').delete()
      .eq('user_id', userId).eq('date', todayStr()).eq('phase', phase).eq('day_index', dayIndex);
    setTrainingStart(null); setElapsedSec(0);
    loadRow(); loadDoneMap();
  }

  async function finishTraining() {
    const total = day.items.length;
    const done = row.items.filter((it) => it.checked).length;
    const completionRatio = total > 0 ? done / total : 0;

    // Use real elapsed time if the timer was running, otherwise fall back to the plan's default duration.
    const minutesUsed = trainingStart ? Math.max(1, Math.round(elapsedSec / 60)) : day.duration;

    const { data: profile } = await supabase.from('profiles').select('weight').eq('id', userId).maybeSingle();
    const bodyWeight = profile?.weight || 90;

    // Full-session calories for the time spent, scaled down a bit if a lot of exercises were skipped.
    const scaleFactor = done === 0 ? 0 : Math.max(completionRatio, 0.6); // still count it even if 1-2 exercises missing
    const calories = Math.round(day.metaMET * bodyWeight * (minutesUsed / 60) * scaleFactor);

    const payload = {
      user_id: userId, date: todayStr(), phase, day_index: dayIndex,
      title: day.title, items: row.items, calories,
    };
    const { data, error } = await supabase.from('workout_logs')
      .upsert(payload, { onConflict: 'user_id,date,phase,day_index' })
      .select().single();

    if (!error) {
      setRow(data);
      flash(`Training gespeichert · ${calories} kcal · ${minutesUsed} Min.`);
      setTrainingStart(null); setElapsedSec(0);
      loadDoneMap();
    } else {
      flash('Fehler beim Speichern');
    }
  }

  async function uploadPhoto(i, file) {
    const path = `${userId}/p${phase}d${dayIndex}i${i}-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from('exercise-photos').upload(path, file, { upsert: true });
    if (upErr) { flash('Foto-Upload fehlgeschlagen'); return; }
    const { data: pub } = supabase.storage.from('exercise-photos').getPublicUrl(path);
    await supabase.from('exercise_photos').upsert(
      { user_id: userId, phase, day_index: dayIndex, item_index: i, photo_url: pub.publicUrl },
      { onConflict: 'user_id,phase,day_index,item_index' }
    );
    loadPhotos();
    flash('Foto gespeichert');
  }

  if (!row) return null;
  const total = day.items.length;
  const done = row.items.filter((it) => it.checked).length;
  const showWeightUI = dayIndex !== 6;

  return (
    <>
      <div className="phase-toggle">
        <button className={`phase-btn ${phase === 1 ? 'active-p1' : ''}`} onClick={() => { setPhase(1); setDayIndex(0); }}>Phase 1 · Maschinen</button>
        <button className={`phase-btn ${phase === 2 ? 'active-p2' : ''}`} onClick={() => { setPhase(2); setDayIndex(0); }}>Phase 2 · Hanteln</button>
      </div>

      <div className="day-tabs">
        {PLAN[phase].map((d, idx) => (
          <button key={idx} className={`day-tab ${idx === dayIndex ? 'active' : ''} ${dayDoneMap[idx] ? 'done' : ''}`} onClick={() => setDayIndex(idx)}>
            Tag {idx + 1}<span className="dot" />
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">{day.title}</h2>
          <span className="progress-label">{done} / {total}</span>
        </div>
        <div className="progress-track"><div className="progress-fill" style={{ width: total ? `${(done / total) * 100}%` : '0%' }} /></div>

        <ul className="items">
          {day.items.map((text, i) => {
            const it = row.items[i] || { checked: false, weight: '' };
            const iconKey = pickIcon(text);
            const photoUrl = photos[i];
            return (
              <li key={i} className={`item ${it.checked ? 'checked' : ''}`}>
                <div className="item-top" onClick={() => toggleItem(i)}>
                  <span className="checkbox">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  <span className="icon-box">{photoUrl ? <img src={photoUrl} alt="Foto" /> : iconSvg(iconKey)}</span>
                  <span className="item-text">{text}</span>
                </div>
                {showWeightUI && (
                  <div className="item-bottom">
                    <div className="weight-field">
                      <input type="number" step="0.5" placeholder="kg" value={it.weight || ''}
                        onChange={(e) => changeWeight(i, e.target.value)} onClick={(e) => e.stopPropagation()} />
                      <span>diese Woche</span>
                    </div>
                    <label className="camera-btn">
                      📷 Foto
                      <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                        onChange={(e) => { const f = e.target.files[0]; if (f) uploadPhoto(i, f); }} />
                    </label>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="cardio-line">{day.cardio}</div>

        <div className="timer-box">
          {trainingStart ? (
            <>
              <div className="timer-display">{String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:{String(elapsedSec % 60).padStart(2, '0')}</div>
              <button className="finish-btn" onClick={finishTraining}>✅ Training beenden &amp; speichern</button>
            </>
          ) : (
            <>
              <button className="start-btn" onClick={startTraining}>▶️ Training starten</button>
              <button className="finish-btn-outline" onClick={finishTraining}>✅ Training für heute abschließen</button>
            </>
          )}
          <p className="field-note" style={{ marginTop: 8 }}>
            &quot;Training beenden&quot; speichert auch, wenn ein paar Übungen fehlen — die Kalorien werden trotzdem berechnet.
          </p>
        </div>

        <div className="footer-row">
          <button className="reset-btn" onClick={resetDay}>Diesen Tag zurücksetzen</button>
        </div>
      </div>
    </>
  );
}

/* ---------------- Verlauf Tab ---------------- */
function VerlaufTab({ userId }) {
  const [weekCal, setWeekCal] = useState(0);
  const [weekDays, setWeekDays] = useState(0);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [historyDates, setHistoryDates] = useState({}); // date -> array of rows
  const [selectedDate, setSelectedDate] = useState(null);
  const [weightByDate, setWeightByDate] = useState({});
  const [weightLog, setWeightLog] = useState([]);

  useEffect(() => {
    (async () => {
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6);
      const cutoffStr = cutoff.toISOString().slice(0, 10);
      const { data: recent } = await supabase.from('workout_logs').select('calories')
        .eq('user_id', userId).gte('date', cutoffStr).not('calories', 'is', null);
      setWeekCal((recent || []).reduce((s, r) => s + (r.calories || 0), 0));
      setWeekDays((recent || []).length);

      const monthStart = new Date(calYear, calMonth, 1).toISOString().slice(0, 10);
      const monthEnd = new Date(calYear, calMonth + 1, 0).toISOString().slice(0, 10);
      const { data: monthRows } = await supabase.from('workout_logs').select('*')
        .eq('user_id', userId).gte('date', monthStart).lte('date', monthEnd);
      const grouped = {};
      (monthRows || []).forEach((r) => { grouped[r.date] = grouped[r.date] || []; grouped[r.date].push(r); });
      setHistoryDates(grouped);

      const { data: wlog } = await supabase.from('weight_logs').select('*').eq('user_id', userId).order('date');
      setWeightLog(wlog || []);
      const wmap = {}; (wlog || []).forEach((w) => { wmap[w.date] = w; });
      setWeightByDate(wmap);
    })();
  }, [userId, calYear, calMonth]);

  const monthNames = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const firstDay = new Date(calYear, calMonth, 1);
  let startOffset = firstDay.getDay() - 1; if (startOffset < 0) startOffset = 6;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const todayIso = todayStr();

  function shiftMonth(delta) {
    let m = calMonth + delta, y = calYear;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setCalMonth(m); setCalYear(y);
  }

  const sortedWeights = [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
  let chartSvg = null;
  if (sortedWeights.length >= 2) {
    const values = sortedWeights.map((w) => parseFloat(w.weight)).filter((v) => !isNaN(v));
    const min = Math.min(...values) - 1, max = Math.max(...values) + 1;
    const W = 320, H = 120, padL = 8, padR = 8, padT = 10, padB = 10;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const pts = sortedWeights.map((w, i) => {
      const x = padL + (innerW * i) / (sortedWeights.length - 1);
      const v = parseFloat(w.weight);
      const y = padT + innerH - ((v - min) / (max - min)) * innerH;
      return { x, y };
    });
    const linePath = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
    chartSvg = (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 120 }}>
        <path d={linePath} fill="none" stroke="#c1622d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#c1622d" />)}
      </svg>
    );
  }

  return (
    <>
      <div className="v-summary">
        <div className="stat-box"><div className="big">{weekCal}</div><div className="lbl">kcal · 7 Tage</div></div>
        <div className="stat-box"><div className="big">{weekDays}</div><div className="lbl">Trainingstage · 7 Tage</div></div>
      </div>

      <div className="cal-nav">
        <button onClick={() => shiftMonth(-1)}>←</button>
        <span className="cal-title">{monthNames[calMonth]} {calYear}</span>
        <button onClick={() => shiftMonth(1)}>→</button>
      </div>
      <div className="cal-grid">
        {['Mo','Di','Mi','Do','Fr','Sa','So'].map((d) => <div key={d} className="cal-dow">{d}</div>)}
        {Array.from({ length: startOffset }).map((_, i) => <div key={'e' + i} className="cal-day empty" />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const hasEntry = !!historyDates[dateStr];
          return (
            <div key={dateStr}
              className={`cal-day ${hasEntry ? 'has-entry' : ''} ${dateStr === todayIso ? 'today' : ''} ${dateStr === selectedDate ? 'selected' : ''}`}
              onClick={() => setSelectedDate(dateStr)}>
              {d}{hasEntry && <span className="cal-dot" />}
            </div>
          );
        })}
      </div>

      <div className="day-detail">
        {selectedDate ? (
          <>
            <h3>{selectedDate}</h3>
            {weightByDate[selectedDate] && (
              <p className="kcal-line" style={{ color: 'var(--ink-soft)' }}>
                Gewicht: {weightByDate[selectedDate].weight} kg{weightByDate[selectedDate].height ? ` · ${weightByDate[selectedDate].height} cm` : ''}
              </p>
            )}
            {(historyDates[selectedDate] || []).length === 0 ? (
              <p className="empty-note">Kein Training an diesem Tag protokolliert.</p>
            ) : (
              historyDates[selectedDate].map((entry) => (
                <div className="entry-block" key={entry.id}>
                  <div className="entry-title">{entry.title}</div>
                  <ul>
                    {entry.items.map((it, idx) => (
                      <li key={idx} className={it.checked ? 'done' : ''}>
                        <span>{it.checked ? '✓ ' : '— '}{it.text}</span>
                        <span>{it.weight ? it.weight + ' kg' : ''}</span>
                      </li>
                    ))}
                  </ul>
                  {entry.calories && <div className="kcal-line">{entry.calories} kcal geschätzt</div>}
                </div>
              ))
            )}
          </>
        ) : (
          <>
            <h3>Tag auswählen</h3>
            <p className="empty-note">Tippe im Kalender auf ein Datum, um das Training dieses Tages zu sehen.</p>
          </>
        )}
      </div>

      <div className="chart-card">
        <h3>Gewichtsverlauf</h3>
        {chartSvg || <p className="weight-empty-note">Noch nicht genug Einträge für ein Diagramm. Trage dein Gewicht ein paarmal unter &quot;Einstellungen&quot; ein.</p>}
        <ul className="weight-log-list">
          {[...sortedWeights].reverse().map((w) => (
            <li key={w.date}><span>{w.date}</span><span>{w.weight} kg{w.height ? ` · ${w.height} cm` : ''}</span></li>
          ))}
        </ul>
      </div>
    </>
  );
}

/* ---------------- Einstellungen Tab ---------------- */
function EinstellungenTab({ userId, flash }) {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (data) { setWeight(data.weight || ''); setHeight(data.height || ''); }
    })();
  }, [userId]);

  async function save(newWeight, newHeight) {
    await supabase.from('profiles').upsert({ id: userId, weight: newWeight || null, height: newHeight || null, updated_at: new Date().toISOString() });
    if ((newWeight && newWeight.toString().trim() !== '') || (newHeight && newHeight.toString().trim() !== '')) {
      await supabase.from('weight_logs').upsert(
        { user_id: userId, date: todayStr(), weight: newWeight || null, height: newHeight || null },
        { onConflict: 'user_id,date' }
      );
    }
    flash('Gespeichert');
  }

  const bmi = (parseFloat(weight) > 0 && parseFloat(height) > 0)
    ? (parseFloat(weight) / ((parseFloat(height) / 100) ** 2)).toFixed(1) : null;

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <>
      <div className="settings-card">
        <h3>Persönliche Daten</h3>
        <div className="field-row">
          <label>Gewicht (kg)</label>
          <input type="number" step="0.1" value={weight}
            onChange={(e) => { setWeight(e.target.value); save(e.target.value, height); }} placeholder="z. B. 102" />
        </div>
        <div className="field-row">
          <label>Größe (cm)</label>
          <input type="number" value={height}
            onChange={(e) => { setHeight(e.target.value); save(weight, e.target.value); }} placeholder="z. B. 178" />
        </div>
        {bmi && <p className="field-note">BMI: {bmi}</p>}
        <p className="field-note">Wird für die Kalorienschätzung genutzt. Jede Änderung wird mit Datum gespeichert, damit du deinen Gewichtstrend siehst.</p>
      </div>
      <button className="logout-btn" onClick={logout}>Abmelden</button>
    </>
  );
}
