# Glassmorphism Design System

## 1. Design Direction

The interface uses a **bold glassmorphism aesthetic** built on top of a vibrant magenta–coral gradient. The visual language should feel modern, luminous, playful, and slightly futuristic.

The design is defined by:

- A saturated gradient background
- Semi-transparent glass panels
- Strong background blur
- Soft white borders
- Diffused shadows
- Large white typography
- Floating translucent geometric shapes
- Minimal, centered composition

The glass effect must remain readable. Decorative transparency should never reduce text contrast below an acceptable level.

---

## 2. Visual Reference

Primary visual characteristics derived from the reference image:

- Canvas ratio: approximately `16:9`
- Background transitions from deep purple/magenta on the left to coral/orange-red on the right
- Main heading is centered near the top
- Main content card is vertically oriented and centered
- Decorative rounded rectangles float behind the content
- Glass panels use white transparency, blur, and subtle borders
- The entire scene has a soft luminous haze

---

## 3. Color System

### 3.1 Background Gradient

Use a diagonal gradient flowing from upper-left to lower-right.

```css
--background-start: #8f167f;
--background-mid: #dc315f;
--background-end: #ff6236;
```

Recommended implementation:

```css
background:
  radial-gradient(
    circle at 30% 20%,
    rgba(255, 255, 255, 0.10),
    transparent 35%
  ),
  linear-gradient(
    120deg,
    #8f167f 0%,
    #d82f65 48%,
    #ff6236 100%
  );
```

Alternative stronger version:

```css
background: linear-gradient(
  115deg,
  #861472 0%,
  #c92070 38%,
  #ef3f54 68%,
  #ff6a32 100%
);
```

### 3.2 Glass Surfaces

```css
--glass-fill: rgba(255, 255, 255, 0.18);
--glass-fill-strong: rgba(255, 255, 255, 0.24);
--glass-fill-subtle: rgba(255, 255, 255, 0.10);
--glass-border: rgba(255, 255, 255, 0.30);
--glass-highlight: rgba(255, 255, 255, 0.45);
```

### 3.3 Text Colors

```css
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.80);
--text-muted: rgba(255, 255, 255, 0.62);
--text-on-dark: #f9f7ff;
```

### 3.4 Dark Accent

The small notification/banner element uses a dark indigo surface.

```css
--accent-dark: #17133f;
--accent-dark-border: rgba(255, 255, 255, 0.14);
--accent-green: #32d36b;
--accent-yellow: #ffc84a;
```

---

## 4. Typography

Use a clean geometric sans-serif.

Preferred font stack:

```css
font-family:
  Inter,
  "Helvetica Neue",
  Arial,
  sans-serif;
```

Alternative display fonts:

- Poppins
- Manrope
- Montserrat
- Avenir Next

### 4.1 Main Heading

The main title should be oversized, uppercase, lightweight, and widely spaced.

```css
font-size: clamp(3rem, 8vw, 7.5rem);
font-weight: 300;
line-height: 0.95;
letter-spacing: 0.015em;
text-transform: uppercase;
color: #ffffff;
text-shadow: 0 4px 24px rgba(255, 255, 255, 0.18);
```

Example:

```text
GLASSMORPHISM
```

### 4.2 Card Heading

```css
font-size: 1.35rem;
font-weight: 600;
line-height: 1.3;
color: #ffffff;
```

### 4.3 Supporting Text

```css
font-size: 0.95rem;
font-weight: 400;
line-height: 1.5;
color: rgba(255, 255, 255, 0.72);
```

### 4.4 Labels

```css
font-size: 0.72rem;
font-weight: 600;
letter-spacing: 0.06em;
text-transform: uppercase;
color: rgba(255, 255, 255, 0.66);
```

---

## 5. Layout

### 5.1 Page Container

```css
min-height: 100vh;
position: relative;
overflow: hidden;
display: flex;
flex-direction: column;
align-items: center;
padding: clamp(2rem, 5vw, 5rem);
```

### 5.2 Composition

Recommended vertical hierarchy:

1. Main title
2. Spacious visual gap
3. Central glass card
4. Decorative background elements
5. Optional subtle footer or call-to-action

Desktop sizing:

```css
--content-max-width: 1200px;
--glass-card-width: 440px;
--glass-card-min-height: 620px;
```

Mobile sizing:

```css
width: min(100%, 360px);
padding-inline: 1rem;
```

---

## 6. Main Glass Card

The main panel should be vertically oriented, translucent, and softly separated from the background.

```css
.glass-card {
  width: min(100%, 440px);
  padding: 2rem;
  border-radius: 26px;

  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.28),
      rgba(255, 255, 255, 0.12)
    );

  border: 1px solid rgba(255, 255, 255, 0.30);

  box-shadow:
    0 30px 80px rgba(73, 12, 74, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.42);

  backdrop-filter: blur(18px) saturate(135%);
  -webkit-backdrop-filter: blur(18px) saturate(135%);
}
```

