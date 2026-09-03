export const ICONS = {
  chest: '<circle cx="12" cy="12" r="3"/><line x1="2" y1="12" x2="9" y2="12"/><line x1="15" y1="12" x2="22" y2="12"/><circle cx="20" cy="12" r="2"/><circle cx="4" cy="12" r="2"/>',
  lat: '<path d="M4 4 L20 4"/><path d="M4 4 L8 20"/><path d="M20 4 L16 20"/><circle cx="12" cy="4" r="1.5"/>',
  row: '<line x1="3" y1="12" x2="15" y2="12"/><polyline points="10 7 15 12 10 17"/><circle cx="20" cy="12" r="2"/>',
  shoulder: '<circle cx="12" cy="6" r="2.5"/><line x1="12" y1="9" x2="12" y2="18"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="6" y1="20" x2="6" y2="12"/><line x1="18" y1="20" x2="18" y2="12"/>',
  leg: '<rect x="3" y="9" width="4" height="10"/><rect x="8" y="6" width="4" height="13"/><rect x="13" y="10" width="4" height="9"/><line x1="18" y1="20" x2="21" y2="20"/><line x1="18" y1="4" x2="18" y2="20"/>',
  curl: '<path d="M4 18 C4 12, 10 12, 10 7"/><circle cx="10" cy="5" r="2.5"/><circle cx="4" cy="19" r="1.5"/>',
  tricep: '<line x1="12" y1="3" x2="12" y2="14"/><polyline points="8 10 12 14 16 10"/><line x1="7" y1="19" x2="17" y2="19"/>',
  calf: '<path d="M6 20 C6 12, 10 12, 10 6"/><polyline points="7 9 10 6 13 9"/><line x1="4" y1="20" x2="14" y2="20"/>',
  ab: '<path d="M5 6 C5 14, 19 14, 19 6"/><line x1="5" y1="6" x2="5" y2="4"/><line x1="19" y1="6" x2="19" y2="4"/>',
  fly: '<circle cx="12" cy="12" r="2.5"/><path d="M12 12 C8 8, 3 8, 2 6"/><path d="M12 12 C16 8, 21 8, 22 6"/>',
  dip: '<line x1="4" y1="6" x2="4" y2="18"/><line x1="20" y1="6" x2="20" y2="18"/><path d="M4 10 C10 16, 14 16, 20 10"/>',
  cardio: '<path d="M20.8 8.6c0 4.4-8.8 9.9-8.8 9.9S3.2 13 3.2 8.6C3.2 5.5 5.6 3 8.6 3c1.7 0 3.2.8 4.2 2.1C13.8 3.8 15.3 3 17 3c3 0 5.4 2.5 5.4 5.6z"/>',
  dumbbell: '<circle cx="4" cy="12" r="2.5"/><circle cx="20" cy="12" r="2.5"/><line x1="6.5" y1="12" x2="17.5" y2="12"/><line x1="9" y1="9" x2="9" y2="15"/><line x1="15" y1="9" x2="15" y2="15"/>'
};

export function pickIcon(text) {
  const t = text.toLowerCase();
  if (t.includes('butterfly') || t.includes('pec') || t.includes('flys') || t.includes('reverse fly')) return 'fly';
  if (t.includes('brust') || t.includes('bankdrücken')) return 'chest';
  if (t.includes('latzug') || t.includes('klimmzug')) return 'lat';
  if (t.includes('rudern') || t.includes('face pull')) return 'row';
  if (t.includes('schulter') || t.includes('military') || t.includes('frontheben') || t.includes('seitheben')) return 'shoulder';
  if (t.includes('dip')) return 'dip';
  if (t.includes('trizeps') || t.includes('kickback')) return 'tricep';
  if (t.includes('bizeps') || t.includes('curl')) return 'curl';
  if (t.includes('wade')) return 'calf';
  if (t.includes('bauch') || t.includes('plank') || t.includes('crunch') || t.includes('twist') || t.includes('leg raise')) return 'ab';
  if (t.includes('bein') || t.includes('kniebeuge') || t.includes('ausfallschritt') || t.includes('kreuzheben') || t.includes('adduktoren') || t.includes('abduktoren')) return 'leg';
  if (t.includes('cardio') || t.includes('stretching') || t.includes('mobility')) return 'cardio';
  return 'dumbbell';
}

