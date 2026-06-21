from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class SystemStatusModel(BaseModel):
    state: str
    stateLabel: str
    stateColor: str
    since: str
    pipeline: str
    dataLatency: str
    lastSync: str
    pradanSync: str
    al1Sync: str
    modelVersion: str

class NowcastModel(BaseModel):
    class_: str  # mapped from 'class'
    peakFlux: float
    onset: str
    peakTime: str
    currentPhase: str
    adaptiveThreshold: float
    rollingMAD: float
    zScore: float
    confidence: float

    class Config:
        fields = {'class_': 'class'}

class ForecastModel(BaseModel):
    probability: int
    updatedAt: str
    windowStart: str
    windowEnd: str
    nextClass: str
    leadTime: int
    tcnConfidence: float

class HardnessRatioModel(BaseModel):
    current: float
    baseline: float
    threshold: float
    trend: str
    preFlareSignal: bool
    minutesEarly: int

class AlertModel(BaseModel):
    ts: str
    type: str
    level: str
    msg: str
    class_: Optional[str] = None
    prob: Optional[int] = None
    hr: Optional[float] = None
    derivative: Optional[str] = None
    latency: Optional[str] = None
    model: Optional[str] = None

    class Config:
        fields = {'class_': 'class'}

class UnifiedStatusModel(BaseModel):
    systemStatus: SystemStatusModel
    nowcast: NowcastModel
    forecast: ForecastModel
    hardnessRatio: HardnessRatioModel
    alerts: List[AlertModel]

class TimeseriesPoint(BaseModel):
    timestamp: int
    softFlux: float
    hardFlux: float
    hardnessRatio: float

class CatalogEventModel(BaseModel):
    id: int
    ts: str
    cls: str
    peak: float
    instrument: str
    lead: int
    conf: int
    duration: str

class ConfusionMatrixModel(BaseModel):
    tp: int
    fn: int
    fp: int
    tn: int

class ValidationMetricsModel(BaseModel):
    podM: float
    farM: float
    csiM: float
    podX: float
    farX: float
    csiX: float
    meanLeadTime: int
    confusion: ConfusionMatrixModel
    skillScore: float
    totalEvents: int
    testPeriod: str
