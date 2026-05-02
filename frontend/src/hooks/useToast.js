import { useState, useCallback } from 'react';
export function useToast(duration=3000){
  const [toast,setToast]=useState({visible:false,message:'',type:'success'});
  const show=useCallback((message,type='success')=>{
    setToast({visible:true,message,type});
    setTimeout(()=>setToast(t=>({...t,visible:false})),duration);
  },[duration]);
  const hide=useCallback(()=>setToast(t=>({...t,visible:false})),[]);
  return {toast,show,hide};
}