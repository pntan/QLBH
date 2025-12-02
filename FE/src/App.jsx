import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SideBar from "./component/sidebar/sidebar";
// Giả sử apiService.js nằm trong thư mục utils
import { checkAuthStatus } from './utils/apiService'; 

import "./css/app.css";

import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import Sanpham from "./pages/sanpham";

// ===============================================
// 1. HELPER COMPONENTS ĐỂ BẢO VỆ ROUTE
// ===============================================

// Dùng cho các route yêu cầu đăng nhập (Dashboard, Sanpham,...)
const ProtectedRoute = ({ element, isLoggedIn }) => {
  if (isLoggedIn === false) {
    return <Navigate to="/login" replace />;
  }
  return element;
};

// Dùng cho các route công khai (Login, Register,...)
const PublicRoute = ({ element, isLoggedIn }) => {
    // Nếu đã đăng nhập và cố truy cập /login, chuyển về /dashboard
    if (isLoggedIn === true) {
        return <Navigate to="/" replace />; // Chuyển về route gốc (Dashboard)
    }
    return element;
};

// Component Loading đơn giản
const LoadingScreen = () => (
    <div style={{ padding: '50px', fontSize: '24px' }}>
        Đang kiểm tra trạng thái đăng nhập...
    </div>
);

// ===============================================
// 2. APP COMPONENT CHÍNH
// ===============================================

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Ổn định hàm kiểm tra Auth
  const verifyAuth = useCallback(async () => {
    try {
        await checkAuthStatus(); 
        setIsLoggedIn(true);
    } catch (error) {
        setIsLoggedIn(false);
    } finally {
        setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    // Chỉ chạy lần đầu khi mount
    if (isLoggedIn === null && loadingInitial) {
        verifyAuth();
    }
  }, [verifyAuth, isLoggedIn, loadingInitial]);

  // HÀM BÁO HIỆU: Cập nhật trạng thái và buộc kiểm tra lại Auth
  const handleLoginSuccess = useCallback(() => {
      // Đặt lại loading và buộc kiểm tra Auth để đọc cookie mới
      setLoadingInitial(true); 
      verifyAuth();
  }, [verifyAuth]);
  
  if (loadingInitial) {
    return <LoadingScreen />;
  }

  // Nếu đã xác định trạng thái, render ứng dụng
  return (
    <BrowserRouter>
      {/* Chỉ hiển thị SideBar nếu đã đăng nhập */}
      {isLoggedIn && <SideBar handleLoginSuccess={handleLoginSuccess} />} 

      <Suspense fallback={<div>ĐANG TẢI NỘI DUNG...</div>}>
          <Routes>
              
              {/* 1. ROUTE CÔNG KHAI (Login/Register) */}
              <Route 
                  path="/login" 
                  element={
                      <PublicRoute 
                          isLoggedIn={isLoggedIn} 
                          element={<Login handleLoginSuccess={handleLoginSuccess} />} 
                      />
                  } 
              />
              
              {/* 2. ROUTE BẢO VỆ (Dashboard, Sanpham) */}
              {/* Route gốc: '/' */}
              <Route 
                  path="/" 
                  element={
                      <ProtectedRoute 
                          isLoggedIn={isLoggedIn} 
                          element={<Dashboard />} 
                      />
                  } 
              />
              <Route 
                  path="/dashboard" 
                  element={
                      <ProtectedRoute 
                          isLoggedIn={isLoggedIn} 
                          element={<Dashboard />} 
                      />
                  } 
              />

              <Route 
                  path="/sanpham" 
                  element={
                      <ProtectedRoute 
                          isLoggedIn={isLoggedIn} 
                          element={<Sanpham />} 
                      />
                  } 
              />
              
              {/* 3. FALLBACK/404 */}
              <Route path="*" element={<Navigate to="/" replace />} /> 

          </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;