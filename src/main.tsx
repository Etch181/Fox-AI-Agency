import React from 'react';

class FoxRenderErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
 state={error:null as Error|null};
 static getDerivedStateFromError(error:Error){return {error};}
 componentDidCatch(error:Error,info:React.ErrorInfo){console.error("[FOX UI] Render crash:",error,info);}
 render(){if(this.state.error)return <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#020617",color:"#e2e8f0",padding:24,fontFamily:"Cairo, sans-serif"}}><div style={{maxWidth:720,width:"100%",border:"1px solid #7f1d1d",borderRadius:20,padding:24,background:"#0f172a"}}><h1>حدث خطأ في تحميل FOX AI AGENCY</h1><p>تم منع الشاشة البيضاء. اضغط إعادة المحاولة.</p><button onClick={()=>window.location.reload()} style={{padding:"10px 18px",borderRadius:12,border:0,background:"#f97316",color:"#fff",fontWeight:800}}>إعادة المحاولة</button><details><summary>تفاصيل الخطأ</summary><pre>{this.state.error.message}</pre></details></div></div>;return this.props.children;}
}
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { testFirebaseConnection } from './services/firebase.ts';

testFirebaseConnection();

createRoot(document.getElementById('root')!).render(
  <FoxRenderErrorBoundary>
    <StrictMode>
      <App />
    </StrictMode>
  </FoxRenderErrorBoundary>,
);

