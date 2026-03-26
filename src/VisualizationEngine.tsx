import React, { useState, useCallback, useMemo } from 'react';
import type { ApexOptions } from 'apexcharts';
import ReactApexChart from 'react-apexcharts';
import {
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie as RePie,
  Cell as ReCell,
  Tooltip as ReTooltip,
  Legend as ReLegend,
} from 'recharts';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Tooltip,
  Chip,
  Divider,
  Alert,
} from '@mui/material';
import {
  FileDownload,
  GridOn,
  GridOff,
  ErrorOutline,
  BarChart,
  ShowChart,
  PieChart,
  DonutLarge,
  StackedBarChart,
} from '@mui/icons-material';

// ─────────────────────────────────────────────────────────────────────────────
// CONTRATO JSON v2.0 (tal cual define el documento de RADIA)
// ─────────────────────────────────────────────────────────────────────────────

export interface RenderPayload {
  request_id: string;
  original_query: string;
  data: Record<string, unknown>[];
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

interface VisualizationEngineProps {
  payload: RenderPayload;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEMÁNTICA DE COLORES — Obligatorio para hallazgos del CSN
// ─────────────────────────────────────────────────────────────────────────────

const IMPORTANCIA_COLORS: Record<string, string> = {
  Verde: '#80C342',
  Blanco: '#cbd5e1',
  Amarillo: '#F7931D',
  Rojo: '#ED1C24',
  // Fallbacks en inglés por si acaso
  Green: '#80C342',
  White: '#cbd5e1',
  Yellow: '#F7931D',
  Red: '#ED1C24',
};

const IMPORTANCIA_LABELS: Record<string, string> = {
  Verde: 'Muy baja',
  Blanco: 'Baja a moderada',
  Amarillo: 'Sustancial',
  Rojo: 'Alta',
  Green: 'Muy baja',
  White: 'Baja a moderada',
  Yellow: 'Sustancial',
  Red: 'Alta',
};

function formatImportanceLabel(label: string): string {
  return IMPORTANCIA_LABELS[label] ?? label;
}

const CHART_COLORS = [
  '#003DA5',
  '#4D88DB',
  '#002764',
  '#80AAE6',
  '#001F52',
  '#B3CCF0',
];

function formatDimensionLabel(value: string): string {
  if (/^\d{4}-\d{2}$/.test(value)) {
    const date = new Date(`${value}-01T00:00:00Z`);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    }
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    }
  }

  return value;
}

/** Genera una paleta armónica a partir del color primario cuando no hay semántica de colores */
function generatePalette(primaryColor: string, count: number): string[] {
  const basePalette = primaryColor === CHART_COLORS[0]
    ? CHART_COLORS
    : [primaryColor, ...CHART_COLORS.filter((color) => color !== primaryColor)];
  return Array.from({ length: count }, (_, i) => basePalette[i % basePalette.length]);
}

// ─────────────────────────────────────────────────────────────────────────────
// ICONO POR TIPO DE GRÁFICO
// ─────────────────────────────────────────────────────────────────────────────

const ChartIcon: React.FC<{ type: RenderPayload['config']['chart_type'] }> = ({ type }) => {
  const icons = {
    bar: <BarChart sx={{ fontSize: 18 }} />,
    line: <ShowChart sx={{ fontSize: 18 }} />,
    pie: <PieChart sx={{ fontSize: 18 }} />,
    donut: <DonutLarge sx={{ fontSize: 18 }} />,
    stacked_bar: <StackedBarChart sx={{ fontSize: 18 }} />,
  };
  return icons[type] ?? <BarChart sx={{ fontSize: 18 }} />;
};

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA DE TRANSFORMACIÓN DE DATOS → SERIES DE APEXCHARTS
// ─────────────────────────────────────────────────────────────────────────────

