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
    <div className="flex flex-col gap-3 h-full max-w-[1600px] mx-auto">
      {/* Row 1: Status + Chart + Alerts — responsive grid */}
      <div className="flex flex-col lg:flex-row gap-3 min-h-0">
        {/* Status Block - full width on mobile, fixed width on desktop */}
        <div className="w-full lg:w-[260px] xl:w-[280px] flex-shrink-0">
          <StatusBlock />
        </div>

        {/* Flux Chart - fills remaining space */}
        <div className="flex-1 min-w-0">
          <FluxChart data={fluxData} range={range} onRange={setRange} />
        </div>

        {/* Alert List - full width on mobile, fixed width on desktop */}
        <div className="w-full lg:w-[220px] xl:w-[240px] flex-shrink-0">
          <AlertList alerts={alerts} />
        </div>
      </div>

      {/* Row 2: Hardness Ratio + Data Sources */}
      <div className="flex flex-col md:flex-row gap-3 min-h-0">
        <div className="flex-1 min-w-0">
          <HardnessMeter data={hardnessRatio} fluxData={fluxData} />
        </div>
        <div className="w-full md:w-[260px] xl:w-[280px] flex-shrink-0">
          <DataSourcePanel />
        </div>
      </div>
    </div>
  );
}
