import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { PLAN, pickIcon, ICONS } from '../lib/plan';

function iconSvg(key) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: ICONS[key] || ICONS.dumbbell }} />
  );
}
function todayStr() { return new Date().toISOString().slice(0, 10); }
function formatDateTime(d) {
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/* Reusable minimal line chart (weight, duration, per-exercise weight all use this) */
function LineChart({ points, color = '#c1622d' }) {
  if (!points || points.length < 2) {
    return <p className="weight-empty-note">Noch nicht genug Einträge für ein Diagramm.</p>;
  }
  const values = points.map((p) => p.value);
  const min = Math.min(...values) - 1, max = Math.max(...values) + 1;
  const W = 320, H = 110, pad = 10;
  const innerW = W - pad * 2, innerH = H - pad * 2;
  const pts = points.map((p, i) => ({
    x: pad + (innerW * i) / (points.length - 1),
    y: pad + innerH - ((p.value - min) / (max - min || 1)) * innerH,
  }));
  const linePath = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ',' + p.y.toFixed(1)).join(' ');
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 110 }}>
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />)}
      </svg>
      <div className="chart-meta">
        <span>{points[0].date}: {points[0].value}</span>
        <span>{points[points.length - 1].date}: {points[points.length - 1].value}</span>
      </div>
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('training');
  const [profile, setProfile] = useState(null);
  const [todayRow, setTodayRow] = useState(undefined); // undefined=loading, null=none found, object=finished today
  const [forceTraining, setForceTraining] = useState(false);
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

  const loadProfile = useCallback(async (userId) => {
    let { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!data) {
      const { data: created } = await supabase.from('profiles')
        .upsert({ id: userId, current_phase: 1, current_day_index: 0 }).select().single();
      data = created;
    }
    setProfile(data);
  }, []);

  const loadTodayRow = useCallback(async (userId) => {
    const { data } = await supabase.from('workout_logs').select('*')
      .eq('user_id', userId).eq('date', todayStr()).not('calories', 'is', null)
      .order('id', { ascending: false }).limit(1).maybeSingle();
    setTodayRow(data || null);
  }, []);

  useEffect(() => {
    if (session) { loadProfile(session.user.id); loadTodayRow(session.user.id); }
  }, [session, loadProfile, loadTodayRow]);

  function flash(msg) { setStatus(msg); setTimeout(() => setStatus((s) => (s === msg ? '' : s)), 1200); }

  function handleFinished(updatedProfile, savedRow) {
    setProfile(updatedProfile);
    setTodayRow(savedRow);
    setForceTraining(false);
  }

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

      {tab === 'training' && profile && (
        todayRow && !forceTraining ? (
          <SummaryView row={todayRow} onEditAnother={() => setForceTraining(true)} />
        ) : (
          <TrainingTab
            userId={session.user.id}
            profile={profile}
            flash={flash}
            onFinished={handleFinished}
          />
        )
      )}
      {tab === 'verlauf' && <VerlaufTab userId={session.user.id} />}
      {tab === 'einstellungen' && <EinstellungenTab userId={session.user.id} flash={flash} />}

      <div className="status" style={{ textAlign: 'center', marginTop: 10 }}>{status}</div>
    </div>
  );
}

/* ---------------- Summary (shown once today's training is finished) ---------------- */
function SummaryView({ row, onEditAnother }) {
  const total = row.items.length;
  const done = row.items.filter((it) => it.checked).length;
  return (
    <div className="card summary-card">
      <h2 className="card-title">Heute erledigt ✅</h2>
      <p className="summary-sub">{row.title}</p>
      <div className="summary-stats">
        <div className="summary-stat"><div className="big">{row.calories || 0}</div><div className="lbl">kcal</div></div>
        <div className="summary-stat"><div className="big">{row.duration_minutes ?? '–'}</div><div className="lbl">Minuten</div></div>
        <div className="summary-stat"><div className="big">{done}/{total}</div><div className="lbl">Übungen</div></div>
      </div>
      <ul className="items">
        {row.items.map((it, i) => (
          <li key={i} className={`item summary-item ${it.checked ? 'checked' : ''}`}>
            <span className="item-text">{it.checked ? '✓' : '—'} {it.text}</span>
            {it.weight && <span className="summary-weight">{it.weight} kg</span>}
          </li>
        ))}
      </ul>
      <button className="reset-btn" onClick={onEditAnother}>Anderen Tag trainieren / nachtragen</button>
    </div>
  );
}

