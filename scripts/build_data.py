"""
build_data.py - build-time data pipeline for "Every Receipt Remembers".

Reads the three raw hackathon CSVs and emits small, pre-aggregated static JSON
into src/data/. Runs ONCE before `npm run dev` / `npm run build`; nothing here
executes in the browser, so the shipped app stays 100% frontend-only.

    python scripts/build_data.py

Inputs (relative to the repo root, in the sibling Data/ folder):
    ../Data/extracted/a1/Daily Household Transactions.csv          -> the money diary (2015-2018)
    ../Data/extracted/a3/spotify_history.csv                       -> the soundtrack (filtered to the same window)
    ../Data/extracted/a2/Augmented_IndiaTransactMultiFacet2024.csv -> noisy; only used for a "places" garnish

Outputs:
    src/data/transactions.json  every ledger line, normalised
    src/data/tracks.json        track dictionary  [[track, artist, album], ...]  (index = track id)
    src/data/listens.json       compact listens   [[minuteSinceEpoch0, trackId, seconds, skipped], ...]
    src/data/daily.json         one row per day: spend / income / listening minutes / top artist
    src/data/threads.json       auto-detected cross-dataset patterns (the "insight engine")
    src/data/chapters.json      the narrative eras that make up Act IV
    src/data/meta.json          totals + window bounds
"""
from __future__ import annotations

import json
from datetime import timedelta
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT.parent / "Data" / "extracted"
OUT = ROOT / "src" / "data"
OUT.mkdir(parents=True, exist_ok=True)

IST = timedelta(hours=5, minutes=30)  # Spotify ts is UTC; the ledger is an Indian household


# ---------------------------------------------------------------- helpers
def dump(name: str, obj) -> None:
    path = OUT / name
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"  wrote {name:20s} {path.stat().st_size/1024:8.1f} KB")


def iso(ts: pd.Timestamp) -> str:
    return ts.strftime("%Y-%m-%dT%H:%M:%S")


def day(ts: pd.Timestamp) -> str:
    return ts.strftime("%Y-%m-%d")


def inr(x: float) -> str:
    x = float(x)
    if x >= 1e5:
        return f"₹{x/1e5:.1f}L"
    if x >= 1e3:
        return f"₹{x/1e3:.1f}k" if x % 1000 else f"₹{int(x/1e3)}k"
    return f"₹{int(round(x))}"


# Coarse category groups so the UI has a manageable set of filter chips.
GROUPS = {
    "Food": "food", "Transportation": "transport", "Household": "home", "maid": "home",
    "Rent": "home", "Cook": "home", "water (jar /tanker)": "home",
    "subscription": "subscriptions", "Health": "health", "Family": "family",
    "Gift": "gifts", "Festivals": "festivals", "Culture": "culture", "Tourism": "travel",
    "Apparel": "style", "Beauty": "style", "Grooming": "style", "Education": "learning",
    "Investment": "investing", "Recurring Deposit": "investing", "Public Provident Fund": "investing",
    "Equity Mutual Fund A": "investing", "Equity Mutual Fund B": "investing", "Equity Mutual Fund C": "investing",
    "Equity Mutual Fund D": "investing", "Equity Mutual Fund E": "investing", "Equity Mutual Fund F": "investing",
    "Small Cap fund 2": "investing", "Small cap fund 1": "investing", "Share Market": "investing",
    "Life Insurance": "investing", "Fixed Deposit": "investing",
    "Salary": "income", "Bonus": "income", "Interest": "income", "Dividend earned on Shares": "income",
    "Maturity amount": "income", "Tax refund": "income", "Gpay Reward": "income", "Amazon pay cashback": "income",
    "Money transfer": "transfers", "Saving Bank account 1": "transfers", "Saving Bank account 2": "transfers",
    "Petty cash": "income", "Other": "other", "scrap": "income", "Documents": "other",
}


# ---------------------------------------------------------------- 1. ledger
print("1. ledger")
t = pd.read_csv(DATA / "a1" / "Daily Household Transactions.csv")
t["when"] = pd.to_datetime(t["Date"], dayfirst=True, format="mixed")
t["has_time"] = t["Date"].str.len() > 10
t = t.sort_values("when").reset_index(drop=True)
t["Note"] = t["Note"].fillna("").astype(str).str.strip()
t["Subcategory"] = t["Subcategory"].fillna("").astype(str).str.strip()
t["group"] = t["Category"].map(GROUPS).fillna("other")
t["kind"] = t["Income/Expense"].map({"Expense": "expense", "Income": "income", "Transfer-Out": "transfer"})

