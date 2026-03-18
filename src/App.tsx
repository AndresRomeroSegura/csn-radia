import { useState } from 'react';
import VisualizationEngine from './VisualizationEngine';
import type { RenderPayload } from './VisualizationEngine';

type ChartType = RenderPayload['config']['chart_type'];

const PAYLOADS: Record<ChartType, RenderPayload> = {
  bar: {
    request_id: "ef32e88c-1",
    original_query: "Comparativa de inspecciones y hallazgos por instalación",
    data: [
      { instalacion: "Ascó I",      total_inspecciones: 12, total_hallazgos: 4 },
      { instalacion: "Vandellós II",total_inspecciones: 8,  total_hallazgos: 1 },
      { instalacion: "Cofrentes",   total_inspecciones: 10, total_hallazgos: 3 },
      { instalacion: "Almaraz I",   total_inspecciones: 6,  total_hallazgos: 2 },
      { instalacion: "Trillo",      total_inspecciones: 9,  total_hallazgos: 5 },
    ],
    config: {
      title: "Comparativa de Inspecciones y Hallazgos por Instalación",
      chart_type: "bar",
      mapping: { dimension: "instalacion", metrics: ["total_inspecciones", "total_hallazgos"] },
      styles: { primary_color: "#003DA5", show_grid: true, export_enabled: true },
    },
  },
  line: {
    request_id: "ef32e88c-2",
    original_query: "Evolución mensual de inspecciones en 2024",
    data: [
      { mes: "2024-01", numero_inspecciones: 2 },
      { mes: "2024-02", numero_inspecciones: 4 },
      { mes: "2024-03", numero_inspecciones: 3 },
      { mes: "2024-04", numero_inspecciones: 6 },
      { mes: "2024-05", numero_inspecciones: 5 },
      { mes: "2024-06", numero_inspecciones: 8 },
      { mes: "2024-07", numero_inspecciones: 7 },
      { mes: "2024-08", numero_inspecciones: 4 },
      { mes: "2024-09", numero_inspecciones: 9 },
    ],
    config: {
      title: "Evolución Mensual de Inspecciones",
      chart_type: "line",
      mapping: { dimension: "mes", metrics: ["numero_inspecciones"] },
      styles: { primary_color: "#003DA5", show_grid: true, export_enabled: true },
    },
  },
  pie: {
    request_id: "ef32e88c-3",
    original_query: "Distribución de hallazgos por importancia",
    data: [
      { importancia: "Verde",    total_hallazgos: 17 },
      { importancia: "Blanco",   total_hallazgos: 8  },
      { importancia: "Amarillo", total_hallazgos: 4  },
      { importancia: "Rojo",     total_hallazgos: 1  },
    ],
    config: {
      title: "Distribución de Hallazgos por Importancia",
      chart_type: "pie",
      mapping: { dimension: "importancia", metrics: ["total_hallazgos"] },
      styles: { primary_color: "#003DA5", show_grid: false, export_enabled: true },
    },
  },
  donut: {
    request_id: "ef32e88c-4",
    original_query: "Distribución de hallazgos por importancia (donut)",
    data: [
      { importancia: "Verde",    total_hallazgos: 17 },
      { importancia: "Blanco",   total_hallazgos: 8  },
      { importancia: "Amarillo", total_hallazgos: 4  },
      { importancia: "Rojo",     total_hallazgos: 1  },
    ],
    config: {
      title: "Distribución de Hallazgos por Importancia",
      chart_type: "donut",
      mapping: { dimension: "importancia", metrics: ["total_hallazgos"] },
      styles: { primary_color: "#003DA5", show_grid: false, export_enabled: true },
    },
  },
  stacked_bar: {
    request_id: "ef32e88c-5",
    original_query: "Desglose de hallazgos por año e importancia",
    data: [
      { anio: 2022, importancia: "Verde",    total_hallazgos: 8 },
      { anio: 2022, importancia: "Blanco",   total_hallazgos: 4 },
      { anio: 2022, importancia: "Amarillo", total_hallazgos: 2 },
      { anio: 2022, importancia: "Rojo",     total_hallazgos: 1 },
      { anio: 2023, importancia: "Verde",    total_hallazgos: 12 },
      { anio: 2023, importancia: "Blanco",   total_hallazgos: 5 },
      { anio: 2023, importancia: "Amarillo", total_hallazgos: 3 },
      { anio: 2024, importancia: "Verde",    total_hallazgos: 17 },
      { anio: 2024, importancia: "Blanco",   total_hallazgos: 6 },
      { anio: 2024, importancia: "Amarillo", total_hallazgos: 2 },
      { anio: 2024, importancia: "Rojo",     total_hallazgos: 1 },
    ],
    config: {
      title: "Desglose de Hallazgos por Año e Importancia",
      chart_type: "stacked_bar",
      mapping: { dimension: "anio", metrics: ["total_hallazgos"], group_by: "importancia" },
      styles: { primary_color: "#003DA5", show_grid: true, export_enabled: true },
    },
  },
};

const LABELS: Record<ChartType, string> = {
  bar:         "Barras",
  line:        "Líneas",
  pie:         "Circular",
  donut:       "Donut",
  stacked_bar: "Barras apiladas",
};

export default function App() {
  const [selected, setSelected] = useState<ChartType>('bar');

  return (
    <div style={{ padding: 40, background: '#f0f4f8', minHeight: '100vh', fontFamily: "'IBM Plex Sans', sans-serif" }}>

      {/* Selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
        {(Object.keys(PAYLOADS) as ChartType[]).map((type) => (
          <button
            key={type}
            onClick={() => setSelected(type)}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: selected === type ? '2px solid #003DA5' : '2px solid #e2e8f0',
              background: selected === type ? '#003DA5' : '#ffffff',
              color: selected === type ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {LABELS[type]}
          </button>
        ))}
      </div>

      {/* Gráfico */}
      <VisualizationEngine payload={PAYLOADS[selected]} />
    </div>
  );
}
