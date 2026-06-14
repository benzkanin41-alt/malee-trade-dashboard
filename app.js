const COLORS = ["#2563eb", "#0f8b6b", "#c24135", "#b7791f", "#7c3aed", "#0891b2", "#be185d", "#4d7c0f"];

const state = {
  data: null,
  sheet: null,
  selectedIds: new Set(),
  selectedPoint: null,
  search: "",
};

const els = {
  sourceMeta: document.getElementById("sourceMeta"),
  sheetSelect: document.getElementById("sheetSelect"),
  seriesSearch: document.getElementById("seriesSearch"),
  defaultSeriesBtn: document.getElementById("defaultSeriesBtn"),
  allSeriesBtn: document.getElementById("allSeriesBtn"),
  clearSeriesBtn: document.getElementById("clearSeriesBtn"),
  seriesList: document.getElementById("seriesList"),
  kpiStrip: document.getElementById("kpiStrip"),
  valueChart: document.getElementById("valueChart"),
  yoyChart: document.getElementById("yoyChart"),
  momChart: document.getElementById("momChart"),
  valueLegend: document.getElementById("valueLegend"),
  yoyLegend: document.getElementById("yoyLegend"),
  momLegend: document.getElementById("momLegend"),
  valueChartUnit: document.getElementById("valueChartUnit"),
  selectedMode: document.getElementById("selectedMode"),
  pointDetail: document.getElementById("pointDetail"),
  rawTable: document.getElementById("rawTable"),
  rawCount: document.getElementById("rawCount"),
  tooltip: document.getElementById("tooltip"),
};

fetch("data/dashboard-data.json")
  .then((response) => response.json())
  .then((data) => {
    state.data = data;
    state.sheet = data.sheets[0];
    state.selectedIds = new Set(state.sheet.defaultSeriesIds);
    hydrateControls();
    renderAll();
  })
  .catch((error) => {
    document.body.innerHTML = `<pre class="empty-state">${escapeHtml(error.message)}</pre>`;
  });

function hydrateControls() {
  els.sourceMeta.textContent = `Source: ${state.data.sourceWorkbook} | Modified: ${state.data.sourceWorkbookModified}`;
  els.sheetSelect.innerHTML = state.data.sheets
    .map((sheet) => `<option value="${sheet.id}">${escapeHtml(sheet.name)}</option>`)
    .join("");
  els.sheetSelect.value = state.sheet.id;
  els.sheetSelect.addEventListener("change", () => {
    state.sheet = state.data.sheets.find((sheet) => sheet.id === els.sheetSelect.value);
    state.selectedIds = new Set(state.sheet.defaultSeriesIds);
    state.selectedPoint = null;
    renderAll();
  });
  els.seriesSearch.addEventListener("input", () => {
    state.search = els.seriesSearch.value.trim().toLowerCase();
    renderSeriesList();
  });
  els.defaultSeriesBtn.addEventListener("click", () => {
    state.selectedIds = new Set(state.sheet.defaultSeriesIds);
    state.selectedPoint = null;
    renderAll();
  });
  els.allSeriesBtn.addEventListener("click", () => {
    state.selectedIds = new Set(state.sheet.series.map((item) => item.id));
    state.selectedPoint = null;
    renderAll();
  });
  els.clearSeriesBtn.addEventListener("click", () => {
    state.selectedIds = new Set();
    state.selectedPoint = null;
    renderAll();
  });
}

function renderAll() {
  renderSeriesList();
  renderKpis();
  renderCharts();
  renderDetail();
  renderRawTable();
}

function selectedSeries() {
  return state.sheet.series.filter((item) => state.selectedIds.has(item.id));
}

function seriesColor(seriesId) {
  const index = state.sheet.series.findIndex((item) => item.id === seriesId);
  return COLORS[Math.max(0, index) % COLORS.length];
}

function renderSeriesList() {
  const search = state.search;
  const items = state.sheet.series.filter((item) => {
    if (!search) return true;
    return `${item.label} ${item.metric} ${item.unit}`.toLowerCase().includes(search);
  });
  els.seriesList.innerHTML = items
    .map((item) => {
      const checked = state.selectedIds.has(item.id) ? "checked" : "";
      return `
        <label class="series-item">
          <input type="checkbox" value="${escapeHtml(item.id)}" ${checked}>
          <span class="series-name">
            <span class="swatch" style="background:${seriesColor(item.id)}"></span>
            <span class="series-label">${escapeHtml(item.label)}</span>
          </span>
          <span class="series-meta">row ${item.row} | ${escapeHtml(item.unit || "")}</span>
        </label>
      `;
    })
    .join("");
  els.seriesList.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) {
        state.selectedIds.add(input.value);
      } else {
        state.selectedIds.delete(input.value);
      }
      state.selectedPoint = null;
      renderAll();
    });
  });
}

