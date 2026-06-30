import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import InvoicesPage from './pages/invoices/InvoicesPage';
import CreateInvoicePage from './pages/invoices/CreateInvoicePage';
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage';
import SettingsPage from './pages/SettingsPage';
import PayInvoicePage from './pages/PayInvoicePage';
import { Providers } from './lib/providers';

function App() {
  return (
    <BrowserRouter>
      <Providers>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/invoices/create" element={<CreateInvoicePage />} />
          <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/pay/:id" element={<PayInvoicePage />} />
        </Routes>
      </Providers>
    </BrowserRouter>
  );
}

export default App;
