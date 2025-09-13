import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PerformanceChartProps {
  data: Array<{
    week: string;
    pace: number;
    distance: number;
  }>;
  unitPreference?: string;
  onTimeRangeChange?: (range: string) => void;
  currentTimeRange?: string;
}

export default function PerformanceChart({ data, unitPreference, onTimeRangeChange, currentTimeRange = "30days" }: PerformanceChartProps) {
  const formatPace = (value: number) => {
    const minutes = Math.floor(value);
    const seconds = Math.round((value - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDistance = (value: number) => `${value.toFixed(1)}${unitPreference === "miles" ? "mi" : "km"}`;

  const getPeriodLabel = () => {
    switch (currentTimeRange) {
      case "7days": return "Day";
      case "year": 
      case "1year": return "Month";
      default: return "Week"; // 30days, 3months, 6months
    }
  };

  const getDistanceLabel = () => {
    switch (currentTimeRange) {
      case "7days": return "Daily Distance";
      case "year": 
      case "1year": return "Monthly Distance";
      default: return "Weekly Distance";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-charcoal">Performance Trends</CardTitle>
          <Select value={currentTimeRange} onValueChange={onTimeRangeChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days" data-testid="option-7days">Last 7 days</SelectItem>
              <SelectItem value="30days" data-testid="option-30days">Last 30 days</SelectItem>
              <SelectItem value="3months" data-testid="option-3months">Last 3 months</SelectItem>
              <SelectItem value="6months" data-testid="option-6months">Last 6 months</SelectItem>
              <SelectItem value="year" data-testid="option-year">This year</SelectItem>
              <SelectItem value="1year" data-testid="option-1year">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="week" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280' }}
              />
              <YAxis 
                yAxisId="pace"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={formatPace}
              />
              <YAxis 
                yAxisId="distance"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickFormatter={formatDistance}
              />
              <Tooltip 
                labelFormatter={(label) => `${getPeriodLabel()}: ${label}`}
                formatter={(value, name) => [
                  name === 'pace' ? formatPace(Number(value)) : formatDistance(Number(value)),
                  name === 'pace' ? 'Average Pace' : getDistanceLabel()
                ]}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line
                yAxisId="pace"
                type="monotone"
                dataKey="pace"
                stroke="hsl(13, 98%, 49%)"
                strokeWidth={3}
                dot={{ fill: 'hsl(13, 98%, 49%)', strokeWidth: 2, r: 6 }}
                name="pace"
              />
              <Line
                yAxisId="distance"
                type="monotone"
                dataKey="distance"
                stroke="hsl(207, 90%, 54%)"
                strokeWidth={3}
                dot={{ fill: 'hsl(207, 90%, 54%)', strokeWidth: 2, r: 6 }}
                name="distance"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
