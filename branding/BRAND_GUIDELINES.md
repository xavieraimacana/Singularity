# 🌌 Singularity — Guía de Identidad de Marca & Manual de Uso
*Producto Oficial de NebulaX Studio*

---

## 1. El Concepto: "Hexacore Singularity"
El isotipo oficial de **Singularity** representa la convergencia entre la ingeniería estructural de **Minecraft** y la precisión aeroespacial de **NebulaX Studio**.

* **Escudo Perimetral Hexagonal:** Inspirado en los parches de misión espacial, simboliza el firewall perimetral, la telemetría y la disponibilidad ininterrumpida 24/7 de los servidores.
* **Prisma Voxel Central:** La representación isométrica del bloque cúbico de Minecraft, esculpido en tres facetas dimensionales.
* **Canales de Singularidad:** Conduits de espacio negativo que convergen hacia el punto de fuga cuántico central, garantizando máxima legibilidad incluso a 16 píxeles.

---

## 2. Paleta Cromática Oficial

| Color | HEX | RGB | Uso |
|---|---|---|---|
| **Cyber Cyan** | `#06b6d4` | `rgb(6, 182, 212)` | Anillo perimetral, telemetría y energía primaria |
| **Sky Luminance** | `#38bdf8` | `rgb(56, 189, 248)` | Faceta superior (luz cenital) y singularidad central |
| **Emerald Accent** | `#10b981` | `rgb(16, 185, 129)` | Faceta derecha, pulso de NebulaX Studio y estado en línea |
| **Deep Void Blue** | `#0284c7` | `rgb(2, 132, 199)` | Faceta izquierda y gradación de sombra isométrica |
| **Cosmic Obsidian** | `#090d16` | `rgb(9, 13, 22)` | Fondo oscuro principal de la interfaz y modo monocromo |

---

## 3. Reglas Geométricas & Zona de Seguridad (Clear Space)

* **Canvas Maestro:** `viewBox="0 0 256 256"`.
* **Ángulos Isométricos Puros:** Cada vértice está calculado con precisión trigonométrica en $30^\circ$, $90^\circ$ y $150^\circ$ ($\tan(30^\circ) = 0.57735$).
* **Zona de Seguridad:** Se debe mantener una distancia mínima alrededor del isotipo equivalente al ancho de la pared del hexágono ($20\text{ px}$ en canvas de 256).
* **Tamaño Mínimo Recomendado:**
  - En pantalla digital: **16 × 16 px** (usar la versión `singularity-favicon.svg`).
  - En impresión física: **8 mm de altura**.

---

## 4. Directorio de Archivos Entregables

```
branding/
├── master-symbol-color.svg         # Isotipo maestro a color (Hero mark)
├── master-symbol-mono.svg          # Isotipo maestro monocromo (100/100 en auditoría)
├── master-symbol-small.svg         # Corte óptico para favicon / bajas resoluciones
├── singularity-black.svg           # Versión negro plano para documentos impresos
├── singularity-white.svg           # Versión blanco puro para fondos oscuros
├── singularity-app-icon.svg        # Icono con contenedor redondeado para app de escritorio
├── favicon.ico                     # Favicon multi-resolución (16/32/48 px)
├── favicon.svg                     # Favicon vectorial moderno para navegadores
├── apple-touch-icon.png            # Icono iOS / PWA (180×180 px)
├── icon-192.png / icon-512.png     # Iconos estándar Android / PWA / Electron
├── site.webmanifest                # Manifiesto PWA listo para producción
├── presentation.html               # Tablero de presentación interactivo
└── slides/                         # 5 diapositivas PNG en alta resolución (Mockups de Software)
    ├── slide-01.png                # Portada de marca
    ├── slide-02.png                # El brief y atributos
    ├── slide-03.png                # Mockups: Terminal, README, Sticker, App Icon
    ├── slide-04.png                # Pruebas de inversión y contraste
    └── slide-05.png                # Conclusión y recomendación final
```

---

## 5. Prohibiciones de Uso (Anti-Patterns)
1. ❌ **No alterar las proporciones:** No estirar, aplastar ni distorsionar la relación de aspecto 1:1.
2. ❌ **No rotar ángulos arbitrarios:** La orientación "pointy-top" (vértice apuntando al cenit $y = 34$) es obligatoria para respetar la cuadrícula isométrica.
3. ❌ **No añadir sombras difusas externas ni biseles 3D falsos:** El logotipo está diseñado con geometría vectorial limpia y moderna.
