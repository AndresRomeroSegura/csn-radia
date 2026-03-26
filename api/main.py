"""
RADIA Visualization API — CSN (Consejo de Seguridad Nuclear)
============================================================
Servicio de generación de código TSX para el motor de visualización de RADIA.

Recibe el contrato JSON v2.0 (generado por el motor LLM #3 del CSN) y devuelve
el código TSX listo para incrustar en el sistema RADIA.

Arrancar:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8002

Swagger UI: http://localhost:8002/docs
"""

import json
import os
import uuid
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from models import RenderPayload, QueryRequest

# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="RADIA Visualization API",
    description="""
## Servicio de generación de componentes TSX para RADIA

Recibe el **contrato de datos v2.0** que genera el motor LLM\\#3 del CSN
y devuelve el **código TSX listo** para incrustar en el sistema RADIA.

El equipo del CSN no necesita implementar ni conocer Recharts:
simplemente llama a `POST /render` con su payload y obtiene el componente React completo.

---

### Flujo de integración

```
RADIA (LLM #3) → JSON payload → POST /render → RADIAChart.tsx → Sistema RADIA
```

---

### Uso en el proyecto React del CSN

```tsx
// 1. Guardar la respuesta del API como RADIAChart.tsx en el proyecto
// 2. Importar el componente donde se necesite:
import RADIAChart from './RADIAChart';

// 3. Renderizarlo:
<RADIAChart />
```

> **Dependencia requerida en el proyecto destino:**
> ```bash
> npm install recharts
> ```
""",
    version="2.0.0",
    contact={
        "name": "CSN — Subdirección de Tecnologías de la Información (STI-SICO)",
        "email": "joaquin.herreropintado@csn.es",
    },
)

_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
_allowed_origins = _origins_env.split(",") if _origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Paleta corporativa CSN
# ─────────────────────────────────────────────────────────────────────────────

# Colores semánticos para el campo "importancia" (hallazgos del CSN)
IMPORTANCIA_COLORS: dict[str, str] = {
    "Verde":    "#80C342",
    "Blanco":   "#cbd5e1",
    "Amarillo": "#F7931D",
    "Rojo":     "#ED1C24",
}

# Paleta genérica para series sin semántica de color
GENERIC_PALETTE: list[str] = [
    "#003DA5",
    "#1A66D1",
    "#002F7A",
    "#4D88DB",
    "#002764",
    "#80AAE6",
    "#B3CCF0",
]

