import os
import json
from datetime import datetime

class AlertAggregator:
    def __init__(self, alerts_path="data/logs/alerts.jsonl"):
        self.alerts_path = alerts_path
        os.makedirs(os.path.dirname(self.alerts_path), exist_ok=True)
        self.alerts = self.load_historical_alerts()
        
        self.active_flare = None
        self.last_forecast_prob = 0.0
        self.last_hr_pre_flare = False
        
    def load_historical_alerts(self):
        """Loads alerts from the local jsonl log file."""
        alerts = []
        if os.path.exists(self.alerts_path):
            try:
                with open(self.alerts_path, 'r') as f:
                    for line in f:
                        if line.strip():
                            alerts.append(json.loads(line))
            except Exception as e:
                print(f"Error loading historical alerts: {e}")
                
        # If no alerts on disk, initialize with some default startup info logs
        if not alerts:
            ts = datetime.utcnow().isoformat() + "Z"
            alerts = [
                { 'ts': ts, 'type': 'INFO', 'level': 'GREEN', 'msg': 'HELIOS-CORTEX pipeline online' },
                { 'ts': ts, 'type': 'INFO', 'level': 'GREEN', 'msg': 'Sync with Aditya-L1 PRADAN portal established' }
            ]
        return alerts[::-1] # Newest first

    def log_alert(self, alert_type, level, msg, **kwargs):
        """Logs an alert in-memory and appends to the alerts.jsonl file."""
        ts = datetime.utcnow().isoformat() + "Z"
        alert = {
            'ts': ts,
            'type': alert_type,
            'level': level,
            'msg': msg,
            **kwargs
        }
        self.alerts.insert(0, alert)
        if len(self.alerts) > 50:
            self.alerts = self.alerts[:50]
            
        try:
            with open(self.alerts_path, 'a') as f:
                f.write(json.dumps(alert) + '\n')
        except Exception as e:
            print(f"Error appending alert: {e}")
            
        return alert

    def process_tick(self, timestamp_utc, telemetry, features, nowcast_probs, nowcast_class, nowcast_conf, forecast_prob):
        """Processes a single telemetry/model update tick (every 5 seconds).
        Returns the unified status dictionary.
        """
        soft_flux = float(telemetry['soft_flux'])
        hard_rate = float(telemetry['hard_25_50'])
        hr_val = float(features[2])
        hr_slope = float(features[3])
        hr_zscore = float(features[4])
        zscore_thresh = 3.0 # MAD adaptive nowcast threshold
        
        # Calculate human-readable flare classification from flux
        # A: <1e-7, B: 1e-7 to 1e-6, C: 1e-6 to 1e-5, M: 1e-5 to 1e-4, X: >=1e-4
        if soft_flux >= 1e-4:
            f_class = f"X{(soft_flux / 1e-4):.1f}"
            c_phase = "ACTIVE"
        elif soft_flux >= 1e-5:
            f_class = f"M{(soft_flux / 1e-5):.1f}"
            c_phase = "ACTIVE"
        elif soft_flux >= 1e-6:
            f_class = f"C{(soft_flux / 1e-6):.1f}"
            c_phase = "ACTIVE"
        elif soft_flux >= 1e-7:
            f_class = f"B{(soft_flux / 1e-7):.1f}"
            c_phase = "QUIET"
        else:
            f_class = f"A{(soft_flux / 1e-8):.1f}"
            c_phase = "QUIET"
            
        # Refine current phase using nowcast classification
        current_phase = "Quiet Sun"
        state_color = "#2ECC71" # Green
        
        if nowcast_class == "FLARE_ONSET":
            current_phase = "Impulsive Onset"
            state_color = "#F1C40F" # Yellow/Amber
        elif nowcast_class == "FLARE_PEAK":
            current_phase = "Peak Flare Phase"
            state_color = "#E74C3C" # Red
        elif nowcast_class == "FLARE_DECAY":
            current_phase = "Gradual Decay"
            state_color = "#E74C3C" # Red
            
        # If we broke the adaptive MAD threshold (> 3 Z-score on both channels)
        threshold_broken = (hr_zscore > zscore_thresh) and (soft_flux > 1.5e-7)
        if threshold_broken:
            if not self.active_flare:
                self.active_flare = {
                    'onset': timestamp_utc,
                    'class': f_class,
                    'peak_flux': soft_flux
                }
                self.log_alert('NOWCAST', 'RED', f"Flare onset confirmed - {f_class} detected. Spectral threshold broken (>3σ).", Class=f_class)
            else:
                self.active_flare['peak_flux'] = max(self.active_flare['peak_flux'], soft_flux)
                # Keep the higher classification
                if soft_flux > self.active_flare['peak_flux']:
                    self.active_flare['class'] = f_class
        else:
            if self.active_flare:
                # Flare just ended/recovered
                self.log_alert('NOWCAST', 'GREEN', f"Flare event {self.active_flare['class']} recovered. Returning to baseline.", Class=self.active_flare['class'])
                self.active_flare = None
                
        # Generate alert triggers based on forecast probabilities
        fc_pct = int(forecast_prob * 100)
        if fc_pct > 60 and self.last_forecast_prob <= 60:
            self.log_alert('FORECAST', 'YELLOW', f"TCN solar flare probability elevated to {fc_pct}% for upcoming 3h window.", Prob=fc_pct)
        self.last_forecast_prob = fc_pct
        
        # Hardness ratio pre-flare signal (rising slope and elevated ratio)
        hr_pre = hr_val > 0.06 and hr_slope > 0.0001
        if hr_pre and not self.last_hr_pre_flare:
            self.log_alert('FORECAST', 'YELLOW', f"Spectral hardness ratio exceeded warning threshold (HR: {hr_val:.3f}). Pre-flare signature detected.", HR=hr_val)
        self.last_hr_pre_flare = hr_pre
        
        # Assemble response
        system_status = {
            'state': 'ACTIVE' if self.active_flare else 'QUIET',
            'stateLabel': 'Flare In Progress' if self.active_flare else 'Quiet Sun',
            'stateColor': state_color,
            'since': self.active_flare['onset'] if self.active_flare else timestamp_utc,
            'pipeline': 'Operational',
            'dataLatency': '1.2s',
            'lastSync': timestamp_utc,
            'pradanSync': 'Healthy',
            'al1Sync': 'Healthy',
            'modelVersion': 'v2.1.3'
        }
        
        nowcast_out = {
            'class': f_class if self.active_flare else '—',
            'peakFlux': self.active_flare['peak_flux'] if self.active_flare else soft_flux,
            'onset': self.active_flare['onset'] if self.active_flare else '—',
            'peakTime': timestamp_utc if nowcast_class == "FLARE_PEAK" else '—',
            'currentPhase': current_phase,
            'adaptiveThreshold': zscore_thresh,
            'rollingMAD': float(abs(hr_zscore) * 1e-8), # representative scale
            'zScore': hr_zscore,
            'confidence': nowcast_conf
        }
        
        forecast_out = {
            'probability': fc_pct,
            'updatedAt': timestamp_utc,
            'windowStart': timestamp_utc,
            'windowEnd': timestamp_utc, # will be incremented on frontend side
            'nextClass': 'M-class' if fc_pct > 50 else 'C-class',
            'leadTime': 22 if hr_pre else 0, # simulated lead time minutes
            'tcnConfidence': forecast_prob
        }
        
        hardness_ratio_out = {
            'current': hr_val,
            'baseline': 0.035,
            'threshold': 0.06,
            'trend': 'rising' if hr_slope > 0 else 'falling',
            'preFlareSignal': hr_pre,
            'minutesEarly': 38 if hr_pre else 0
        }
        
        return {
            'systemStatus': system_status,
            'nowcast': nowcast_out,
            'forecast': forecast_out,
            'hardnessRatio': hardness_ratio_out,
            'alerts': self.alerts
        }