/* ---------------- Training Tab ---------------- */
function TrainingTab({ userId, profile, flash, onFinished }) {
  const [phase, setPhase] = useState(profile.current_phase || 1);
  const [dayIndex, setDayIndex] = useState(profile.current_day_index || 0);
  const [row, setRow] = useState(null);
  const [photos, setPhotos] = useState({});
  const [trainingStart, setTrainingStart] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [now, setNow] = useState(new Date());
  const day = PLAN[phase][dayIndex];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!trainingStart) return;
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - trainingStart) / 1000)), 1000);
    return () => clearInterval(id);
  }, [trainingStart]);

  const loadRow = useCallback(async () => {
    const { data } = await supabase.from('workout_logs').select('*')
      .eq('user_id', userId).eq('date', todayStr()).eq('phase', phase).eq('day_index', dayIndex)
      .maybeSingle();
    if (data) setRow(data);
    else setRow({ items: day.items.map((text) => ({ text, checked: false, weight: '' })), calories: null, duration_minutes: null });
  }, [userId, phase, dayIndex, day.items]);

  const loadPhotos = useCallback(async () => {
    const { data } = await supabase.from('exercise_photos').select('item_index, photo_url')
      .eq('user_id', userId).eq('phase', phase).eq('day_index', dayIndex);
    const map = {};
    (data || []).forEach((p) => { map[p.item_index] = p.photo_url; });
    setPhotos(map);
  }, [userId, phase, dayIndex]);

  useEffect(() => { loadRow(); loadPhotos(); }, [loadRow, loadPhotos]);

  async function persistItems(newItems) {
    setRow((r) => ({ ...r, items: newItems }));
    const payload = { user_id: userId, date: todayStr(), phase, day_index: dayIndex, title: day.title, items: newItems };
    const { error } = await supabase.from('workout_logs')
      .upsert(payload, { onConflict: 'user_id,date,phase,day_index' });
    if (!error) flash('Gespeichert'); else flash('Fehler beim Speichern');
  }

  function toggleItem(i) {
    const newItems = row.items.map((it, idx) => idx === i ? { ...it, checked: !it.checked } : it);
    persistItems(newItems);
  }
  function changeWeight(i, val) {
    const newItems = row.items.map((it, idx) => idx === i ? { ...it, weight: val, checked: val.trim() !== '' } : it);
    persistItems(newItems);
  }

  async function resetDay() {
    await supabase.from('workout_logs').delete()
      .eq('user_id', userId).eq('date', todayStr()).eq('phase', phase).eq('day_index', dayIndex);
    setTrainingStart(null); setElapsedSec(0);
    loadRow();
  }

  function startTraining() { setTrainingStart(Date.now()); setElapsedSec(0); }

  async function endTraining() {
    const minutesUsed = Math.max(1, Math.round(elapsedSec / 60));
    const total = day.items.length;
    const done = row.items.filter((it) => it.checked).length;
    const scaleFactor = done === 0 ? 0.3 : Math.max(done / total, 0.6); // still credited even if 1-2 exercises missing

    const { data: prof } = await supabase.from('profiles').select('weight').eq('id', userId).maybeSingle();
    const bodyWeight = prof?.weight || 90;
    const calories = Math.round(day.metaMET * bodyWeight * (minutesUsed / 60) * scaleFactor);

    const payload = {
      user_id: userId, date: todayStr(), phase, day_index: dayIndex,
      title: day.title, items: row.items, calories, duration_minutes: minutesUsed,
    };
    const { data: savedRow, error } = await supabase.from('workout_logs')
      .upsert(payload, { onConflict: 'user_id,date,phase,day_index' })
      .select().single();

    if (error) { flash('Fehler beim Speichern'); return; }

    const nextDayIndex = (dayIndex + 1) % 7;
    const { data: updatedProfile } = await supabase.from('profiles')
      .upsert({ id: userId, current_phase: phase, current_day_index: nextDayIndex, last_training_date: todayStr() })
      .select().single();

    setTrainingStart(null); setElapsedSec(0);
    flash(`Gespeichert · ${calories} kcal · ${minutesUsed} Min.`);
    onFinished(updatedProfile, savedRow);
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

  function changeDay(delta) {
    let idx = dayIndex + delta;
    if (idx < 0) idx = 6;
    if (idx > 6) idx = 0;
    setDayIndex(idx);
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

      <div className="day-nav">
        <button className="nav-arrow" onClick={() => changeDay(-1)} aria-label="Vorheriger Tag">‹</button>
        <div className="day-nav-label">
          <span>Tag {dayIndex + 1}</span>
          <span className="day-nav-sub">von 7</span>
        </div>
        <button className="nav-arrow" onClick={() => changeDay(1)} aria-label="Nächster Tag">›</button>
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
                      📷
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
          <div className="timer-date">{formatDateTime(now)}</div>
          {trainingStart ? (
            <>
              <div className="timer-display">{String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:{String(elapsedSec % 60).padStart(2, '0')}</div>
              <button className="timer-btn" onClick={endTraining}>Training beenden</button>
            </>
          ) : (
            <button className="timer-btn" onClick={startTraining}>Training starten</button>
          )}
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
  const [historyDates, setHistoryDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [weightByDate, setWeightByDate] = useState({});
  const [weightLog, setWeightLog] = useState([]);
  const [durationPoints, setDurationPoints] = useState([]);

  const [exPhase, setExPhase] = useState(1);
  const [exSelection, setExSelection] = useState('0-0'); // "dayIndex-itemIndex"
  const [exPoints, setExPoints] = useState([]);

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

      const { data: durRows } = await supabase.from('workout_logs').select('date, duration_minutes')
        .eq('user_id', userId).not('duration_minutes', 'is', null).order('date');
      const seen = {};
      (durRows || []).forEach((r) => { seen[r.date] = r.duration_minutes; }); // one point per date
      setDurationPoints(Object.entries(seen).map(([date, value]) => ({ date, value })));
    })();
  }, [userId, calYear, calMonth]);

  useEffect(() => {
    (async () => {
      const [dIdx, iIdx] = exSelection.split('-').map(Number);
      const { data } = await supabase.from('workout_logs').select('date, items')
        .eq('user_id', userId).eq('phase', exPhase).eq('day_index', dIdx).order('date');
      const pts = (data || [])
        .map((r) => ({ date: r.date, value: parseFloat(r.items?.[iIdx]?.weight) }))
        .filter((p) => !isNaN(p.value));
      setExPoints(pts);
    })();
  }, [userId, exPhase, exSelection]);

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
  const weightPoints = sortedWeights.map((w) => ({ date: w.date, value: parseFloat(w.weight) })).filter((p) => !isNaN(p.value));

  return (
    <>
      <div className="v-summary">
        <div className="stat-box"><div className="big">{weekCal}</div><div className="lbl">kcal · 7 Tage</div></div>
        <div className="stat-box"><div className="big">{weekDays}</div><div className="lbl">Trainingstage · 7 Tage</div></div>
      </div>

      <div className="cal-nav">
        <button onClick={() => shiftMonth(-1)}>‹</button>
        <span className="cal-title">{monthNames[calMonth]} {calYear}</span>
        <button onClick={() => shiftMonth(1)}>›</button>
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
                  <div className="kcal-line">
                    {entry.calories ? `${entry.calories} kcal` : ''}
                    {entry.duration_minutes ? ` · ${entry.duration_minutes} Min.` : ''}
                  </div>
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
        <LineChart points={weightPoints} color="#c1622d" />
        <ul className="weight-log-list">
          {[...sortedWeights].reverse().map((w) => (
            <li key={w.date}><span>{w.date}</span><span>{w.weight} kg{w.height ? ` · ${w.height} cm` : ''}</span></li>
          ))}
        </ul>
      </div>

      <div className="chart-card">
        <h3>Trainingsdauer</h3>
        <LineChart points={durationPoints} color="#2d4a3a" />
      </div>

      <div className="chart-card">
        <h3>Kraftverlauf pro Übung</h3>
        <div className="phase-toggle" style={{ marginBottom: 10 }}>
          <button className={`phase-btn ${exPhase === 1 ? 'active-p1' : ''}`} onClick={() => { setExPhase(1); setExSelection('0-0'); }}>Phase 1</button>
          <button className={`phase-btn ${exPhase === 2 ? 'active-p2' : ''}`} onClick={() => { setExPhase(2); setExSelection('0-0'); }}>Phase 2</button>
        </div>
        <select className="exercise-select" value={exSelection} onChange={(e) => setExSelection(e.target.value)}>
          {PLAN[exPhase].map((d, dIdx) => (
            <optgroup key={dIdx} label={d.title}>
              {d.items.map((text, iIdx) => (
                <option key={iIdx} value={`${dIdx}-${iIdx}`}>{text.split(' – ')[0]}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <LineChart points={exPoints} color="#4b6ea9" />
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