EXAMPLE_PAYLOADS: dict[str, dict] = {
    "bar": {
        "request_id": "ff5c93ca-0c94-4494-ab1f-b9462d31ac9c",
        "original_query": "Muestra el número total de hallazgos registrados en cada instalación",
        "data": [
            {"instalacion": "Almaraz I", "total_hallazgos": 2},
            {"instalacion": "Vandellós II", "total_hallazgos": 2},
            {"instalacion": "Almaraz II", "total_hallazgos": 1},
            {"instalacion": "Ascó I", "total_hallazgos": 4},
            {"instalacion": "Ascó II", "total_hallazgos": 0},
            {"instalacion": "Cofrentes", "total_hallazgos": 2},
            {"instalacion": "Trillo", "total_hallazgos": 0},
        ],
        "config": {
            "title": "Número total de hallazgos por instalación",
            "chart_type": "bar",
            "mapping": {"dimension": "instalacion", "metrics": ["total_hallazgos"]},
            "styles": {"primary_color": "#003DA5", "show_grid": True, "export_enabled": True},
        },
    },
    "line": {
        "request_id": "814cff48-802f-4d45-a951-799e06c74734",
        "original_query": "Muestra la evolución mensual del número total de hallazgos detectados en todas las instalaciones a lo largo del tiempo",
        "data": [
            {"mes": "2024-03-01T00:00:00+00:00", "total_hallazgos": 2},
            {"mes": "2024-08-01T00:00:00+00:00", "total_hallazgos": 2},
            {"mes": "2024-09-01T00:00:00+00:00", "total_hallazgos": 1},
            {"mes": "2025-02-01T00:00:00+00:00", "total_hallazgos": 2},
            {"mes": "2026-01-01T00:00:00+00:00", "total_hallazgos": 1},
            {"mes": "2026-02-01T00:00:00+00:00", "total_hallazgos": 2},
            {"mes": "2026-03-01T00:00:00+00:00", "total_hallazgos": 1},
        ],
        "config": {
            "title": "Evolución Mensual de Hallazgos",
            "chart_type": "line",
            "mapping": {"dimension": "mes", "metrics": ["total_hallazgos"]},
            "styles": {"primary_color": "#003DA5", "show_grid": True, "export_enabled": True},
        },
    },
    "pie": {
        "request_id": "4658b4b0-f994-4138-bef8-a5aad85a5b06",
        "original_query": "Muestra la distribución del número total de inspecciones realizadas agrupadas por cada instalación. Represéntalo visualmente como un gráfico circular",
        "data": [
            {"instalacion": "Almaraz I", "total_inspecciones": 2},
            {"instalacion": "Vandellós II", "total_inspecciones": 2},
            {"instalacion": "Almaraz II", "total_inspecciones": 2},
            {"instalacion": "Ascó I", "total_inspecciones": 2},
            {"instalacion": "Ascó II", "total_inspecciones": 1},
            {"instalacion": "Cofrentes", "total_inspecciones": 3},
            {"instalacion": "Trillo", "total_inspecciones": 3},
        ],
        "config": {
            "title": "Distribución de Inspecciones por Instalación",
            "chart_type": "pie",
            "mapping": {"dimension": "instalacion", "metrics": ["total_inspecciones"]},
            "styles": {"primary_color": "#003DA5", "show_grid": True, "export_enabled": True},
        },
    },
    "donut": {
        "request_id": "d3a9f712-1b2c-4e5f-8a7b-0c1d2e3f4a5b",
        "original_query": "Distribución de hallazgos por nivel de importancia en formato donut",
        "data": [
            {"importancia": "Verde", "total_hallazgos": 17},
            {"importancia": "Blanco", "total_hallazgos": 8},
            {"importancia": "Amarillo", "total_hallazgos": 4},
            {"importancia": "Rojo", "total_hallazgos": 1},
        ],
        "config": {
            "title": "Distribución de Hallazgos por Importancia",
            "chart_type": "donut",
            "mapping": {"dimension": "importancia", "metrics": ["total_hallazgos"]},
            "styles": {"primary_color": "#003DA5", "show_grid": False, "export_enabled": True},
        },
    },
    "stacked_bar": {
        "request_id": "2810f88e-4bdc-42f3-8412-c979fc80a63e",
        "original_query": "Muestra el número total de hallazgos por instalación y desglose interno por año de inspección. Muestra solo las instalaciones que tengan algún hallazgo",
        "data": [
            {"instalacion": "Cofrentes", "anio": 2026, "total_hallazgos": 1},
            {"instalacion": "Ascó I", "anio": 2024, "total_hallazgos": 2},
            {"instalacion": "Cofrentes", "anio": 2024, "total_hallazgos": 1},
            {"instalacion": "Ascó I", "anio": 2026, "total_hallazgos": 2},
            {"instalacion": "Vandellós II", "anio": 2025, "total_hallazgos": 2},
            {"instalacion": "Almaraz I", "anio": 2024, "total_hallazgos": 2},
            {"instalacion": "Almaraz II", "anio": 2026, "total_hallazgos": 1},
        ],
        "config": {
            "title": "Número total de hallazgos por instalación y año",
            "chart_type": "stacked_bar",
            "mapping": {
                "dimension": "anio",
                "metrics": ["total_hallazgos"],
                "group_by": "instalacion",
            },
            "styles": {"primary_color": "#003DA5", "show_grid": True, "export_enabled": True},
        },
    },
}


