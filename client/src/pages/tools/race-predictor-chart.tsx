import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export interface ConfidenceChartDatum {
  distance: string;
  predicted: number;
  lower: number;
  upper: number;
}

export default function RacePredictorChart({ data }: { data: ConfidenceChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="distance"
          label={{ value: 'Distance (km)', position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          label={{ value: 'Time (minutes)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value: number) => `${value.toFixed(1)} min`}
          labelFormatter={(label) => `${label} km`}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="upper"
          stackId="1"
          stroke="#93c5fd"
          fill="#dbeafe"
          name="Upper Bound"
        />
        <Area
          type="monotone"
          dataKey="predicted"
          stackId="2"
          stroke="#3b82f6"
          fill="#3b82f6"
          name="Predicted"
        />
        <Area
          type="monotone"
          dataKey="lower"
          stackId="3"
          stroke="#93c5fd"
          fill="#dbeafe"
          name="Lower Bound"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
