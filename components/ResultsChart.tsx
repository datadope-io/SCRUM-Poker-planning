import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Vote, FIBONACCI_DECK } from '../types';
import { Target, Users, Zap } from 'lucide-react';

interface ResultsChartProps {
  votes: Record<string, Vote>;
}

export const ResultsChart: React.FC<ResultsChartProps> = ({ votes }) => {
  const voteValues = Object.values(votes).map((v: Vote) => v.value);

  // Calculate frequency
  const dataMap: Record<string, number> = {};
  let total = 0;
  let count = 0;
  let maxFreq = 0;
  let consensusValue = '';

  voteValues.forEach(val => {
    if (val === '?') return; // Skip invalid
    const numVal = Number(val);
    const key = String(val);

    dataMap[key] = (dataMap[key] || 0) + 1;
    if (dataMap[key] > maxFreq) {
        maxFreq = dataMap[key];
        consensusValue = key;
    }

    total += numVal;
    count++;
  });

  const average = count > 0 ? (total / count) : 0;
  const averageDisplay = count > 0 ? average.toFixed(1) : "0.0";

  // Find nearest Fibonacci card
  const validFibs = FIBONACCI_DECK.filter(x => typeof x === 'number') as number[];
  const nearestFib = validFibs.length > 0 && count > 0
    ? validFibs.reduce((prev, curr) =>
        Math.abs(curr - average) < Math.abs(prev - average) ? curr : prev
      )
    : 0;

  // Calculate Agreement %
  const agreement = count > 0 ? Math.round((maxFreq / count) * 100) : 0;

  const chartData = Object.keys(dataMap).map(key => ({
    name: key,
    votes: dataMap[key]
  })).sort((a, b) => Number(a.name) - Number(b.name));

  const COLORS = ['#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3'];

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto">
       {/* Metrics Row */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {/* Average Card - The Main Focus */}
           <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-6 rounded-xl border border-indigo-500/30 flex flex-col items-center justify-center shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Target size={64} />
                </div>
                <span className="text-indigo-300 text-xs uppercase tracking-widest font-bold mb-2">Average Score</span>
                <div className="flex items-baseline gap-2">
                    <span className="text-6xl font-black text-white tracking-tighter shadow-black drop-shadow-lg">
                        {averageDisplay}
                    </span>
                    <span className="text-sm text-indigo-400">pts</span>
                </div>
                {count > 0 && Math.abs(nearestFib - average) > 0.1 && (
                    <div className="mt-2 text-xs text-indigo-200 bg-indigo-800/50 px-2 py-1 rounded-full">
                        Closest Card: <strong className="text-white">{nearestFib}</strong>
                    </div>
                )}
           </div>

           {/* Agreement Metric */}
           <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center shadow-md">
                <div className="mb-2 text-emerald-400">
                    <Users size={24} />
                </div>
                <span className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Agreement</span>
                <span className={`text-4xl font-bold mt-1 ${agreement >= 80 ? 'text-emerald-400' : agreement >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {agreement}%
                </span>
                <span className="text-xs text-slate-500 mt-1">
                    {agreement === 100 ? 'Unanimous!' : 'Consensus'}
                </span>
           </div>

           {/* Mode / Most Voted */}
           <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col items-center justify-center shadow-md">
                <div className="mb-2 text-amber-400">
                    <Zap size={24} />
                </div>
                <span className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Most Voted</span>
                <span className="text-4xl font-bold text-white mt-1">
                    {consensusValue || "-"}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                    {maxFreq} vote{maxFreq !== 1 ? 's' : ''}
                </span>
           </div>
       </div>

       {/* Distribution Chart */}
       <div className="w-full h-48 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
         <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                tick={{fill: '#94a3b8'}}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                stroke="#94a3b8"
                tick={{fill: '#94a3b8'}}
                hide
              />
              <Tooltip
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', color: 'white', borderRadius: '8px' }}
              />
              <Bar dataKey="votes" radius={[6, 6, 6, 6]} barSize={40}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.name === consensusValue ? '#6366f1' : '#475569'} />
                ))}
              </Bar>
            </BarChart>
         </ResponsiveContainer>
       </div>
    </div>
  );
};
