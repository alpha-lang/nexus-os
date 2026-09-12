'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: { name: string; value: number; color: string }[];
}

export default function PieChartCard({ data }: Props) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="none" />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 12px',
              color: '#fff',
              fontSize: 12,
            }}
            formatter={(v: any) => [v, '']}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
