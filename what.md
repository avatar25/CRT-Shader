# CRT Shader Simulation Reference

## UI Visual Style
- **Typeface:** Monospace (Retro terminal style).
- **Layout:** Left-aligned sidebar with stacked, full-width sliders.
- **Color Coding:** Sections are grouped by colored headers (Red, Pink, Teal, Gold, Lavender).
- **Controls:** Value-based sliders with real-time numeric readouts on the right.

---

## 🛠️ Parameter Specification

### 1. MASK LAYOUT (Header: LAYOUT)
- **Mask Type:** `slot-grid` (Selected)
- **Scan Mode:** `persistence` (Selected)
- **Scan Direction:** `L -> R` (Selected)
- **Beam Mode:** `simulated` (Selected)

### 2. BLOOM & GLOW (Header: BLOOM)
- `Bloom Strength`: **2.50** (Intensity of the light bleed)
- `Bloom Threshold`: **0.00** (Brightness cutoff for glow effect)
- `Bloom Soft Knee`: **0.001** (Transition smoothness of the glow)
- `Bloom Radius`: **3.05** (The spread distance of the glow)

### 3. BEAM DYNAMICS (Header: SCAN_DIRECTION / BEAM_MODE)
- `Frame Rate (Hz)`: **60.00** (Refresh rate simulation)
- `Beam Radius (px)`: **6.0** (The thickness of the "electron beam")
- `Beam Softness (px)`: **8.0** (Feathering of the beam edges)
- `Phosphor Decay`: **13.5** (Persistence of the pixels/after-glow)
- `Beam Deposit`: **160.0** (Energy/Light intensity per beam pass)

### 4. GEOMETRY & SUBPIXELS (Header: GEOMETRY)
- `Virtual Height`: **60** (Vertical resolution of the scanlines)
- `Triad Pitch X`: **0.720** (Horizontal spacing between RGB triads)
- `Triad Pitch Y`: **0.200** (Vertical spacing between RGB triads)
- `Slot Pixel Pitch`: **0.720** (Distance between individual sub-units)
- `Triad Row Shift`: **0.17** (Staggering of the pixel rows)
- `Row Brick Shift`: **0.50** (Horizontal alignment for brick layouts)
- `Column Brick Shift`: **0.50** (Vertical alignment for brick layouts)
- `Dot Radius`: **0.096** (Physical size of the phosphor dots)
- `Slot Width`: **0.160** (Width of the aperture/slot)
- `Slot Height`: **0.620** (Height of the aperture/slot)
- `Slot Exponent`: **5.00** (The curve of the light distribution in the slot)
- `Edge Softness`: **0.0072** (Sharpness of the subpixel edges)
- `Triad Phase`: **0** (Global offset for the mask pattern)

---

## 🎥 Visual Implementation Notes
- **RGB Subpixels:** Vertical stripes following an R-G-B pattern.
- **Scanlines:** Dark horizontal voids between "lit" rows, controlled by `Virtual Height`.
- **Texture:** The high `Bloom Strength` combined with a low `Virtual Height` creates the characteristic "warm" fuzzy glow of an 80s arcade monitor.