def resolve_color(label: str, index: int) -> str:
    """Devuelve el color semántico si el label lo tiene, o uno de la paleta genérica."""
    return IMPORTANCIA_COLORS.get(label, GENERIC_PALETTE[index % len(GENERIC_PALETTE)])


def fmt(name: str) -> str:
    """Convierte snake_case a Title Case. Ej: 'total_hallazgos' → 'Total Hallazgos'."""
    return " ".join(w.capitalize() for w in name.split("_"))


def infer_payload_from_query(query: str) -> dict:
    """Devuelve uno de los payloads de ejemplo en función de la consulta."""
    q = query.lower()
    if "donut" in q or "anillo" in q:
        key = "donut"
    elif "circular" in q or ("distribuc" in q and "instalac" in q):
        key = "pie"
    elif "apilad" in q or "desglose" in q or "año" in q or "anio" in q:
        key = "stacked_bar"
    elif "mensual" in q or "evoluc" in q or "tiempo" in q:
        key = "line"
    else:
        key = "bar"

    payload = json.loads(json.dumps(EXAMPLE_PAYLOADS[key], ensure_ascii=False))
    payload["request_id"] = str(uuid.uuid4())
    payload["original_query"] = query
    return payload


# ─────────────────────────────────────────────────────────────────────────────
# Transformación de datos: long-format SQL → wide-format Recharts
# ─────────────────────────────────────────────────────────────────────────────

def pivot_stacked(
    data: list[dict],
    dimension: str,
    group_by: str,
    metric: str,
) -> tuple[list[dict], list[str]]:
    """
    Pivota datos en long-format (tal como los escupe SQL) a wide-format
    que Recharts necesita para las barras apiladas.

    Ejemplo de entrada:
        [{"anio": 2024, "instalacion": "Ascó I", "total_hallazgos": 2},
         {"anio": 2024, "instalacion": "Cofrentes", "total_hallazgos": 1}, ...]

    Ejemplo de salida:
        [{"anio": "2024", "Ascó I": 2, "Cofrentes": 1}, ...]
    """
    categories = list(dict.fromkeys(str(r[dimension]) for r in data))
    groups = list(dict.fromkeys(str(r[group_by]) for r in data))
    pivoted = []
    for cat in categories:
        row: dict = {dimension: cat}
        for g in groups:
            match = next(
                (r for r in data if str(r[dimension]) == cat and str(r[group_by]) == g),
                None,
            )
            row[g] = match[metric] if match else 0
        pivoted.append(row)
    return pivoted, groups


# ─────────────────────────────────────────────────────────────────────────────
# Generador de TSX
# ─────────────────────────────────────────────────────────────────────────────

