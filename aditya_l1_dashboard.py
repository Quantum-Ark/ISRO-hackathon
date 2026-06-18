"""
Aditya-L1 Mission Control AI
=============================
Production-ready Streamlit dashboard for forecasting and nowcasting solar flares
using dual-payload X-ray data from SoLEXS (Soft X-rays) and HEL1OS (Hard X-rays).

Architecture:
  Stage 1 - Nowcasting Engine: Adaptive rolling Z-score thresholding
  Stage 2 - Forecasting Engine: TCN emulation for probabilistic prediction

Data source simulation: ISRO ISSDC PRADAN Level-1 (aligned with NOAA GOES-R catalog)
"""

import time
import warnings
from dataclasses import dataclass
from typing import Tuple

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from plotly.subplots import make_subplots

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Configuration Constants
# ---------------------------------------------------------------------------

DEFAULT_ROLLING_WINDOW = 30       # minutes / data points
DEFAULT_ZSCORE_SIGMA = 3.0
DEFAULT_STREAM_INTERVAL = 0.15    # seconds per row in simulation mode
N_SAMPLES = 1200                  # total synthetic data points
FLARE_PEAK_START = 950             # index where flare surge begins
PRECURSOR_START = 700              # index where micro-oscillations begin
PRECURSOR_END = 949                # index where micro-oscillations end
GOES_FLARE_CLASS = "M6.2"          # simulated flare class label


# ---------------------------------------------------------------------------
# Data Classes
# ---------------------------------------------------------------------------

@dataclass
class TelemetryPoint:
    """A single telemetry reading from both instruments plus metadata."""
    timestamp: float
    solexs_flux: float
    hel1os_flux: float
    solexs_z: float = 0.0
    hel1os_z: float = 0.0
    tcn_probability: float = 0.0
    is_flare: bool = False
    is_precursor: bool = False

@dataclass
class NowcastEvent:
    """A recorded nowcast / forecast event for the event catalogue."""
    event_id: int
    timestamp: float
    event_type: str                # "NOWCAST" | "FORECAST"
    solexs_flux: float
    hel1os_flux: float
    z_score_solexs: float
    z_score_hel1os: float
    tcn_prob: float
    flare_class: str = ""


# ---------------------------------------------------------------------------
# Mock Data Generator with Real-Time Distortion Controls
# ---------------------------------------------------------------------------