### 6.1 Glass Card Rules

- Blur range: `14px–24px`
- Border radius: `20px–30px`
- Border opacity: `0.20–0.35`
- Fill opacity: `0.12–0.26`
- Avoid fully opaque surfaces
- Do not apply blur to text
- Maintain at least `24px` internal padding

---

## 7. Notification Banner

A compact dark banner sits near the top of the card.

```css
.notification-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  padding: 0.85rem 1rem;
  border-radius: 12px;

  background: rgba(20, 16, 61, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);

  box-shadow:
    0 12px 32px rgba(30, 9, 55, 0.28);

  color: #ffffff;
}
```

Badge:

```css
.notification-badge {
  padding: 0.22rem 0.48rem;
  border-radius: 999px;
  background: #2ed866;
  color: #0d2f18;

  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.05em;
}
```

---

## 8. Controls

The reference contains horizontal sliders and control rows.

### 8.1 Control Group

```css
.control-group {
  display: grid;
  gap: 0.55rem;
  margin-top: 1.2rem;
}
```

### 8.2 Range Track

```css
input[type="range"] {
  width: 100%;
  height: 4px;
  appearance: none;

  border-radius: 999px;
  background: rgba(255, 255, 255, 0.58);
}
```

### 8.3 Range Thumb

```css
input[type="range"]::-webkit-slider-thumb {
  appearance: none;

  width: 18px;
  height: 18px;
  border-radius: 50%;

  background: rgba(255, 255, 255, 0.90);
  border: 1px solid rgba(255, 255, 255, 0.48);

  box-shadow:
    0 4px 14px rgba(79, 17, 78, 0.24);
}
```

### 8.4 Divider

```css
.divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.24);
  margin-block: 1.5rem;
}
```

---

## 9. Code Preview Area

A translucent monospace section may be used to preview CSS output.

```css
.code-preview {
  padding: 1rem;
  border-radius: 14px;

  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);

  font-family:
    "SFMono-Regular",
    Consolas,
    "Liberation Mono",
    monospace;

  font-size: 0.78rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.74);

  overflow-x: auto;
}
```

---

## 10. Decorative Floating Shapes

The background uses translucent rounded rectangles arranged diagonally.

```css
.floating-glass {
  position: absolute;
  width: 140px;
  height: 90px;
  border-radius: 20px;

  background: rgba(255, 255, 255, 0.10);
  border: 1px solid rgba(255, 255, 255, 0.08);

  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  box-shadow:
    0 18px 40px rgba(84, 18, 84, 0.12);

  transform: rotate(-18deg);
}
```

Recommended placement:

- Several overlapping shapes on the left side
- One broad horizontal shape behind the main title
- Lower opacity than the main glass card
- Vary size and rotation to avoid repetition
- Keep decorative elements outside important text areas

Suggested values:

```css
opacity: 0.35;
filter: blur(0.2px);
```

---

## 11. Spacing Scale

Use a consistent 4px-based spacing system.

```text
4px   — micro gap
8px   — compact gap
12px  — small gap
16px  — standard gap
24px  — section gap
32px  — large gap
48px  — major separation
64px  — hero spacing
96px  — large desktop spacing
```

Recommended tokens:

```css
--space-1: 0.25rem;
--space-2: 0.5rem;
--space-3: 0.75rem;
--space-4: 1rem;
--space-6: 1.5rem;
--space-8: 2rem;
--space-12: 3rem;
--space-16: 4rem;
--space-24: 6rem;
```

---

## 12. Border Radius

```css
--radius-sm: 10px;
--radius-md: 14px;
--radius-lg: 20px;
--radius-xl: 26px;
--radius-pill: 999px;
```

Usage:

- Badge: pill
- Banner: small/medium
- Controls: medium
- Main card: extra large
- Floating panels: large

---

## 13. Shadows

Use soft, broad shadows rather than harsh black shadows.

```css
--shadow-glass:
  0 30px 80px rgba(74, 13, 79, 0.28);

--shadow-small:
  0 10px 28px rgba(73, 14, 74, 0.20);

--shadow-inset-highlight:
  inset 0 1px 0 rgba(255, 255, 255, 0.40);
```

Avoid:

```css
box-shadow: 0 4px 4px #000;
```

Prefer shadows that match the purple tones of the background.

---

## 14. Motion

Animations should be slow and atmospheric.

### 14.1 Floating Shapes

```css
@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(-18deg);
  }

  50% {
    transform: translateY(-16px) rotate(-15deg);
  }
}
```

```css
animation: float 8s ease-in-out infinite;
```

### 14.2 Card Entrance