def generate_tsx(payload: RenderPayload) -> str:
    data      = payload.data
    config    = payload.config
    mapping   = config.mapping
    styles    = config.styles
    ctype     = config.chart_type
    title     = config.title
    dimension = mapping.dimension
    metrics   = mapping.metrics
    primary   = styles.primary_color
    grid      = styles.show_grid
    rid       = payload.request_id
    query     = payload.original_query

    header = f"""\
// ── RADIA · Contrato v2.0 ────────────────────────────────────────────────────
// request_id : {rid}
// query      : {query}
// chart_type : {ctype}"""

    grid_line = (
        '        <CartesianGrid strokeDasharray="3 3" vertical={false} />'
        if grid else ""
    )

    # ── BAR ───────────────────────────────────────────────────────────────────
    if ctype == "bar":
        palette = [
            primary if len(metrics) == 1
            else GENERIC_PALETTE[i % len(GENERIC_PALETTE)]
            for i in range(len(metrics))
        ]
        bars = "\n".join(
            f'        <Bar dataKey="{m}" name="{fmt(m)}" fill="{palette[i]}" '
            f'radius={{[4, 4, 0, 0]}}{" barSize={40}" if len(metrics) == 1 else ""} />'
            for i, m in enumerate(metrics)
        )
        return f"""\
import React from 'react';
import {{
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
}} from 'recharts';

{header}
// ────────────────────────────────────────────────────────────────────────────

const DATA = {json.dumps(data, ensure_ascii=False, indent=2)};

export const RADIAChart: React.FC = () => (
  <div style={{{{ width: '100%', fontFamily: "'IBM Plex Sans', sans-serif" }}}}>
    <h3 style={{{{ color: '{primary}', marginBottom: 16, fontWeight: 700 }}}}>
      {title}
    </h3>
    <ResponsiveContainer width="100%" height={{400}}>
      <BarChart data={{DATA}} margin={{{{ top: 20, right: 30, left: 0, bottom: 20 }}}}>
{grid_line}
        <XAxis dataKey="{dimension}" tick={{{{ fill: '#4D4D4D' }}}} />
        <YAxis tick={{{{ fill: '#4D4D4D' }}}} />
        <Tooltip
          cursor={{{{ fill: 'rgba(0, 61, 165, 0.05)' }}}}
          contentStyle={{{{ borderRadius: '8px', border: '1px solid #e2e8f0' }}}}
        />
        <Legend />
{bars}
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default RADIAChart;
"""

    # ── LINE ──────────────────────────────────────────────────────────────────
    if ctype == "line":
        lines = "\n".join(
            f'        <Line type="monotone" dataKey="{m}" name="{fmt(m)}" '
            f'stroke="{GENERIC_PALETTE[i % len(GENERIC_PALETTE)]}" '
            f'strokeWidth={{3}} dot={{{{ r: 5 }}}} activeDot={{{{ r: 7 }}}} />'
            for i, m in enumerate(metrics)
        )
        return f"""\
import React from 'react';
import {{
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
}} from 'recharts';

{header}
// Nota: los valores de "{dimension}" son fechas ISO. Se formatean con formatDate().
// ────────────────────────────────────────────────────────────────────────────

const DATA = {json.dumps(data, ensure_ascii=False, indent=2)};

const formatDate = (iso: string): string => {{
  try {{
    return new Date(iso).toLocaleDateString('es-ES', {{ month: 'short', year: '2-digit' }});
  }} catch {{
    return iso;
  }}
}};

export const RADIAChart: React.FC = () => (
  <div style={{{{ width: '100%', fontFamily: "'IBM Plex Sans', sans-serif" }}}}>
    <h3 style={{{{ color: '{primary}', marginBottom: 16, fontWeight: 700 }}}}>
      {title}
    </h3>
    <ResponsiveContainer width="100%" height={{400}}>
      <LineChart data={{DATA}} margin={{{{ top: 20, right: 30, left: 0, bottom: 20 }}}}>
{grid_line}
        <XAxis dataKey="{dimension}" tickFormatter={{formatDate}} tick={{{{ fill: '#4D4D4D', fontSize: 12 }}}} />
        <YAxis tick={{{{ fill: '#4D4D4D' }}}} />
        <Tooltip
          labelFormatter={{(label) => formatDate(String(label))}}
          contentStyle={{{{ borderRadius: '8px', border: '1px solid #e2e8f0' }}}}
        />
        <Legend />
{lines}
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default RADIAChart;
"""

    # ── PIE / DONUT ───────────────────────────────────────────────────────────
    if ctype in ("pie", "donut"):
        metric   = metrics[0]
        pie_data = [{"name": str(r[dimension]), "value": r[metric]} for r in data]
        inner    = "60" if ctype == "donut" else "0"
        cells    = "\n".join(
            f'          <Cell key="cell-{i}" fill="{resolve_color(row["name"], i)}" />'
            for i, row in enumerate(pie_data)
        )
        donut_note = "// Nota: innerRadius={60} genera el hueco central del donut." if ctype == "donut" else ""
        return f"""\
import React from 'react';
import {{
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
}} from 'recharts';

{header}
{donut_note}
// ────────────────────────────────────────────────────────────────────────────

// Datos ya mapeados a {{name, value}} para Recharts
const DATA = {json.dumps(pie_data, ensure_ascii=False, indent=2)};

export const RADIAChart: React.FC = () => (
  <div style={{{{ width: '100%', fontFamily: "'IBM Plex Sans', sans-serif" }}}}>
    <h3 style={{{{ color: '{primary}', marginBottom: 16, fontWeight: 700 }}}}>
      {title}
    </h3>
    <ResponsiveContainer width="100%" height={{400}}>
      <PieChart>
        <Pie
          data={{DATA}}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={{150}}
          innerRadius={{{inner}}}
          paddingAngle={{{3 if ctype == "donut" else 1}}}
          label={{({{ name, percent }}) => `${{name}} (${{((percent ?? 0) * 100).toFixed(0)}}%)`}}
        >
{cells}
        </Pie>
        <Tooltip contentStyle={{{{ borderRadius: '8px', border: '1px solid #e2e8f0' }}}} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  </div>
);

export default RADIAChart;
"""

    # ── STACKED BAR ───────────────────────────────────────────────────────────
    if ctype == "stacked_bar":
        group_by        = mapping.group_by or ""
        metric          = metrics[0]
        pivoted, groups = pivot_stacked(data, dimension, group_by, metric)
        bars = "\n".join(
            f'        <Bar dataKey="{g}" stackId="csn" fill="{resolve_color(g, i)}" name="{g}"'
            f'{" radius={{[4, 4, 0, 0]}}" if i == len(groups) - 1 else ""} />'
            for i, g in enumerate(groups)
        )
        return f"""\
import React from 'react';
import {{
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
}} from 'recharts';

{header}
// Nota: los datos SQL venían en long-format y han sido pivotados a wide-format.
//       group_by="{group_by}" · dimension="{dimension}" · metric="{metric}"
// ────────────────────────────────────────────────────────────────────────────

// Datos pivotados (long-format SQL → wide-format Recharts)
const DATA = {json.dumps(pivoted, ensure_ascii=False, indent=2)};

export const RADIAChart: React.FC = () => (
  <div style={{{{ width: '100%', fontFamily: "'IBM Plex Sans', sans-serif" }}}}>
    <h3 style={{{{ color: '{primary}', marginBottom: 16, fontWeight: 700 }}}}>
      {title}
    </h3>
    <ResponsiveContainer width="100%" height={{400}}>
      <BarChart data={{DATA}} margin={{{{ top: 20, right: 30, left: 0, bottom: 20 }}}}>
{grid_line}
        <XAxis dataKey="{dimension}" tick={{{{ fill: '#4D4D4D' }}}} />
        <YAxis tick={{{{ fill: '#4D4D4D' }}}} />
        <Tooltip contentStyle={{{{ borderRadius: '8px', border: '1px solid #e2e8f0' }}}} />
        <Legend />
{bars}
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default RADIAChart;
"""

    return f"// Tipo de gráfico '{ctype}' no soportado."