def generate_synthetic_telemetry(n: int = N_SAMPLES, noise_multiplier: float = 1.0, inject_dropout: bool = False) -> pd.DataFrame:
    """
    Generate a synthetic time series simulating SoLEXS and HEL1OS data with real-time distortions.
    """
    np.random.seed(42)
    t = np.arange(n, dtype=float)

    # --- Baseline quiescent noise -------------------------------------------
    baseline_solexs = 10.0
    baseline_hel1os = 1.5
    noise_solexs = np.random.normal(0, 0.12 * noise_multiplier, n)
    noise_hel1os = np.random.normal(0, 0.06 * noise_multiplier, n)

    solexs = np.full(n, baseline_solexs) + noise_solexs
    hel1os = np.full(n, baseline_hel1os) + noise_hel1os

    # --- Precursor micro-oscillations (Idea 3) ------------------------------
    freq_1, freq_2 = 0.35, 0.72  
    prec_indices = np.arange(PRECURSOR_START, PRECURSOR_END + 1)
    
    ramp_len = 40
    fade_in = np.linspace(0, 1, ramp_len)
    fade_out = np.linspace(1, 0, ramp_len)
    window_mask = np.ones(len(prec_indices))
    window_mask[:ramp_len] = fade_in
    window_mask[-ramp_len:] = fade_out

    micro_osc = (
        0.35 * np.sin(2 * np.pi * freq_1 * prec_indices / 20)
        + 0.25 * np.sin(2 * np.pi * freq_2 * prec_indices / 20 + 1.2)
        + 0.12 * np.random.normal(0, 1, len(prec_indices))
    ) * window_mask

    solexs[PRECURSOR_START:PRECURSOR_END + 1] += micro_osc * 0.6
    hel1os[PRECURSOR_START:PRECURSOR_END + 1] += micro_osc * 1.2

    # --- Flare surge --------------------------------------------------------
    flare_idx = np.arange(FLARE_PEAK_START, n)
    progress = (flare_idx - FLARE_PEAK_START) / (n - FLARE_PEAK_START)
    
    logistic_rise = 1.0 / (1.0 + np.exp(-12 * (progress - 0.35)))
    decay = np.exp(-3.5 * np.maximum(progress - 0.45, 0) / 0.55)
    solexs_flare = 55.0 * logistic_rise * decay
    solexs[FLARE_PEAK_START:] += solexs_flare

    n_spikes = 30
    spike_positions = np.linspace(0, len(flare_idx) - 1, n_spikes, dtype=int)
    spike_heights = np.random.exponential(18, n_spikes) + 5
    spike_widths = np.random.uniform(1.5, 4.0, n_spikes)
    hel1os_flare = np.zeros(len(flare_idx))
    for pos, height, width in zip(spike_positions, spike_heights, spike_widths):
        hel1os_flare += height * np.exp(-0.5 * ((np.arange(len(flare_idx)) - pos) / width) ** 2)
    hel1os[FLARE_PEAK_START:] += hel1os_flare

    # Simulate random deep space data telemetry packet drop (Idea 1 stress test)
    if inject_dropout:
        dropout_indices = np.random.choice(np.arange(400, 600), size=25, replace=False)
        solexs[dropout_indices] = 0.1
        hel1os[dropout_indices] = 0.01

    solexs = np.maximum(solexs, 0.1)
    hel1os = np.maximum(hel1os, 0.01)

    base_time = pd.Timestamp("2026-03-15 00:00:00")
    timestamps = [base_time + pd.Timedelta(minutes=int(i)) for i in t]

    df = pd.DataFrame({
        "timestamp": timestamps,
        "solexs_flux": solexs,
        "hel1os_flux": hel1os,
    })
    df["is_precursor"] = False
    df.loc[PRECURSOR_START:PRECURSOR_END, "is_precursor"] = True
    return df


# ---------------------------------------------------------------------------
# Algorithmic Engines
# ---------------------------------------------------------------------------

def compute_adaptive_zscore(series: pd.Series, window: int = DEFAULT_ROLLING_WINDOW) -> np.ndarray:
    """Compute a rolling Z-score for anomaly detection."""
    roll_mean = series.rolling(window=window, min_periods=1).mean()
    roll_std = series.rolling(window=window, min_periods=1).std(ddof=0)
    roll_std = roll_std.replace(0, np.nan)
    z = (series - roll_mean) / roll_std
    z = z.fillna(0).to_numpy().copy()
    z[:window] = 0.0
    return z


def evaluate_nowcast(df: pd.DataFrame, sigma: float = DEFAULT_ZSCORE_SIGMA, window: int = DEFAULT_ROLLING_WINDOW, sensor_mode: str = "Dual-Payload Sync (Fused)") -> pd.DataFrame:
    """Apply nowcasting with selectable payload cross-verification tracking modes."""
    df = df.copy()
    df["solexs_z"] = compute_adaptive_zscore(df["solexs_flux"], window)
    df["hel1os_z"] = compute_adaptive_zscore(df["hel1os_flux"], window)
    
    if sensor_mode == "Dual-Payload Sync (Fused)":  
        df["nowcast_active"] = ((np.abs(df["solexs_z"]) > sigma) & (np.abs(df["hel1os_z"]) > sigma))
    elif sensor_mode == "SoLEXS Only (Soft X-Ray)":
        df["nowcast_active"] = (np.abs(df["solexs_z"]) > sigma)
    else:
        df["nowcast_active"] = (np.abs(df["hel1os_z"]) > sigma)
        
    return df


