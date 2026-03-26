import React, { useState, useRef, useEffect } from 'react';
import { VisualizationWrapper } from './components/VisualizationWrapper';

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
interface ApiPayload {
  request_id: string;
  original_query: string;
  data: Record<string, unknown>[];
  config: {
    title: string;
    chart_type: 'bar' | 'line' | 'pie' | 'donut' | 'stacked_bar';
    mapping: { dimension: string; metrics: string[]; group_by?: string };
    styles: { primary_color: string; show_grid: boolean; export_enabled: boolean };
  };
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  text: string;
  payload?: ApiPayload;
  timestamp: string;
}

type ApiStatus = 'checking' | 'online' | 'offline';

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_LOCAL_API_BASE = 'http://localhost:8002';
const DEFAULT_CLOUD_API_BASE = 'https://radia-api.onrender.com';
const API_BASE = import.meta.env.VITE_API_BASE
  ?? (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? DEFAULT_CLOUD_API_BASE
    : DEFAULT_LOCAL_API_BASE);
const API_BASE_LABEL =
  typeof window !== 'undefined' && window.location.hostname !== 'localhost' && API_BASE.includes('localhost')
    ? 'el backend desplegado de RADIA'
    : API_BASE;

const PRESET_QUERIES = [
  'Muestra el número total de hallazgos registrados en cada instalación',
  'Muestra la evolución mensual del número total de hallazgos a lo largo del tiempo',
  'Distribución del número total de inspecciones por instalación como gráfico circular',
  'Distribución de hallazgos por nivel de importancia en formato donut',
  'Hallazgos por instalación y desglose por año de inspección apilado',
];

const LOCAL_FALLBACK: Record<string, ApiPayload> = {
  bar: {
    request_id: 'ff5c93ca-0c94-4494-ab1f-b9462d31ac9c',
    original_query: 'Muestra el número total de hallazgos registrados en cada instalación',
    data: [
      { instalacion: 'Almaraz I', total_hallazgos: 2 },
      { instalacion: 'Vandellós II', total_hallazgos: 2 },
      { instalacion: 'Almaraz II', total_hallazgos: 1 },
      { instalacion: 'Ascó I', total_hallazgos: 4 },
      { instalacion: 'Ascó II', total_hallazgos: 0 },
      { instalacion: 'Cofrentes', total_hallazgos: 2 },
      { instalacion: 'Trillo', total_hallazgos: 0 },
    ],
    config: {
      title: 'Número total de hallazgos por instalación',
      chart_type: 'bar',
      mapping: { dimension: 'instalacion', metrics: ['total_hallazgos'] },
      styles: { primary_color: '#003DA5', show_grid: true, export_enabled: true },
    },
  },
  line: {
    request_id: '814cff48-802f-4d45-a951-799e06c74734',
    original_query: 'Evolución mensual de hallazgos',
    data: [
      { mes: '2024-03-01T00:00:00+00:00', total_hallazgos: 2 },
      { mes: '2024-08-01T00:00:00+00:00', total_hallazgos: 2 },
      { mes: '2024-09-01T00:00:00+00:00', total_hallazgos: 1 },
      { mes: '2025-02-01T00:00:00+00:00', total_hallazgos: 2 },
      { mes: '2026-01-01T00:00:00+00:00', total_hallazgos: 1 },
      { mes: '2026-02-01T00:00:00+00:00', total_hallazgos: 2 },
      { mes: '2026-03-01T00:00:00+00:00', total_hallazgos: 1 },
    ],
    config: {
      title: 'Evolución Mensual de Hallazgos',
      chart_type: 'line',
      mapping: { dimension: 'mes', metrics: ['total_hallazgos'] },
      styles: { primary_color: '#003DA5', show_grid: true, export_enabled: true },
    },
  },
  pie: {
    request_id: '4658b4b0-f994-4138-bef8-a5aad85a5b06',
    original_query: 'Distribución de inspecciones por instalación',
    data: [
      { instalacion: 'Almaraz I', total_inspecciones: 2 },
      { instalacion: 'Vandellós II', total_inspecciones: 2 },
      { instalacion: 'Almaraz II', total_inspecciones: 2 },
      { instalacion: 'Ascó I', total_inspecciones: 2 },
      { instalacion: 'Ascó II', total_inspecciones: 1 },
      { instalacion: 'Cofrentes', total_inspecciones: 3 },
      { instalacion: 'Trillo', total_inspecciones: 3 },
    ],
    config: {
      title: 'Distribución de Inspecciones por Instalación',
      chart_type: 'pie',
      mapping: { dimension: 'instalacion', metrics: ['total_inspecciones'] },
      styles: { primary_color: '#003DA5', show_grid: true, export_enabled: true },
    },
  },
  donut: {
    request_id: 'd3a9f712-1b2c-4e5f-8a7b-0c1d2e3f4a5b',
    original_query: 'Distribución de hallazgos por importancia (donut)',
    data: [
      { importancia: 'Verde', total_hallazgos: 17 },
      { importancia: 'Blanco', total_hallazgos: 8 },
      { importancia: 'Amarillo', total_hallazgos: 4 },
      { importancia: 'Rojo', total_hallazgos: 1 },
    ],
    config: {
      title: 'Distribución de Hallazgos por Importancia',
      chart_type: 'donut',
      mapping: { dimension: 'importancia', metrics: ['total_hallazgos'] },
      styles: { primary_color: '#003DA5', show_grid: false, export_enabled: true },
    },
  },
  stacked_bar: {
    request_id: '2810f88e-4bdc-42f3-8412-c979fc80a63e',
    original_query: 'Hallazgos por instalación y año de inspección',
    data: [
      { instalacion: 'Cofrentes', anio: 2026, total_hallazgos: 1 },
      { instalacion: 'Ascó I', anio: 2024, total_hallazgos: 2 },
      { instalacion: 'Cofrentes', anio: 2024, total_hallazgos: 1 },
      { instalacion: 'Ascó I', anio: 2026, total_hallazgos: 2 },
      { instalacion: 'Vandellós II', anio: 2025, total_hallazgos: 2 },
      { instalacion: 'Almaraz I', anio: 2024, total_hallazgos: 2 },
      { instalacion: 'Almaraz II', anio: 2026, total_hallazgos: 1 },
    ],
    config: {
      title: 'Número total de hallazgos por instalación y año',
      chart_type: 'stacked_bar',
      mapping: { dimension: 'anio', metrics: ['total_hallazgos'], group_by: 'instalacion' },
      styles: { primary_color: '#003DA5', show_grid: true, export_enabled: true },
    },
  },
};

