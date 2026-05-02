import client from './client';
export const authService = {
  login:async({email,password})=>{
    const{data}=await client.post('/auth/login/',{email,password});
    if(data.access)  localStorage.setItem('iles_access_token',data.access);
    if(data.refresh) localStorage.setItem('iles_refresh_token',data.refresh);
    return data;
  },
  signup:async(payload)=>{
    const {
      email,
      password,
      confirmPassword,
      role,
      fullName,
      registration_number,
      programme,
      academic_year,
    } = payload;
    const{data}=await client.post('/auth/signup/',{
      email,
      password,
      confirm_password:confirmPassword,
      role,
      full_name:fullName,
      registration_number,
      programme,
      academic_year,
    });
    if(data.access)  localStorage.setItem('iles_access_token',data.access);
    if(data.refresh) localStorage.setItem('iles_refresh_token',data.refresh);
    return data;
  },
  logout:async()=>{
    const refresh = localStorage.getItem('iles_refresh_token');
    try{await client.post('/auth/logout/');}
    catch {
      if (refresh) {
        await client.post('/auth/logout/', { refresh });
      }
    }
    finally{localStorage.removeItem('iles_access_token');localStorage.removeItem('iles_refresh_token');}
  },
  refreshToken:async()=>{
    const refresh=localStorage.getItem('iles_refresh_token');
    const{data}=await client.post('/auth/token/refresh/',{refresh});
    localStorage.setItem('iles_access_token',data.access);
    return data.access;
  },
  forgotPassword:async(email)=>{const{data}=await client.post('/auth/password-reset/',{email});return data;},
};