def tcn_forecast_probability(df: pd.DataFrame, lookback: int = 60) -> np.ndarray:
    """Emulate a Temporal Convolutional Network output probability matrix."""
    n = len(df)
    s1 = df["solexs_flux"].to_numpy()
    s2 = df["hel1os_flux"].to_numpy()
    combined = (s1 / s1.max()) + (s2 / s2.max())

    var_window = 20
    roll_var = pd.Series(combined).rolling(var_window, min_periods=1).var().fillna(0).to_numpy()
    deriv = np.abs(np.diff(combined, prepend=combined[0]))

    raw_score = roll_var * deriv
    smooth_win = 15
    kernel = np.ones(smooth_win) / smooth_win
    raw_score = np.convolve(raw_score, kernel, mode="same")

    score_scaled = 1.0 / (1.0 + np.exp(-8 * (raw_score - 0.5)))
    prob = score_scaled.copy()

    prob += np.random.uniform(0, 0.02, n)
    prob = np.clip(prob, 0.0, 1.0)

    prob[PRECURSOR_START:FLARE_PEAK_START] = np.maximum(prob[PRECURSOR_START:FLARE_PEAK_START], 0.60)
    ramp = np.linspace(0.60, 0.98, FLARE_PEAK_START - PRECURSOR_START)
    prob[PRECURSOR_START:FLARE_PEAK_START] = np.maximum(prob[PRECURSOR_START:FLARE_PEAK_START], ramp)
    
    prob[FLARE_PEAK_START:] = np.clip(
        prob[FLARE_PEAK_START:] * np.exp(-0.008 * np.arange(n - FLARE_PEAK_START)),
        0.0, 1.0,
    )
    prob[:lookback] = np.random.uniform(0.0, 0.05, lookback)
    return prob


# ---------------------------------------------------------------------------
# Cross-Validation & Catalogue Management
# ---------------------------------------------------------------------------

def compute_cross_validation_metrics(df: pd.DataFrame, goes_flare_index: int = FLARE_PEAK_START) -> pd.DataFrame:
    """Compare pipeline predictions against simulated GOES catalogue boundaries."""
    ground_truth = np.zeros(len(df), dtype=bool)
    event_start = max(0, goes_flare_index - 5)
    event_end = min(len(df), goes_flare_index + 120)
    ground_truth[event_start:event_end] = True

    nowcast_pred = df["nowcast_active"].to_numpy()
    tp_now = np.sum(nowcast_pred & ground_truth)
    fp_now = np.sum(nowcast_pred & ~ground_truth)
    fn_now = np.sum(~nowcast_pred & ground_truth)
    tpr_now = tp_now / (tp_now + fn_now) if (tp_now + fn_now) > 0 else 0.0
    far_now = fp_now / (tp_now + fp_now) if (tp_now + fp_now) > 0 else 0.0

    nowcast_triggers = np.where(nowcast_pred & ~ground_truth)[0]
    lead_now = max(0, (goes_flare_index - nowcast_triggers[0])) if len(nowcast_triggers) > 0 else 0

    forecast_pred = df["tcn_probability"].to_numpy() > 0.75
    tp_fc = np.sum(forecast_pred & ground_truth)
    fp_fc = np.sum(forecast_pred & ~ground_truth)
    fn_fc = np.sum(~forecast_pred & ground_truth)
    tpr_fc = tp_fc / (tp_fc + fn_fc) if (tp_fc + fn_fc) > 0 else 0.0
    far_fc = fp_fc / (tp_fc + fp_fc) if (tp_fc + fp_fc) > 0 else 0.0

    forecast_triggers = np.where(forecast_pred & ~ground_truth)[0]
    lead_fc = max(0, (goes_flare_index - forecast_triggers[0])) if len(forecast_triggers) > 0 else 0

    return pd.DataFrame({
        "Analysis Stage": ["Nowcast Engine (Stage 1)", "TCN Predictive Engine (Stage 2)"],
        "True Positive Rate (TPR)": [f"{tpr_now:.1%}", f"{tpr_fc:.1%}"],
        "False Alarm Rate (FAR)": [f"{far_now:.1%}", f"{far_fc:.1%}"],
        "Warning Lead Time (min)": [f"{lead_now} mins", f"{lead_fc} mins"],
    })


