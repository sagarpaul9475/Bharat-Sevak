import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'


export default function Navbar(){
const { t, i18n } = useTranslation()
const toggleLang = ()=> i18n.changeLanguage(i18n.language === 'bn' ? 'en' : 'bn')


return (
<nav className="bg-white shadow">
<div className="container mx-auto px-4 py-3 flex items-center justify-between">
<Link to="/" className="font-bold text-lg">EqualWork</Link>
<div className="space-x-4 flex items-center">
<Link to="/" className="hover:underline">{t('home_title')}</Link>
<Link to="/routine" className="hover:underline">{t('today_routine')}</Link>
<Link to="/tasks" className="hover:underline">{t('tasks')}</Link>
<Link to="/marketplace" className="hover:underline">{t('marketplace')}</Link>
<button onClick={toggleLang} className="px-3 py-1 border rounded">Lang</button>
</div>
</div>
</nav>
)
}