export default function StatusFilter({ value, onChange }) {
  return (
    <div className="itin-filter">
      {[{ value: 'all', label: 'All' }, { value: 'sel', label: 'Selected' }, { value: 'conf', label: 'Confirmed' }].map(o => (
        <button key={o.value} className={`fp ${value === o.value ? 'fp-active' : ''}`} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}