function buildChartOptions(
  payload: RenderPayload,
  showGrid: boolean,
): { series: ApexOptions['series']; options: ApexOptions } {
  const { data, config } = payload;
  const { chart_type, mapping, styles } = config;
  const { dimension, metrics, group_by } = mapping;
  const primaryColor = styles.primary_color || '#003DA5';

  // ── Opciones base comunes ──────────────────────────────────────────────────
  const baseOptions: ApexOptions = {
    chart: {
      toolbar: { show: false },
      background: 'transparent',
      animations: { enabled: false },
    },
    tooltip: {
      theme: 'light',
    },
    legend: {
      show: true,
      position: 'bottom',
    },
    grid: {
      show: showGrid,
      borderColor: '#e2e8f0',
    },
  };

  // ── PIE / DONUT ────────────────────────────────────────────────────────────
  if (chart_type === 'pie' || chart_type === 'donut') {
    const rawLabels = data.map((row) => String(row[dimension] ?? ''));
    const labels = rawLabels.map((label) => formatImportanceLabel(label));
    const values = data.map((row) => Number(row[metrics[0]] ?? 0));
    const colors = rawLabels.map(
      (label) => IMPORTANCIA_COLORS[label] ?? generatePalette(primaryColor, rawLabels.length)[rawLabels.indexOf(label)],
    );

    return {
      series: values as number[],
      options: {
        ...baseOptions,
        chart: { ...baseOptions.chart, type: chart_type === 'donut' ? 'donut' : 'pie' },
        labels,
        colors,
        dataLabels: { enabled: true },
      },
    };
  }

  // ── STACKED BAR (con group_by) ─────────────────────────────────────────────
  if (chart_type === 'stacked_bar' && group_by) {
    const categories = [...new Set(data.map((row) => formatDimensionLabel(String(row[dimension] ?? ''))))];
    const groups = [...new Set(data.map((row) => String(row[group_by] ?? '')))];
    const metric = metrics[0];

    const series = groups.map((group) => {
      const seriesData = categories.map((cat) => {
        const match = data.find(
          (row) => formatDimensionLabel(String(row[dimension] ?? '')) === cat && String(row[group_by]) === group,
        );
        return Number(match?.[metric] ?? 0);
      });
      return { name: formatImportanceLabel(group), data: seriesData };
    });

    const colors = groups.map(
      (g) => IMPORTANCIA_COLORS[g] ?? generatePalette(primaryColor, groups.length)[groups.indexOf(g)],
    );

    return {
      series,
      options: {
        ...baseOptions,
        chart: { ...baseOptions.chart, type: 'bar', stacked: true },
        colors,
        xaxis: { categories },
        plotOptions: { bar: { horizontal: false } },
        dataLabels: { enabled: false },
      },
    };
  }

  // ── BAR / LINE (múltiples métricas o una sola) ─────────────────────────────
  const categories = data.map((row) => formatDimensionLabel(String(row[dimension] ?? '')));
  const palette = generatePalette(primaryColor, metrics.length);

  const series = metrics.map((metric, idx) => ({
    name: metric.replace(/_/g, ' '),
    data: data.map((row) => Number(row[metric] ?? 0)),
    color: palette[idx],
  }));

  const apexType: 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter' = chart_type === 'line' ? 'line' : 'bar';

  return {
    series,
    options: {
      ...baseOptions,
      chart: { ...baseOptions.chart, type: apexType },
      colors: palette,
      xaxis: { categories },
      plotOptions: {
        bar: { horizontal: false },
      },
      stroke: chart_type === 'line' ? { curve: 'straight', width: 2 } : { show: false },
      markers: chart_type === 'line'
        ? { size: 5, strokeWidth: 0, colors: palette, strokeColors: palette }
        : {},
      dataLabels: { enabled: false },
      fill: { opacity: 1 },
    },
  };
}

