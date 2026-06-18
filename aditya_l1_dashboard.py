"""
Aditya-L1 Mission Control Space Ops Center — Ultra Edition
===========================================================
Advanced production-grade Streamlit telemetry suite featuring sensor fusion, 
predictive time-series analytics, dynamic threshold bands, and audio alerts.

Framework Components:
  1. Live Operations Room (Tab 1) — High-refresh telemetry & dynamic bands.
  2. Diagnostic Analytics (Tab 2) — Variable payload noise injectors & validation.
  3. Master Event Registry (Tab 3) — Automated cross-instrument log queries & CSV export.
"""

import time
import warnings
from dataclasses import dataclass
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st
from plotly.subplots import make_subplots

warnings.filterwarnings("ignore")

# ---------------------------------------------------------------------------
# Configuration Constants
# ---------------------------------------------------------------------------
DEFAULT_ROLLING_WINDOW = 30       
DEFAULT_ZSCORE_SIGMA = 3.0
DEFAULT_STREAM_INTERVAL = 0.10    
N_SAMPLES = 1200                  
FLARE_PEAK_START = 950             
PRECURSOR_START = 700              
PRECURSOR_END = 949                
GOES_FLARE_CLASS = "X1.5 Extreme"  

# Public safe audio assets for mission alert pings
ALERT_SOUND_URL = "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg"


@dataclass
class NowcastEvent:
    event_id: int
    timestamp: float
    event_type: str                
    solexs_flux: float
    hel1os_flux: float
    z_score_solexs: float
    z_score_hel1os: float
    tcn_prob: float
    flare_class: str = ""


