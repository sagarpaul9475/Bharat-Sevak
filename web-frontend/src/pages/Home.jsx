import React, { useEffect, useState } from 'react';
import TaskCard from '../components/TaskCard';
import axios from 'axios';
import { useTranslation } from 'react-i18next';

export default function Home(){
  const { t, i18n } = useTranslation();
  const [routine, setRoutine] = useState([]);
  const [tasks, setTasks] = useState([]);

  useEffect(()=>{
    axios.get(`http://localhost:5000/api/routine?lang=${i18n.language}`)
      .then(res => setRoutine(res.data))
      .catch(err => console.log(err));

    axios.get(`http://localhost:5000/api/tasks?lang=${i18n.language}`)
      .then(res => setTasks(res.data))
      .catch(err => console.log(err));
  }, [i18n.language]);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold">{t('today_routine')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {routine.map(r => (
            <div key={r.id} className="p-4 bg-white rounded shadow">
              <h3 className="font-semibold">{r.activity}</h3>
              <p className="text-sm text-gray-500">{r.time}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t('your_task')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map(task => <TaskCard key={task.id} task={task} />)}
        </div>
      </section>
    </div>
  );
}
