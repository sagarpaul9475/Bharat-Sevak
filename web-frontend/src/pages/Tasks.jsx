import React from 'react';

export default function Tasks() {
  // We can use a map to avoid repeating code
  const sampleTasks = ["Sample Task 1", "Sample Task 2", "Sample Task 3", "Sample Task 4", "Sample Task 5", "Sample Task 6"];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-slate-900">টাস্কসমূহ</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sampleTasks.map((task, index) => (
          // Use a proper TaskCard component here in the future
          <div key={index} className="p-4 bg-white rounded-lg shadow-sm border border-slate-200"> {/* Added border */}
            <h3 className="font-semibold text-slate-800">{task}</h3>
            <p className="text-sm text-slate-500 mt-1">A short description of the task would go here.</p>
          </div>
        ))}
      </div>
    </div>
  );
}