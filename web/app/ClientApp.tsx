'use client';

import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import App from '../src/App';

export default function ClientApp() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <main className="night-void" aria-busy="true" aria-label="正在进入夜郎国">
        <div className="route-loading" role="status">正在点亮谷中灯火…</div>
      </main>
    );
  }

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
