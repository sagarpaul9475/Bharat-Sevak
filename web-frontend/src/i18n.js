import i18n from 'i18next'
import { initReactI18next } from 'react-i18next';


const resources = {
bn: {
translation: {
"home_title": "স্বাগতম — EqualWork",
"today_routine": "আজকের রুটিন",
"your_task": "আপনার টাস্ক",
"no_task": "আপনার কোনো টাস্ক নেই।",
"start": "শুরু করুন",
"exercise": "ব্যায়াম",
"instruction": "ইনস্ট্রাকশন",
"learning": "জ্ঞান অর্জন",
"meditation": "ধ্যান",
"marketplace": "মার্কেটপ্লেস",
"tasks": "টাস্কসমূহ",
"logout": "লগআউট"
}
},
en: {
translation: {
"home_title": "Welcome — EqualWork",
"today_routine": "Today's Routine",
"your_task": "Your Task",
"no_task": "You have no task.",
"start": "Start",
"exercise": "Exercise",
"instruction": "Instruction",
"learning": "Learning",
"meditation": "Meditation",
"marketplace": "Marketplace",
"tasks": "Tasks",
"logout": "Logout"
}
}
}


i18n.use(initReactI18next).init({
resources,
lng: 'bn',
fallbackLng: 'bn',
interpolation: { escapeValue: false }
})


export default i18n