import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar/Sidebar';
import styles from './MainLayout.module.css';
export default function MainLayout({role='student',user={}}){
  const [open,setOpen]=useState(false);
  return(
    <div className={styles.shell}>
      {open&&<div className={styles.overlay} onClick={()=>setOpen(false)}/>}
      <aside className={`${styles.sidebarWrap}${open?' '+styles.open:''}`}>
        <Sidebar role={role} user={user} onClose={()=>setOpen(false)}/>
      </aside>
      <div className={styles.mainArea}>
        <div className={styles.mobileBar}>
          <button className={styles.hamburger} onClick={()=>setOpen(true)} aria-label="Open menu">
            <span/><span/><span/>
          </button>
          <span className={styles.mobileLogo}>ILES<span style={{color:'#00bfa5'}}>.</span></span>
        </div>
        <Outlet/>
      </div>
    </div>
  );
}