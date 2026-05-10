import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import ScanPage from './pages/ScanPage';
import DashboardPage from './pages/DashboardPage';

function Nav() {
  const base = 'px-4 py-2 rounded-lg text-sm font-medium transition-colors';
  const active = 'bg-indigo-600 text-white';
  const inactive = 'text-gray-300 hover:bg-gray-700';

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center gap-6">
      <span className="font-bold text-indigo-400 text-lg mr-4">FlexSaaS · Inventario</span>
      <NavLink to="/" end className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        Escanear
      </NavLink>
      <NavLink to="/dashboard" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
        Dashboard
      </NavLink>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100">
        <Nav />
        <main className="max-w-4xl mx-auto p-6">
          <Routes>
            <Route path="/" element={<ScanPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
