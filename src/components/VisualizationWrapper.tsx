import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Skeleton,
  Alert,
  Fade,
  Divider,
  Chip,
} from '@mui/material';
import { Close, BarChart, Api, Analytics, Warning, ContentCopy, Check } from '@mui/icons-material';

const API_RENDER_URL = `${import.meta.env.VITE_API_BASE ?? 'http://localhost:8002'}/render`;

// Importamos el renderizador real
import { DashboardRenderer } from './DashboardRenderer';

// --- INTERFACES DEL CONTRATO V2.0 ---
interface VisualizationWrapperProps {
  data: any[];
  userQuery: string;
  vizConfig?: any;
  onBack: () => void;
}

export interface RenderPayload {
  request_id: string;
  original_query: string;
  data: any[];
  config: {
    title: string;
    chart_type: 'bar' | 'line' | 'pie' | 'donut' | 'stacked_bar';
    mapping: {
      dimension: string;
      metrics: string[];
      group_by?: string;
    };
    styles: {
      primary_color: string;
      show_grid: boolean;
      export_enabled: boolean;
    };
  };
}

// --- SKELETON DEL DASHBOARD ---
const DashboardSkeleton: React.FC = () => (
  <Box sx={{ width: '100%', mt: 2 }}>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 3, mb: 3 }}>
      {[1, 2, 3, 4].map((i) => (
        <Paper key={`kpi-${i}`} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Skeleton variant="text" width="50%" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="80%" height={40} />
        </Paper>
      ))}
    </Box>
    <Box sx={{ mb: 3 }}>
      <Paper elevation={0} sx={{ p: 3, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Skeleton variant="text" width="30%" height={30} />
          <Skeleton variant="circular" width={30} height={30} />
        </Box>
        <Skeleton variant="rectangular" width="100%" height={300} sx={{ borderRadius: 1 }} />
      </Paper>
    </Box>
  </Box>
);

// --- COMPONENTE PRINCIPAL ---
export const VisualizationWrapper: React.FC<VisualizationWrapperProps> = ({ data, userQuery, vizConfig, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<RenderPayload | null>(null);
  const [errorConfig, setErrorConfig] = useState<boolean>(false);
  const [tsxResponse, setTsxResponse] = useState<string | null>(null);
  const [tsxError, setTsxError] = useState<boolean>(false);
  const [copiedLeft, setCopiedLeft] = useState(false);
  const [copiedRight, setCopiedRight] = useState(false);

  const handleCopy = (text: string, side: 'left' | 'right') => {
    navigator.clipboard.writeText(text).then(() => {
      if (side === 'left') { setCopiedLeft(true); setTimeout(() => setCopiedLeft(false), 1800); }
      else { setCopiedRight(true); setTimeout(() => setCopiedRight(false), 1800); }
    });
  };

  useEffect(() => {
    // 0. RESET: Si alguna de las dependencias cambia, forzamos la carga y limpiamos el payload viejo
    setLoading(true);
    setPayload(null);
    setErrorConfig(false);
    setTsxResponse(null);
    setTsxError(false);

    // 1. Verificación
    if (!vizConfig || !vizConfig.mapping) {
      console.error("El backend no envió una configuración de visualización válida.");
      setErrorConfig(true);
      setLoading(false);
      return;
    }

    // 2. Construcción del Payload
    const requestPayload: RenderPayload = {
      request_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req-${Date.now()}`,
      original_query: userQuery, // <--- Ahora sí cogerá la pregunta fresca
      data: data || [],
      // ... el resto sigue igual ...
      config: {
        title: vizConfig.title || "Análisis Dinámico de Resultados",
        chart_type: vizConfig.chart_type || "bar",
        mapping: {
          dimension: vizConfig.mapping.dimension,
          metrics: vizConfig.mapping.metrics,
          group_by: vizConfig.mapping.group_by || undefined
        },
        styles: {
          primary_color: vizConfig.styles?.primary_color || "#003DA5",
          show_grid: vizConfig.styles?.show_grid ?? true,
          export_enabled: vizConfig.styles?.export_enabled ?? true
        }
      }
    };

    setPayload(requestPayload);

    // Llamada real a POST /render para obtener el TSX
    fetch(API_RENDER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((tsx) => setTsxResponse(tsx))
      .catch(() => setTsxError(true));

    const timer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, [data, vizConfig, userQuery]);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <BarChart sx={{ color: '#003DA5', fontSize: 32 }} />
          <Typography variant="h5" fontWeight={800} color="#003DA5">
            Cuadro de Mandos
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Close />}
          onClick={onBack}
          sx={{ borderRadius: 2, textTransform: 'none', borderColor: '#cbd5e1', color: '#475569' }}
        >
          Cerrar Visualización
        </Button>
      </Box>

      <Divider sx={{ mb: 4 }} />

      {errorConfig && (
        <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
          <strong>Configuración Incompleta.</strong> El motor de inteligencia artificial no pudo determinar una estructura de gráfico válida para estos datos.
        </Alert>
      )}

      {loading && !errorConfig ? (
        <Fade in timeout={500}>
          <Box>
            <Alert icon={<Api fontSize="inherit" />} severity="info" sx={{ mb: 4, borderRadius: 2 }}>
              Generando entorno visual interactivo y empaquetando contrato JSON...
            </Alert>
            <DashboardSkeleton />
          </Box>
        </Fade>
      ) : (
        payload && !errorConfig && (
          <Fade in timeout={800}>
            <Box>
              <Alert severity="success" icon={<Analytics />} sx={{ mb: 3, borderRadius: 2 }}>
                <strong>Dashboard Renderizado.</strong> El motor (LLM #3) dictó la estructura y se ha generado el contrato de datos.
              </Alert>

              {/* 1. EL GRÁFICO REAL (Arriba) */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 4,
                  borderRadius: 3,
                  border: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                  overflow: 'hidden'
                }}
              >
                <DashboardRenderer payload={payload} />
              </Paper>

              {/* 2. PETICIÓN + RESPUESTA API (lado a lado) */}
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#475569', mb: 2 }}>
                Referencia Técnica — Contrato API
              </Typography>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>

                {/* ── IZQUIERDA: Petición (Request) ── */}
                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #334155', bgcolor: '#0f172a', overflow: 'hidden' }}>
                  {/* Cabecera */}
                  <Box sx={{ px: 3, py: 1.5, borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Chip label="POST" size="small" sx={{ bgcolor: '#1d4ed8', color: '#fff', fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        /render
                      </Typography>
                    </Box>
                    <Button
                      size="small"
                      startIcon={copiedLeft ? <Check sx={{ fontSize: '14px !important' }} /> : <ContentCopy sx={{ fontSize: '14px !important' }} />}
                      onClick={() => handleCopy(JSON.stringify(payload, null, 2), 'left')}
                      sx={{ color: copiedLeft ? '#10b981' : '#64748b', textTransform: 'none', fontSize: '0.7rem', minWidth: 0, px: 1 }}
                    >
                      {copiedLeft ? 'Copiado' : 'Copiar'}
                    </Button>
                  </Box>
                  {/* Body */}
                  <Box sx={{ p: 2.5, overflowX: 'auto', maxHeight: '45vh', overflowY: 'auto' }}>
                    <Typography component="pre" sx={{ color: '#e2e8f0', fontFamily: 'monospace', margin: 0, fontSize: '0.78rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {JSON.stringify(payload, null, 2)}
                    </Typography>
                  </Box>
                </Paper>

                {/* ── DERECHA: Respuesta (Response TSX) ── */}
                <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #334155', bgcolor: '#0f172a', overflow: 'hidden' }}>
                  {/* Cabecera */}
                  <Box sx={{ px: 3, py: 1.5, borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <Chip label="200 OK" size="small" sx={{ bgcolor: '#15803d', color: '#fff', fontWeight: 700, fontSize: '0.7rem', height: 20 }} />
                      <Typography variant="caption" sx={{ color: '#94a3b8', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                        text/plain · RADIAChart.tsx
                      </Typography>
                    </Box>
                    {tsxResponse && (
                      <Button
                        size="small"
                        startIcon={copiedRight ? <Check sx={{ fontSize: '14px !important' }} /> : <ContentCopy sx={{ fontSize: '14px !important' }} />}
                        onClick={() => handleCopy(tsxResponse, 'right')}
                        sx={{ color: copiedRight ? '#10b981' : '#64748b', textTransform: 'none', fontSize: '0.7rem', minWidth: 0, px: 1 }}
                      >
                        {copiedRight ? 'Copiado' : 'Copiar'}
                      </Button>
                    )}
                  </Box>
                  {/* Body */}
                  <Box sx={{ p: 2.5, overflowX: 'auto', maxHeight: '45vh', overflowY: 'auto' }}>
                    {tsxError ? (
                      <Typography variant="caption" sx={{ color: '#f87171', fontFamily: 'monospace' }}>
                        API no disponible — inicia uvicorn en localhost:8002 para ver el TSX generado.
                      </Typography>
                    ) : tsxResponse ? (
                      <Typography component="pre" sx={{ color: '#e2e8f0', fontFamily: 'monospace', margin: 0, fontSize: '0.78rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {tsxResponse}
                      </Typography>
                    ) : (
                      <Box>
                        {[100, 80, 90, 60, 85, 70].map((w, i) => (
                          <Skeleton key={i} variant="text" width={`${w}%`} sx={{ bgcolor: '#1e293b', mb: 0.5 }} />
                        ))}
                      </Box>
                    )}
                  </Box>
                </Paper>

              </Box>

            </Box>
          </Fade>
        )
      )}
    </Container>
  );
};

export default VisualizationWrapper;
