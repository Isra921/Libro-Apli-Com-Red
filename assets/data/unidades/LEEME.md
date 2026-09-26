# Cómo editar una unidad

Cada unidad tiene **un solo archivo**: `assets/data/unidades/unidad-XX.json`.
La página `unidades/unidad-XX/index.html` y la tarjeta en `unidades.html` se generan solas a partir de ese archivo. **No hay que tocar HTML.**

## Campos

| Campo | Qué es |
|---|---|
| `numero` | Número de la unidad (1, 2, 3…). El numeral romano se calcula solo. |
| `titulo` | Nombre de la unidad. |
| `descripcion` | Texto breve que aparece en la tarjeta de `unidades.html`. |
| `lema` | Línea bajo el título de la página de la unidad. |
| `duracion_horas` | Solo el número (ej. `27`). |
| `introduccion` | Lista de párrafos: `["Párrafo 1", "Párrafo 2"]`. |
| `recorrido` | Texto que explica el orden de los temas. |
| `temas` | Lista de temas; cada uno incluye su actividad (ver abajo). |
| `actividad_final` | `nombre`, `descripcion`, `url`. |
| `objetivo` | Objetivo de la unidad (panel derecho). |
| `competencias` | Lista de competencias (panel derecho). |
| `video` | `titulo` y `url` *embed* de YouTube (`https://www.youtube.com/embed/...`). Aparece en "Material de apoyo". Déjalo en `""` para ocultarlo. |
| `material_apoyo` | Lista de enlaces: `nombre`, `url`. |

Cada tema (con su actividad de aprendizaje):

```json
{
  "numero": "1.2",
  "nombre": "Nombre del tema",
  "sintesis": "Una línea que resume el tema.",
  "url": "unidades/unidad-01/temas/tema-01-02.html",
  "actividad": {
    "nombre": "Actividad de aprendizaje 1.2",
    "url": "unidades/unidad-01/actividades/actividad-1-2.html"
  }
}
```

- Si la página del tema todavía no existe, deja `"url": ""`: el tema aparecerá como **Próximamente** y **su actividad también se bloquea**.
- Si un tema no tiene actividad, simplemente borra el bloque `"actividad"`.
- Opcional: `"icono": "fa-network-wired"` cambia el ícono del tema en la vista de tarjetas (nombres de https://fontawesome.com/v6/icons).
- Los enlaces se escriben **desde la raíz del sitio** (empiezan con `unidades/...`).
- Si agregas o quitas un tema o actividad, los contadores se actualizan solos.

## Agregar una unidad nueva

1. Copia `unidad-03.json` como `unidad-04.json` y cambia su contenido (incluido `"id": "unidad-04"`).
2. Copia la carpeta `unidades/unidad-03/index.html` a `unidades/unidad-04/index.html` y cambia **solo** `data-unidad="unidad-04"`.
3. Agrega `"unidad-04"` a la lista `unidades` de `assets/data/unidades-data.json`.

## Si la página muestra "No se pudo cargar el contenido"

- Casi siempre es una **coma de más o de menos**, o una comilla sin cerrar. El mensaje indica el archivo; puedes validarlo en https://jsonlint.com.
- La página debe abrirse con un servidor (Live Server o GitHub Pages), no con doble clic.
