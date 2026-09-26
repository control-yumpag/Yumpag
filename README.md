# Portal · Control de construcción LT 138 kV Pomayaros – Yumpag

Tablero BIM 4D publicado con GitHub Pages: https://control-yumpag.github.io/Yumpag/

| Archivo | Qué es | Cambia cuando |
|---|---|---|
| `index.html` | Acceso: visita o usuario y contraseña | cambia la pantalla de acceso |
| `tablero.html` | Arma la página en el navegador (plantilla + datos) | casi nunca |
| `plantilla.html` | Diseño del tablero, sin datos | cambia el diseño |
| `datos.json` | Datos del corte: visita en claro + tablero completo cifrado por usuario (AES-256-GCM) | cada corte |
| `visita.html` | Redirección al tablero en modo visita | nunca |

Los datos se generan con el generador v72 del proyecto y se publican desde el chat del Proyecto.