function buildCircularChartData(payload: RenderPayload) {
  const { data, config } = payload;
  const { dimension, metrics } = config.mapping;
  const primaryColor = config.styles.primary_color || '#003DA5';
  const rawLabels = data.map((row) => String(row[dimension] ?? ''));
  const metric = metrics[0];

  return data.map((row, index) => {
    const rawLabel = String(row[dimension] ?? '');
    return {
      name: rawLabel,
      displayName: formatImportanceLabel(rawLabel),
      value: Number(row[metric] ?? 0),
      color:
        IMPORTANCIA_COLORS[rawLabel]
        ?? generatePalette(primaryColor, rawLabels.length)[index % rawLabels.length],
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN DE PAYLOAD
// ─────────────────────────────────────────────────────────────────────────────

function validatePayload(payload: RenderPayload): string | null {
  if (!payload?.config) return 'El payload no contiene el nodo config.';
  if (!payload.data || payload.data.length === 0) return 'El array data está vacío.';
  const { mapping, chart_type } = payload.config;
  if (!mapping?.dimension) return 'config.mapping.dimension no está definido.';
  if (!mapping?.metrics?.length) return 'config.mapping.metrics está vacío.';
  if (chart_type === 'stacked_bar' && !mapping.group_by)
    return 'chart_type stacked_bar requiere config.mapping.group_by.';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: VisualizationEngine
// ─────────────────────────────────────────────────────────────────────────────

export const VisualizationEngine: React.FC<VisualizationEngineProps> = ({ payload }) => {
  const [showGrid, setShowGrid] = useState(payload?.config?.styles?.show_grid ?? true);

  const validationError = useMemo(() => validatePayload(payload), [payload]);

  const { series, options } = useMemo(() => {
    if (validationError) return { series: [], options: {} };
    return buildChartOptions(payload, showGrid);
  }, [payload, showGrid, validationError]);

  const handleExport = useCallback(() => {
    // Dispara el download nativo de ApexCharts a PNG
    if (typeof window !== 'undefined') {
      const chartEl = document.querySelector(`#apex-chart-${payload.request_id} .apexcharts-canvas`);
      if (chartEl) {
        const svg = chartEl.querySelector('svg');
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          const link = document.createElement('a');
          link.download = `${payload.config.title.replace(/\s+/g, '_')}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      }
    }
  }, [payload]);

  // ── Render: Error de validación ──────────────────────────────────────────
  if (validationError) {
    return (
      <Alert
        severity="error"
        icon={<ErrorOutline />}
        sx={{ borderRadius: 2, fontFamily: "'IBM Plex Sans', sans-serif" }}
      >
        <strong>Error de contrato:</strong> {validationError}
      </Alert>
    );
  }

  const { config } = payload;
  const exportEnabled = config.styles.export_enabled;
  const isCircularChart = config.chart_type === 'pie' || config.chart_type === 'donut';
  const circularData = useMemo(
    () => (isCircularChart ? buildCircularChartData(payload) : []),
    [isCircularChart, payload],
  );

  // ── Render: Gráfico ──────────────────────────────────────────────────────
  return (
    <Paper
      elevation={0}
      sx={{
        border: '1px solid #e2e8f0',
        borderRadius: 3,
        overflow: 'hidden',
        bgcolor: '#ffffff',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      {/* ── Cabecera ── */}
      <Box
        sx={{
          px: 3,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f1f5f9',
          bgcolor: '#fafbfc',
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 1.5,
              bgcolor: config.styles.primary_color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
            }}
          >
            <ChartIcon type={config.chart_type} />
          </Box>
          <Box>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              color="#1e293b"
              sx={{ fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1.2 }}
            >
              {config.title}
            </Typography>
            <Typography
              variant="caption"
              color="#94a3b8"
              sx={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
            >
              {payload.original_query}
            </Typography>
          </Box>
        </Box>

        {/* Controles */}
        <Box display="flex" alignItems="center" gap={0.5}>
          <Chip
            label={config.chart_type.replace('_', ' ')}
            size="small"
            sx={{
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: '0.7rem',
              fontWeight: 600,
              bgcolor: '#f1f5f9',
              color: '#475569',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              mr: 1,
            }}
          />
          <Tooltip title={showGrid ? 'Ocultar cuadrícula' : 'Mostrar cuadrícula'}>
            <IconButton size="small" onClick={() => setShowGrid((v) => !v)} sx={{ color: '#94a3b8' }}>
              {showGrid ? <GridOn fontSize="small" /> : <GridOff fontSize="small" />}
            </IconButton>
          </Tooltip>
          {exportEnabled && (
            <Tooltip title="Exportar PNG">
              <IconButton size="small" onClick={handleExport} sx={{ color: '#94a3b8' }}>
                <FileDownload fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      <Divider />

      {/* ── Gráfico ── */}
      <Box p={3} id={`apex-chart-${payload.request_id}`}>
        {isCircularChart ? (
          <Box sx={{ width: '100%', height: 380 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <RePie
                  data={circularData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={150}
                  innerRadius={config.chart_type === 'donut' ? 60 : 0}
                  paddingAngle={config.chart_type === 'donut' ? 3 : 1}
                  label={({ payload: slicePayload, percent }) =>
                    `${slicePayload.displayName} (${((percent ?? 0) * 100).toFixed(0)}%)`
                  }
                  labelLine={true}
                >
                  {circularData.map((entry, index) => (
                    <ReCell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </RePie>
                <ReTooltip
                  formatter={(value, _name, item) => [
                    value,
                    (item?.payload as { displayName?: string } | undefined)?.displayName ?? '',
                  ]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
                <ReLegend formatter={(value: string) => formatImportanceLabel(String(value))} />
              </RePieChart>
            </ResponsiveContainer>
          </Box>
        ) : (
          <ReactApexChart
            key={`${payload.request_id}-${showGrid}`}
            series={series}
            options={options}
            type={
              config.chart_type === 'stacked_bar'
                ? 'bar'
                : (config.chart_type as 'line' | 'bar' | 'pie' | 'donut' | 'area' | 'scatter')
            }
            height={380}
            width="100%"
          />
        )}
      </Box>

      {/* ── Footer con metadatos ── */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          borderTop: '1px solid #f1f5f9',
          bgcolor: '#fafbfc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography
          variant="caption"
          color="#94a3b8"
          sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
        >
          {payload.data.length} registros · dim: {config.mapping.dimension} · métricas:{' '}
          {config.mapping.metrics.join(', ')}
          {config.mapping.group_by ? ` · agrupado por: ${config.mapping.group_by}` : ''}
        </Typography>
        <Typography
          variant="caption"
          color="#cbd5e1"
          sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
        >
          REQ {payload.request_id.split('-')[0]}
        </Typography>
      </Box>
    </Paper>
  );
};

export default VisualizationEngine;
