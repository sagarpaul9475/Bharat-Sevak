import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Marketplace() {
  const { t } = useTranslation();
  const items = ["আইটেম ১", "আইটেম ২", "আইটেম ৩"];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">{t('marketplace')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item, index) => (
          <div key={index} className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
             <h3 className="font-semibold text-slate-800">{item}</h3>
             <p className="text-sm text-slate-500 mt-1">Item description or price.</p>
          </div>
        ))}
      </div>
    </div>
  );
}