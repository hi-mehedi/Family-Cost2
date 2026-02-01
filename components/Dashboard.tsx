import React, { useState, useMemo } from 'react';
import { DailyEntry, UNIT_NAMES, UnitName, BazarItem } from '../types';
import SummaryCard from './SummaryCard';
import { getBDTDate, getBDTMonth } from '../utils/dateUtils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  entries: DailyEntry[];
}

const Dashboard: React.FC<DashboardProps> = ({ entries }) => {
  const [selectedMonth, setSelectedMonth] = useState(getBDTMonth()); // YYYY-MM
  const [selectedVehicle, setSelectedVehicle] = useState<UnitName | null>(null);
  const [isBazarSelected, setIsBazarSelected] = useState(false);
  
  const todayStr = getBDTDate();
  const isSelectedMonthCurrent = todayStr.startsWith(selectedMonth);

  const monthEntries = useMemo(() => 
    entries.filter(e => e.date.startsWith(selectedMonth) && !e.isHistory)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  , [entries, selectedMonth]);

  const monthIncome = monthEntries.reduce((sum, e) => sum + e.totalIncome, 0);
  const monthVehicleCost = monthEntries.reduce((sum, e) => sum + e.totalVehicleCost, 0);
  const monthBazarCost = monthEntries.reduce((sum, e) => sum + e.bazarCosts, 0);
  const monthTotalCost = monthVehicleCost + monthBazarCost;
  const monthBalance = monthIncome - monthTotalCost;
  
  const todayEntries = entries.filter(e => e.date === todayStr && !e.isHistory);
  const dailyIncome = todayEntries.reduce((sum, e) => sum + e.totalIncome, 0);
  const dailyCost = todayEntries.reduce((sum, e) => sum + (e.totalVehicleCost + e.bazarCosts), 0);

  const vehicleStats: Record<UnitName, { income: number, cost: number, net: number }> = useMemo(() => 
    UNIT_NAMES.reduce((acc, name) => {
      const inc = monthEntries.reduce((sum, e) => sum + (e.units[name]?.income || 0), 0);
      const cst = monthEntries.reduce((sum, e) => sum + (e.units[name]?.cost || 0), 0);
      acc[name] = { income: inc, cost: cst, net: inc - cst };
      return acc;
    }, {} as Record<UnitName, { income: number, cost: number, net: number }>)
  , [monthEntries]);

  const bazarByDate = useMemo(() => {
    const map: Record<string, { total: number, items: BazarItem[] }> = {};
    monthEntries.forEach(entry => {
      if (entry.bazarCosts > 0) {
        if (!map[entry.date]) map[entry.date] = { total: 0, items: [] };
        map[entry.date].total += entry.bazarCosts;
        map[entry.date].items.push(...entry.bazarItems);
      }
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [monthEntries]);

  const chartData = useMemo(() => {
    const dailyMap: Record<string, { name: string, income: number, cost: number }> = {};
    monthEntries.forEach(e => {
      if (!dailyMap[e.date]) {
        dailyMap[e.date] = {
          name: new Date(e.date).getDate().toString(),
          income: 0,
          cost: 0
        };
      }
      dailyMap[e.date].income += e.totalIncome;
      dailyMap[e.date].cost += (e.totalVehicleCost + e.bazarCosts);
    });
    return Object.values(dailyMap).sort((a, b) => parseInt(a.name) - parseInt(b.name));
  }, [monthEntries]);

  const vehicleHistory = selectedVehicle ? monthEntries
    .filter(e => (e.units[selectedVehicle]?.income > 0 || e.units[selectedVehicle]?.cost > 0))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : [];

  const vehicleMonthSummary = selectedVehicle ? vehicleHistory.reduce((acc, e) => {
    acc.income += e.units[selectedVehicle].income;
    acc.cost += e.units[selectedVehicle].cost;
    acc.net = acc.income - acc.cost;
    return acc;
  }, { income: 0, cost: 0, net: 0 }) : { income: 0, cost: 0, net: 0 };

  const handleVehicleClick = (name: UnitName) => {
    setIsBazarSelected(false);
    setSelectedVehicle(name === selectedVehicle ? null : name);
  };

  const handleBazarClick = () => {
    setSelectedVehicle(null);
    setIsBazarSelected(!isBazarSelected);
  };

  return (
    <div className="space-y-6 pb-6">
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
            <i className="fas fa-calendar-check text-xl"></i>
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest leading-none">Monthly View</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">Viewing statistics for {new Date(selectedMonth + "-01").toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <input 
          type="month" 
          value={selectedMonth}
          onChange={(e) => { setSelectedMonth(e.target.value); setSelectedVehicle(null); setIsBazarSelected(false); }}
          className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {isSelectedMonthCurrent && (
          <>
            <SummaryCard title="Today Income" value={dailyIncome} icon="fa-calendar-day" colorClass="text-emerald-700" iconColorClass="bg-emerald-50 text-emerald-700" />
            <SummaryCard title="Today Cost" value={dailyCost} icon="fa-calendar-minus" colorClass="text-rose-700" iconColorClass="bg-rose-50 text-rose-700" />
          </>
        )}
        <SummaryCard title="Monthly Income" value={monthIncome} icon="fa-money-bill-trend-up" colorClass="text-emerald-600" iconColorClass="bg-emerald-100 text-emerald-600" />
        <SummaryCard title="Monthly Cost" value={monthTotalCost} icon="fa-money-bill-transfer" colorClass="text-rose-600" iconColorClass="bg-rose-100 text-rose-600" />
        <SummaryCard title="Monthly Bazar" value={monthBazarCost} icon="fa-shopping-basket" colorClass="text-orange-500" iconColorClass="bg-orange-100 text-orange-500" />
        <SummaryCard title="Month Balance" value={monthBalance} icon="fa-wallet" colorClass="text-indigo-600" iconColorClass="bg-indigo-100 text-indigo-600" />
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-50 pb-3">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
             <i className="fas fa-layer-group text-sm"></i>
          </div>
          <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Monthly All Report</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {UNIT_NAMES.map(name => {
            const stats = vehicleStats[name];
            return (
              <button 
                key={name} 
                onClick={() => handleVehicleClick(name)}
                className={`p-3 rounded-2xl border transition-all text-left flex flex-col group h-full ${selectedVehicle === name ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500 ring-offset-2' : 'bg-slate-50 border-slate-100 hover:border-indigo-200 hover:bg-white'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter group-hover:text-indigo-600 leading-tight">{name}</span>
                  <i className={`fas ${selectedVehicle === name ? 'fa-chevron-down' : 'fa-chevron-right'} text-[9px] text-slate-300 transition-all mt-0.5`}></i>
                </div>
                <div className="space-y-1 mt-auto">
                  <div className="flex justify-between items-center bg-white/60 px-2 py-1 rounded-lg">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">IN</p>
                    <p className="text-[10px] font-black text-emerald-600">{stats.income.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center bg-white/60 px-2 py-1 rounded-lg">
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">OUT</p>
                    <p className="text-[10px] font-black text-rose-600">{stats.cost.toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center bg-indigo-100/30 px-2 py-1 rounded-lg border border-indigo-100/20">
                    <p className="text-[8px] text-indigo-400 font-black uppercase tracking-tighter">NET</p>
                    <p className={`text-[10px] font-black ${stats.net >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{stats.net.toLocaleString()}</p>
                  </div>
                </div>
              </button>
            );
          })}
          <button 
            onClick={handleBazarClick}
            className={`p-3 rounded-2xl border transition-all text-left flex flex-col group h-full ${isBazarSelected ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-500 ring-offset-2' : 'bg-slate-50 border-slate-100 hover:border-orange-200 hover:bg-white'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter group-hover:text-orange-600 leading-tight">Monthly Bazar</span>
              <i className={`fas ${isBazarSelected ? 'fa-chevron-down' : 'fa-chevron-right'} text-[9px] text-slate-300 transition-all mt-0.5`}></i>
            </div>
            <div className="space-y-1 mt-auto">
              <div className="flex justify-between items-center bg-white/60 px-2 py-1 rounded-lg">
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">TOTAL</p>
                <p className="text-[10px] font-black text-orange-600">{monthBazarCost.toLocaleString()}</p>
              </div>
              <div className="flex justify-between items-center bg-white/60 px-2 py-1 rounded-lg">
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">ITEMS</p>
                <p className="text-[10px] font-black text-slate-600">{bazarByDate.reduce((acc, [_, d]) => acc + d.items.length, 0)}</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {selectedVehicle && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border-2 border-indigo-100 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
                <i className="fas fa-truck"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800">{selectedVehicle}</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Monthly History • {selectedMonth}</p>
              </div>
            </div>
            <button onClick={() => setSelectedVehicle(null)} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center">
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-center">
             <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Income</p><p className="text-sm font-black text-emerald-600">{vehicleMonthSummary.income.toLocaleString()}</p></div>
             <div className="border-x border-indigo-100"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Cost</p><p className="text-sm font-black text-rose-600">{vehicleMonthSummary.cost.toLocaleString()}</p></div>
             <div><p className="text-[9px] font-black text-indigo-400 uppercase mb-1">Net</p><p className={`text-sm font-black ${vehicleMonthSummary.net >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{vehicleMonthSummary.net.toLocaleString()}</p></div>
          </div>
          <div className="max-h-80 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {vehicleHistory.map(entry => {
              const uStats = entry.units[selectedVehicle];
              return (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-white px-2 py-1.5 rounded-xl border border-slate-200 text-center min-w-[45px]">
                      <p className="text-[8px] font-black text-slate-400 uppercase leading-none">{new Date(entry.date).toLocaleDateString(undefined, { month: 'short' })}</p>
                      <p className="text-sm font-black text-slate-700 leading-none mt-1">{new Date(entry.date).getDate()}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-right">
                    <div><p className="text-[8px] text-emerald-500 font-black uppercase">In</p><p className="text-xs font-black text-emerald-600">{uStats.income.toLocaleString()}</p></div>
                    <div><p className="text-[8px] text-rose-500 font-black uppercase">Out</p><p className="text-xs font-black text-rose-600">{uStats.cost.toLocaleString()}</p></div>
                    <div className="min-w-[40px] border-l border-slate-200 pl-4"><p className="text-[8px] text-indigo-500 font-black uppercase">Net</p><p className={`text-xs font-black ${uStats.income - uStats.cost >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>{(uStats.income - uStats.cost).toLocaleString()}</p></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isBazarSelected && (
        <div className="bg-white p-6 rounded-3xl shadow-xl border-2 border-orange-100 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-200">
                <i className="fas fa-shopping-basket"></i>
              </div>
              <div><h3 className="text-xl font-black text-slate-800">Monthly Bazar</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Date-wise • {selectedMonth}</p></div>
            </div>
            <button onClick={() => setIsBazarSelected(false)} className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 flex items-center justify-center"><i className="fas fa-times"></i></button>
          </div>
          <div className="p-5 bg-orange-600 text-white rounded-3xl mb-6 shadow-xl shadow-orange-100 flex flex-col items-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">Total Monthly Bazar</p>
            <p className="text-3xl font-black">TK {monthBazarCost.toLocaleString()}</p>
          </div>
          <div className="max-h-96 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            {bazarByDate.length > 0 ? bazarByDate.map(([date, data]) => (
                <div key={date} className="bg-slate-50/50 rounded-2xl border border-slate-50 overflow-hidden">
                  <div className="px-4 py-3 flex items-start gap-3">
                    <div className="w-16 flex-shrink-0 text-center border-r border-slate-200 pr-3">
                       <p className="text-[9px] font-black text-slate-400 uppercase leading-none">{new Date(date).toLocaleDateString(undefined, { month: 'short' })}</p>
                       <p className="text-base font-black text-slate-800 leading-none mt-1">{new Date(date).getDate()}</p>
                    </div>
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        {data.items.map((item, idx) => (
                          <div key={item.id + idx} className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200/50 shadow-sm">
                            <span className="text-[10px] font-bold text-slate-600 truncate">{item.name}</span>
                            <span className="text-[9px] font-black text-orange-500/80">({item.cost})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="w-20 flex-shrink-0 text-right"><p className="text-xs font-black text-orange-600 mt-1">TK {data.total.toLocaleString()}</p></div>
                  </div>
                </div>
              )) : <div className="py-16 text-center text-slate-300"><i className="fas fa-ghost text-5xl mb-3 opacity-20"></i><p className="text-[10px] font-black uppercase tracking-widest">No bazar records found</p></div>}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Daily Profit Trend</h3>
        <div className="h-64">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 900}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px'}} itemStyle={{fontSize: '11px', fontWeight: 900}} />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
                <Bar dataKey="cost" name="Cost" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="h-full flex items-center justify-center text-slate-300 italic text-xs font-black uppercase tracking-widest bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">No data for this month</div>}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;