function renderKpis() {
  const series = selectedSeries();
  const latestIndex = latestVisibleIndex(series);
  const period = state.sheet.periods[latestIndex];
  const yoyValues = series.map((item) => item.yoy[latestIndex]).filter(isNumber);
  const momValues = series.map((item) => item.mom[latestIndex]).filter(isNumber);
  const latestRows = series.map((item) => ({
    id: item.id,
    label: item.label,
    value: item.values[latestIndex],
    yoy: item.yoy[latestIndex],
    mom: item.mom[latestIndex],
    unit: item.unit || "",
  }));
  const kpis = [
    { label: "Sheet", value: state.sheet.name, delta: `${state.sheet.periods.length} periods | ${state.sheet.series.length} series` },
    { label: "Latest Period", value: period ? period.label : "-", delta: `${series.length} selected series` },
    {
      label: "Latest Values",
      className: "kpi-wide",
      custom: renderLatestValues(latestRows),
      delta: series.length > 1 ? "shown separately, not aggregated" : unitSummary(series),
    },
    { label: "Avg YoY / MoM", value: `${formatPercent(avg(yoyValues))} / ${formatPercent(avg(momValues))}`, delta: "selected series average" },
  ];
  els.kpiStrip.innerHTML = kpis
    .map((item) => `
      <div class="kpi ${item.className || ""}">
        <div class="label">${escapeHtml(item.label)}</div>
        ${item.custom || `<div class="value">${escapeHtml(item.value)}</div>`}
        <div class="delta">${escapeHtml(item.delta)}</div>
      </div>
    `)
    .join("");
}