WIN_START, WIN_END = t.when.min().normalize(), t.when.max().normalize()
print(f"   window {WIN_START.date()} .. {WIN_END.date()}, {len(t)} rows")

transactions = []
for i, r in t.iterrows():
    transactions.append({
        "id": f"t{i}",
        "ts": iso(r.when),
        "d": day(r.when),
        "h": int(r.when.hour) if r.has_time else None,
        "mode": r.Mode,
        "cat": r.Category,
        "sub": r.Subcategory,
        "note": r.Note,
        "amt": round(float(r.Amount), 2),
        "kind": r.kind,
        "g": r.group,
    })
dump("transactions.json", transactions)


# ---------------------------------------------------------------- 2. listens
print("2. listens")
s = pd.read_csv(DATA / "a3" / "spotify_history.csv", encoding="utf-8-sig")
s["ts"] = pd.to_datetime(s["ts"]) + IST
s = s[(s.ts >= WIN_START) & (s.ts < WIN_END + timedelta(days=1))].copy()
raw = s.copy()                                 # keep everything for the "couldn't finish" detector
s = s[s.ms_played >= 30_000].copy()           # drop <30 s blips (accidental taps / skips)
s = s.sort_values("ts").reset_index(drop=True)
s["track_name"] = s["track_name"].fillna("Unknown").astype(str)
s["artist_name"] = s["artist_name"].fillna("Unknown").astype(str)
s["album_name"] = s["album_name"].fillna("").astype(str)
s["skipped"] = s["skipped"].astype(str).str.upper().eq("TRUE")
print(f"   {len(s)} listens in window, {s.ms_played.sum()/3.6e6:.0f} hours")

track_ids: dict[tuple, int] = {}
tracks = []
for name, artist, album in zip(s.track_name, s.artist_name, s.album_name):
    key = (name, artist)
    if key not in track_ids:
        track_ids[key] = len(tracks)
        tracks.append([name, artist, album])
