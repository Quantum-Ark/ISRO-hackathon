import os
import json
import math


# Try to load pandas/astropy for FITS support
try:
    import pandas as pd
    from astropy.io import fits
    PANDAS_ASTROPY_OK = True
except ImportError:
    PANDAS_ASTROPY_OK = False

# ==========================================
# 1. FITS-based Ingestion (Pandas/Astropy)
# ==========================================
def load_helios_fits(filepath):
    if not PANDAS_ASTROPY_OK:
        raise RuntimeError("Astropy/Pandas not loaded.")
    with fits.open(filepath) as hdul:
        data = hdul['LIGHTCURVE'].data
        return pd.DataFrame({
            'time': data['TIME'],
            'hard_15_25': data['RATE_15_25keV'],
            'hard_25_50': data['RATE_25_50keV'],
            'hard_50_100': data['RATE_50_100keV']
        })

def load_solexs_fits(filepath):
    if not PANDAS_ASTROPY_OK:
        raise RuntimeError("Astropy/Pandas not loaded.")
    with fits.open(filepath) as hdul:
        data = hdul['SPECTRUM'].data
        df = pd.DataFrame({
            'time': data['TIME'],
            'channel': data['CHANNEL'],
            'counts': data['COUNTS']
        })
    grouped = df.groupby('time')['counts'].sum().reset_index()
    grouped['soft_flux'] = grouped['counts'] * 1.5e-8
    return grouped[['time', 'soft_flux']]

def align_telemetry_fits(solexs_df, helios_df):
    solexs_df = solexs_df.copy()
    helios_df = helios_df.copy()
    solexs_df['time'] = solexs_df['time'].round().astype(int)
    helios_df['time'] = helios_df['time'].round().astype(int)
    
    solexs_df = solexs_df.drop_duplicates(subset=['time'])
    helios_df = helios_df.drop_duplicates(subset=['time'])
    
    t_min = min(solexs_df['time'].min(), helios_df['time'].min())
    t_max = max(solexs_df['time'].max(), helios_df['time'].max())
    
    grid = pd.DataFrame({'time': range(t_min, t_max + 1)})
    grid = pd.merge(grid, helios_df, on='time', how='left')
    grid['hard_15_25'] = grid['hard_15_25'].interpolate(limit=5)
    grid['hard_25_50'] = grid['hard_25_50'].interpolate(limit=5)
    grid['hard_50_100'] = grid['hard_50_100'].interpolate(limit=5)
    
    grid = pd.merge(grid, solexs_df, on='time', how='left')
    grid['soft_flux_ffill'] = grid['soft_flux'].ffill(limit=70)
    grid['data_gap'] = grid['soft_flux_ffill'].isna() | grid['hard_25_50'].isna()
    
    grid = grid.dropna(subset=['soft_flux_ffill', 'hard_25_50']).copy()
    grid = grid.rename(columns={'soft_flux_ffill': 'soft_flux'})
    return grid.to_dict('records')

# ==========================================
# 2. Pure-Python JSON Ingestion (Zero-Dependency)
# ==========================================
def load_helios_json(filepath):
    if not os.path.exists(filepath):
        # Fallback to .fits filename mapping if JSON filepath needs correction
        filepath = filepath.replace(".fits", ".json")
    with open(filepath, 'r') as f:
        data = json.load(f)
    records = []
    for r in data:
        records.append({
            'time': int(round(r['TIME'])),
            'hard_15_25': float(r['RATE_15_25keV']),
            'hard_25_50': float(r['RATE_25_50keV']),
            'hard_50_100': float(r['RATE_50_100keV'])
        })
    return records

def load_solexs_json(filepath):
    if not os.path.exists(filepath):
        filepath = filepath.replace(".fits", ".json")
    with open(filepath, 'r') as f:
        data = json.load(f)
        
    # Aggregate counts by time
    time_counts = {}
    for r in data:
        t = int(round(r['TIME']))
        time_counts[t] = time_counts.get(t, 0.0) + float(r['COUNTS'])
        
    records = []
    for t, counts in time_counts.items():
        records.append({
            'time': t,
            'soft_flux': counts * 1.5e-8
        })
    return sorted(records, key=lambda x: x['time'])

