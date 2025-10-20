import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Routine() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">{t('today_routine')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800">{t('exercise')}</h3>
          <p className="text-slate-600">১০ মিনিট ব্যায়াম</p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow-sm border border-slate-200">
          <h3 className="font-semibold text-slate-800">{t('instruction')}</h3>
          <p className="text-slate-600">আপনার কাজের ইনস্ট্রাকশন এখানে দেখা যাবে</p>
        </div>
      </div>
    </div>
  );
}