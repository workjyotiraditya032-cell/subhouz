import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Toaster } from "sonner";

import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";

import HomePage from "./pages/HomePage";
import HostelListingPage from "./pages/HostelListingPage";
import HostelDetailPage from "./pages/HostelDetailPage";
import LoginPage from "./pages/LoginPage";
import SearchResults from "./components/search/SearchResults";
import { SearchProvider } from "./contexts/SearchContext";
import { MapProvider } from "./contexts/MapContext";

import DashboardPage from "./pages/DashboardPage";
import HostelsPage from "./pages/HostelsPage";
import RoomsPage from "./pages/RoomsPage";
import ResidentsPage from "./pages/ResidentsPage";
import RentTrackerPage from "./pages/RentTrackerPage";
import EnquiriesPage from "./pages/EnquiriesPage";
import ElectricityPage from "./pages/ElectricityPage";
import AutomationPage from "./pages/AutomationPage";
import WebsiteImagesPage from "./pages/WebsiteImagesPage";
import AdminManagementPage from "./pages/AdminManagementPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  return (
    <AuthProvider>
      <SearchProvider>
        <MapProvider>
          <BrowserRouter>
            <Routes>

              {/* Public Routes */}

              <Route path="/" element={<HomePage />} />
              <Route path="/hostels" element={<HostelListingPage />} />
              <Route path="/search" element={<SearchResults />} />
              <Route
                path="/hostels/:hostelId"
                element={<HostelDetailPage />}
              />
              <Route path="/login" element={<LoginPage />} />

          {/* Dashboard */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />

            <Route path="hostels" element={<HostelsPage />} />
            <Route path="rooms" element={<RoomsPage />} />
            <Route path="residents" element={<ResidentsPage />} />
            <Route path="rent-tracker" element={<RentTrackerPage />} />
            <Route path="enquiries" element={<EnquiriesPage />} />
            <Route path="electricity" element={<ElectricityPage />} />
            <Route path="automation" element={<AutomationPage />} />

            {/* Website Images */}
            <Route
              path="website-images"
              element={<WebsiteImagesPage />}
            />

            <Route
              path="admin-management"
              element={<AdminManagementPage />}
            />

            <Route
              path="settings"
              element={<SettingsPage />}
            />
          </Route>

          {/* 404 */}

          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
          </BrowserRouter>
        </MapProvider>
      </SearchProvider>

      <Toaster
        position="top-right"
        richColors
        closeButton
      />
    </AuthProvider>
  );
}

export default App;