import type { CanvasConnectorArrowDirection, CanvasObject, Page, WorkspaceData } from "@/types/workspace";
import { normalizeEditorContent } from "@/lib/editorContent";
import { defaultCanvasStyle } from "@/lib/canvasStyle";
import {
  getArrowDirection,
  getConnectorLineMode,
  getConnectorStyle,
  getCurveConnectorControlPoint,
  getDoubleLinePathData,
  getElbowConnectorPoints,
  getLineLabelPoint,
  getLinePoints,
  getLineRenderPoints,
  getSecondLineArrowDirection,
  getSecondLineStrokeColor,
  getSecondLineStrokeDashArray,
  getSecondLineStrokeWidth,
  getStrokeDashArray,
  isConnectedLine,
} from "@/components/workspace/canvas/canvasGeometry";

export function exportWorkspaceBackup(data: WorkspaceData) {
  const date = new Date().toISOString().slice(0, 10);
  downloadTextFile(`thinkleaf-backup-${date}.json`, JSON.stringify(data, null, 2), "application/json");
}

export function exportPageAsPdf(page: Page, breadcrumbPath: string[]) {
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    window.alert("Could not open the PDF export window. Allow pop-ups for Thinkleaf and try again.");
    return;
  }

  printWindow.document.write(getPrintablePageHtml(page, breadcrumbPath));
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 250);
}

