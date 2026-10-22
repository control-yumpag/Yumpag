# Repositorio control-yumpag/Yumpag — reglas para agentes

Tres cosas distintas conviven aquí:

1. **Raíz** (`index.html`, `tablero.html`, `plantilla.html`, `datos.json`, `visita.html`, `fotos/`, `tex/`): el portal
   del tablero BIM 4D de la LT 138 kV Yumpag. **No se edita a mano desde este repositorio**: `plantilla.html` y
   `datos.json` los genera y publica el generador v72 del Proyecto «AI ENGINNER» de claude.ai (`publicar.py`), y
   `fotos/` lo escribe solo el carril automático del repositorio privado `Yumpag-fotos`. Un cambio hecho aquí se
   pierde en la siguiente publicación.
2. **`se-uchucchacua/`**: modelo 3D en código de la SE Uchucchacua. Tiene su propio `AGENTS.md`; léelo antes de tocarlo.
3. **`albarenga/`**: modelo 3D de la instalación eléctrica del SGFVC Albarenga (Loreto). Tiene su propio `AGENTS.md`.

No empujes a `main` mientras una corrida de «Fotos automáticas» esté en curso (chocan los push).