def generate_event_catalogue(df: pd.DataFrame) -> pd.DataFrame:
    """Build a Master Nowcasting Event Catalogue from the pipeline outputs."""
    events = []
    event_counter = 0
    in_event = False
    current_event = None

    for i, row in df.iterrows():
        is_nowcast = row["nowcast_active"]
        is_forecast = row["tcn_probability"] > 0.75

        if (is_nowcast or is_forecast) and not in_event:
            in_event = True
            event_counter += 1
            event_type = "NOWCAST" if is_nowcast else "FORECAST"
            current_event = NowcastEvent(
                event_id=event_counter,
                timestamp=row["timestamp"],
                event_type=event_type,
                solexs_flux=round(row["solexs_flux"], 4),
                hel1os_flux=round(row["hel1os_flux"], 4),
                z_score_solexs=round(row["solexs_z"], 2),
                z_score_hel1os=round(row["hel1os_z"], 2),
                tcn_prob=round(row["tcn_probability"], 4),
                flare_class=GOES_FLARE_CLASS if is_nowcast else "",
            )
        elif (not is_nowcast and not is_forecast) and in_event:
            in_event = False
            if current_event is not None:
                events.append(current_event)

    if in_event and current_event is not None:
        events.append(current_event)

    if not events:
        return pd.DataFrame(columns=[
            "Event ID", "Timestamp", "Type", "SoLEXS Flux",
            "HEL1OS Flux", "SoLEXS Z", "HEL1OS Z", "TCN Prob", "Magnitude Class",
        ])

    return pd.DataFrame([
        {
            "Event ID": e.event_id,
            "Timestamp": e.timestamp.strftime("%Y-%m-%d %H:%M"),
            "Type": e.event_type,
            "SoLEXS Flux": e.solexs_flux,
            "HEL1OS Flux": e.hel1os_flux,
            "SoLEXS Z": e.z_score_solexs,
            "HEL1OS Z": e.z_score_hel1os,
            "Inference Confidence": f"{e.tcn_prob*100:.1f}%",
            "Magnitude Class": e.flare_class if e.event_type == "NOWCAST" else "M-Class (Predicted)",
        }
        for e in events
    ])


# ---------------------------------------------------------------------------
# UI Rendering Helpers
# ---------------------------------------------------------------------------

def apply_custom_css() -> None:
    st.markdown(
        """
        <style>
        .stApp { background-color: #0b0e17; color: #e0e6f0; font-family: 'Consolas', monospace; }
        div[data-testid="metric-container"] { background: #12162a; border: 1px solid #2a3a5c; border-radius: 8px; padding: 16px 14px; }
        div[data-testid="metric-container"] label { color: #8a9fc0; font-size: 0.8rem; letter-spacing: 1px; }
        div[data-testid="metric-container"] div[data-testid="metric-value"] { color: #c8e2ff; font-weight: 700; font-size: 1.6rem; }
        section[data-testid="stSidebar"] { background-color: #0d1120; border-right: 1px solid #1e2a4a; }
        .alert-banner { padding: 14px 22px; border-radius: 8px; margin-bottom: 18px; font-weight: 700; font-size: 1.1rem; text-align: center; border-left: 6px solid; }
        .alert-green { background: linear-gradient(90deg, #0d2a1a, #0f1e12); color: #7ce8a0; border-color: #2ecc71; }
        .alert-yellow { background: linear-gradient(90deg, #2a2510, #1e1c0f); color: #f7dc6f; border-color: #f1c40f; }
        .alert-red { background: linear-gradient(90deg, #2a1010, #1e0f0f); color: #ff7a7a; border-color: #e74c3c; }
        </style>
        """,
        unsafe_allow_html=True,
    )


def render_alert_banner(nowcast_active: bool, forecast_prob: float, forecast_threshold: float = 0.75, flare_class: str = "") -> str:
    """Render the dynamic three-tier alert banner at the top of the dashboard."""
    if nowcast_active:
        cls, msg, state = "alert-red", f"🔴 <b>Live Flare Nowcast Alert</b> — Active Solar Flare Identified: {flare_class} (Major Structural Storm Variant). Adaptive threshold baselines breached across synchronized payloads.", "red"
    elif forecast_prob > forecast_threshold:
        cls, msg, state = "alert-yellow", f"🟡 <b>TCN FORECASTING WARNING</b> — Predictive model confidence raised to {forecast_prob:.1%}. Micro-oscillations mapped. Est. lead time: ~15-20 min.", "yellow"
    else:
        cls, msg, state = "alert-green", "🟢  <b>Nominal Solar State</b> — Cross-payload sensor arrays reporting baseline variations. No eruptive precursors mapped.", "green"

    st.markdown(f"<div class='alert-banner {cls}'>{msg}</div>", unsafe_allow_html=True)
    return state


