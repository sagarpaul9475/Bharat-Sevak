import React from 'react'


export default function TaskCard({task}){
if(!task) return (
<div className="p-4 bg-white rounded shadow">
কোনো টাস্ক নেই।
</div>
)


return (
<div className="p-4 bg-white rounded shadow">
<h3 className="font-semibold">{task.title}</h3>
<p className="text-sm text-gray-600">{task.description}</p>
<div className="mt-3 flex items-center justify-between">
<div className="text-xs text-gray-500">মূল্য: ₹{task.productionValue ?? 0}</div>
<button className="px-3 py-1 bg-blue-600 text-white rounded">কাজ শুরু করুন</button>
</div>
</div>
)
}