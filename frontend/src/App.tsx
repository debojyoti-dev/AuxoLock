import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AdminPage } from "./pages/AdminPage";
import { CreateLeasePage } from "./pages/CreateLeasePage";
import { DashboardPage } from "./pages/DashboardPage";
import { DepositFundsPage } from "./pages/DepositFundsPage";
import { LandingPage } from "./pages/LandingPage";
import { SettlementViewPage } from "./pages/SettlementViewPage";

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/create-lease" element={<CreateLeasePage />} />
        <Route path="/deposit-funds" element={<DepositFundsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/settlement" element={<SettlementViewPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