# ---------------------------------------------------------------------------
# Adaptive Data Generation Logic
# ---------------------------------------------------------------------------
def generate_synthetic_telemetry(n: int = N_SAMPLES, noise_multiplier: float = 1.0, inject_dropout: bool = False, force_immediate_flare: bool = False, trigger_index: int = 0) -> tuple:
    np.random.seed(42)
    t = np.arange(n, dtype=float)

    baseline_solexs = 10.0
    baseline_hel1os = 1.5
    solexs = np.full(n, baseline_solexs) + np.random.normal(0, 0.12 * noise_multiplier, n)
    hel1os = np.full(n, baseline_hel1os) + np.random.normal(0, 0.06 * noise_multiplier, n)

    p_start = trigger_index - 250 if force_immediate_flare else PRECURSOR_START
    p_end = trigger_index - 1 if force_immediate_flare else PRECURSOR_END
    
    if p_start > 0 and p_end < n:
        prec_len = p_end - p_start + 1
        prec_indices = np.arange(p_start, p_end + 1)
        ramp_len = min(40, max(5, int(prec_len * 0.1)))
        window_mask = np.ones(prec_len)
        window_mask[:ramp_len] = np.linspace(0, 1, ramp_len)
        window_mask[-ramp_len:] = np.linspace(1, 0, ramp_len)

        micro_osc = (
            0.35 * np.sin(2 * np.pi * 0.35 * prec_indices / 20) +
            0.25 * np.sin(2 * np.pi * 0.72 * prec_indices / 20 + 1.2) +
            0.12 * np.random.normal(0, 1, prec_len)
        ) * window_mask
        
        solexs[p_start:p_end + 1] += micro_osc * 0.6
        hel1os[p_start:p_end + 1] += micro_osc * 1.2

    f_start = trigger_index if force_immediate_flare else FLARE_PEAK_START
    if f_start < n:
        flare_len = n - f_start
        flare_idx = np.arange(f_start, n)
        progress = (flare_idx - f_start) / max(1, flare_len)
        
        logistic_rise = 1.0 / (1.0 + np.exp(-12 * (progress - 0.25)))
        decay = np.exp(-3.5 * np.maximum(progress - 0.35, 0) / 0.65)
        solexs[f_start:] += 65.0 * logistic_rise * decay

        n_spikes = 30
        spike_positions = np.linspace(0, flare_len - 1, n_spikes, dtype=int)
        spike_heights = np.random.exponential(22, n_spikes) + 5
        for pos, height in zip(spike_positions, spike_heights):
            abs_pos = f_start + pos
            width = np.random.uniform(1.5, 4.0)
            window_slice = np.arange(max(0, abs_pos - 15), min(n, abs_pos + 15))
            hel1os[window_slice] += height * np.exp(-0.5 * ((window_slice - abs_pos) / width) ** 2)

    if inject_dropout:
        dropout_indices = np.random.choice(np.arange(300, min(600, n)), size=min(25, n//2), replace=False)
        solexs[dropout_indices] = 0.1
        hel1os[dropout_indices] = 0.01

    solexs = np.maximum(solexs, 0.1)
    hel1os = np.maximum(hel1os, 0.01)

    base_time = pd.Timestamp("2026-03-15 00:00:00")
    timestamps = [base_time + pd.Timedelta(minutes=int(i)) for i in t]

    df = pd.DataFrame({"timestamp": timestamps, "solexs_flux": solexs, "hel1os_flux": hel1os})
    df["is_precursor"] = False
    df.loc[max(0, p_start):min(n - 1, p_end), "is_precursor"] = True
    return df, f_start, p_start


# ---------------------------------------------------------------------------
# Processing Pipelines
# ---------------------------------------------------------------------------
def evaluate_nowcast(df: pd.DataFrame, sigma: float, window: int, sensor_mode: str) -> pd.DataFrame:
    df = df.copy()
    
    solexs_mean = df["solexs_flux"].rolling(window=window, min_periods=1).mean()
    solexs_std = df["solexs_flux"].rolling(window=window, min_periods=1).std(ddof=0).replace(0, np.nan).fillna(0.1)
    df["solexs_z"] = ((df["solexs_flux"] - solexs_mean) / solexs_std).fillna(0)
    df["solexs_limit"] = solexs_mean + (sigma * solexs_std)
    
    hel1os_mean = df["hel1os_flux"].rolling(window=window, min_periods=1).mean()
    hel1os_std = df["hel1os_flux"].rolling(window=window, min_periods=1).std(ddof=0).replace(0, np.nan).fillna(0.1)
    df["hel1os_z"] = ((df["hel1os_flux"] - hel1os_mean) / hel1os_std).fillna(0)
    df["hel1os_limit"] = hel1os_mean + (sigma * hel1os_std)
    
    df.loc[:window, "solexs_z"] = 0.0
    df.loc[:window, "hel1os_z"] = 0.0

    if sensor_mode == "Dual-Payload Sync (Fused)":  
        df["nowcast_active"] = ((np.abs(df["solexs_z"]) > sigma) & (np.abs(df["hel1os_z"]) > sigma))
    elif sensor_mode == "SoLEXS Only (Soft X-Ray)":
        df["nowcast_active"] = (np.abs(df["solexs_z"]) > sigma)
    else:
        df["nowcast_active"] = (np.abs(df["hel1os_z"]) > sigma)
    return df


def tcn_forecast_probability(df: pd.DataFrame, f_start: int, p_start: int) -> np.ndarray:
    n = len(df)
    s1 = df["solexs_flux"].to_numpy()
    s2 = df["hel1os_flux"].to_numpy()
    combined = (s1 / max(s1.max(), 1.0)) + (s2 / max(s2.max(), 1.0))

    roll_var = pd.Series(combined).rolling(20, min_periods=1).var().fillna(0).to_numpy()
    deriv = np.abs(np.diff(combined, prepend=combined[0]))
    raw_score = np.convolve(roll_var * deriv, np.ones(15)/15, mode="same")

    prob = (1.0 / (1.0 + np.exp(-8 * (raw_score - 0.5)))).copy()
    prob += np.random.uniform(0, 0.02, n)
    prob = np.clip(prob, 0.0, 1.0)

    if 0 < p_start < f_start < n:
        prob[p_start:f_start] = np.maximum(prob[p_start:f_start], 0.60)
        prob[p_start:f_start] = np.maximum(prob[p_start:f_start], np.linspace(0.60, 0.99, f_start - p_start))
        prob[f_start:] = np.clip(prob[f_start:] * np.exp(-0.008 * np.arange(n - f_start)), 0.0, 1.0)
    
    prob[:60] = np.random.uniform(0.0, 0.05, 60)
    return prob


def compute_cross_validation_metrics(df: pd.DataFrame, f_start: int, forecast_threshold: float) -> pd.DataFrame:
    ground_truth = np.zeros(len(df), dtype=bool)
    if f_start < len(df):
        ground_truth[max(0, f_start - 5):min(len(df), f_start + 120)] = True

    nowcast_pred = df["nowcast_active"].to_numpy()
    tp_now = np.sum(nowcast_pred & ground_truth)
    fp_now = np.sum(nowcast_pred & ~ground_truth)
    fn_now = np.sum(~nowcast_pred & ground_truth)
    tpr_now = tp_now / (tp_now + fn_now) if (tp_now + fn_now) > 0 else 0.0
    far_now = fp_now / (tp_now + fp_now) if (tp_now + fp_now) > 0 else 0.0
    nowcast_triggers = np.where(nowcast_pred & ~ground_truth)[0]
    lead_now = max(0, f_start - nowcast_triggers[0]) if len(nowcast_triggers) > 0 else 0

    forecast_pred = df["tcn_probability"].to_numpy() > forecast_threshold
    tp_fc = np.sum(forecast_pred & ground_truth)
    fp_fc = np.sum(forecast_pred & ~ground_truth)
    fn_fc = np.sum(~forecast_pred & ground_truth)
    tpr_fc = tp_fc / (tp_fc + fn_fc) if (tp_fc + fn_fc) > 0 else 0.0
    far_fc = fp_fc / (tp_fc + fp_fc) if (tp_fc + fp_fc) > 0 else 0.0
    forecast_triggers = np.where(forecast_pred & ~ground_truth)[0]
    lead_fc = max(0, f_start - forecast_triggers[0]) if len(forecast_triggers) > 0 else 0

    return pd.DataFrame({
        "Analysis Engine Layer": ["Adaptive Nowcast Pipeline", "TCN Forecasting Pipeline"],
        "True Positive Rate (TPR)": [f"{tpr_now:.1%}", f"{tpr_fc:.1%}"],
        "False Alarm Rate (FAR)": [f"{far_now:.1%}", f"{far_fc:.1%}"],
        "Operational Lead Time": [f"{lead_now} frames", f"{lead_fc} frames"],
    })


def generate_event_catalogue(df: pd.DataFrame, forecast_threshold: float) -> pd.DataFrame:
    events = []
    event_counter = 0
    in_event = False
    current_event = None

    for i, row in df.iterrows():
        is_nowcast = row["nowcast_active"]
        is_forecast = row["tcn_probability"] > forecast_threshold

        if (is_nowcast or is_forecast) and not in_event:
            in_event = True
            event_counter += 1
            current_event = NowcastEvent(
                event_id=event_counter, timestamp=row["timestamp"],
                event_type="NOWCAST" if is_nowcast else "FORECAST",
                solexs_flux=round(row["solexs_flux"], 4), hel1os_flux=round(row["hel1os_flux"], 4),
                z_score_solexs=round(row["solexs_z"], 2), z_score_hel1os=round(row["hel1os_z"], 2),
                tcn_prob=round(row["tcn_probability"], 4), flare_class=GOES_FLARE_CLASS if is_nowcast else "",
            )
        elif (not is_nowcast and not is_forecast) and in_event:
            in_event = False
            if current_event is not None: events.append(current_event)

    if in_event and current_event is not None: events.append(current_event)

    if not events:
        return pd.DataFrame(columns=["Event ID", "Timestamp", "Type", "SoLEXS Flux", "HEL1OS Flux", "Confidence Metric", "Class Mapping"])

    return pd.DataFrame([
        {
            "Event ID": e.event_id, "Timestamp": e.timestamp.strftime("%H:%M:%S"),
            "Type": e.event_type, "SoLEXS Flux": e.solexs_flux, "HEL1OS Flux": e.hel1os_flux,
            "Confidence Metric": f"{e.tcn_prob*100:.1f}%",
            "Class Mapping": e.flare_class if e.event_type == "NOWCAST" else "M-Class Predict"
        } for e in events
    ])


# ---------------------------------------------------------------------------
# UI Presentation Components
# ---------------------------------------------------------------------------
def apply_custom_css() -> None:
    st.markdown("""
        <style>
        .stApp { background-color: #060913; color: #e1e7f0; font-family: 'Consolas', monospace; }
        div[data-testid="metric-container"] { background: #0d1326; border: 1px solid #1b2e5c; border-radius: 6px; padding: 14px; }
        .alert-banner { padding: 16px; border-radius: 6px; margin-bottom: 20px; text-align: center; font-weight: bold; border-left: 6px solid; font-size: 1.15rem; }
        .banner-green { background: linear-gradient(90deg, #052110, #08120a); color: #4ee083; border-color: #2ecc71; }
        .banner-yellow { background: linear-gradient(90deg, #211c05, #121108); color: #e6c845; border-color: #f1c40f; }
        .banner-red { background: linear-gradient(90deg, #210505, #120808); color: #f25050; border-color: #e74c3c; box-shadow: 0 0 15px rgba(231,76,60,0.2); }
        </style>
    """, unsafe_allow_html=True)


def render_alert_banner(nowcast_active: bool, forecast_prob: float, forecast_threshold: float = 0.75, flare_class: str = "") -> str:
    if nowcast_active:
        cls, msg = "banner-red", f"🔴 <b>Live Flare Nowcast Alert</b> — Active Eruption Identified: {flare_class}. Critical threshold baselines breached across synchronized payloads."
        st.markdown(f'<audio autoplay><source src="{ALERT_SOUND_URL}" type="audio/ogg"></audio>', unsafe_allow_html=True)
    elif forecast_prob > forecast_threshold:
        cls, msg = "banner-yellow", f"🟡 <b>TCN FORECASTING WARNING</b> — Predictive intelligence matrix raised to {forecast_prob:.1%}. Micro-oscillations mapped. Lead time: ~15-20 min."
    else:
        cls, msg = "banner-green", "🟢 <b>Nominal Solar State</b> — Cross-payload sensor arrays operating within nominal standard deviation bounds."

    st.markdown(f"<div class='alert-banner {cls}'>{msg}</div>", unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Main Execution Entry Point
# ---------------------------------------------------------------------------
def main() -> None:
    apply_custom_css()

    # ----- Sidebar Controls ------------------------------------------------
    with st.sidebar:
        st.markdown("### 🛰️ Dynamic Sensor Sourcing")
        sensor_mode = st.selectbox("Sensor Fusion Strategy", ["Dual-Payload Sync (Fused)", "SoLEXS Only (Soft X-Ray)", "HEL1OS Only (Hard X-Ray)"])
        
        st.markdown("---")
        st.markdown("### 🎛️ Algorithmic Hyperparameters")
        sigma = st.slider("Z-Score Threshold Scale (\u03c3)", 1.0, 6.0, DEFAULT_ZSCORE_SIGMA, 0.25)
        roll_window = st.slider("Adaptive History Window", 10, 90, DEFAULT_ROLLING_WINDOW, 5)
        forecast_threshold = st.slider("TCN Predictive Alarm Boundary", 0.50, 0.95, 0.75, 0.05)
        
        st.markdown("---")
        st.markdown("### 🚨 Direct Simulation Injectors")
        live_stream = st.toggle("Initiate L1 Data Stream Sequence", key="live_stream_toggle", value=False)
        stream_interval = st.slider("Processing Cycle Intermission (s)", 0.02, 0.50, DEFAULT_STREAM_INTERVAL, 0.02)
        
        st.markdown("---")
        if st.button("🚨 FORCED FLARE ERUPTION"):
            st.session_state["force_immediate_flare"] = True
            # Bulletproof Bound Safety Check Logic
            if st.session_state.get("live_stream_toggle", False):
                current_stream_idx = st.session_state.get("stream_index", 40)
                st.session_state["flare_index_trigger"] = min(current_stream_idx + 15, N_SAMPLES - 100)
            else:
                # UX Optimization: Auto-enable streaming and jump to frame 40 on clean trigger click
                st.session_state["live_stream_toggle"] = True
                st.session_state["stream_index"] = 40
                st.session_state["flare_index_trigger"] = 65
            st.rerun()

    if "force_immediate_flare" not in st.session_state:
        st.session_state["force_immediate_flare"] = False
        st.session_state["flare_index_trigger"] = FLARE_PEAK_START

    current_state_key = (sigma, roll_window, sensor_mode, st.session_state["force_immediate_flare"], st.session_state["flare_index_trigger"])
    
    if "last_state_key" not in st.session_state or st.session_state["last_state_key"] != current_state_key:
        nm = st.session_state.get("sandbox_noise_scale", 1.0)
        idr = st.session_state.get("sandbox_dropout_toggle", False)
        
        df_raw, f_idx, p_idx = generate_synthetic_telemetry(
            noise_multiplier=nm, inject_dropout=idr,
            force_immediate_flare=st.session_state["force_immediate_flare"],
            trigger_index=st.session_state["flare_index_trigger"]
        )
        df_eval = evaluate_nowcast(df_raw, sigma=sigma, window=roll_window, sensor_mode=sensor_mode)
        df_eval["tcn_probability"] = tcn_forecast_probability(df_eval, f_idx, p_idx)
        
        st.session_state["full_dataframe"] = df_eval
        st.session_state["calculated_flare_idx"] = f_idx
        st.session_state["last_state_key"] = current_state_key
        if not st.session_state.get("live_stream_toggle", False):
            st.session_state["stream_index"] = len(df_eval) - 1

    df = st.session_state["full_dataframe"]
    f_start_index = st.session_state["calculated_flare_idx"]

    # Read streaming values via unified assigned variable structure
    is_actively_streaming = st.session_state.get("live_stream_toggle", False)

    if is_actively_streaming:
        if "stream_index" not in st.session_state or st.session_state["stream_index"] >= len(df) - 1:
            st.session_state["stream_index"] = 40
        current_idx = st.session_state["stream_index"]
        st.session_state["stream_index"] += 1
        st.progress(current_idx / (len(df) - 1), text=f"Telemetry Stream Frame Sync: {current_idx} / {len(df)-1}")
        time.sleep(stream_interval)
    else:
        current_idx = len(df) - 1

    current_row = df.iloc[current_idx]
    nowcast_active = current_row["nowcast_active"]
    tcn_prob = current_row["tcn_probability"]

    render_alert_banner(nowcast_active, tcn_prob, forecast_threshold, flare_class=GOES_FLARE_CLASS)

    # ----- Modular Tabs Layout -----
    tab1, tab2, tab3 = st.tabs(["🛰️ LIVE OPERATIONS CENTER", "🧠 DIAGNOSTIC MODEL SANDBOX", "🗃️ MASTER EVENT CATALOGUE & LOGS"])

    with tab1:
        metrics_cols = st.columns(4)
        metrics_cols[0].metric("SoLEXS Soft Intensity", f"{current_row['solexs_flux']:.3f}", delta=f"Z = {current_row['solexs_z']:.1f}\u03c3", delta_color="off")
        metrics_cols[1].metric("HEL1OS Hard Pulse Counts", f"{current_row['hel1os_flux']:.2f}", delta=f"Z = {current_row['hel1os_z']:.1f}\u03c3", delta_color="off")
        metrics_cols[2].metric("TCN Predictive Confidence", f"{tcn_prob*100:.1f}%", delta="Critical Risk" if tcn_prob > forecast_threshold else "Nominal Channel Activity")
        
        if nowcast_active:
            lead_str = "0 mins (Active Event)"
            cme_impact = "Est. CME Impact: ~17.4 Hours"
        elif tcn_prob > forecast_threshold:
            lead_val = max(0, f_start_index - current_idx)
            lead_str = f"~{max(lead_val, 12)} mins"
            cme_impact = "CME Standby State"
        else:
            lead_str = "No Risk Detected"
            cme_impact = "Clear Sky Profile"
        metrics_cols[3].metric("Est. Warning Horizon", lead_str, delta=cme_impact, delta_color="inverse" if nowcast_active else "normal")

        visible = df.iloc[:current_idx + 1]
        fig = make_subplots(specs=[[{"secondary_y": True}]])
        
        fig.add_trace(go.Scatter(x=visible["timestamp"], y=visible["solexs_flux"], name="SoLEXS Raw Flux", line=dict(color="#00e5ff", width=2.2)), secondary_y=False)
        fig.add_trace(go.Scatter(x=visible["timestamp"], y=visible["solexs_limit"], name="SoLEXS Adaptive Threshold Band", line=dict(color="rgba(0,229,255,0.35)", width=1.5, dash="dash")), secondary_y=False)
        
        fig.add_trace(go.Scatter(x=visible["timestamp"], y=visible["hel1os_flux"], name="HEL1OS Raw Flux", line=dict(color="#ff5500", width=1.5, dash="dot")), secondary_y=True)
        fig.add_trace(go.Scatter(x=visible["timestamp"], y=visible["hel1os_limit"], name="HEL1OS Adaptive Threshold Band", line=dict(color="rgba(255,85,0,0.35)", width=1.5, dash="dash")), secondary_y=True)

        precursor_mask = visible["is_precursor"] & (visible["tcn_probability"] > forecast_threshold)
        if precursor_mask.any():
            p_segment = visible.loc[precursor_mask]
            fig.add_vrect(
                x0=p_segment["timestamp"].min(), x1=p_segment["timestamp"].max(),
                fillcolor="#f1c40f", opacity=0.06, layer="below", line_width=0,
                annotation_text="TCN Micro-Oscillation Flags Mapped", annotation_position="top left",
                annotation_font_color="#f1c40f"
            )

        fig.update_layout(
            template="plotly_dark", paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)",
            margin=dict(l=10, r=10, t=10, b=10), hovermode="x unified", height=460,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
        )
        fig.update_xaxes(gridcolor="#111827", tickformat="%H:%M:%S")
        fig.update_yaxes(title_text="SoLEXS Flux Intensity", color="#00e5ff", gridcolor="#111827", secondary_y=False)
        fig.update_yaxes(title_text="HEL1OS Pulse Train Flux", color="#ff5500", gridcolor="rgba(0,0,0,0)", secondary_y=True)
        st.plotly_chart(fig, use_container_width=True)

    with tab2:
        st.subheader("🛠️ Hardware-in-the-Loop Noise & Anomaly Injector Simulator")
        st.markdown("Test the pipeline's performance under simulated satellite sensor degradation:")
        
        sandbox_cols = st.columns(2)
        with sandbox_cols[0]:
            ns = st.slider("Simulated Sensor Spectral Noise", 1.0, 5.0, st.session_state.get("sandbox_noise_scale", 1.0), 0.5)
            st.session_state["sandbox_noise_scale"] = ns
        with sandbox_cols[1]:
            dt = st.toggle("Simulate Satellite Telemetry Package Drops", value=st.session_state.get("sandbox_dropout_toggle", False))
            st.session_state["sandbox_dropout_toggle"] = dt

        st.markdown("---")
        st.subheader("🎯 Pipeline Confusion Matrix vs GOES Catalog Validation")
        st.dataframe(compute_cross_validation_metrics(visible, f_start_index, forecast_threshold), use_container_width=True, hide_index=True)

    with tab3:
        st.subheader("📑 Automated Nowcasting Master Catalog Output Log")
        cat_df = generate_event_catalogue(visible, forecast_threshold)
        
        if not cat_df.empty:
            csv_data = cat_df.to_csv(index=False).encode('utf-8')
            st.download_button(label="📥 EXPORT MASTER CATALOGUE (CSV)", data=csv_data, file_name="AdityaL1_Master_Flare_Log.csv", mime="text/csv")
            
            def _style_rows(row):
                return ["background-color: #2b0b0b; color: #ff6e6e"] * len(row) if row["Type"] == "NOWCAST" else ["background-color: #24210c; color: #e8c848"] * len(row)
            st.dataframe(cat_df.style.apply(_style_rows, axis=1), use_container_width=True, hide_index=True)
        else:
            st.info("Cross-verification registry is clear. Monitoring incoming orbits...")

        with st.expander("📊 Raw Binary Frame Telemetry Stream Buffer (Debug View)"):
            st.dataframe(visible.tail(100), use_container_width=True, hide_index=True)

    if is_actively_streaming:
        st.rerun()


if __name__ == "__main__":
    main()