const HEALTHCHECK_QUERY = 'Muestra el número total de hallazgos registrados en cada instalación';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const ts = () => new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
const uid = () => Math.random().toString(36).slice(2);

function StatusSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <style>{`
        @keyframes radia-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes radia-pulse {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div style={{
        width: 18,
        height: 18,
        borderRadius: '50%',
        border: '2px solid #cbd5e1',
        borderTopColor: '#003DA5',
        animation: 'radia-spin 0.8s linear infinite',
        flexShrink: 0,
      }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#003DA5',
              display: 'block',
              animation: `radia-pulse 1.2s ease-in-out ${i * 0.18}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function generateAIText(payload: ApiPayload): string {
  const { data, config } = payload;
  const { dimension, metrics } = config.mapping;
  const count = data.length;
  const metricKey = metrics[0];
  const total = data.reduce((s, r) => s + Number(r[metricKey] ?? 0), 0);
  const avg = count > 0 ? (total / count).toFixed(2) : '0';
  const max = Math.max(...data.map((r) => Number(r[metricKey] ?? 0)));
  const maxRow = data.find((r) => Number(r[metricKey]) === max);
  return (
    `Se han encontrado ${count} registros correspondientes a diferentes ${dimension}s. ` +
    `A continuación, se presenta el número total de ${metricKey.replace(/_/g, ' ')} registrados en cada una:\n\n` +
    `En resumen, el total de ${metricKey.replace(/_/g, ' ')} registrados en todas las instalaciones es **${total}**. ` +
    `El promedio de ${metricKey.replace(/_/g, ' ')} por instalación es de **${avg}**, ` +
    `con un mínimo de **0** y un máximo de **${max}** hallazgos` +
    (maxRow ? ` en ${maxRow[dimension]}` : '') + `.`
  );
}

function exportCSV(payload: ApiPayload) {
  const { data, config } = payload;
  const headers = Object.keys(data[0] ?? {});
  const csv = [headers.join(','), ...data.map((r) => headers.map((h) => String(r[h] ?? '')).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
    download: `${config.title.replace(/\s+/g, '_')}.csv`,
  });
  a.click();
}

// ─────────────────────────────────────────────────────────────────────────────
// Iconos SVG reutilizables
// ─────────────────────────────────────────────────────────────────────────────

// Icono RADIA: target/radar de 3 círculos concéntricos con marcas de cuadrante
const RadiaIcon = () => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="10" stroke="#003DA5" strokeWidth="1.4" />
    <circle cx="11" cy="11" r="5.5" stroke="#003DA5" strokeWidth="1.4" />
    <circle cx="11" cy="11" r="2" fill="#003DA5" />
    <line x1="11" y1="1" x2="11" y2="3.5" stroke="#003DA5" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="11" y1="18.5" x2="11" y2="21" stroke="#003DA5" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="1" y1="11" x2="3.5" y2="11" stroke="#003DA5" strokeWidth="1.4" strokeLinecap="round" />
    <line x1="18.5" y1="11" x2="21" y2="11" stroke="#003DA5" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);