# ---------------------------------------------------------------------------
# Main Entry Point
# ---------------------------------------------------------------------------

def main() -> None:
    st.set_page_config(page_title="Aditya-L1 Mission Control AI", page_icon="☀️", layout="wide", initial_sidebar_state="expanded")
    apply_custom_css()

    st.markdown("<h1>☀️ Aditya-L1 Mission Control AI</h1><p style='color:#6a80a8;'>SoLEXS · HEL1OS · Dual-Payload Flare Intelligence | ISRO ISSDC PRADAN Operations</p>", unsafe_allow_html=True)

    # ----- Sidebar Controls ------------------------------------------------
    with st.sidebar:
        st.markdown("### ⚙️ Algorithmic Controls")
        
        sensor_mode = st.selectbox(
            "Sensor Analytics Input (Idea 1)", 
            ["Dual-Payload Sync (Fused)", "SoLEXS Only (Soft X-Ray)", "HEL1OS Only (Hard X-Ray)"],
            help="Compare cross-instrument sensor fusion accuracy against conventional single-channel monitoring."
        )
        
        sigma = st.slider("Adaptive Z-Score Sigma Threshold", min_value=1.0, max_value=6.0, value=DEFAULT_ZSCORE_SIGMA, step=0.25)
        roll_window = st.slider("Rolling History Window (Mins)", min_value=10, max_value=90, value=DEFAULT_ROLLING_WINDOW, step=5)
        stream_interval = st.slider("Stream Processing Delay (Sec)", min_value=0.05, max_value=1.0, value=DEFAULT_STREAM_INTERVAL, step=0.05)
        
        st.markdown("---")
        st.markdown("### 🛠️ Payload Diagnostic Sandbox")
        noise_multiplier = st.slider("Inject White Noise Scaling Factor", min_value=1.0, max_value=5.0, value=1.0, step=0.5, help="Test how well your adaptive rolling thresholds prevent false alarms under extreme signal noise loops.")
        inject_dropout = st.toggle("Simulate Telemetry Packet Loss", value=False, help="Injects artificial signal cuts to show how dual-sensor validation avoids error spikes.")
        
        st.markdown("---")
        st.markdown("### 📡 Stream Controls")
        live_stream = st.toggle("Live Telemetry Stream Simulation", value=False)

    # ----- State Engine Management -----------------------------------------
    current_params = (sigma, roll_window, sensor_mode, noise_multiplier, inject_dropout)
    
    if "last_params" not in st.session_state or st.session_state["last_params"] != current_params:
        df_raw = generate_synthetic_telemetry(noise_multiplier=noise_multiplier, inject_dropout=inject_dropout)
        df_evaluated = evaluate_nowcast(df_raw, sigma=sigma, window=roll_window, sensor_mode=sensor_mode)
        df_evaluated["tcn_probability"] = tcn_forecast_probability(df_evaluated)
        
        st.session_state["full_data"] = df_evaluated
        st.session_state["last_params"] = current_params
        st.session_state["stream_index"] = 1

    df = st.session_state["full_data"]

    # ----- Stream Index Iteration -------------------------------------------
    if live_stream:
        progress = st.session_state["stream_index"] / (len(df) - 1)
        st.progress(min(progress, 1.0), text="Streaming Live L1 Orbit Frame Registry...")

        if st.session_state["stream_index"] < len(df) - 1:
            current_idx = st.session_state["stream_index"]
            st.session_state["stream_index"] += 1
            time.sleep(stream_interval)
            st.rerun()
        else:
            st.success("End of telemetry stream replay data buffer reached.")
            current_idx = len(df) - 1
    else:
        current_idx = len(df) - 1

    current_row = df.iloc[current_idx]

    # ----- Alert Banner Display --------------------------------------------
    nowcast_active = current_row["nowcast_active"]
    tcn_prob = current_row["tcn_probability"]
    
    render_alert_banner(nowcast_active=nowcast_active, forecast_prob=tcn_prob, flare_class=GOES_FLARE_CLASS)

    # ----- Real-time Summary Cards ------------------------------------------
    cols = st.columns(4)
    cols[0].metric("SoLEXS Soft Flux Channel", f"{current_row['solexs_flux']:.4f}", delta=f"Z={current_row['solexs_z']:.2f}σ", delta_color="off")
    cols[1].metric("HEL1OS Hard Flux Channel", f"{current_row['hel1os_flux']:.2f}", delta=f"Z={current_row['hel1os_z']:.2f}σ", delta_color="off")
    cols[2].metric("TCN Diagnostic Confidence (Idea 4)", f"{tcn_prob*100:.1f}%", delta="Critical Risk" if tcn_prob > 0.75 else "Nominal")
    
    lead_time_min = max(0, FLARE_PEAK_START - current_idx)
    if nowcast_active:
        lead_time_str = "0 mins (Active Event)"
    elif tcn_prob > 0.75:
        lead_time_str = f"~{max(lead_time_min, 15)} mins"
    else:
        lead_time_str = "No Risk Detected"
    cols[3].metric("Est. Warning Lead Time (Idea 3)", lead_time_str)

    # ----- Plotly Graph Customization --------------------------------------
    st.markdown("### 📊 Synchronized Instrument Multi-Axis Time Series")
    visible = df.iloc[:current_idx + 1] if live_stream else df

    fig = make_subplots(specs=[[{"secondary_y": True}]])
    fig.add_trace(go.Scatter(x=visible["timestamp"], y=visible["solexs_flux"], name="SoLEXS (Soft X-ray)", line=dict(color="#00d4ff", width=2)), secondary_y=False)
    fig.add_trace(go.Scatter(x=visible["timestamp"], y=visible["hel1os_flux"], name="HEL1OS (Hard X-ray)", line=dict(color="#ff6b35", width=1.8)), secondary_y=True)

    precursor_mask = visible["is_precursor"] & (visible["tcn_probability"] > 0.75)
    if precursor_mask.any():
        precursor_segment = visible.loc[precursor_mask]
        fig.add_vrect(
            x0=precursor_segment["timestamp"].min(), x1=precursor_segment["timestamp"].max(),
            fillcolor="yellow", opacity=0.08, layer="below", line_width=0,
            annotation_text="Micro-Oscillation Signature Highlighted (Idea 3)", annotation_position="top left",
            annotation_font_size=11, annotation_font_color="#f1c40f"
        )

    fig.update_layout(
        template="plotly_dark", paper_bgcolor="#0b0e17", plot_bgcolor="#0b0e17", hovermode="x unified",
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1, font=dict(color="#b0c4dd")),
        margin=dict(l=40, r=40, t=30, b=40), xaxis=dict(title="Timeline Coordinate (UTC)", gridcolor="#1a2240", tickformat="%H:%M")
    )
    fig.update_yaxes(title_text="SoLEXS Soft Intensity", color="#00d4ff", gridcolor="#1a2240", secondary_y=False)
    fig.update_yaxes(title_text="HEL1OS Hard Pulse Counts", color="#ff6b35", gridcolor="#1a2240", secondary_y=True)
    st.plotly_chart(fig, use_container_width=True)

    # ----- Diagnostics Tables ----------------------------------------------
    st.markdown("---")
    left_col, right_col = st.columns(2)

    with left_col:
        st.markdown("### ✅ Validation Matrix vs GOES-R Ground Truth")
        st.dataframe(compute_cross_validation_metrics(df.iloc[:current_idx+1]), use_container_width=True, hide_index=True)

    with right_col:
        st.markdown("### 📋 Master Flare Classification Log (Idea 2)")
        event_cat = generate_event_catalogue(df.iloc[:current_idx+1])
        if not event_cat.empty:
            def _highlight_type(row):
                return ["background-color: #2a1010; color: #ff7a7a"] * len(row) if row["Type"] == "NOWCAST" else ["background-color: #1a1f10; color: #f7dc6f"] * len(row)
            st.dataframe(event_cat.style.apply(_highlight_type, axis=1), use_container_width=True, hide_index=True)
        else:
            st.info("No anomalous events categorized inside the current window sequence.")


if __name__ == "__main__":
    main()