function downloadTextFile(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getPrintablePageHtml(page: Page, breadcrumbPath: string[]) {
  const bodyHtml = normalizeEditorContent(page.body) || "<p></p>";
  const tags = page.tags.length
    ? `<div class="tags">${page.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>`
    : '<div class="tags muted">No tags</div>';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(page.title || "Untitled meeting note")}</title>
    <style>
      @page {
        margin: 0.55in;
        size: letter portrait;
      }
      * {
        box-sizing: border-box;
      }
      body {
        background: #f8fafc;
        color: #0f172a;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
        margin: 0;
      }
      .note-card,
      .canvas-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
      }
      .note-card {
        min-height: 9.4in;
        padding: 0.42in 0.5in 0.5in;
      }
      .top-row {
        align-items: flex-start;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        gap: 18px;
        justify-content: space-between;
        padding-bottom: 18px;
      }
      .breadcrumb {
        color: #64748b;
        font-size: 12px;
        font-weight: 500;
      }
      .breadcrumb strong {
        color: #334155;
      }
      .breadcrumb .separator {
        color: #cbd5e1;
        margin: 0 7px;
      }
      .updated {
        color: #64748b;
        flex: 0 0 auto;
        font-size: 11px;
        font-weight: 600;
        text-align: right;
      }
      h1 {
        font-size: 30px;
        letter-spacing: 0;
        line-height: 1.2;
        margin: 20px 0 8px;
      }
      .meta {
        align-items: center;
        color: #64748b;
        display: flex;
        flex-wrap: wrap;
        font-size: 12px;
        gap: 10px;
        margin-bottom: 28px;
      }
      .meta-label {
        color: #94a3b8;
        font-weight: 700;
        text-transform: uppercase;
      }
      .tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .tags span {
        background: #f1f5f9;
        border: 1px solid #e2e8f0;
        border-radius: 999px;
        color: #475569;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
      }
      .muted {
        color: #94a3b8;
        font-size: 12px;
      }
      .thinkleaf-editor {
        color: #1f2937;
        font-size: 16px;
        line-height: 1.75;
        overflow-wrap: anywhere;
      }
      .thinkleaf-editor > * {
        margin-bottom: 0;
        margin-top: 0;
      }
      .thinkleaf-editor > * + * {
        margin-top: 0.85rem;
      }
      .thinkleaf-editor h1,
      .thinkleaf-editor h2,
      .thinkleaf-editor h3 {
        color: #0f172a;
        font-weight: 650;
        letter-spacing: 0;
        line-height: 1.25;
      }
      .thinkleaf-editor h1 {
        font-size: 1.85rem;
        margin-top: 1.5rem;
      }
      .thinkleaf-editor h2 {
        font-size: 1.35rem;
        margin-top: 1.3rem;
      }
      .thinkleaf-editor h3 {
        font-size: 1.08rem;
        margin-top: 1.1rem;
      }
      .thinkleaf-editor ul,
      .thinkleaf-editor ol {
        padding-left: 1.55rem;
      }
      .thinkleaf-editor ul {
        list-style: disc;
      }
      .thinkleaf-editor ol {
        list-style: decimal;
      }
      .thinkleaf-editor ol ol {
        list-style: lower-alpha;
      }
      .thinkleaf-editor ol ol ol {
        list-style: lower-roman;
      }
      .thinkleaf-editor li {
        padding-left: 0;
      }
      .thinkleaf-editor ul[data-type="taskList"] {
        list-style: none;
        padding-left: 0.15rem;
      }
      .thinkleaf-editor ul[data-type="taskList"] ul[data-type="taskList"] {
        padding-left: 1.55rem;
      }
      .thinkleaf-editor ul[data-type="taskList"] li {
        align-items: flex-start;
        display: flex;
        gap: 0.55rem;
        padding-left: 0;
      }
      .thinkleaf-editor ul[data-type="taskList"] li > label {
        align-items: center;
        display: inline-flex;
        height: 1.75rem;
        margin-top: 0;
      }
      .thinkleaf-editor ul[data-type="taskList"] input {
        accent-color: #238157;
        margin: 0;
      }
      .thinkleaf-editor ul[data-type="taskList"] li > div {
        min-width: 0;
      }
      .thinkleaf-editor a {
        color: #1f6849;
        text-decoration: underline;
        text-underline-offset: 3px;
      }
      .thinkleaf-editor blockquote {
        background: #f8fafc;
        border-left: 3px solid #2f9f6d;
        border-radius: 0 6px 6px 0;
        color: #334155;
        margin: 1rem 0;
        padding: 0.75rem 1rem;
      }
      .thinkleaf-editor table {
        border-collapse: collapse;
        margin: 1rem 0;
        table-layout: fixed;
        width: 100%;
      }
      .thinkleaf-editor th,
      .thinkleaf-editor td {
        border: 1px solid #dbe3ee;
        min-width: 1em;
        padding: 0.55rem 0.65rem;
        position: relative;
        vertical-align: top;
      }
      .thinkleaf-editor th {
        background: #f8fafc;
        color: #334155;
        font-weight: 650;
      }
      .thinkleaf-editor img,
      .thinkleaf-editor [data-thinkleaf-image="true"] {
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        display: block;
        margin: 1rem 0;
        max-width: 100%;
      }
      .thinkleaf-editor [contenteditable="false"] {
        white-space: normal;
      }
      .canvas-page {
        break-before: page;
        page-break-before: always;
      }
      .canvas-card {
        min-height: 9.4in;
        padding: 0.36in;
      }
      .canvas-header {
        border-bottom: 1px solid #f1f5f9;
        margin-bottom: 18px;
        padding-bottom: 12px;
      }
      .canvas-header h2 {
        font-size: 20px;
        line-height: 1.2;
        margin: 0 0 4px;
      }
      .canvas-header p {
        color: #64748b;
        font-size: 12px;
        margin: 0;
      }
      .canvas-empty {
        color: #64748b;
        font-size: 13px;
      }
      .canvas-frame {
        align-items: center;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        display: flex;
        height: 8in;
        justify-content: center;
        overflow: hidden;
      }
      .canvas-frame svg {
        display: block;
        height: auto;
        max-height: 100%;
        max-width: 100%;
        width: 100%;
      }
      @media print {
        body {
          background: #ffffff;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        .note-card,
        .canvas-card {
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <article class="note-card">
      <div class="top-row">
        <div class="breadcrumb">${renderBreadcrumb(breadcrumbPath)}</div>
        <div class="updated">Updated ${escapeHtml(formatDateTime(page.updatedAt))}</div>
      </div>
      <h1>${escapeHtml(page.title || "Untitled meeting note")}</h1>
      <div class="meta">
        <span class="meta-label">Note date</span>
        <span>${escapeHtml(page.noteDate || "No date")}</span>
        ${tags}
      </div>
      <section class="thinkleaf-editor">${bodyHtml}</section>
    </article>
    <section class="canvas-page">
      <div class="canvas-card">
        <div class="canvas-header">
          <h2>Canvas</h2>
          <p>${escapeHtml(page.title || "Untitled meeting note")}</p>
        </div>
        <div class="canvas-frame">${getCanvasSvg(page.canvasObjects)}</div>
      </div>
    </section>
  </body>
</html>`;
}

type LineRenderEntry = {
  arrowDirection: CanvasConnectorArrowDirection;
  pathData: string;
  strokeColor: string;
  strokeDasharray: string | undefined;
  strokeWidth: number;
  startPt: { x: number; y: number };
  startAngle: number;
  endPt: { x: number; y: number };
  endAngle: number;
};

// Parse the first M-command point from an SVG path string.
function parsePathStartPt(pathData: string): { x: number; y: number } {
  const m = pathData.match(/M\s+([\d.e+\-]+)\s+([\d.e+\-]+)/);
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
}

// Parse the last endpoint from an SVG path string (handles L and Q commands).
function parsePathEndPt(pathData: string): { x: number; y: number } {
  // Greedily match to the last L command (polyline / elbow / offset-curve paths).
  const lMatch = pathData.match(/.*L\s+([\d.e+\-]+)\s+([\d.e+\-]+)/);
  if (lMatch) return { x: parseFloat(lMatch[1]), y: parseFloat(lMatch[2]) };
  // Quadratic bezier endpoint: last two args of Q.
  const qMatch = pathData.match(/Q\s+[\d.e+\-]+\s+[\d.e+\-]+\s+([\d.e+\-]+)\s+([\d.e+\-]+)/);
  if (qMatch) return { x: parseFloat(qMatch[1]), y: parseFloat(qMatch[2]) };
  // Fallback: last M point.
  const mMatch = pathData.match(/.*M\s+([\d.e+\-]+)\s+([\d.e+\-]+)/);
  return mMatch ? { x: parseFloat(mMatch[1]), y: parseFloat(mMatch[2]) } : { x: 0, y: 0 };
}

// Render an explicit arrowhead triangle at (x, y) pointing in direction `angle` (radians).
// Geometry matches the live-canvas SVG marker: tip 1sw forward, base 7sw back, 4sw half-width.
function renderArrowhead(x: number, y: number, angle: number, sw: number, color: string): string {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);
  const tx = x + cosA * sw;
  const ty = y + sinA * sw;
  const ax = x - cosA * 7 * sw + sinA * 4 * sw;
  const ay = y - sinA * 7 * sw - cosA * 4 * sw;
  const bx = x - cosA * 7 * sw - sinA * 4 * sw;
  const by = y - sinA * 7 * sw + cosA * 4 * sw;
  const pts = `${Math.round(tx * 10) / 10},${Math.round(ty * 10) / 10} ${Math.round(ax * 10) / 10},${Math.round(ay * 10) / 10} ${Math.round(bx * 10) / 10},${Math.round(by * 10) / 10}`;
  return `<polygon points="${pts}" fill="${escapeAttribute(color)}" stroke="none" />`;
}

function getCanvasSvg(objects: CanvasObject[]) {
  if (!objects.length) {
    return '<p class="canvas-empty">No canvas objects on this page.</p>';
  }

  const bounds = getCanvasBounds(objects);
  const padding = 32;
  const viewBox = [
    bounds.x - padding,
    bounds.y - padding,
    bounds.width + padding * 2,
    bounds.height + padding * 2,
  ].join(" ");
  const height = Math.min(720, Math.max(260, Math.round(((bounds.height + padding * 2) / (bounds.width + padding * 2)) * 900)));

  return `<svg viewBox="${viewBox}" width="900" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="${bounds.x - padding}" y="${bounds.y - padding}" width="${bounds.width + padding * 2}" height="${bounds.height + padding * 2}" fill="#ffffff" />
    ${objects.map((o) => renderCanvasObject(o, objects)).join("")}
  </svg>`;
}

function getLineRenderEntries(object: CanvasObject, objects: CanvasObject[]): LineRenderEntry[] {
  const points = getLineRenderPoints(object, objects);
  const { x1, y1, x2, y2 } = points;
  const strokeColor = object.strokeColor ?? defaultCanvasStyle.strokeColor;
  const strokeWidth = object.strokeWidth ?? defaultCanvasStyle.strokeWidth;
  const arrowDirection = getArrowDirection(object);
  const lineMode = getConnectorLineMode(object);

  if (lineMode === "double" && isConnectedLine(object)) {
    const secondStrokeWidth = getSecondLineStrokeWidth(object);
    const primaryPath = getDoubleLinePathData(object, points, 1, strokeWidth, secondStrokeWidth);
    const secondaryPath = getDoubleLinePathData(object, points, -1, strokeWidth, secondStrokeWidth);

    // Angles are the same as the single-line routing (paths are parallel offsets).
    const connectorStyle = getConnectorStyle(object);
    let startAngle: number;
    let endAngle: number;

    if (connectorStyle === "curve") {
      const cp = getCurveConnectorControlPoint(points, object);
      endAngle = Math.atan2(y2 - cp.y, x2 - cp.x);
      startAngle = Math.atan2(y1 - cp.y, x1 - cp.x);
    } else if (connectorStyle === "elbow") {
      const rp = getElbowConnectorPoints(points, object);
      const n = rp.length;
      endAngle = n >= 2 ? Math.atan2(rp[n - 1].y - rp[n - 2].y, rp[n - 1].x - rp[n - 2].x) : 0;
      startAngle = n >= 2 ? Math.atan2(rp[0].y - rp[1].y, rp[0].x - rp[1].x) : Math.PI;
    } else {
      const a = Math.atan2(y2 - y1, x2 - x1);
      endAngle = a;
      startAngle = a + Math.PI;
    }

    return [
      {
        arrowDirection,
        pathData: primaryPath,
        strokeColor,
        strokeDasharray: getStrokeDashArray(object),
        strokeWidth,
        startPt: parsePathStartPt(primaryPath),
        startAngle,
        endPt: parsePathEndPt(primaryPath),
        endAngle,
      },
      {
        arrowDirection: getSecondLineArrowDirection(object),
        pathData: secondaryPath,
        strokeColor: getSecondLineStrokeColor(object),
        strokeDasharray: getSecondLineStrokeDashArray(object),
        strokeWidth: secondStrokeWidth,
        startPt: parsePathStartPt(secondaryPath),
        startAngle,
        endPt: parsePathEndPt(secondaryPath),
        endAngle,
      },
    ];
  }

  // Single line — straight, curve, or elbow.
  let pathData: string;
  let startPt: { x: number; y: number };
  let endPt: { x: number; y: number };
  let startAngle: number;
  let endAngle: number;

  if (isConnectedLine(object)) {
    const connectorStyle = getConnectorStyle(object);
    if (connectorStyle === "curve") {
      const cp = getCurveConnectorControlPoint(points, object);
      pathData = `M ${x1} ${y1} Q ${cp.x} ${cp.y} ${x2} ${y2}`;
      endAngle = Math.atan2(y2 - cp.y, x2 - cp.x);
      startAngle = Math.atan2(y1 - cp.y, x1 - cp.x);
      startPt = { x: x1, y: y1 };
      endPt = { x: x2, y: y2 };
    } else if (connectorStyle === "elbow") {
      const rp = getElbowConnectorPoints(points, object);
      pathData = rp.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
      const n = rp.length;
      endAngle = n >= 2 ? Math.atan2(rp[n - 1].y - rp[n - 2].y, rp[n - 1].x - rp[n - 2].x) : 0;
      startAngle = n >= 2 ? Math.atan2(rp[0].y - rp[1].y, rp[0].x - rp[1].x) : Math.PI;
      startPt = rp[0] ?? { x: x1, y: y1 };
      endPt = rp[n - 1] ?? { x: x2, y: y2 };
    } else {
      pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
      const a = Math.atan2(y2 - y1, x2 - x1);
      endAngle = a;
      startAngle = a + Math.PI;
      startPt = { x: x1, y: y1 };
      endPt = { x: x2, y: y2 };
    }
  } else {
    // Freeform (unconnected) line or arrow — always straight.
    pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
    const a = Math.atan2(y2 - y1, x2 - x1);
    endAngle = a;
    startAngle = a + Math.PI;
    startPt = { x: x1, y: y1 };
    endPt = { x: x2, y: y2 };
  }

  return [{ arrowDirection, pathData, strokeColor, strokeDasharray: getStrokeDashArray(object), strokeWidth, startPt, startAngle, endPt, endAngle }];
}

function renderBreadcrumb(breadcrumbPath: string[]) {
  return breadcrumbPath
    .map((item, index) => {
      const label = index === 0 ? `<strong>${escapeHtml(item)}</strong>` : escapeHtml(item);
      return index === 0 ? label : `<span class="separator">/</span>${label}`;
    })
    .join("");
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getCanvasBounds(objects: CanvasObject[]) {
  const points = objects.flatMap((object) => {
    if (object.type === "line" || object.type === "arrow") {
      const lp = getLinePoints(object);
      return [
        { x: lp.x1, y: lp.y1 },
        { x: lp.x2, y: lp.y2 },
      ];
    }

    return [
      { x: object.x, y: object.y },
      { x: object.x + object.width, y: object.y + object.height },
    ];
  });
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function renderCanvasObject(object: CanvasObject, objects: CanvasObject[]) {
  if (object.type === "line" || object.type === "arrow") {
    return renderLine(object, objects);
  }

  if (object.type === "penStroke") {
    return renderPenStroke(object);
  }

  if (object.type === "image" && object.imageDataUrl) {
    return `<image href="${escapeAttribute(object.imageDataUrl)}" x="${object.x}" y="${object.y}" width="${object.width}" height="${object.height}" preserveAspectRatio="xMidYMid meet" />`;
  }

  const fillColor = object.fillColor ?? defaultCanvasStyle.fillColor;
  const strokeColor = object.strokeColor ?? defaultCanvasStyle.strokeColor;
  const strokeWidth = object.strokeWidth ?? defaultCanvasStyle.strokeWidth;
  const textColor = object.textColor ?? defaultCanvasStyle.textColor;
  const strokeDasharray = getStrokeDashArray(object);
  const dashAttr = strokeDasharray != null ? ` stroke-dasharray="${strokeDasharray}"` : "";
  const label = object.text || "";
  const text = label
    ? `<text x="${object.x + object.width / 2}" y="${object.y + object.height / 2}" dominant-baseline="middle" fill="${escapeAttribute(textColor)}" font-size="${object.fontSize ?? defaultCanvasStyle.fontSize}" font-weight="${object.textBold ? 700 : 400}" text-anchor="middle">${escapeHtml(label)}</text>`
    : "";

  if (object.type === "circle") {
    return `<g>${textBeforeLabel(object)}<ellipse cx="${object.x + object.width / 2}" cy="${object.y + object.height / 2}" rx="${object.width / 2}" ry="${object.height / 2}" fill="${escapeAttribute(fillColor)}" stroke="${escapeAttribute(strokeColor)}" stroke-width="${strokeWidth}" stroke-linecap="round"${dashAttr} />${text}</g>`;
  }

  if (object.type === "diamond") {
    const points = [
      `${object.x + object.width / 2},${object.y}`,
      `${object.x + object.width},${object.y + object.height / 2}`,
      `${object.x + object.width / 2},${object.y + object.height}`,
      `${object.x},${object.y + object.height / 2}`,
    ].join(" ");
    return `<g>${textBeforeLabel(object)}<polygon points="${points}" fill="${escapeAttribute(fillColor)}" stroke="${escapeAttribute(strokeColor)}" stroke-width="${strokeWidth}" stroke-linecap="round"${dashAttr} />${text}</g>`;
  }

  return `<g>${textBeforeLabel(object)}<rect x="${object.x}" y="${object.y}" width="${object.width}" height="${object.height}" rx="6" fill="${escapeAttribute(fillColor)}" stroke="${escapeAttribute(strokeColor)}" stroke-width="${strokeWidth}" stroke-linecap="round"${dashAttr} />${text}</g>`;
}

function renderLine(object: CanvasObject, objects: CanvasObject[]) {
  const entries = getLineRenderEntries(object, objects);
  const pathsHtml = entries
    .map((entry) => {
      const dashAttr = entry.strokeDasharray != null ? ` stroke-dasharray="${entry.strokeDasharray}"` : "";
      const pathHtml = `<path d="${entry.pathData}" fill="none" stroke="${escapeAttribute(entry.strokeColor)}" stroke-width="${entry.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${dashAttr} />`;
      let arrowsHtml = "";
      if (entry.arrowDirection === "forward" || entry.arrowDirection === "both") {
        arrowsHtml += renderArrowhead(entry.endPt.x, entry.endPt.y, entry.endAngle, entry.strokeWidth, entry.strokeColor);
      }
      if (entry.arrowDirection === "backward" || entry.arrowDirection === "both") {
        arrowsHtml += renderArrowhead(entry.startPt.x, entry.startPt.y, entry.startAngle, entry.strokeWidth, entry.strokeColor);
      }
      return pathHtml + arrowsHtml;
    })
    .join("");

  let labelHtml = "";
  if (object.connectorLabel?.trim()) {
    const labelPt = getLineLabelPoint(object, objects);
    labelHtml = `<text x="${labelPt.x}" y="${labelPt.y - 8}" fill="#334155" font-size="13" text-anchor="middle">${escapeHtml(object.connectorLabel)}</text>`;
  }

  return `<g>${pathsHtml}${labelHtml}</g>`;
}

function renderPenStroke(object: CanvasObject) {
  const points = object.penPoints?.map((point) => `${object.x + point.x},${object.y + point.y}`).join(" ") ?? "";

  if (!points) {
    return "";
  }

  return `<polyline points="${points}" fill="none" stroke="${escapeAttribute(object.strokeColor)}" stroke-width="${object.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
}

function textBeforeLabel(object: CanvasObject) {
  return object.shapeLabel
    ? `<text x="${object.x + object.width / 2}" y="${object.y - 8}" fill="#334155" font-size="13" text-anchor="middle">${escapeHtml(object.shapeLabel)}</text>`
    : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
