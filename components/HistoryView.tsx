import React, { useState, useMemo } from 'react';
import { DailyEntry, UnitEntry } from '../types';
import { getBDTMonth } from '../utils/dateUtils';

interface HistoryViewProps {
  entries: DailyEntry[];
  onDelete: (id: string) => void;
  onEdit: (entry: DailyEntry) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ entries, onDelete, onEdit }) => {
  const [selectedMonth, setSelectedMonth] = useState(getBDTMonth());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inspectVersionId, setInspectVersionId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => 
    entries.filter(e => e.date.startsWith(selectedMonth) && !e.isHistory)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  , [entries, selectedMonth]);

  const handleExport = () => {
    if (filteredEntries.length === 0) return alert("No data to export.");
    let csv = "Date,Total Income,Vehicle Cost,Bazar Cost,Balance\n";
    filteredEntries.forEach(e => csv += `${e.date},${e.totalIncome},${e.totalVehicleCost},${e.bazarCosts},${e.availableBalance}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Family_Cost_${selectedMonth}.csv`;
    a.click();
  };

  const renderBreakdown = (entry: DailyEntry, comparison?: DailyEntry) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Unit Breakdown</p>
        <div className="bg-white rounded-2xl p-2 border border-slate-100 space-y-1">
          {(Object.entries(entry.units) as [string, UnitEntry][]).map(([name, data]) => {
            const compData = comparison?.units[name as keyof typeof entry.units];
            const isIncomeDiff = comparison && compData && data.income !== compData.income;
            const isCostDiff = comparison && compData && data.cost !== compData.cost;

            return (data.income > 0 || data.cost > 0 || isIncomeDiff || isCostDiff) ? (
              <div key={name} className={`flex justify-between items-center text-xs p-2 rounded-xl border-b border-slate-50 last:border-0 transition-colors ${comparison ? 'bg-white' : ''}`}>
                <span className="text-slate-700 font-bold">{name}</span>
                <div className="flex gap-4">
                   <div className={`text-right px-2 py-1 rounded-lg transition-all ${isIncomeDiff ? 'bg-emerald-50 ring-1 ring-emerald-200 animate-pulse' : ''}`}>
                      <span className="text-[8px] block font-black text-emerald-500 uppercase">In</span>
                      <span className="text-emerald-600 font-black">{data.income.toLocaleString()}</span>
                   </div>
                   <div className={`text-right px-2 py-1 rounded-lg transition-all ${isCostDiff ? 'bg-rose-50 ring-1 ring-rose-200 animate-pulse' : ''}`}>
                      <span className="text-[8px] block font-black text-rose-500 uppercase">Out</span>
                      <span className="text-rose-600 font-black">{data.cost.toLocaleString()}</span>
                   </div>
                </div>
              </div>
            ) : null;
          })}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Daily Bazar</p>
        <div className="bg-white rounded-2xl p-2 border border-slate-100">
          {entry.bazarItems.length > 0 ? (
            <div className="space-y-1">
              {entry.bazarItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs p-2 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700 font-bold truncate mr-2">{item.name}</span>
                  <span className="text-rose-600 font-black">TK {item.cost.toLocaleString()}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-[10px] text-slate-400 font-bold italic p-2">No items recorded.</p>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-10">
      <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2"><i className="fas fa-search-dollar text-indigo-500"></i><h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">History Lookup</h3></div>
        <div className="flex gap-2">
          <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" />
          <button onClick={handleExport} className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-black shadow-lg flex items-center gap-2 active:scale-95 transition-all"><i className="fas fa-file-csv"></i> CSV</button>
        </div>
      </div>

      <div className="px-2 flex items-center justify-between"><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredEntries.length} Records Found</h3></div>

      {filteredEntries.length > 0 ? (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const historyTrail = entries.filter(e => e.isHistory && (e.parentId === (entry.parentId || entry.id) || (e.id === entry.parentId)));
            
            return (
              <div key={entry.id} className={`bg-white rounded-[32px] shadow-sm border transition-all ${expandedId === entry.id ? 'border-indigo-200 ring-4 ring-indigo-500/5' : 'border-slate-100'}`}>
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => { setExpandedId(expandedId === entry.id ? null : entry.id); setInspectVersionId(null); }}>
                  <div className="flex items-center gap-4">
                     <div className="bg-slate-50 w-12 h-12 rounded-2xl flex flex-col items-center justify-center text-slate-600 border border-slate-100">
                        <span className="text-[9px] font-black uppercase leading-none mb-1">{new Date(entry.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                        <span className="text-lg font-black leading-none">{new Date(entry.date).getDate()}</span>
                     </div>
                     <div>
                       <p className="font-black text-slate-800 text-sm leading-none">{new Date(entry.date).toLocaleDateString(undefined, { weekday: 'long' })}</p>
                       <div className="flex gap-3 text-[9px] font-black mt-2">
                          <span className="text-emerald-600">IN: {entry.totalIncome.toLocaleString()}</span>
                          <span className="text-rose-600">OUT: {(entry.totalVehicleCost + entry.bazarCosts).toLocaleString()}</span>
                       </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`text-sm font-black text-right ${entry.availableBalance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}><p className="text-[8px] uppercase font-black text-slate-400 tracking-tighter leading-none mb-1">Balance</p>TK {entry.availableBalance.toLocaleString()}</div>
                    <i className={`fas fa-chevron-${expandedId === entry.id ? 'up' : 'down'} text-slate-300 text-xs transition-transform duration-300`}></i>
                  </div>
                </div>

                {expandedId === entry.id && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-50 bg-slate-50/30 animate-in fade-in slide-in-from-top-2">
                    {renderBreakdown(entry)}

                    {historyTrail.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3"><i className="fas fa-history text-indigo-400 text-[10px]"></i><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Version History (Compare Changes)</p></div>
                        <div className="space-y-2">
                          {historyTrail.sort((a, b) => b.updatedAt - a.updatedAt).map((old, idx) => (
                            <div key={old.id} className={`bg-white border p-4 rounded-2xl transition-all ${inspectVersionId === old.id ? 'border-indigo-500 shadow-md' : 'border-slate-200'}`}>
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-black text-indigo-600 uppercase">Version {historyTrail.length - idx}</span>
                                  <span className="text-[8px] text-slate-400 font-bold">Saved at: {new Date(old.updatedAt).toLocaleTimeString()}</span>
                                </div>
                                <div className="flex gap-4 items-center">
                                  <div className="text-right">
                                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Income</p>
                                    <p className={`text-xs font-black ${old.totalIncome !== entry.totalIncome ? 'text-emerald-600 bg-emerald-50 px-1 rounded' : 'text-slate-600'}`}>{old.totalIncome.toLocaleString()}</p>
                                  </div>
                                  <button onClick={() => setInspectVersionId(inspectVersionId === old.id ? null : old.id)} className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${inspectVersionId === old.id ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-indigo-300'}`}>
                                    <i className={`fas ${inspectVersionId === old.id ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                    {inspectVersionId === old.id ? 'Close' : 'Inspect'}
                                  </button>
                                </div>
                              </div>
                              {inspectVersionId === old.id && (
                                <div className="mt-4 pt-4 border-t border-dashed border-slate-100 animate-in zoom-in-95 duration-200">
                                   <p className="text-[8px] font-black text-slate-400 uppercase mb-4 text-center bg-slate-50 py-1 rounded-lg italic">Highlights show values different from current</p>
                                   {renderBreakdown(old, entry)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                      <button onClick={(e) => { e.stopPropagation(); onEdit(entry); }} className="px-6 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-2xl flex items-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 transition-all"><i className="fas fa-edit"></i> UPDATE CURRENT</button>
                      <button onClick={(e) => { e.stopPropagation(); if(confirm('Permanently delete this record?')) onDelete(entry.id); }} className="px-4 py-3 text-rose-500 text-[10px] font-black hover:bg-rose-50 rounded-2xl flex items-center gap-2 transition-all border border-rose-100"><i className="fas fa-trash-alt"></i></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : <div className="flex flex-col items-center justify-center py-24 text-slate-400 bg-white rounded-[40px] border border-dashed border-slate-200"><i className="fas fa-calendar-times text-5xl mb-4 opacity-20"></i><p className="font-black uppercase text-xs tracking-widest">No entries found</p></div>}
    </div>
  );
};

export default HistoryView;