function renderLatestValues(rows) {
  if (!rows.length) {
    return `<div class="latest-list empty">No selected series</div>`;
  }
  return `
    <div class="latest-list">
      ${rows
        .map((row) => `
          <div class="latest-item">
            <span class="swatch" style="background:${seriesColor(row.id)}"></span>
            <span class="latest-name">${escapeHtml(row.label)}</span>
            <span class="latest-value">${escapeHtml(formatNumber(row.value))}</span>
            <span class="latest-meta">${escapeHtml(row.unit)} | YoY ${escapeHtml(formatPercent(row.yoy))} | MoM ${escapeHtml(formatPercent(row.mom))}</span>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function renderCharts() {
  const unit = unitSummary(selectedSeries());
  els.valueChartUnit.textContent = unit;
  renderChart(els.valueChart, "value");
  renderChart(els.yoyChart, "yoy");
  renderChart(els.momChart, "mom");
  renderChartLegend(els.valueLegend, "value");
  renderChartLegend(els.yoyLegend, "yoy");
  renderChartLegend(els.momLegend, "mom");
}

function renderChart(svg, mode) {
  svg.innerHTML = "";
  svg.setAttribute("viewBox", "0 0 1000 340");
  const series = selectedSeries();
  if (!series.length) {
    drawEmpty(svg, "No series selected");
    return;
  }

  const periods = state.sheet.periods;
  const margin = { top: 22, right: 36, bottom: 54, left: 78 };
  const width = 1000 - margin.left - margin.right;
  const height = 340 - margin.top - margin.bottom;
  const manySeries = series.length > 8;
  const pointsBySeries = series.map((item) => ({
    item,
    points: periods
      .map((period, index) => ({
        period,
        index,
        value: mode === "value" ? item.values[index] : item[mode][index],
      }))
      .filter((point) => isNumber(point.value)),
  }));
  const allPoints = pointsBySeries.flatMap((item) => item.points);
  if (!allPoints.length) {
    drawEmpty(svg, "No chartable values");
    return;
  }

  const yValues = allPoints.map((point) => point.value);
  if (mode !== "value") yValues.push(0);
  let minY = Math.min(...yValues);
  let maxY = Math.max(...yValues);
  if (minY === maxY) {
    minY -= 1;
    maxY += 1;
  }
  const pad = (maxY - minY) * 0.08;
  minY -= pad;
  maxY += pad;

  const x = (index) => margin.left + (periods.length <= 1 ? width / 2 : (index / (periods.length - 1)) * width);
  const y = (value) => margin.top + height - ((value - minY) / (maxY - minY)) * height;

  drawGrid(svg, margin, width, height, minY, maxY, mode);
  drawXAxis(svg, margin, width, height, periods);

  pointsBySeries.forEach(({ item, points }) => {
    if (!points.length) return;
    const color = seriesColor(item.id);
    const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.index)} ${y(point.value)}`).join(" ");
    svg.appendChild(el("path", {
      d: path,
      class: "series-line",
      stroke: color,
      opacity: manySeries ? 0.62 : 0.9,
      "vector-effect": "non-scaling-stroke",
    }));
    points.forEach((point) => {
      const active = isActivePoint(item.id, point.index, mode);
      const marker = el("circle", {
        cx: x(point.index),
        cy: y(point.value),
        r: active ? 5.4 : manySeries ? 2.2 : 3.2,
        fill: color,
        opacity: active ? 1 : manySeries ? 0.6 : 0.86,
        class: active ? "point active" : "point",
      });
      const hit = el("circle", {
        cx: x(point.index),
        cy: y(point.value),
        r: manySeries ? 4.8 : 8,
        class: "point-hit",
      });
      const choosePoint = () => {
        state.selectedPoint = { seriesId: item.id, periodIndex: point.index, mode };
        renderDetail();
        renderCharts();
        renderRawTable();
      };
      hit.addEventListener("click", choosePoint);
      hit.addEventListener("mousemove", (event) => showTooltip(event, item, point, mode));
      hit.addEventListener("mouseleave", hideTooltip);
      svg.appendChild(marker);
      svg.appendChild(hit);
    });
  });
}

function drawGrid(svg, margin, width, height, minY, maxY, mode) {
  const group = el("g", { class: "grid" });
  const ticks = 6;
  for (let i = 0; i <= ticks; i += 1) {
    const ratio = i / ticks;
    const value = maxY - (maxY - minY) * ratio;
    const yPos = margin.top + height * ratio;
    group.appendChild(el("line", { x1: margin.left, x2: margin.left + width, y1: yPos, y2: yPos }));
    const label = mode === "value" ? formatAxis(value) : `${formatAxis(value)}%`;
    const text = el("text", { x: margin.left - 8, y: yPos + 4, "text-anchor": "end" });
    text.textContent = label;
    group.appendChild(text);
  }
  if (minY < 0 && maxY > 0) {
    const zeroY = margin.top + height - ((0 - minY) / (maxY - minY)) * height;
    group.appendChild(el("line", { x1: margin.left, x2: margin.left + width, y1: zeroY, y2: zeroY, class: "zero-line" }));
  }
  svg.appendChild(group);
}

function drawXAxis(svg, margin, width, height, periods) {
  const group = el("g", { class: "axis" });
  const baseY = margin.top + height;
  group.appendChild(el("line", { x1: margin.left, x2: margin.left + width, y1: baseY, y2: baseY }));
  const tickCount = Math.min(8, periods.length);
  const used = new Set();
  for (let i = 0; i < tickCount; i += 1) {
    const index = Math.round((i / Math.max(1, tickCount - 1)) * (periods.length - 1));
    if (used.has(index)) continue;
    used.add(index);
    const xPos = margin.left + (periods.length <= 1 ? width / 2 : (index / (periods.length - 1)) * width);
    group.appendChild(el("line", { x1: xPos, x2: xPos, y1: baseY, y2: baseY + 5 }));
    const text = el("text", { x: xPos, y: baseY + 22, "text-anchor": "middle" });
    text.textContent = periods[index].label;
    group.appendChild(text);
  }
  svg.appendChild(group);
}

function drawEmpty(svg, message) {
  svg.setAttribute("viewBox", "0 0 1000 340");
  const text = el("text", { x: 500, y: 170, "text-anchor": "middle", fill: "#5f6b7a" });
  text.textContent = message;
  svg.appendChild(text);
}

function renderChartLegend(container, mode) {
  const series = selectedSeries();
  const latestIndex = latestVisibleIndex(series);
  if (!series.length) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = series
    .map((item) => {
      const value = mode === "value" ? item.values[latestIndex] : item[mode][latestIndex];
      const valueText = mode === "value" ? formatNumber(value) : formatPercent(value);
      return `
        <span class="legend-item">
          <span class="swatch" style="background:${seriesColor(item.id)}"></span>
          <span class="legend-name">${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(valueText)}</strong>
        </span>
      `;
    })
    .join("");
}

function renderDetail() {
  if (!state.selectedPoint) {
    els.selectedMode.textContent = "";
    els.pointDetail.innerHTML = `
      <dt>Sheet</dt><dd>${escapeHtml(state.sheet.name)}</dd>
      <dt>Status</dt><dd>No point selected</dd>
    `;
    return;
  }
  const item = state.sheet.series.find((series) => series.id === state.selectedPoint.seriesId);
  const index = state.selectedPoint.periodIndex;
  const period = state.sheet.periods[index];
  const mode = state.selectedPoint.mode;
  els.selectedMode.textContent = mode.toUpperCase();
  const value = item.values[index];
  const detailRows = [
    ["Sheet", state.sheet.name],
    ["Series", item.label],
    ["Period", period.label],
    ["Value", `${formatNumber(value)} ${item.unit || ""}`],
    ["YoY", formatPercent(item.yoy[index])],
    ["MoM", formatPercent(item.mom[index])],
    ["Prev Period", formatNumber(item.previousPeriodValues[index])],
    ["Prev Year", formatNumber(item.previousYearValues[index])],
    ["Excel Cell", item.sourceCells[index]],
    ["Formula", item.formulas[index] || "-"],
  ];
  els.pointDetail.innerHTML = detailRows
    .map(([term, valueText]) => `<dt>${escapeHtml(term)}</dt><dd>${escapeHtml(valueText)}</dd>`)
    .join("");
}

function renderRawTable() {
  const periods = state.sheet.periods;
  const rows = state.sheet.rawRows;
  els.rawCount.textContent = `${rows.length} rows`;
  const header = `<tr><th>Series</th>${periods.map((period) => `<th>${escapeHtml(period.label)}</th>`).join("")}</tr>`;
  const body = rows
    .map((row) => {
      const cells = row.values
        .map((value, index) => {
          const active = state.selectedPoint && state.selectedPoint.seriesId === row.id && state.selectedPoint.periodIndex === index;
          return `<td class="raw-cell ${active ? "active" : ""}" data-series="${escapeHtml(row.id)}" data-index="${index}" title="${escapeHtml(row.sourceCells[index])}">${escapeHtml(formatNumber(value))}</td>`;
        })
        .join("");
      return `<tr><td>${escapeHtml(row.label)}</td>${cells}</tr>`;
    })
    .join("");
  els.rawTable.innerHTML = `<table>${header}${body}</table>`;
  els.rawTable.querySelectorAll(".raw-cell").forEach((cell) => {
    cell.addEventListener("click", () => {
      state.selectedPoint = {
        seriesId: cell.dataset.series,
        periodIndex: Number(cell.dataset.index),
        mode: "value",
      };
      renderDetail();
      renderCharts();
      renderRawTable();
    });
  });
}

function latestVisibleIndex(series) {
  for (let i = state.sheet.periods.length - 1; i >= 0; i -= 1) {
    if (series.some((item) => isNumber(item.values[i]))) return i;
  }
  return Math.max(0, state.sheet.periods.length - 1);
}

function showTooltip(event, item, point, mode) {
  const value = mode === "value" ? item.values[point.index] : item[mode][point.index];
  els.tooltip.hidden = false;
  els.tooltip.innerHTML = `
    <strong>${escapeHtml(item.label)}</strong><br>
    ${escapeHtml(point.period.label)}<br>
    ${escapeHtml(mode === "value" ? formatNumber(value) : formatPercent(value))}<br>
    Value ${escapeHtml(formatNumber(item.values[point.index]))} | YoY ${escapeHtml(formatPercent(item.yoy[point.index]))} | MoM ${escapeHtml(formatPercent(item.mom[point.index]))}
  `;
  els.tooltip.style.left = `${event.clientX + 12}px`;
  els.tooltip.style.top = `${event.clientY + 12}px`;
}

function hideTooltip() {
  els.tooltip.hidden = true;
}

function isActivePoint(seriesId, periodIndex, mode) {
  return (
    state.selectedPoint &&
    state.selectedPoint.seriesId === seriesId &&
    state.selectedPoint.periodIndex === periodIndex &&
    state.selectedPoint.mode === mode
  );
}

function isNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function avg(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function unitSummary(series) {
  const units = [...new Set(series.map((item) => item.unit).filter(Boolean))];
  if (!units.length) return "";
  if (units.length === 1) return units[0];
  return "mixed units";
}

function formatNumber(value) {
  if (!isNumber(value)) return "-";
  const abs = Math.abs(value);
  const digits = abs >= 100 ? 2 : abs >= 10 ? 3 : 4;
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function formatAxis(value) {
  if (!isNumber(value)) return "";
  const abs = Math.abs(value);
  if (abs >= 1000) return `${(value / 1000).toFixed(1)}k`;
  if (abs >= 100) return value.toFixed(0);
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

function formatPercent(value) {
  if (!isNumber(value)) return "-";
  const className = value >= 0 ? "positive" : "negative";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function el(name, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => {
    node.setAttribute(key, value);
  });
  return node;
}