s["tid"] = [track_ids[(n, a)] for n, a in zip(s.track_name, s.artist_name)]
epoch0 = WIN_START
s["m"] = ((s.ts - epoch0).dt.total_seconds() // 60).astype(int)
listens = [[int(m), int(tid), int(ms // 1000), int(sk)] for m, tid, ms, sk in zip(s.m, s.tid, s.ms_played, s.skipped)]
dump("tracks.json", tracks)
dump("listens.json", listens)


# ---------------------------------------------------------------- 3. daily
print("3. daily")
t["d"] = t.when.dt.normalize()
s["d"] = s.ts.dt.normalize()
days = pd.date_range(WIN_START, WIN_END, freq="D")
spend = t[t.kind == "expense"].groupby("d").Amount.sum()
income = t[t.kind == "income"].groupby("d").Amount.sum()
txc = t.groupby("d").size()
lmin = s.groupby("d").ms_played.sum() / 60000
plays = s.groupby("d").size()
top_artist = s.groupby("d").artist_name.agg(lambda x: x.value_counts().index[0])
top_cat = t[t.kind == "expense"].groupby("d").apply(lambda g: g.groupby("group").Amount.sum().idxmax())
daily = []
for d in days:
    daily.append({
        "d": day(d),
        "spend": round(float(spend.get(d, 0)), 0),
        "income": round(float(income.get(d, 0)), 0),
        "tx": int(txc.get(d, 0)),
        "min": round(float(lmin.get(d, 0)), 0),
        "plays": int(plays.get(d, 0)),
        "artist": top_artist.get(d, None),
        "cat": top_cat.get(d, None),
    })
dump("daily.json", daily)


# ---------------------------------------------------------------- 4. threads (the insight engine)
print("4. threads")
threads = []


def tx_ids(mask) -> list[str]:
    return [f"t{i}" for i in t[mask].index]


def ids_of(df) -> list[str]:
    return [f"t{i}" for i in df.index]


def listens_between(a, b):
    return s[(s.ts >= a) & (s.ts < b)]


def top_track(df, n=1):
    if df.empty:
        return []
    c = df.groupby(["track_name", "artist_name"]).size().sort_values(ascending=False).head(n)
    return [{"track": k[0], "artist": k[1], "plays": int(v)} for k, v in c.items()]


def top_artists(df, n=3):
    if df.empty:
        return []
    c = (df.groupby("artist_name").ms_played.sum() / 60000).sort_values(ascending=False).head(n)
    return [{"artist": k, "min": int(v)} for k, v in c.items()]


def month_plays(y, m):
    a = pd.Timestamp(year=y, month=m, day=1)
    return int(len(listens_between(a, a + pd.offsets.MonthBegin(1))))


# 4a. Payday pattern - what happens in the 72h after "From workplace" lands
sal = t[(t.Category == "Salary")]
after, before = [], []
for _, r in sal.iterrows():
    w_after = t[(t.when > r.when) & (t.when <= r.when + timedelta(hours=72)) & (t.kind == "expense")]
    w_before = t[(t.when < r.when) & (t.when >= r.when - timedelta(hours=72)) & (t.kind == "expense")]
    after.append(w_after.Amount.sum()); before.append(w_before.Amount.sum())
after_avg, before_avg = float(np.mean(after)), float(np.mean(before))
threads.append({
    "id": "payday",
    "kind": "money",
    "icon": "\U0001F4B8",
    "title": "The Payday Pulse",
    "subtitle": f"{len(sal)} salaries · avg {inr(sal.Amount.mean())}",
    "stat": f"{after_avg/before_avg:.1f}×",
    "statLabel": "more spent in the 72h after payday than the 72h before",
    "caption": (
        f"Every month, on the last working day, {inr(sal.Amount.mean())} arrives with the note "
        f"\"From workplace\". In the three days that follow, spending runs {after_avg/before_avg:.1f}× hotter "
        f"than the three days before. The month has a heartbeat, and it beats on the 31st."
    ),
    "evidence": ids_of(sal)[:6],
    "range": [day(sal.when.min()), day(sal.when.max())],
    "series": [{"d": day(r.when), "v": float(r.Amount)} for _, r in sal.iterrows()],
})

# 4b. The wedding silence - near-zero listening around the Jan 2016 wedding gift
wed = t[t.Note.str.contains("wedding", case=False)]
w0 = wed.when.iloc[0]
silent_start, silent_end = pd.Timestamp("2016-01-01"), pd.Timestamp("2016-05-31")
silent_plays = len(listens_between(silent_start, silent_end + timedelta(days=1)))
prev_plays = len(listens_between(pd.Timestamp("2015-08-01"), pd.Timestamp("2015-11-01")))
threads.append({
    "id": "wedding-silence",
    "kind": "silence",
    "icon": "\U0001F90D",
    "title": "The Wedding Silence",
    "subtitle": "Jan – May 2016",
    "stat": str(silent_plays),
    "statLabel": f"songs played in five months (vs {prev_plays} the previous autumn)",
    "caption": (
        f"On {w0.day} {w0.strftime('%B %Y')} a single line appears: \"wedding gift\", {inr(wed.Amount.iloc[0])}. "
        f"Then Spotify goes silent — " + ("not a single song" if silent_plays == 0 else f"{silent_plays} plays") + " between January and May. "
        "Some chapters of a life are too loud for headphones."
    ),
    "evidence": ids_of(wed),
    "range": [day(silent_start), day(silent_end)],
    "series": [{"d": f"{y}-{m:02d}-01", "v": month_plays(y, m)} for y, m in [(2015, 8), (2015, 9), (2015, 10), (2015, 11), (2015, 12), (2016, 1), (2016, 2), (2016, 3), (2016, 4), (2016, 5), (2016, 6), (2016, 7), (2016, 8)]],
})

# 4c. The song on repeat - the most-played track inside any rolling 90-day window
best = (0, None, None)
for (name, artist), g in s.groupby(["track_name", "artist_name"]):
    ms = sorted(g.m.tolist()); j = 0
    for i in range(len(ms)):
        while ms[i] - ms[j] > 90 * 1440:
            j += 1
        if i - j + 1 > best[0]:
            best = (i - j + 1, (name, artist), (ms[j], ms[i]))
lcount, (ltrack, lartist), (m0, m1) = best
lm_start = epoch0 + timedelta(minutes=m0)
lm_end = epoch0 + timedelta(minutes=m1)
lm_tx = t[(t.when >= lm_start) & (t.when <= lm_end) & (t.kind == "expense")]
loop_days = s[(s.track_name == ltrack) & (s.m >= m0) & (s.m <= m1)].groupby(s.ts.dt.normalize()).size()
threads.append({
    "id": "on-repeat",
    "kind": "music",
    "icon": "🔁",
    "title": "The Song On Repeat",
    "subtitle": f"{lm_start.strftime('%b')} – {lm_end.strftime('%b %Y')}",
    "stat": f"{lcount}×",
    "statLabel": f"\"{ltrack}\" — {lartist}, inside {(m1-m0)//1440} days",
    "caption": (
        f"Between {lm_start.strftime('%d %B').lstrip('0')} and {lm_end.strftime('%d %B %Y').lstrip('0')} one song was played {lcount} times: "
        f"\"{ltrack}\" by {lartist}. In those same weeks the ledger shows {len(lm_tx)} expenses, mostly "
        f"{', '.join(lm_tx.groupby('group').Amount.sum().sort_values(ascending=False).head(3).index)}. "
        "A year after the wedding, the soundtrack picked itself."
    ),
    "evidence": ids_of(lm_tx.nlargest(4, "Amount")),
    "range": [day(lm_start), day(lm_end)],
    "series": [{"d": day(d), "v": int(v)} for d, v in loop_days.items()],
})

# 4c2. The song they couldn't finish - most starts that ended within a second (from the unfiltered log)
zero = raw[raw.ms_played < 1000]
zc = zero.groupby(["track_name", "artist_name"]).size().sort_values(ascending=False)
(ztrack, zartist), zcount = zc.index[0], int(zc.iloc[0])
zrows = raw[(raw.track_name == ztrack) & (raw.artist_name == zartist)]
zmonth = zrows.groupby(zrows.ts.dt.to_period("M")).size().sort_values(ascending=False)
zm = zmonth.index[0]
zfull = int((zrows.ms_played >= 30_000).sum())
zm_start = zm.to_timestamp(); zm_end = zm_start + pd.offsets.MonthBegin(1)
zm_tx = t[(t.when >= zm_start) & (t.when < zm_end) & (t.kind == "expense")]
threads.append({
    "id": "couldnt-finish",
    "kind": "music",
    "icon": "⏹️",
    "title": "The Song They Couldn't Finish",
    "subtitle": zm.strftime("%B %Y"),
    "stat": f"{int(zmonth.iloc[0])}×",
    "statLabel": f"\"{ztrack.split(' - ')[0]}\" — {zartist}: pressed play, stopped within a second",
    "caption": (
        f"In {zm.strftime('%B %Y')} someone pressed play on \"{ztrack.split(' - ')[0]}\" by {zartist} "
        f"{int(zmonth.iloc[0])} times — and stopped it almost immediately, almost every time. "
        f"Only {zfull} plays ever reached the end. It was Diwali month; the ledger shows rangoli stamps, an Aakash kandil, offerings. "
        "A glitch, or a title that hit too close to home? The data doesn't say. That is the honest answer."
    ),
    "evidence": ids_of(zm_tx[zm_tx.group == "festivals"])[:6] or ids_of(zm_tx.nlargest(3, "Amount")),
    "range": [day(zm_start), day(zm_end - timedelta(days=1))],
    "series": [{"d": day(d), "v": int(v)} for d, v in zrows[zrows.ts.dt.to_period("M") == zm].groupby(zrows.ts.dt.normalize()).size().items()],
})

# 4d. 3AM club - listening between midnight and 4am IST
night = s[(s.ts.dt.hour >= 0) & (s.ts.dt.hour < 4)]
night_share = len(night) / len(s)
night_tx = t[t.has_time & (t.when.dt.hour < 4)].sort_values("when")
last_night = (night_tx.Note.iloc[-1] or night_tx.Subcategory.iloc[-1]) if len(night_tx) else ""
threads.append({
    "id": "3am-club",
    "kind": "night",
    "icon": "\U0001F319",
    "title": "The 3 AM Club",
    "subtitle": "midnight – 4 AM",
    "stat": f"{night_share*100:.0f}%",
    "statLabel": f"of all listening happened between midnight and 4 AM ({len(night):,} plays)",
    "caption": (
        f"{len(night):,} songs were played between midnight and four in the morning — "
        f"{night_share*100:.0f}% of everything. The most common night-time artist was "
        f"{night.artist_name.value_counts().index[0]}. The ledger has only {len(night_tx)} receipts from those hours"
        + (f" — the last one: \"{last_night}\"." if last_night else ".")
        + " Money sleeps. Music doesn't."
    ),
    "evidence": ids_of(night_tx)[-6:],
    "range": [day(WIN_START), day(WIN_END)],
    "series": [{"d": str(int(h)), "v": int(v)} for h, v in s.groupby(s.ts.dt.hour).size().items()],
    "artists": top_artists(night, 4),
})

# 4e. Sending money home - the monthly 10k streak
home = t[(t.Category == "Money transfer") & (t.Amount >= 10000)].sort_values("when")
months = sorted(set(home.when.dt.to_period("M")))
streak, best, prev = 0, 0, None
for m in months:
    streak = streak + 1 if prev is not None and (m - prev).n == 1 else 1
    best = max(best, streak); prev = m
threads.append({
    "id": "money-home",
    "kind": "money",
    "icon": "\U0001F3E0",
    "title": "Money Goes Home",
    "subtitle": f"{home.when.min().strftime('%b %Y')} → {home.when.max().strftime('%b %Y')}",
    "stat": f"{best} months",
    "statLabel": f"longest unbroken streak of transfers home · {inr(home.Amount.sum())} total",
    "caption": (
        f"Starting {home.when.min().strftime('%B %Y')}, on the 1st of almost every month, a transfer marked "
        f"\"Home\" leaves the account. {len(home)} transfers, {inr(home.Amount.sum())} in total, the longest run "
        f"{best} months without a miss. Nobody writes a note on these. Nobody needs to."
    ),
    "evidence": ids_of(home)[:8],
    "range": [day(home.when.min()), day(home.when.max())],
    "series": [{"d": day(r.when), "v": float(r.Amount)} for _, r in home.iterrows()],
})

# 4f. The hospital summer - health cluster of Jul-Sep 2017 + trip + listening spike
h_start, h_end = pd.Timestamp("2017-07-20"), pd.Timestamp("2017-09-30")
h_tx = t[(t.when >= h_start) & (t.when <= h_end) & (t.group == "health")]
trip = t[(t.when >= h_start - timedelta(days=30)) & (t.when <= h_end) & (t.group == "travel")]
h_listen = listens_between(h_start, h_end + timedelta(days=1))
loud = s.groupby(s.ts.dt.to_period("M")).size().sort_values(ascending=False)
loud_m, sep_plays = loud.index[0], int(loud.iloc[0])
threads.append({
    "id": "hospital-summer",
    "kind": "health",
    "icon": "\U0001FA7A",
    "title": "The Hospital Summer",
    "subtitle": "Jul – Sep 2017",
    "stat": inr(h_tx.Amount.sum()),
    "statLabel": f"on {len(h_tx)} medical receipts, next to a {inr(trip.Amount.sum())} trip",
    "caption": (
        f"Between late July and September 2017 the ledger fills with hospital consultations, \"Medical tests - Family\", "
        f"Vicks, Strepsils, Meftal — {len(h_tx)} health receipts, {inr(h_tx.Amount.sum())}. Right beside them: "
        f"\"Tours and Travel\", {inr(trip.Amount.sum())}. And {loud_m.strftime('%B %Y')} became the loudest month of the whole "
        f"story — {sep_plays:,} songs, mostly {top_artists(h_listen,1)[0]['artist']}. When the body is tired, the ears stay awake."
    ),
    "evidence": ids_of(h_tx.nlargest(5, "Amount")) + ids_of(trip)[:2],
    "range": [day(h_start), day(h_end)],
    "series": [{"d": day(d), "v": float(v)} for d, v in h_tx.groupby("d").Amount.sum().items()],
    "artists": top_artists(h_listen, 3),
    "tracks": top_track(h_listen, 3),
})

# 4g. Festival season - Diwali/Ganesh/Rakshabandhan receipts + the music around them
fest = t[t.group == "festivals"]
fest_days = sorted(set(fest.d))
fest_listen = pd.concat([listens_between(d - timedelta(days=3), d + timedelta(days=4)) for d in fest_days]) if fest_days else s.iloc[0:0]
threads.append({
    "id": "festivals",
    "kind": "family",
    "icon": "\U0001FA94",
    "title": "Diwali, Every Year",
    "subtitle": f"{len(fest)} festival receipts",
    "stat": str(len(set(fest.Subcategory))),
    "statLabel": "festivals: " + ", ".join(sorted(set(fest.Subcategory))),
    "caption": (
        "Firecrackers, an Aakash kandil, rangoli stamps, a Ganesh idol every August, ovalni at Rakshabandhan. "
        f"The festival receipts are tiny — {inr(fest.Amount.median())} on a typical line — but they arrive on schedule "
        "every year like a calendar written in rupees. Around those days the playlist leans towards "
        f"{fest_listen.artist_name.value_counts().index[0] if len(fest_listen) else 'silence'}."
    ),
    "evidence": ids_of(fest)[:8],
    "range": [day(fest.when.min()), day(fest.when.max())],
    "series": [{"d": day(r.when), "v": float(r.Amount), "label": r.Subcategory} for _, r in fest.iterrows()],
})

# 4h. Two tickets - every movie is for two, after the wedding
mov = t[(t.Subcategory == "Movie")]
two = mov[mov.Note.str.contains("2", na=False)]
threads.append({
    "id": "two-tickets",
    "kind": "family",
    "icon": "\U0001F39F️",
    "title": "Always Two Tickets",
    "subtitle": f"{len(mov)} cinema trips",
    "stat": f"{len(two)}/{len(mov)}",
    "statLabel": "movie receipts explicitly say \"2 tickets\" — all of them after the wedding",
    "caption": (
        f"Before 2016 there is one \"monument\" ticket for ₹40. After the wedding, every cinema receipt reads "
        f"\"2 tickets\" — IMAX 3D, Cinepolis 4DX, PVR, INOX. {len(two)} out of {len(mov)}. "
        "You never buy one ticket again."
    ),
    "evidence": ids_of(mov),
    "range": [day(mov.when.min()), day(mov.when.max())],
    "series": [{"d": day(r.when), "v": float(r.Amount), "label": r.Note} for _, r in mov.iterrows()],
})

# 4i. The parent thread - "Aai", glasses, cataract, thyroid
parent = t[t.Note.str.contains("Aai|Family's Glasses|Cataract|Thyroid|Medical tests - Family|eyewear", case=False, regex=True)]
threads.append({
    "id": "for-aai",
    "kind": "family",
    "icon": "\U0001F453",
    "title": "For Aai",
    "subtitle": f"{parent.when.min().strftime('%b %Y')} → {parent.when.max().strftime('%b %Y')}",
    "stat": inr(parent.Amount.sum()),
    "statLabel": f"across {len(parent)} receipts for someone else's eyes, thyroid and phone",
    "caption": (
        "A Nokia 215 \"for Aai\" in December 2016. \"Family's Glasses\", ₹22,700, the next November. "
        "Thyroid tests every few months through 2018. Then, in July 2018, three lines in a row: \"Cataract Medicine\". "
        f"{inr(parent.Amount.sum())} in total. None of it was for the person holding the receipts."
    ),
    "evidence": ids_of(parent),
    "range": [day(parent.when.min()), day(parent.when.max())],
    "series": [{"d": day(r.when), "v": float(r.Amount), "label": r.Note} for _, r in parent.iterrows()],
})

dump("threads.json", threads)


# ---------------------------------------------------------------- 5. chapters (Act IV)
print("5. chapters")
CHAPTERS = [
    ("2015-01-01", "2015-12-31", "The Root Canal Year", "A new ledger, a dentist's chair, a Kindle for Diwali.",
     "The story starts with painkillers and a root canal in March. Salary arrives like clockwork. Spotify barely exists yet — a summer of Justin Bieber and Hozier, then Sinatra. The last receipt of the year is a secret-Santa diary."),
    ("2016-01-01", "2016-06-30", "The Silence", "A wedding gift. Five months with almost no music.",
     "One line on 13 January: \"wedding gift\", ₹45,000. The soundtrack stops. Salary keeps coming, LIC premiums begin, the first \"Family exam form\" appears in June. Some months you don't need a playlist."),
    ("2016-07-01", "2017-02-28", "New Roof, New Job", "Pocket money, a 32-inch TV, a phone for Aai, farewells at the office.",
     "Pocket money becomes a monthly line. A Metz TV in November. \"Farewell contribution\" three times in December; salary jumps in January and ₹1,00,000 moves on New Year's Day. Music floods back: The Beatles, Johnny Cash, Led Zeppelin — thousands of plays in December alone."),
    ("2017-03-01", "2017-06-30", "In the Blood", "John Mayer on repeat, two tickets at a time, ₹10,000 home on the 1st.",
     "John Mayer's \"In the Blood\" becomes the most-repeated song of the whole story. Two movie tickets every few weeks — Batman, a 4DX screening. Meanwhile the transfers home settle into a rhythm: ₹10,000, the 1st of every month, without a note."),
    ("2017-07-01", "2017-10-31", "The Hospital Summer", "Tours and Travel, ₹63,000. Hospital consultation, ₹3,050. The loudest September.",
     "A trip is booked in July and August; the hospital visits start the same week. \"Medical tests - Family\". July becomes the loudest month of the whole story. Then Diwali: rangoli, an Aakash kandil, offerings — and one Oasis song, \"Married with Children\", pressed play on 84 times and never finished."),
    ("2017-11-01", "2018-03-31", "Glasses, a Bike, a Course", "₹22,700 for someone's glasses. ₹93,000 for a bike. ₹28,400 to learn something new.",
     "\"Family's Glasses\" in November. An Edtech course renewal at the end of December. A new optimism in January: SIP redemptions, a Bikedelux in three installments. A book in March: \"Finding next Job\"."),
    ("2018-04-01", "2018-09-20", "Cataract Season", "Thyroid tests, cataract medicine, a washing machine, a planetarium ticket.",
     "The receipts get gentler and more frequent — eye drops, All Out refills, a water purifier. In July, three lines of \"Cataract Medicine\". In June, one ticket to a planetarium. The last receipt in the file is idli-vada, two plates, ₹60."),
]
chapters = []
for i, (a, b, title, tagline, body) in enumerate(CHAPTERS):
    a_, b_ = pd.Timestamp(a), pd.Timestamp(b)
    ct = t[(t.when >= a_) & (t.when < b_ + timedelta(days=1))]
    cs = listens_between(a_, b_ + timedelta(days=1))
    exp = ct[ct.kind == "expense"]
    big = exp.nlargest(3, "Amount")
    chapters.append({
        "n": i + 1,
        "title": title,
        "tagline": tagline,
        "body": body,
        "range": [a, b],
        "spend": float(exp.Amount.sum()),
        "income": float(ct[ct.kind == "income"].Amount.sum()),
        "receipts": int(len(ct)),
        "plays": int(len(cs)),
        "hours": round(float(cs.ms_played.sum() / 3.6e6), 1),
        "topCats": [{"g": g, "amt": float(v)} for g, v in exp.groupby("group").Amount.sum().sort_values(ascending=False).head(4).items()],
        "artists": top_artists(cs, 3),
        "track": top_track(cs, 1)[0] if len(cs) else None,
        "biggest": [{"id": f"t{j}", "note": (r.Note or r.Subcategory or r.Category), "amt": float(r.Amount), "d": day(r.when)} for j, r in big.iterrows()],
        "threads": [th["id"] for th in threads if not (th["range"][1] < a or th["range"][0] > b)],
    })
dump("chapters.json", chapters)


# ---------------------------------------------------------------- 6. places garnish from the noisy dataset
print("6. places (garnish)")
try:
    p = pd.read_csv(DATA / "a2" / "Augmented_IndiaTransactMultiFacet2024.csv", low_memory=False)
    p = p.dropna(subset=["city", "category", "amt"])
    p = p[p["is_fraud"].fillna(0) == 0]
    places = (p.groupby(["city", "category"]).size().reset_index(name="n")
                .sort_values("n", ascending=False).head(40))
    dump("places.json", [{"city": r.city, "cat": r.category, "n": int(r.n)} for _, r in places.iterrows()])
except Exception as e:  # garnish only - never block the build
    print("   skipped places:", e)
    dump("places.json", [])


# ---------------------------------------------------------------- 7. meta
meta = {
    "window": [day(WIN_START), day(WIN_END)],
    "epoch0": day(epoch0),
    "receipts": int(len(t)),
    "listens": int(len(listens)),
    "rawListens": 149860,
    "hours": round(float(s.ms_played.sum() / 3.6e6)),
    "spend": float(t[t.kind == "expense"].Amount.sum()),
    "income": float(t[t.kind == "income"].Amount.sum()),
    "tracks": len(tracks),
    "artists": int(s.artist_name.nunique()),
    "groups": sorted(set(t.group)),
}
dump("meta.json", meta)
print("done.")
