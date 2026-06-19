import { useState } from 'react';
import FluxChart from './FluxChart';
import StatusBlock from './StatusBlock';
import AlertList from './AlertList';
import HardnessMeter from './HardnessMeter';
import DataSourcePanel from './DataSourcePanel';
import { useLiveState } from '../lib/data';

export default function Dashboard() {
  const [range, setRange] = useState(6);
  const { fluxData, alerts, hardnessRatio } = useLiveState();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      {/* Row 1: Status + Alerts */}
      <div style={{ display: 'flex', gap: 10, minHeight: 140 }}>
        {/* Status Block */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <StatusBlock />
        </div>
        {/* Dual-Y Flux Chart */}
        <div style={{ flex: 1 }}>
          <FluxChart data={fluxData} range={range} onRange={setRange} />
        </div>
        {/* Alert List */}
        <div style={{ width: 240, flexShrink: 0 }}>
          <AlertList alerts={alerts} />
        </div>
      </div>

      {/* Row 2: Hardness Ratio + Data Sources */}
      <div style={{ display: 'flex', gap: 10, minHeight: 100 }}>
        <div style={{ flex: 1 }}>
          <HardnessMeter data={hardnessRatio} fluxData={fluxData} />
        </div>
        <div style={{ width: 280, flexShrink: 0 }}>
          <DataSourcePanel />
        </div>
      </div>
    </div>
  );
}
