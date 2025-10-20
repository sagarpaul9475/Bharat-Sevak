import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Routine from './pages/Routine'
import Tasks from './pages/Tasks'
import Marketplace from './pages/Marketplace'


export default function App(){
return (
<div className="min-h-screen flex flex-col">
<Navbar />
<main className="flex-1 container mx-auto px-4 py-6">
<Routes>
<Route path="/" element={<Home/>} />
<Route path="/routine" element={<Routine/>} />
<Route path="/tasks" element={<Tasks/>} />
<Route path="/marketplace" element={<Marketplace/>} />
</Routes>
</main>
<Footer />
</div>
)
}