# ─────────────────────────────────────────────────────────────────────────────
# Único endpoint
# ─────────────────────────────────────────────────────────────────────────────

RENDER_DESCRIPTION = """
Recibe el **contrato JSON v2.0** tal cual lo produce el motor LLM\\#3 de RADIA
y devuelve el **código TSX del componente React** listo para incrustar en el sistema.

---

### Estructura del payload (contrato v2.0)

```json
{
  "request_id": "uuid generado por el motor LLM",
  "original_query": "la pregunta original del usuario",
  "data": [ /* filas de la base de datos */ ],
  "config": {
    "title": "Título del gráfico",
    "chart_type": "bar | line | pie | donut | stacked_bar",
    "mapping": {
      "dimension": "nombre de la columna para el eje X",
      "metrics":   ["columna(s) para el eje Y"],
      "group_by":  "columna para apilar (solo stacked_bar)"
    },
    "styles": {
      "primary_color": "#003DA5",
      "show_grid": true,
      "export_enabled": true
    }
  }
}
```

---

### Comportamiento por tipo de gráfico

| `chart_type` | Componente Recharts | Notas |
|---|---|---|
| `bar` | `<BarChart>` | Soporta múltiples métricas en paralelo |
| `line` | `<LineChart>` | Formatea automáticamente fechas ISO → `"mar 24"` |
| `pie` | `<PieChart>` | Colores semánticos para el campo `importancia` |
| `donut` | `<PieChart>` | Igual que `pie` con `innerRadius={60}` |
| `stacked_bar` | `<BarChart stacked>` | Pivota automáticamente los datos SQL de long-format a wide-format |

---

### Colores semánticos para hallazgos del CSN

Cuando `mapping.dimension` sea `importancia`, el API aplica automáticamente:

| Valor | Color |
|---|---|
| `Verde` | `#80C342` |
| `Blanco` | `#cbd5e1` |
| `Amarillo` | `#F7931D` |
| `Rojo` | `#ED1C24` |

---

### Respuesta

Texto plano (`text/plain`) con el código TSX completo.
El componente exportado se llama siempre `RADIAChart` (named export + default export).

---

### Ejemplos de payload por tipo

<details>
<summary><strong>bar</strong> — Hallazgos por instalación</summary>

```json
{
  "request_id": "ff5c93ca-0c94-4494-ab1f-b9462d31ac9c",
  "original_query": "Muestra el número total de hallazgos registrados en cada instalación",
  "data": [
    { "instalacion": "Almaraz I",    "total_hallazgos": 2 },
    { "instalacion": "Vandellós II", "total_hallazgos": 2 },
    { "instalacion": "Almaraz II",   "total_hallazgos": 1 },
    { "instalacion": "Ascó I",       "total_hallazgos": 4 },
    { "instalacion": "Ascó II",      "total_hallazgos": 0 },
    { "instalacion": "Cofrentes",    "total_hallazgos": 2 },
    { "instalacion": "Trillo",       "total_hallazgos": 0 }
  ],
  "config": {
    "title": "Número total de hallazgos por instalación",
    "chart_type": "bar",
    "mapping": { "dimension": "instalacion", "metrics": ["total_hallazgos"] },
    "styles": { "primary_color": "#003DA5", "show_grid": true, "export_enabled": true }
  }
}
```
</details>

<details>
<summary><strong>line</strong> — Evolución mensual</summary>

```json
{
  "request_id": "814cff48-802f-4d45-a951-799e06c74734",
  "original_query": "Muestra la evolución mensual del número total de hallazgos",
  "data": [
    { "mes": "2024-03-01T00:00:00+00:00", "total_hallazgos": 2 },
    { "mes": "2024-08-01T00:00:00+00:00", "total_hallazgos": 2 },
    { "mes": "2024-09-01T00:00:00+00:00", "total_hallazgos": 1 },
    { "mes": "2025-02-01T00:00:00+00:00", "total_hallazgos": 2 },
    { "mes": "2026-01-01T00:00:00+00:00", "total_hallazgos": 1 }
  ],
  "config": {
    "title": "Evolución Mensual de Hallazgos",
    "chart_type": "line",
    "mapping": { "dimension": "mes", "metrics": ["total_hallazgos"] },
    "styles": { "primary_color": "#003DA5", "show_grid": true, "export_enabled": true }
  }
}
```
</details>

<details>
<summary><strong>pie</strong> — Distribución circular</summary>

```json
{
  "request_id": "4658b4b0-f994-4138-bef8-a5aad85a5b06",
  "original_query": "Distribución de inspecciones por instalación como gráfico circular",
  "data": [
    { "instalacion": "Almaraz I",    "total_inspecciones": 2 },
    { "instalacion": "Vandellós II", "total_inspecciones": 2 },
    { "instalacion": "Ascó I",       "total_inspecciones": 2 },
    { "instalacion": "Cofrentes",    "total_inspecciones": 3 },
    { "instalacion": "Trillo",       "total_inspecciones": 3 }
  ],
  "config": {
    "title": "Distribución de Inspecciones por Instalación",
    "chart_type": "pie",
    "mapping": { "dimension": "instalacion", "metrics": ["total_inspecciones"] },
    "styles": { "primary_color": "#003DA5", "show_grid": true, "export_enabled": true }
  }
}
```
</details>

<details>
<summary><strong>donut</strong> — Distribución por importancia</summary>

```json
{
  "request_id": "d3a9f712-1b2c-4e5f-8a7b-0c1d2e3f4a5b",
  "original_query": "Distribución de hallazgos por nivel de importancia en formato donut",
  "data": [
    { "importancia": "Verde",    "total_hallazgos": 17 },
    { "importancia": "Blanco",   "total_hallazgos": 8  },
    { "importancia": "Amarillo", "total_hallazgos": 4  },
    { "importancia": "Rojo",     "total_hallazgos": 1  }
  ],
  "config": {
    "title": "Distribución de Hallazgos por Importancia",
    "chart_type": "donut",
    "mapping": { "dimension": "importancia", "metrics": ["total_hallazgos"] },
    "styles": { "primary_color": "#003DA5", "show_grid": false, "export_enabled": true }
  }
}
```
</details>

<details>
<summary><strong>stacked_bar</strong> — Hallazgos por instalación y año</summary>

```json
{
  "request_id": "2810f88e-4bdc-42f3-8412-c979fc80a63e",
  "original_query": "Hallazgos por instalación y desglose por año de inspección",
  "data": [
    { "instalacion": "Cofrentes",    "anio": 2026, "total_hallazgos": 1 },
    { "instalacion": "Ascó I",       "anio": 2024, "total_hallazgos": 2 },
    { "instalacion": "Cofrentes",    "anio": 2024, "total_hallazgos": 1 },
    { "instalacion": "Ascó I",       "anio": 2026, "total_hallazgos": 2 },
    { "instalacion": "Vandellós II", "anio": 2025, "total_hallazgos": 2 },
    { "instalacion": "Almaraz I",    "anio": 2024, "total_hallazgos": 2 },
    { "instalacion": "Almaraz II",   "anio": 2026, "total_hallazgos": 1 }
  ],
  "config": {
    "title": "Número total de hallazgos por instalación y año",
    "chart_type": "stacked_bar",
    "mapping": {
      "dimension": "anio",
      "metrics": ["total_hallazgos"],
      "group_by": "instalacion"
    },
    "styles": { "primary_color": "#003DA5", "show_grid": true, "export_enabled": true }
  }
}
```
</details>
"""

QUERY_DESCRIPTION = """
Recibe una consulta en lenguaje natural y devuelve uno de los payloads v2.0
de ejemplo alineados con las especificaciones del cliente para `bar`, `line`,
`pie`, `donut` y `stacked_bar`.

Este endpoint sirve como backend de demostración para el chat de RADIA y como
healthcheck funcional del servicio antes de habilitar el sistema en frontend.
"""


@app.post(
    "/query",
    summary="Convierte una consulta natural en un payload de gráfico v2.0",
    description=QUERY_DESCRIPTION,
    response_model=RenderPayload,
)
def query(request: QueryRequest) -> RenderPayload:
    return RenderPayload(**infer_payload_from_query(request.query))


@app.post(
    "/render",
    response_class=PlainTextResponse,
    summary="Genera el componente TSX a partir del contrato JSON v2.0",
    description=RENDER_DESCRIPTION,
    responses={
        200: {
            "content": {"text/plain": {"example": "import React from 'react';\n..."}},
            "description": "Código TSX del componente `RADIAChart` listo para usar en RADIA.",
        }
    },
)
def render(payload: RenderPayload) -> str:
    return generate_tsx(payload)
