'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

interface Props {
  data: { label: string; revenue: number }[];
}

export default function RevenueChart({ data }: Props) {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueBar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: '#94a3b8' }}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          />
          <Tooltip
            cursor={{ fill: 'rgba(20, 184, 166, 0.08)' }}
            contentStyle={{
              backgroundColor: '#0f172a',
              border: 'none',
              borderRadius: '12px',
              padding: '8px 12px',
              color: '#fff',
              fontSize: 12,
            }}
            formatter={(v: any) => [`${v.toLocaleString('fr-FR')} Ar`, 'Revenus']}
            labelStyle={{ color: '#94a3b8', marginBottom: 4 }}
          />
          <Bar dataKey="revenue" fill="url(#revenueBar)" radius={[8, 8, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
