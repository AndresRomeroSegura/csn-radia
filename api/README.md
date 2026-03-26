# RADIA Visualization API

FastAPI backend que implementa el contrato de datos v2.0 para el motor de visualización de RADIA (CSN).

## Arrancar

```bash
cd api
pip install -r requirements.txt
uvicorn main:app --reload --port 8002
```

Swagger UI: http://localhost:8002/docs

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/query` | Consulta en lenguaje natural → payload de gráfico |
| `POST` | `/render` | Payload v2.0 → componente TSX (`RADIAChart.tsx`) |

## Arrancar el proyecto completo

**Terminal 1 — API:**
```bash
cd api
uvicorn main:app --reload --port 8002
```

**Terminal 2 — Frontend React:**
```bash
npm run dev
```

El frontend estará en http://localhost:5173 y llamará automáticamente a la API en http://localhost:8002.
El frontend no habilita el sistema hasta confirmar que `POST /query` y `POST /render` están disponibles.