def align_telemetry_json(solexs_list, helios_list):
    if not solexs_list or not helios_list:
        return []
        
    # Index HEL1OS by time
    helios_map = {r['time']: r for r in helios_list}
    # Index SoLEXS by time
    solexs_map = {r['time']: r for r in solexs_list}
    
    t_min = min(min(helios_map.keys()), min(solexs_map.keys()))
    t_max = max(max(helios_map.keys()), max(solexs_map.keys()))
    
    aligned = []
    
    # Track rolling values for interpolation
    last_hard_15_25 = 3.0
    last_hard_25_50 = 3.0
    last_hard_50_100 = 0.5
    
    last_soft_flux = 5e-8
    last_soft_seen_time = -99999
    
    for t in range(t_min, t_max + 1):
        h_rec = helios_map.get(t)
        s_rec = solexs_map.get(t)
        
        # HEL1OS interpolation
        if h_rec:
            last_hard_15_25 = h_rec['hard_15_25']
            last_hard_25_50 = h_rec['hard_25_50']
            last_hard_50_100 = h_rec['hard_50_100']
            helios_ok = True
        else:
            helios_ok = False # can still use last cached values
            
        # SoLEXS cadence tracking (quiet sun cadence 60s)
        if s_rec:
            last_soft_flux = s_rec['soft_flux']
            last_soft_seen_time = t
            solexs_ok = True
        else:
            # check if gap is within 70 seconds
            if t - last_soft_seen_time <= 70:
                solexs_ok = True
            else:
                solexs_ok = False
                
        gap = not (helios_ok and solexs_ok)
        
        aligned.append({
            'time': t,
            'soft_flux': last_soft_flux,
            'hard_15_25': last_hard_15_25,
            'hard_25_50': last_hard_25_50,
            'hard_50_100': last_hard_50_100,
            'data_gap': gap
        })
        
    return aligned

# ==========================================
# 3. Main Combined Interface
# ==========================================
def load_and_align(solexs_path, helios_path):
    """Main function that tries FITS first, then falls back to JSON."""
    # Resolve file extension mapping
    if not os.path.exists(solexs_path) and os.path.exists(solexs_path.replace(".fits", ".json")):
        solexs_path = solexs_path.replace(".fits", ".json")
    if not os.path.exists(helios_path) and os.path.exists(helios_path.replace(".fits", ".json")):
        helios_path = helios_path.replace(".fits", ".json")
        
    if solexs_path.endswith(".json") or helios_path.endswith(".json") or not PANDAS_ASTROPY_OK:
        print("Using pure-Python JSON ingestion path...")
        s_list = load_solexs_json(solexs_path)
        h_list = load_helios_json(helios_path)
        return align_telemetry_json(s_list, h_list)
    else:
        print("Using FITS astropy/pandas ingestion path...")
        s_df = load_solexs_fits(solexs_path)
        h_df = load_helios_fits(helios_path)
        return align_telemetry_fits(s_df, h_df)

def generate_live_stream_point(t_sec, flare_active=False):
    import random
    bg_soft = 5e-8
    bg_hard = 3.0
    
    if flare_active:
        dt = (t_sec % 1200) - 600
        # Double Gaussian spike
        impulse = 600.0 * math.exp(-((dt + 100) / 90.0) ** 2) if dt < 100 else 10.0
        cooling = 3.0 * math.exp(-(dt - 100) / 250.0) if dt >= 100 else 0.0
        
        hard_val = bg_hard + impulse + random.gauss(0, 1.0)
        soft_val = bg_soft + (impulse * 3.5e-11) + (cooling * 2e-7) + random.gauss(0, 1e-9)
    else:
        hard_val = bg_hard + random.gauss(0, 0.4)
        soft_val = bg_soft + random.gauss(0, 1e-9)
        
    hard_val = max(0.1, hard_val)
    soft_val = max(1e-9, soft_val)
    
    return {
        'time': int(t_sec),
        'soft_flux': soft_val,
        'hard_15_25': hard_val * 2.2,
        'hard_25_50': hard_val,
        'hard_50_100': hard_val * 0.12,
        'data_gap': False
    }
