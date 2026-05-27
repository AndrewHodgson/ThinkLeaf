# PDF Export — Canvas Rendering

## How PDF export works

`exportPageAsPdf` (in `src/lib/exportUtils.ts`) opens a blank `window`, writes a complete HTML document via `document.write`, and calls `window.print()`. The browser's native print dialog handles rendering to PDF.

The canvas section is a static SVG built from `page.canvasObjects`. There is no html2canvas, no DOM capture, no screenshot — the SVG is generated purely from the stored canvas object data.

## Arrowhead approach — explicit polygons (not SVG markers)

SVG `<marker>` / `url(#id)` references are unreliable in browser print contexts. Even when the `<defs>` block is present and structurally correct, markers are silently dropped during `window.print()` / PDF save in some browsers.

**All arrowheads are rendered as explicit `<polygon>` elements** computed from endpoint position and path tangent angle. This is reliable across all print contexts.

The triangle geometry matches the live-canvas marker exactly:
- Tip: 1× strokeWidth forward from the path endpoint
- Base: 7× strokeWidth back, 4× strokeWidth half-width (both sides)

`renderArrowhead(x, y, angle, strokeWidth, color)` in `exportUtils.ts` produces the polygon. The angle is computed per connector type (see below).

## Issues fixed — first pass (2026-05-26)

### 1. Missing arrowheads (initial fix)

Added `<marker>` elements in `<defs>` and `marker-end`/`marker-start` attributes to path elements. This was the correct structural approach but proved unreliable in print contexts.

### 2. Double-line connectors not rendering

`getLineRenderEntries` checks `getConnectorLineMode(object)`. For double-line connected lines it calls `getDoubleLinePathData(object, points, 1|−1, ...)` and returns two `LineRenderEntry` objects, one per offset line.

### 3. Connector paths always straight

`getLineRenderEntries` checks `getConnectorStyle(object)`:
- `"straight"` → `M x1 y1 L x2 y2`
- `"curve"` → `M x1 y1 Q controlX controlY x2 y2`
- `"elbow"` → polyline from `getElbowConnectorPoints`

### 4. Connector label position

Uses `getLineLabelPoint(object, objects)` — same logic as the live canvas.

### 5. Shape stroke-dasharray missing

`renderCanvasObject` calls `getStrokeDashArray(object)` and includes `stroke-dasharray` on shape elements.

### 6. Color defaults

Shape and line rendering falls back to `defaultCanvasStyle` when object properties are not set.

## Issues fixed — second pass (2026-05-26)

### 7. Arrowheads not appearing in saved PDF (SVG marker unreliability)

**Root cause**: SVG `<marker>` elements referenced via `url(#id)` are dropped silently during `window.print()` PDF save in some browsers. No error is thrown; arrowheads simply do not appear in the saved file.

**Fix**: Replaced all `<marker>`/`url(#id)` logic with explicit `<polygon>` elements computed from path tangent angle. `getLineMarkerAttribute` and the `<defs>` block in `getCanvasSvg` are removed. `renderLine` now calls `renderArrowhead()` for each line entry that needs one. The `markerId` field is removed from `LineRenderEntry`.

### 8. Wrong endpoint coordinates for freeform lines (y1/y2 fallback bug)

**Root cause**: `getLineRenderEntries` and `getCanvasBounds` used `object.y1 ?? object.y` as the y1 fallback, but `canvasGeometry.getLinePoints` correctly uses `object.y1 ?? object.y + object.height / 2`. For freeform lines without stored `y1`/`y2`, all geometry was shifted.

**Fix**: `getLineRenderEntries` now calls `getLineRenderPoints(object, objects)` (which handles both connected and freeform lines correctly). `getCanvasBounds` now calls `getLinePoints(object)`.

### 9. Curve arrowhead orientation wrong when using SVG markers

With explicit polygon arrowheads, the angle at each endpoint is computed from the curve tangent:
- End: `atan2(y2 − cp.y, x2 − cp.x)` (direction from control point to end)
- Start: `atan2(y1 − cp.y, x1 − cp.x)` (reversed, matching `auto-start-reverse`)

For elbow connectors, the angle comes from the first/last segment of `getElbowConnectorPoints`.
For double-line offset paths, the angle is the same as the main line; the offset endpoints are parsed from the path string via `parsePathStartPt` / `parsePathEndPt`.

## Architecture — LineRenderEntry

```typescript
type LineRenderEntry = {
  arrowDirection: CanvasConnectorArrowDirection;
  pathData: string;
  strokeColor: string;
  strokeDasharray: string | undefined;
  strokeWidth: number;
  startPt: { x: number; y: number };
  startAngle: number;  // angle pointing away from line (for start arrowhead)
  endPt: { x: number; y: number };
  endAngle: number;    // angle in direction of travel (for end arrowhead)
};
```

`renderLine` renders `<path>` + explicit `<polygon>` arrowheads per entry, then the connector label.

## Functions imported from canvasGeometry.ts

`getArrowDirection`, `getConnectorLineMode`, `getConnectorStyle`, `getCurveConnectorControlPoint`, `getDoubleLinePathData`, `getElbowConnectorPoints`, `getLineLabelPoint`, `getLinePoints`, `getLineRenderPoints`, `getSecondLineArrowDirection`, `getSecondLineStrokeColor`, `getSecondLineStrokeDashArray`, `getSecondLineStrokeWidth`, `getStrokeDashArray`, `isConnectedLine`

## Files changed

- `src/lib/exportUtils.ts` — 487 → ~650 lines (canvas rendering section fully rewritten across two passes)

## Known limitations

- **Ink/variable-width pen strokes**: rendered as `<polyline>` from centerline points with uniform stroke width. The live canvas renders Ink strokes with variable-width filled outlines. Acceptable limitation for beta.
- **Shape text highlight**: `textHighlightColor` is not rendered (text is bare `<text>` SVG elements). Low-priority cosmetic gap.
- **Highlighter pen strokes**: exported as a semi-transparent polyline. Appearance may differ slightly from the live canvas.
- **Canvas colors depend on `print-color-adjust: exact`**: set in print CSS, but some browser/OS combinations may strip colors with forced grayscale. Browser-level constraint.
- **Double-line arrowhead position on curves**: for double-line curve connectors, the arrowhead is placed at the parsed endpoint of the offset polyline path using the main curve's tangent angle. The visual difference from perfect tangent-at-offset is negligible at normal connector lengths.

## How to test

1. Create a canvas with: straight arrow (forward), straight arrow (both directions), elbow connector with arrow, curve connector with arrow, double-line connector, double-line connector with arrows, dashed connector, a colored rectangle, a colored circle with dashed stroke, a text object, an image, a freehand pen stroke.
2. Export PDF from the page menu.
3. In print preview: verify connector paths (straight/elbow/curve), arrowheads at correct endpoints, double-line shows two parallel lines, shapes show fill and stroke colors.
4. **Save as PDF and open the file directly** (not just the print preview). Verify arrowheads, paths, and colors are preserved in the PDF viewer.
5. Test connectors with labels — verify label at correct midpoint/bend.
6. Test freeform (non-connected) arrows — arrowhead at end.
7. Verify JSON backup export is unaffected.
8. Verify note-body page renders correctly (text, headings, tables, checklists).
