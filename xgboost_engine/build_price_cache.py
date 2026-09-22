"""
╔══════════════════════════════════════════════════════════════════════════════╗
║         BUILD LOCAL BINANCE BTC/USDT 1H PRICE CACHE (2017-2024)            ║
║                                                                              ║
║  Downloads all historical hourly BTC/USDT klines from Binance's public     ║
║  data portal (no API key, no rate limits, completely free).                 ║
║                                                                              ║
║  Source: https://data.binance.vision/data/spot/monthly/klines/BTCUSDT/1h/  ║
║  Coverage: 2017-08 to present (~84 months, ~60,000 hourly rows)             ║
║  Download size: ~8 MB total (compressed), ~50 MB uncompressed               ║
║                                                                              ║
║  Output: xgboost_engine/data/btc_1h_price_cache.parquet                    ║
║           (fast columnar format, loads in <1 second)                        ║
║                                                                              ║
║  Run once:                                                                   ║
║    python xgboost_engine/build_price_cache.py                               ║
╚══════════════════════════════════════════════════════════════════════════════╝
"""

import os
import io
import zipfile
import requests
import pandas as pd
from datetime import datetime, timezone

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(BASE_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

CACHE_PATH    = os.path.join(DATA_DIR, "btc_1h_price_cache.parquet")
CACHE_CSV     = os.path.join(DATA_DIR, "btc_1h_price_cache.csv")     # backup
BASE_URL      = "https://data.binance.vision/data/spot/monthly/klines/BTCUSDT/1h"

# Months to download (August 2017 = first full month BTC traded on Binance)
START_YEAR, START_MONTH = 2017, 8
END_YEAR,   END_MONTH   = datetime.now(timezone.utc).year, datetime.now(timezone.utc).month

KLINE_COLS = [
    "open_time", "open", "high", "low", "close", "volume",
    "close_time", "quote_volume", "trade_count",
    "taker_buy_volume", "taker_buy_quote_volume", "ignore"
]


def iter_months(start_y, start_m, end_y, end_m):
    y, m = start_y, start_m
    while (y, m) <= (end_y, end_m):
        yield y, m
        m += 1
        if m > 12:
            m = 1
            y += 1


def download_month(year: int, month: int) -> pd.DataFrame | None:
    fname = f"BTCUSDT-1h-{year}-{month:02d}.zip"
    url   = f"{BASE_URL}/{fname}"
    try:
        resp = requests.get(url, timeout=30)
        if resp.status_code == 404:
            return None   # month not available yet
        resp.raise_for_status()

        with zipfile.ZipFile(io.BytesIO(resp.content)) as z:
            csv_name = z.namelist()[0]
            with z.open(csv_name) as f:
                df = pd.read_csv(f, header=None, names=KLINE_COLS)

        # Keep only needed columns
        df = df[["open_time", "open", "close"]].copy()
        df["open_time"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)
        df["open"]      = df["open"].astype(float)
        df["close"]     = df["close"].astype(float)
        return df

    except Exception as e:
        print(f"  Error downloading {year}-{month:02d}: {e}")
        return None


def build_price_cache():
    print("=" * 70)
    print("BUILDING BTC/USDT 1H PRICE CACHE FROM BINANCE DATA PORTAL")
    print("=" * 70)
    print(f"Coverage: {START_YEAR}-{START_MONTH:02d} to present")
    print(f"Output  : {CACHE_PATH}")
    print()

    frames = []
    months = list(iter_months(START_YEAR, START_MONTH, END_YEAR, END_MONTH))
    total  = len(months)

    for i, (y, m) in enumerate(months):
        label = f"{y}-{m:02d}"
        print(f"  [{i+1:3d}/{total}] Downloading {label}...", end=" ", flush=True)
        df = download_month(y, m)
        if df is not None:
            frames.append(df)
            print(f"{len(df):,} rows")
        else:
            print("not available (skipped)")

    if not frames:
        print("\nERROR: No data downloaded. Check internet connection.")
        return

    # ── Merge all months ──────────────────────────────────────────────────────
    full = pd.concat(frames, ignore_index=True)
    full = full.drop_duplicates(subset="open_time").sort_values("open_time").reset_index(drop=True)
    full = full.rename(columns={"open_time": "dt", "open": "price_open", "close": "price_close"})

    print(f"\nTotal rows: {len(full):,}")
    print(f"Date range: {full['dt'].min()} → {full['dt'].max()}")
    print(f"Price range: ${full['price_open'].min():,.0f} — ${full['price_open'].max():,.0f}")

    # ── Save as Parquet (fast) + CSV (backup) ─────────────────────────────────
    try:
        full.to_parquet(CACHE_PATH, index=False)
        print(f"\nSaved Parquet: {CACHE_PATH}  ({os.path.getsize(CACHE_PATH)/1024:.0f} KB)")
    except Exception:
        print("  Parquet save failed (pyarrow not installed) — saving CSV instead")

    full.to_csv(CACHE_CSV, index=False)
    print(f"Saved CSV   : {CACHE_CSV}  ({os.path.getsize(CACHE_CSV)//1024:.0f} KB)")
    print("\nDone. Run build_historic_dataset.py next.")
    print("=" * 70)


if __name__ == "__main__":
    build_price_cache()
