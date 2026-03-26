import React, { useMemo } from 'react';
import { Typography, Box } from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ============================================================================
// 1. CONTRATO DE DATOS (API V2.0)
// Estructura exacta que nuestro backend de IA inyectará en este componente.
// ============================================================================
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

interface DashboardRendererProps {
  payload: RenderPayload;
}

// ============================================================================
// 2. PALETA DE COLORES CORPORATIVA (CSN)
// ============================================================================
const CSN_COLORS = {
  primary: '#003DA5',
  secondary: '#00A3E0',
  accent: '#F58220',
  grey: '#4D4D4D',
  finding_low: '#80C342',
  finding_medium: '#F7931D',
  finding_high: '#ED1C24',
};

const GENERIC_PALETTE = [
  CSN_COLORS.primary,
  CSN_COLORS.secondary,
  CSN_COLORS.accent,
  '#6366f1',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#06b6d4',
];

// Semántica de colores para el campo "importancia"
const IMPORTANCIA_COLOR_MAP: Record<string, string> = {
  Verde:    CSN_COLORS.finding_low,
  Blanco:   '#cbd5e1',
  Amarillo: CSN_COLORS.finding_medium,
  Rojo:     CSN_COLORS.finding_high,
};

const formatMetricName = (name: string) =>
  name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const IMPORTANCIA_LABEL_MAP: Record<string, string> = {
  Verde: 'Baja',
  Blanco: 'Sin clasificar',
  Amarillo: 'Media',
  Rojo: 'Alta',
};

function formatSeriesLabel(label: string): string {
  return IMPORTANCIA_LABEL_MAP[label] ?? label;
}

// Formatea valores de dimensión que sean fechas ISO a "MMM YY"
function formatDimension(value: string): string {
  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
      }
    } catch {
      // noop
    }
  }
  return String(value);
}

// Pivota datos "long format" de SQL a formato ancho que Recharts necesita
// Ejemplo: [{anio: 2024, instalacion: "Ascó I", total: 2}, ...]
//       → [{anio: 2024, "Ascó I": 2, "Cofrentes": 1}, ...]
function pivotStackedData(
  data: any[],
  dimension: string,
  groupBy: string,
  metric: string,
): { pivoted: any[]; groups: string[] } {
  const categories = [...new Set(data.map((r) => r[dimension]))];
  const groups = [...new Set(data.map((r) => String(r[groupBy])))] as string[];

  const pivoted = categories.map((cat) => {
    const row: any = { [dimension]: cat };
    groups.forEach((g) => {
      const match = data.find(
        (r) => String(r[dimension]) === String(cat) && String(r[groupBy]) === g,
      );
      row[g] = match ? Number(match[metric]) : 0;
    });
    return row;
  });

  return { pivoted, groups };
}

// Devuelve el color semántico si el label lo tiene, o uno de la paleta genérica
function resolveColor(label: string, index: number): string {
  return IMPORTANCIA_COLOR_MAP[label] ?? GENERIC_PALETTE[index % GENERIC_PALETTE.length];
}

