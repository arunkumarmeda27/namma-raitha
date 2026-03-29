import React from 'react';
import { cropRates } from '../data/appData';

export default function Ticker() {
  const items = [...cropRates, ...cropRates]; // duplicate for seamless loop
  return (
    <div className="ticker">
      <div className="ticker-inner">
        {items.map((r, i) => (
          <div className="ti" key={i}>
            {r.icon} {r.name}{' '}
            <span className="tp">{r.price}/qt</span>
            <span className={r.up ? 'tup' : 'tdn'}>{r.change}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
