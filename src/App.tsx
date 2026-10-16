import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HomePage } from './pages/HomePage';
import { AdminPage } from './pages/AdminPage';
import { ScannerPage } from './pages/ScannerPage';
import { TicketViewPage } from './pages/TicketViewPage';
import { MyTicketsSearchPage } from './pages/MyTicketsSearchPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 1. Módulo Público de Vendas */}
          <Route path="/" element={<HomePage />} />

          {/* 2. Módulo Administrativo Protegido */}
          <Route path="/admin" element={<AdminPage />} />

          {/* 3. Módulo Scanner de Portaria Mobile */}
          <Route path="/scanner" element={<ScannerPage />} />

          {/* Página do Ingresso Digital VIP com QR Code único */}
          <Route path="/ingresso/:token" element={<TicketViewPage />} />

          {/* Busca de Ingressos por CPF + WhatsApp */}
          <Route path="/meus-ingressos" element={<MyTicketsSearchPage />} />

          {/* Fallback de rotas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