// ============================================================================
// 3. COMPONENTE PRINCIPAL
// ============================================================================
export const DashboardRenderer: React.FC<DashboardRendererProps> = ({ payload }) => {
  const { data, config } = payload;
  const { mapping, styles } = config;

  // Pre-procesamos los datos del stacked_bar una sola vez
  const stackedData = useMemo(() => {
    if (config.chart_type === 'stacked_bar' && mapping.group_by) {
      return pivotStackedData(data, mapping.dimension, mapping.group_by, mapping.metrics[0]);
    }
    return null;
  }, [data, config.chart_type, mapping]);

  const renderChart = () => {
    switch (config.chart_type) {

      // ── Barras simples (EJEMPLO RESUELTO POR EL CSN) ──────────────────────
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            {styles.show_grid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
            <XAxis dataKey={mapping.dimension} tick={{ fill: CSN_COLORS.grey }} />
            <YAxis tick={{ fill: CSN_COLORS.grey }} />
            <Tooltip
              cursor={{ fill: 'rgba(0, 61, 165, 0.05)' }}
              formatter={(value, name) => [value, formatSeriesLabel(String(name))]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend formatter={(value) => formatSeriesLabel(formatMetricName(String(value)))} />
            {mapping.metrics.map((metricKey, index) => (
              <Bar
                key={metricKey}
                dataKey={metricKey}
                name={formatMetricName(metricKey)}
                fill={
                  mapping.metrics.length === 1
                    ? styles.primary_color
                    : GENERIC_PALETTE[index % GENERIC_PALETTE.length]
                }
                radius={[4, 4, 0, 0]}
                barSize={mapping.metrics.length === 1 ? 40 : undefined}
              />
            ))}
          </BarChart>
        );

      // ── Líneas: series temporales ──────────────────────────────────────────
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            {styles.show_grid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
            <XAxis
              dataKey={mapping.dimension}
              tickFormatter={formatDimension}
              tick={{ fill: CSN_COLORS.grey, fontSize: 12 }}
            />
            <YAxis tick={{ fill: CSN_COLORS.grey }} />
            <Tooltip
              labelFormatter={(label) => formatDimension(String(label))}
              formatter={(value, name) => [value, formatSeriesLabel(String(name))]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend formatter={(value) => formatSeriesLabel(formatMetricName(String(value)))} />
            {mapping.metrics.map((metricKey, index) => (
              <Line
                key={metricKey}
                type="monotone"
                dataKey={metricKey}
                name={formatMetricName(metricKey)}
                stroke={GENERIC_PALETTE[index % GENERIC_PALETTE.length]}
                strokeWidth={3}
                dot={{ r: 5, strokeWidth: 0 }}
                activeDot={{ r: 7 }}
              />
            ))}
          </LineChart>
        );

      // ── Barras apiladas: requiere pivoteo de datos SQL ─────────────────────
      case 'stacked_bar': {
        if (!mapping.group_by || !stackedData) {
          return <Typography color="error">stacked_bar requiere config.mapping.group_by</Typography>;
        }
        const { pivoted, groups } = stackedData;
        return (
          <BarChart data={pivoted} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            {styles.show_grid && <CartesianGrid strokeDasharray="3 3" vertical={false} />}
            <XAxis dataKey={mapping.dimension} tick={{ fill: CSN_COLORS.grey }} />
            <YAxis tick={{ fill: CSN_COLORS.grey }} />
            <Tooltip
              formatter={(value, name) => [value, formatSeriesLabel(String(name))]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend formatter={(value) => formatSeriesLabel(String(value))} />
            {groups.map((group, index) => (
              <Bar
                key={group}
                dataKey={group}
                name={formatSeriesLabel(group)}
                stackId="csn-stack"
                fill={resolveColor(group, index)}
                radius={index === groups.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        );
      }

      // ── Circular (pie) y Donut — mismo componente, innerRadius diferencia ──
      case 'pie':
      case 'donut': {
        const metric = mapping.metrics[0];
        const pieData = data.map((row) => ({
          name: String(row[mapping.dimension] ?? ''),
          displayName: formatSeriesLabel(String(row[mapping.dimension] ?? '')),
          value: Number(row[metric] ?? 0),
        }));
        const isDonut = config.chart_type === 'donut';

        return (
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
                outerRadius={150}
                innerRadius={isDonut ? 60 : 0}
                paddingAngle={isDonut ? 3 : 1}
                label={({ payload: slicePayload, percent }) =>
                  `${slicePayload.displayName} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
                labelLine={true}
              >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={resolveColor(entry.name, index)}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, _name, item) => [value, item?.payload?.displayName ?? formatMetricName(metric)]}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend formatter={(value) => formatSeriesLabel(String(value))} />
          </PieChart>
        );
      }

      default:
        return (
          <Typography color="error">
            Tipo de gráfico '{config.chart_type}' desconocido.
          </Typography>
        );
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" fontWeight={700} sx={{ color: CSN_COLORS.primary, mb: 2 }}>
        {config.title}
      </Typography>
      <Box sx={{ width: '100%', height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default DashboardRenderer;
