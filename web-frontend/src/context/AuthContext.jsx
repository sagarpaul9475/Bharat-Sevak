import React, { createContext, useState, useEffect } from 'react'


export const AuthContext = createContext()


export function AuthProvider({children}){
const [user, setUser] = useState(null)


useEffect(()=>{
// placeholder: read auth from localStorage
const raw = localStorage.getItem('equalwork_user')
if(raw) setUser(JSON.parse(raw))
},[])


const login = (u)=>{ setUser(u); localStorage.setItem('equalwork_user', JSON.stringify(u)) }
const logout = ()=>{ setUser(null); localStorage.removeItem('equalwork_user') }


return (
<AuthContext.Provider value={{user, login, logout}}>
{children}
</AuthContext.Provider>
)
}