# Repositorio control-yumpag/Yumpag — reglas para agentes

Cinco cosas distintas conviven aquí:

1. **Raíz** (`index.html`, `tablero.html`, `plantilla.html`, `datos.json`, `visita.html`, `fotos/`, `tex/`): el portal
   del tablero BIM 4D de la LT 138 kV Yumpag. **No se edita a mano desde este repositorio**: `plantilla.html` y
   `datos.json` los genera y publica el generador v72 del Proyecto «AI ENGINNER» de claude.ai (`publicar.py`), y
   `fotos/` lo escribe solo el carril automático del repositorio privado `Yumpag-fotos`. Un cambio hecho aquí se
   pierde en la siguiente publicación.
2. **`se-uchucchacua/`**: modelo 3D en código de la SE Uchucchacua. Tiene su propio `AGENTS.md`; léelo antes de tocarlo.
3. **`albarenga/`**: modelo 3D de la instalación eléctrica del SGFVC Albarenga (Loreto). Tiene su propio `AGENTS.md`.
4. **`se-yumpag/`**: modelo 3D de la SE Yumpag 138/10 kV desde la ingeniería de detalle (sin avance de obra aún).
   Tiene su propio `AGENTS.md`.
5. **`se-paragsha2/`**: modelo 3D estimado de la SE Paragsha II 220/138 kV (origen de la L-1123), desde el unifilar
   OE-250 y la imagen satelital. Tiene su propio `AGENTS.md`.

No empujes a `main` mientras una corrida de «Fotos automáticas» esté en curso (chocan los push).
