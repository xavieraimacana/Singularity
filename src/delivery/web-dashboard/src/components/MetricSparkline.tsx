import React from 'react';

interface MetricSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export const MetricSparkline: React.FC<MetricSparklineProps> = ({
  data,
  color = '#10b981',
  height = 36,
  width = 120
}) => {
  if (!data || data.length === 0) {
    return <div className="h-9 w-28 bg-nebula-950/40 rounded border border-nebula-800/40" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data, min + 1);
  const range = max - min;

  const points = data.map((val, idx) => {
    const x = (idx / Math.max(data.length - 1, 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