const IconTrash = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
  </svg>
);
const IconInfo = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const IconSettings = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);
const IconLogout = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#e03131" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IconBarChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);
const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const IconGlobe = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#003DA5" strokeWidth="2" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);
const IconChevron = ({ up }: { up: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round">
    {up ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponente: Header RADIA
// ─────────────────────────────────────────────────────────────────────────────
interface HeaderProps {
  showActions?: boolean;
  onClear?: () => void;
  onLogout?: () => void;
  apiStatus?: ApiStatus;
}

function RadiaHeader({ showActions = false, onClear, onLogout, apiStatus }: HeaderProps) {
  return (
    <header style={{
      height: 56,
      background: '#fff',
      borderBottom: '1px solid #e8ecf0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      flexShrink: 0,
      fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
    }}>
      {/* ── Izquierda: logos ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Badge CSN */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          border: '1.5px solid #003DA5', padding: '4px 7px',
          height: 36, boxSizing: 'border-box',
        }}>
          {/* Sello nuclear simplificado */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#003DA5" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="3.5" fill="#003DA5" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="#003DA5" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
            <span style={{ fontSize: 7.5, fontWeight: 700, color: '#003DA5', letterSpacing: 0.3 }}>CONSEJO DE</span>
            <span style={{ fontSize: 7.5, fontWeight: 700, color: '#003DA5', letterSpacing: 0.3 }}>SEGURIDAD</span>
            <span style={{ fontSize: 7.5, fontWeight: 700, color: '#003DA5', letterSpacing: 0.3 }}>NUCLEAR</span>
          </div>
        </div>

        {/* Divisor */}
        <div style={{ width: 1, height: 30, background: '#dde1e7' }} />

        {/* Marca RADIA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <RadiaIcon />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#1a1a2e', letterSpacing: 0.5 }}>
              RADIA
            </span>
            <span style={{ fontSize: 7.5, color: '#6b7280', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 1 }}>
              Recuperación Automática de Datos con IA
            </span>
          </div>
        </div>
      </div>

      {/* ── Derecha: acciones + usuario ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        {/* Badge estado API */}
        {apiStatus && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '3px 9px', borderRadius: 20, marginRight: 6,
            background: apiStatus === 'online' ? '#f0fdf4' : apiStatus === 'offline' ? '#fef2f2' : '#fffbeb',
            border: `1px solid ${apiStatus === 'online' ? '#bbf7d0' : apiStatus === 'offline' ? '#fecaca' : '#fde68a'}`,
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: apiStatus === 'online' ? '#22c55e' : apiStatus === 'offline' ? '#ef4444' : '#f59e0b',
              boxShadow: apiStatus === 'checking' ? '0 0 0 2px #fde68a' : undefined,
            }} />
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: 0.3,
              color: apiStatus === 'online' ? '#16a34a' : apiStatus === 'offline' ? '#dc2626' : '#b45309',
            }}>
              {apiStatus === 'online' ? 'API Online' : apiStatus === 'offline' ? 'API Offline' : 'Conectando…'}
            </span>
          </div>
        )}
        {showActions && (
          <>
            <button
              onClick={onClear}
              style={{ ...hdrBtn, gap: 5, paddingRight: 10 }}
              title="Limpiar conversación"
            >
              <IconTrash />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>Limpiar</span>
            </button>
            <button style={hdrBtn} title="Información"><IconInfo /></button>
            <button style={hdrBtn} title="Configuración"><IconSettings /></button>
            <div style={{ width: 1, height: 24, background: '#dde1e7', margin: '0 6px' }} />
          </>
        )}

        {/* Nombre usuario */}
        <div style={{ textAlign: 'right', marginRight: 8 }}>
          <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.2 }}>Conectado como</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1a1a2e', letterSpacing: 0.2 }}>
            JOAQUIN HERRERO PINTADO
          </div>
        </div>

        {/* Avatar */}
        <div style={{
          width: 30, height: 30, borderRadius: '50%',
          background: '#003DA5', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, flexShrink: 0,
          fontFamily: "'IBM Plex Sans', sans-serif",
        }}>J</div>

        {/* Logout */}
        <button style={{ ...hdrBtn, marginLeft: 2 }} title="Cerrar sesión" onClick={onLogout}><IconLogout /></button>
      </div>
    </header>
  );
}

const hdrBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  padding: '5px 6px', borderRadius: 6, color: '#6b7280',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Login gate
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (user === 'radia' && pass === 'radia-anhela') {
      sessionStorage.setItem('radia_auth', '1');
      onLogin();
    } else {
      setError(true);
    }
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#f5f6f8',
      fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
    }}>
      <div style={{
        background: '#fff', borderRadius: 12, padding: '40px 36px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)', width: 360,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <RadiaIcon />
          <span style={{ fontWeight: 800, fontSize: 18, color: '#003DA5', letterSpacing: '0.04em' }}>RADIA</span>
          <span style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>· CSN</span>
        </div>

        <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 24px' }}>
          Accede con tus credenciales para continuar.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              Usuario
            </label>
            <input
              value={user}
              onChange={(e) => { setUser(e.target.value); setError(false); }}
              placeholder="radia"
              autoComplete="username"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                borderRadius: 8, border: error ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                fontSize: 14, outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
              Contraseña
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setError(false); }}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                width: '100%', boxSizing: 'border-box', padding: '9px 12px',
                borderRadius: 8, border: error ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                fontSize: 14, outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 12, color: '#ef4444', margin: '-12px 0 16px', textAlign: 'center' }}>
              Credenciales incorrectas
            </p>
          )}

          <button
            type="submit"
            style={{
              width: '100%', padding: '10px', borderRadius: 8,
              background: '#003DA5', color: '#fff', fontWeight: 700,
              fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    sessionStorage.getItem('radia_auth') === '1'
  );
  const [apiStatus, setApiStatus] = useState<ApiStatus>('checking');
  const [view, setView] = useState<'chat' | 'dashboard'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [activePayload, setActivePayload] = useState<ApiPayload | null>(null);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isServiceReady = apiStatus === 'online';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    let cancelled = false;

    const checkServices = async () => {
      const queryController = new AbortController();
      const renderController = new AbortController();
      const timeout = window.setTimeout(() => {
        queryController.abort();
        renderController.abort();
      }, 8000);

      try {
        const queryRes = await fetch(`${API_BASE}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: HEALTHCHECK_QUERY }),
          cache: 'no-store',
          signal: queryController.signal,
        });
        if (!queryRes.ok) throw new Error('query_unavailable');

        await queryRes.json() as ApiPayload;

        const renderRes = await fetch(`${API_BASE}/render`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(LOCAL_FALLBACK.bar),
          cache: 'no-store',
          signal: renderController.signal,
        });
        if (!renderRes.ok) throw new Error('render_unavailable');

        if (!cancelled) {
          setApiStatus('online');
        }
      } catch {
        if (!cancelled) {
          setApiStatus('offline');
        }
      } finally {
        window.clearTimeout(timeout);
      }
    };

    checkServices();
    const interval = window.setInterval(checkServices, apiStatus === 'online' ? 30000 : 5000);
    window.addEventListener('focus', checkServices);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', checkServices);
    };
  }, [apiStatus]);

  function handleLogout() {
    sessionStorage.removeItem('radia_auth');
    setIsAuthenticated(false);
    setView('chat');
    setMessages([]);
    setActivePayload(null);
    setQuery('');
    setExpandedId(null);
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  async function submitQuery(q: string) {
    if (!q.trim() || isLoading || !isServiceReady) return;
    setMessages((p) => [...p, { id: uid(), type: 'user', text: q, timestamp: ts() }]);
    setQuery('');
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      if (!res.ok) throw new Error();
      const payload: ApiPayload = await res.json();
      setMessages((p) => [...p, { id: uid(), type: 'ai', text: generateAIText(payload), payload, timestamp: ts() }]);
    } catch {
      setApiStatus('offline');
      setMessages((p) => [
        ...p,
        {
          id: uid(),
          type: 'ai',
          text: `No se pudo completar la consulta porque alguno de los servicios de RADIA dejó de estar disponible. Se seguirá reintentando automáticamente contra ${API_BASE_LABEL}.`,
          timestamp: ts(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Vista: Cuadro de Mandos ────────────────────────────────────────────────
  if (view === 'dashboard' && activePayload) {
    return (
      <div style={{ minHeight: '100vh', background: '#f5f6f8', fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif" }}>
        <RadiaHeader showActions={false} apiStatus={apiStatus} onLogout={handleLogout} />
        <VisualizationWrapper
          data={activePayload.data}
          userQuery={activePayload.original_query}
          vizConfig={activePayload.config}
          onBack={() => setView('chat')}
        />
      </div>
    );
  }

  // ── Vista: Chat ────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#f5f6f8', fontFamily: "'IBM Plex Sans', 'Segoe UI', sans-serif",
    }}>
      <RadiaHeader showActions onClear={() => setMessages([])} apiStatus={apiStatus} onLogout={handleLogout} />

      {/* Área de chat */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 0 12px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 20px' }}>
          {!isServiceReady && (
            <div style={{
              marginBottom: 20,
              background: '#fff',
              border: `1px solid ${apiStatus === 'offline' ? '#fecaca' : '#fde68a'}`,
              borderRadius: 12,
              padding: '16px 18px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: apiStatus === 'offline' ? '#b91c1c' : '#92400e',
                marginBottom: 6,
              }}>
                <StatusSpinner />
                {apiStatus === 'offline'
                  ? 'Servicios no disponibles'
                  : 'Verificando disponibilidad de servicios'}
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: '#475569' }}>
                {apiStatus === 'offline'
                  ? `RADIA no permite consultas hasta confirmar conexión con ${API_BASE_LABEL}. El sistema seguirá reintentándolo automáticamente en segundo plano.`
                  : 'Se está comprobando la API antes de habilitar consultas y visualizaciones. No es necesario refrescar la página.'}
              </p>
            </div>
          )}

          {/* Estado vacío */}
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 56 }}>
              <div style={{ marginBottom: 6 }}>
                <RadiaIcon />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', margin: '8px 0 4px' }}>
                Sistema RADIA — Motor de Análisis IA
              </p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 28px' }}>
                Formule una consulta técnica sobre los datos de inspección del CSN.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxWidth: 580, margin: '0 auto' }}>
                {PRESET_QUERIES.map((q) => (
                  <button
                    key={q}
                    onClick={() => submitQuery(q)}
                    style={{
                      background: '#fff', border: '1px solid #e2e6eb',
                      borderRadius: 8, padding: '11px 18px',
                      fontSize: 13, color: '#374151',
                      cursor: isServiceReady ? 'pointer' : 'not-allowed',
                      textAlign: 'left', fontFamily: 'inherit',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                      transition: 'border-color 0.15s, background 0.15s',
                      opacity: isServiceReady ? 1 : 0.55,
                    }}
                    onMouseEnter={(e) => {
                      if (!isServiceReady) return;
                      e.currentTarget.style.background = '#f0f4ff';
                      e.currentTarget.style.borderColor = '#003DA5';
                    }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e6eb'; }}
                    disabled={!isServiceReady}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mensajes */}
          {messages.map((msg) => (
            <div key={msg.id} style={{ marginBottom: 20 }}>
              {msg.type === 'user' ? (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ maxWidth: '65%' }}>
                    <div style={{
                      background: '#003DA5', color: '#fff',
                      padding: '11px 16px',
                      borderRadius: '14px 14px 2px 14px',
                      fontSize: 14, lineHeight: 1.55,
                    }}>
                      {msg.text}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ maxWidth: '90%', minWidth: 480 }}>
                    <div style={{
                      background: '#fff',
                      border: '1px solid #e8ecf0',
                      borderRadius: '2px 14px 14px 14px',
                      padding: '18px 20px 12px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                    }}>
                      {/* Texto */}
                      <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.65, margin: '0 0 14px' }}>
                        {msg.text.split('**').map((part, i) =>
                          i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
                        )}
                      </p>

                      {/* Tabla */}
                      {msg.payload && (
                        <div style={{ borderRadius: 6, overflow: 'hidden', border: '1px solid #e8ecf0', marginBottom: 16 }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead>
                              <tr>
                                {Object.keys(msg.payload.data[0] ?? {}).map((col) => (
                                  <th key={col} style={{
                                    background: '#003DA5', color: '#fff',
                                    padding: '9px 14px', textAlign: 'left',
                                    fontWeight: 600, fontSize: 12, letterSpacing: 0.2,
                                  }}>
                                    {col.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {msg.payload.data.map((row, i) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fb' }}>
                                  {Object.values(row).map((val, j) => (
                                    <td key={j} style={{
                                      padding: '8px 14px',
                                      borderBottom: '1px solid #f0f2f5',
                                      color: '#374151', fontSize: 13,
                                    }}>
                                      {String(val)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Botones */}
                      {msg.payload && (
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                          <button
                            onClick={() => { setActivePayload(msg.payload!); setView('dashboard'); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 7,
                              background: '#003DA5', color: '#fff', border: 'none',
                              borderRadius: 7, padding: '9px 16px',
                              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            <IconBarChart />
                            Ver Cuadro de Mandos
                          </button>
                          <button
                            onClick={() => exportCSV(msg.payload!)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 7,
                              background: '#fff', color: '#003DA5',
                              border: '1.5px solid #003DA5',
                              borderRadius: 7, padding: '9px 16px',
                              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            <IconDownload />
                            Exportar a Excel
                          </button>
                        </div>
                      )}

                      {/* Explicabilidad técnica */}
                      {msg.payload && (
                        <div style={{ borderTop: '1px solid #f0f2f5', paddingTop: 8 }}>
                          <button
                            onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              width: '100%', background: 'none', border: 'none',
                              cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit',
                            }}
                          >
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <IconGlobe />
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#003DA5', letterSpacing: 1, textTransform: 'uppercase' }}>
                                Explicabilidad Técnica
                              </span>
                            </span>
                            <IconChevron up={expandedId === msg.id} />
                          </button>
                          {expandedId === msg.id && (
                            <div style={{ paddingTop: 10, fontSize: 12, color: '#4b5563', lineHeight: 1.7 }}>
                              <strong>Motor:</strong> LLM #3 — tipo inferido:{' '}
                              <code style={{ background: '#f0f4ff', color: '#003DA5', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>
                                {msg.payload.config.chart_type}
                              </code>
                              <br />
                              <strong>Dimensión:</strong> {msg.payload.config.mapping.dimension} &nbsp;
                              <strong>Métricas:</strong> {msg.payload.config.mapping.metrics.join(', ')}
                              {msg.payload.config.mapping.group_by && (
                                <><br /><strong>Agrupación:</strong> {msg.payload.config.mapping.group_by}</>
                              )}
                              <br />
                              <strong>Request ID:</strong>{' '}
                              <code style={{ fontSize: 10, color: '#9ca3af' }}>{msg.payload.request_id}</code>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{msg.timestamp}</div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
              <div style={{
                background: '#fff', border: '1px solid #e8ecf0',
                borderRadius: '2px 14px 14px 14px',
                padding: '14px 20px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}>
                <div className="radia-typing" style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Barra de input */}
      <div style={{
        background: '#fff', borderTop: '1px solid #e8ecf0', padding: '14px 20px', flexShrink: 0,
      }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            style={{
              flex: 1, border: '1.5px solid #e2e6eb', borderRadius: 10,
              padding: '12px 18px', fontSize: 14, fontFamily: 'inherit',
              outline: 'none', background: '#f9fafb', color: '#1a1a2e',
            }}
            placeholder="Formule su consulta técnica..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitQuery(query)}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#003DA5'; e.currentTarget.style.background = '#fff'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e6eb'; e.currentTarget.style.background = '#f9fafb'; }}
            disabled={isLoading || !isServiceReady}
          />
          <button
            onClick={() => submitQuery(query)}
            disabled={!query.trim() || isLoading || !isServiceReady}
            style={{
              background: '#003DA5', color: '#fff', border: 'none',
              borderRadius: 10, padding: '12px 16px',
              cursor: (!query.trim() || isLoading || !isServiceReady) ? 'not-allowed' : 'pointer',
              opacity: (!query.trim() || isLoading || !isServiceReady) ? 0.45 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'opacity 0.15s',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