export const PLAN = {
  1: [
    { title: "Tag 1 – Push", items: ["Brustpresse (Maschine) – 4×10–12","Schrägbankpresse (Maschine) – 3×12","Schulterdrücken Maschine – 3×12","Seitheben Maschine oder Kabel – 3×15","Trizeps-Seildrücken am Kabelzug – 3×15","Dips-Maschine (assistiert) – 3×12"], cardio: "Cardio-Finisher: 15 Min. Crosstrainer", metaMET: 5.5, duration: 60 },
    { title: "Tag 2 – Pull", items: ["Latzug breit (Maschine) – 4×10–12","Rudern am Kabel (sitzend) – 3×12","Klimmzugmaschine (assistiert) – 3×10","Face Pulls (Kabel) – 3×15","Bizeps-Curls am Kabel/Maschine – 3×12","Hammer-Curls am Kabel – 3×15"], cardio: "Cardio-Finisher: 15 Min. Rudergerät", metaMET: 5.5, duration: 60 },
    { title: "Tag 3 – Beine & Core", items: ["Beinpresse – 4×12","Beinstrecker (Maschine) – 3×15","Beinbeuger (Maschine) – 3×15","Adduktoren-/Abduktoren-Maschine – 2×15","Wadenheben Maschine – 3×20","Plank – 3×45 Sek.","Bauchmaschine oder Cable Crunch – 3×15"], cardio: "Cardio-Finisher: 20 Min. Radfahren (Intervall)", metaMET: 5.7, duration: 65 },
    { title: "Tag 4 – Push (Variation)", items: ["Schrägbankpresse Maschine – 4×12","Butterfly / Pec-Deck – 3×15","Schulterdrücken Maschine (anderer Griff) – 3×12","Frontheben am Kabel – 3×15","Enges Bankdrücken Maschine (Trizeps) – 3×12","Kickbacks Kabel – 3×15"], cardio: "Cardio-Finisher: 15 Min. Stepper", metaMET: 5.5, duration: 60 },
    { title: "Tag 5 – Pull (Variation)", items: ["Rudern eng am Kabel (Maschine) – 4×12","Rudern einarmig am Kabelzug – 3×12/Seite","Latzug eng (Untergriff, Maschine) – 3×12","Reverse Flys Maschine – 3×15","Bizeps-Curls Maschine – 3×12"], cardio: "Cardio-Finisher: 15 Min. Crosstrainer", metaMET: 5.5, duration: 60 },
    { title: "Tag 6 – Ganzkörper + Core", items: ["Beinpresse (leicht, hohe Wdh.) – 3×15","Brustpresse – 3×15","Rudern eng am Kabel – 3×15","Schulterdrücken Maschine – 3×15","Bauch-Zirkel: Maschine, Russian Twists, Plank – 3 Runden"], cardio: "Cardio: 25–30 Min. moderates Tempo", metaMET: 5.7, duration: 65 },
    { title: "Tag 7 – Aktive Erholung", items: ["30–40 Min. lockeres Cardio","Stretching / Mobility 15 Min."], cardio: "Kein Krafttraining – wichtig für Regeneration", metaMET: 3.0, duration: 35 },
  ],
  2: [
    { title: "Tag 1 – Push", items: ["Bankdrücken Lang-/Kurzhantel – 4×10–12","Schrägbankdrücken Kurzhantel – 3×12","Schulterdrücken Kurzhantel – 3×12","Seitheben Kurzhantel – 3×15","Trizeps-Seildrücken am Kabelzug – 3×15","Dips (frei) – 3×12"], cardio: "Cardio-Finisher: 15 Min. Crosstrainer", metaMET: 5.8, duration: 60 },
    { title: "Tag 2 – Pull", items: ["Latzug breit – 4×10–12","Rudern vorgebeugt Lang-/Kurzhantel – 3×12","Klimmzüge (frei/unterstützt) – 3×10","Face Pulls (Kabel) – 3×15","Bizeps-Curls Lang-/Kurzhantel – 3×12","Hammer-Curls Kurzhantel – 3×15"], cardio: "Cardio-Finisher: 15 Min. Rudergerät", metaMET: 5.8, duration: 60 },
    { title: "Tag 3 – Beine & Core", items: ["Kniebeugen (Langhantel/Goblet) – 4×12","Ausfallschritte Kurzhanteln – 3×12/Bein","Rumänisches Kreuzheben Kurzhantel – 3×12","Wadenheben mit Kurzhantel – 3×20","Plank – 3×45 Sek.","Hanging Leg Raises/Crunches – 3×15"], cardio: "Cardio-Finisher: 20 Min. Radfahren (Intervall)", metaMET: 6.0, duration: 65 },
    { title: "Tag 4 – Push (Variation)", items: ["Schrägbankdrücken Kurzhantel – 4×12","Kurzhantel-Flys – 3×15","Military Press Kurz-/Langhantel – 3×12","Frontheben Kurzhantel – 3×15","Enges Bankdrücken Langhantel – 3×12","Kurzhantel-Kickbacks – 3×15"], cardio: "Cardio-Finisher: 15 Min. Stepper", metaMET: 5.8, duration: 60 },
    { title: "Tag 5 – Pull (Variation)", items: ["T-Bar/Langhantelrudern eng – 4×12","Einarmiges Kurzhantelrudern – 3×12/Seite","Latzug eng (Untergriff) – 3×12","Reverse Flys Kurzhantel – 3×15","Konzentrationscurls Kurzhantel – 3×12"], cardio: "Cardio-Finisher: 15 Min. Crosstrainer", metaMET: 5.8, duration: 60 },
    { title: "Tag 6 – Ganzkörper + Core", items: ["Kurzhantel Goblet Squats – 3×15","Push-Ups – 3×max","Rudern eng am Kabel – 3×15","Schulterdrücken Kurzhantel – 3×15","Bauch-Zirkel: Crunches, Russian Twists, Plank – 3 Runden"], cardio: "Cardio: 25–30 Min. moderates Tempo", metaMET: 6.0, duration: 65 },
    { title: "Tag 7 – Aktive Erholung", items: ["30–40 Min. lockeres Cardio","Stretching / Mobility 15 Min."], cardio: "Kein Krafttraining – wichtig für Regeneration", metaMET: 3.0, duration: 35 },
  ]
};
