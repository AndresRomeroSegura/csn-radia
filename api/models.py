from pydantic import BaseModel
from typing import Any, Optional
from enum import Enum


class ChartType(str, Enum):
    bar = "bar"
    line = "line"
    pie = "pie"
    donut = "donut"
    stacked_bar = "stacked_bar"


class MappingConfig(BaseModel):
    dimension: str
    metrics: list[str]
    group_by: Optional[str] = None


class StylesConfig(BaseModel):
    primary_color: str = "#003DA5"
    show_grid: bool = True
    export_enabled: bool = True


class ChartConfig(BaseModel):
    title: str
    chart_type: ChartType
    mapping: MappingConfig
    styles: StylesConfig


class RenderPayload(BaseModel):
    request_id: str
    original_query: str
    data: list[dict[str, Any]]
    config: ChartConfig


class QueryRequest(BaseModel):
    query: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {"query": "Muestra el número total de hallazgos registrados en cada instalación"},
                {"query": "Muestra la evolución mensual de hallazgos"},
                {"query": "Distribución de inspecciones por instalación como gráfico circular"},
                {"query": "Hallazgos por instalación y año de inspección apilado"},
            ]
        }
    }
