
import React, { useState, useEffect } from 'react';
import { DailyEntry, UNIT_NAMES, UnitName, UnitEntry, BazarItem } from '../types';
import { getBDTDate } from '../utils/dateUtils';

interface EntryFormProps {
  onAdd: (entry: DailyEntry) => void;
  initialEntry?: DailyEntry | null;
  onCancel?: () => void;
}

const EntryForm: React.FC<EntryFormProps> = ({ onAdd, initialEntry, onCancel }) => {
  const bdtToday = getBDTDate();
  const [date, setDate] = useState(initialEntry ? initialEntry.date : bdtToday);
  const [bazarItems, setBazarItems] = useState<BazarItem[]>(initialEntry ? initialEntry.bazarItems : []);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCost, setNewItemCost] = useState('');
  
  const [unitData, setUnitData] = useState<Record<UnitName, UnitEntry>>(
    initialEntry ? initialEntry.units : 
    UNIT_NAMES.reduce((acc, name) => {
      acc[name] = { income: 0, cost: 0 };
      return acc;
    }, {} as Record<UnitName, UnitEntry>)
  );

  useEffect(() => {
    if (initialEntry) {
      setDate(initialEntry.date);
      setBazarItems(initialEntry.bazarItems);
      setUnitData(initialEntry.units);
    }
  }, [initialEntry]);

  const addBazarItem = () => {
    if (!newItemName || !newItemCost) return;
    const cost = parseInt(newItemCost, 10) || 0;
    setBazarItems([...bazarItems, { id: crypto.randomUUID(), name: newItemName, cost }]);
    setNewItemName('');
    setNewItemCost('');
  };

  const removeBazarItem = (id: string) => setBazarItems(bazarItems.filter(item => item.id !== id));

  const handleUnitChange = (name: UnitName, field: keyof UnitEntry, value: string) => {
    const num = parseInt(value, 10) || 0;
    setUnitData(prev => ({ ...prev, [name]: { ...prev[name], [field]: num } }));
  };

  const totalBazarCost = bazarItems.reduce((sum, item) => sum + item.cost, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let totalIncome = 0;
    let totalVehicleCost = 0;
    (Object.values(unitData) as UnitEntry[]).forEach(u => {
      totalIncome += u.income;
      totalVehicleCost += u.cost;
    });

    onAdd({
      id: crypto.randomUUID(),
      date,
      units: { ...unitData },
      bazarItems: [...bazarItems],
      bazarCosts: totalBazarCost,
      totalIncome,
      totalVehicleCost,
      availableBalance: totalIncome - (totalVehicleCost + totalBazarCost),
      updatedAt: Date.now()
    });
    
    if (!initialEntry) {
      setBazarItems([]);
      setUnitData(UNIT_NAMES.reduce((acc, name) => {
        acc[name] = { income: 0, cost: 0 };
        return acc;
      }, {} as Record<UnitName, UnitEntry>));
    }
    alert(initialEntry ? 'Log updated and old history preserved!' : 'Daily log saved!');
  };

  // Prevent numeric inputs from changing values on scroll
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.currentTarget.blur();
  };

  const noSpinnerClasses = "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto pb-10">
      {initialEntry && (
        <div className="bg-indigo-600 p-4 rounded-2xl text-white flex justify-between items-center shadow-lg">
          <div><p className="text-[10px] font-black uppercase tracking-widest opacity-80">Currently Updating</p><h2 className="text-lg font-black">{new Date(initialEntry.date).toLocaleDateString(undefined, { dateStyle: 'full' })}</h2></div>
          <button type="button" onClick={onCancel} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Cancel</button>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Select Entry Date</label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><i className="fas fa-calendar-alt text-indigo-500"></i></div>
          <input type="date" required max={bdtToday} value={date} onChange={(e) => setDate(e.target.value)} className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all cursor-pointer font-bold text-slate-700" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="px-2"><h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Fleet Logs</h2></div>
        {UNIT_NAMES.map((name) => (
          <div key={name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 transition-all hover:border-indigo-100">
            <h3 className="font-black text-slate-800 mb-4 text-lg border-l-4 border-indigo-50 pl-3">{name}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-emerald-600 uppercase mb-1 tracking-widest">Income</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">TK</span>
                <input 
                  type="number" 
                  inputMode="numeric" 
                  step="1" 
                  pattern="\d*" 
                  value={unitData[name].income || ''} 
                  onChange={(e) => handleUnitChange(name, 'income', e.target.value)} 
                  onWheel={handleWheel}
                  placeholder="0" 
                  className={`w-full pl-9 pr-3 py-3 bg-emerald-50/30 border border-emerald-100 rounded-xl text-emerald-900 font-black focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all ${noSpinnerClasses}`} 
                /></div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-rose-600 uppercase mb-1 tracking-widest">Cost</label>
                <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">TK</span>
                <input 
                  type="number" 
                  inputMode="numeric" 
                  step="1" 
                  pattern="\d*" 
                  value={unitData[name].cost || ''} 
                  onChange={(e) => handleUnitChange(name, 'cost', e.target.value)} 
                  onWheel={handleWheel}
                  placeholder="0" 
                  className={`w-full pl-9 pr-3 py-3 bg-rose-50/30 border border-rose-100 rounded-xl text-rose-900 font-black focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 outline-none transition-all ${noSpinnerClasses}`} 
                /></div>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-4 border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2"><i className="fas fa-shopping-cart text-rose-500"></i><h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Bazar Items</h3></div>
            <div className="text-rose-600 font-black text-lg bg-rose-50 px-3 py-1 rounded-lg">TK {totalBazarCost.toLocaleString()}</div>
          </div>
          <div className="space-y-2 mb-6">
            {bazarItems.length > 0 ? bazarItems.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 group">
                  <span className="font-bold text-slate-700 truncate block flex-1">{item.name}</span>
                  <div className="flex items-center gap-4"><span className="font-black text-slate-900">TK {item.cost.toLocaleString()}</span><button type="button" onClick={() => removeBazarItem(item.id)} className="text-slate-300 hover:text-rose-500 transition-colors"><i className="fas fa-times-circle text-lg"></i></button></div>
                </div>
              )) : <div className="text-center py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200"><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">No items added</p></div>}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="Item Name" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none" />
            <input 
              type="number" 
              inputMode="numeric" 
              placeholder="Price" 
              value={newItemCost} 
              onChange={(e) => setNewItemCost(e.target.value)} 
              onWheel={handleWheel}
              className={`w-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none ${noSpinnerClasses}`} 
            />
            <button type="button" onClick={addBazarItem} className="bg-indigo-600 text-white w-12 h-12 rounded-xl flex items-center justify-center shadow-lg active:scale-90 transition-all"><i className="fas fa-plus"></i></button>
          </div>
        </div>
      </div>

      <button type="submit" className={`w-full ${initialEntry ? 'bg-indigo-800' : 'bg-indigo-600'} text-white font-black py-5 rounded-3xl shadow-xl hover:bg-indigo-700 active:scale-[0.97] transition-all flex items-center justify-center gap-3 text-lg`}>
        <i className={`fas ${initialEntry ? 'fa-save' : 'fa-cloud-upload-alt'}`}></i>
        {initialEntry ? 'CONFIRM UPDATE' : 'SAVE LOG'}
      </button>
    </form>
  );
};

export default EntryForm;