```css
@keyframes card-enter {
  from {
    opacity: 0;
    transform: translateY(28px) scale(0.97);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

```css
animation: card-enter 700ms cubic-bezier(.2, .8, .2, 1);
```

### 14.3 Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 15. Responsive Behavior

### Desktop

- Large title spanning much of the page width
- Card centered below title
- Decorative shapes visible around the left and top edges
- Generous negative space

### Tablet

- Reduce title size
- Keep the card centered
- Reduce decorative shape count
- Maintain at least `32px` page padding

### Mobile

```css
@media (max-width: 640px) {
  .page {
    padding: 1.25rem;
  }

  .hero-title {
    font-size: clamp(2.6rem, 15vw, 4.4rem);
    text-align: center;
  }

  .glass-card {
    padding: 1.35rem;
    border-radius: 22px;
  }

  .floating-glass {
    opacity: 0.18;
  }
}
```

On small screens, prioritize clarity over decorative depth.

---

### Indikator transaksi

Setiap aksi yang mengubah data atau memanggil Lawet Hub (masuk, ajukan/simpan jurnal, setujui, tolak, hapus, unggah foto/dokumen, keluar) menampilkan `Spinner` (`src/shared/ui/spinner.tsx`) selama permintaan berjalan:

- Tombol pemicu terkunci (`disabled`) dan memakai `aria-busy="true"`; labelnya berubah menjadi bentuk berjalan ("Menyetujui...", "Menghapus...") dengan spinner di sampingnya.
- Spinner berwarna `currentColor` sehingga mengikuti warna tombol; animasinya satu putaran lambat, bukan kedip cepat.
- Spinner adalah `role="status"` dengan `aria-label` yang menyebut transaksinya, agar pembaca layar mengumumkannya.
- Unggahan berkas menampilkan penanda "Mengunggah n..." di zona unggah selama antrean berjalan; keadaan dibersihkan di `finally` agar tidak menggantung saat gagal.

## 16. Accessibility

- Keep normal body text at least `16px`
- Ensure interactive controls have a minimum target size of `44px`
- Provide visible keyboard focus states
- Do not rely solely on transparency to separate sections
- Use a dark fallback surface when backdrop blur is unavailable
- Maintain sufficient contrast between white text and the gradient
- Disable unnecessary motion when reduced-motion mode is active

Focus state:

```css
:focus-visible {
  outline: 3px solid rgba(255, 255, 255, 0.90);
  outline-offset: 4px;
}
```

Fallback:

```css
@supports not (
  (backdrop-filter: blur(1px)) or
  (-webkit-backdrop-filter: blur(1px))
) {
  .glass-card {
    background: rgba(169, 45, 97, 0.94);
  }
}
```

---

## 17. Design Tokens

```css
:root {
  /* Colors */
  --background-start: #8f167f;
  --background-mid: #dc315f;
  --background-end: #ff6236;

  --glass-fill: rgba(255, 255, 255, 0.18);
  --glass-fill-strong: rgba(255, 255, 255, 0.24);
  --glass-fill-subtle: rgba(255, 255, 255, 0.10);
  --glass-border: rgba(255, 255, 255, 0.30);

  --text-primary: #ffffff;
  --text-secondary: rgba(255, 255, 255, 0.80);
  --text-muted: rgba(255, 255, 255, 0.62);

  --accent-dark: #17133f;
  --accent-green: #32d36b;
  --accent-yellow: #ffc84a;

  /* Radius */
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-xl: 26px;
  --radius-pill: 999px;

  /* Blur */
  --blur-sm: 8px;
  --blur-md: 16px;
  --blur-lg: 24px;

  /* Shadows */
  --shadow-glass:
    0 30px 80px rgba(74, 13, 79, 0.28);

  --shadow-small:
    0 10px 28px rgba(73, 14, 74, 0.20);

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-24: 6rem;
}
```

---

## 18. Complete Surface Example

```css
.glass-surface {
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.24),
      rgba(255, 255, 255, 0.10)
    );

  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 24px;

  box-shadow:
    0 28px 70px rgba(72, 12, 79, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.42);

  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
}
```

---

## 19. Implementation Principles

1. The gradient is the primary visual foundation.
2. Glass panels must reveal the background without sacrificing readability.
3. Large typography should remain clean and lightweight.
4. Decorative shapes are atmospheric, not functional.
5. Limit the number of competing surfaces.
6. Use a dark accent only for strong contrast or status messages.
7. Keep the page composition centered and spacious.
8. Prefer subtle depth over heavy borders.
9. Ensure the design still works without `backdrop-filter`.
10. Maintain consistent opacity, radius, spacing, and blur tokens.

---

## 20. Avoid

Do not use:

- Pure black shadows
- Excessively opaque cards
- More than three competing gradient directions
- Tiny low-contrast text
- Strongly saturated text colors
- Sharp corners
- Heavy outlines
- Fast looping animations
- Too many floating objects
- Blur on text or interactive content

The final result should feel luminous, clean, spacious, and distinctly glass-like.
