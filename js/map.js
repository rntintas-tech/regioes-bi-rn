/**
 * map.js
 * Toda a lógica de renderização do mapa Leaflet.
 * Usa os dados de data.js e redesenha quando chamado.
 */

let map;
let clusterGroup;
let poligonosAtivos = [];

/** Inicializa o mapa Leaflet uma única vez */
function inicializarMapa() {
  map = L.map("map", { zoomControl: false }).setView([-21.7, -45.8], 7);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png", {
    attribution: "© CartoDB",
    maxZoom: 19,
  }).addTo(map);

  // Leaflet precisa que o container já tenha tamanho; dispara depois do CSS renderizar
  setTimeout(() => map.invalidateSize(), 200);

  // Controle de zoom no canto inferior direito
  L.control.zoom({ position: "bottomright" }).addTo(map);

  clusterGroup = L.markerClusterGroup({
    iconCreateFunction: (cluster) => {
      return L.divIcon({
        html: `<div class="cluster-icon">${cluster.getChildCount()}</div>`,
        className: "",
        iconSize: [36, 36],
      });
    },
  });

  map.addLayer(clusterGroup);
}

/** Converte valor de vendas em raio do marcador */
function calcularRaio(vendas) {
  return Math.max(6, vendas / 12);
}

/** Desenha polígonos côncavos/convexos agrupados por região */
function desenharPoligonos(cidadesFiltradas) {
  // Limpa polígonos anteriores
  poligonosAtivos.forEach((p) => map.removeLayer(p));
  poligonosAtivos = [];

  const agrupado = {};
  cidadesFiltradas.forEach((c) => {
    if (!agrupado[c.regiao]) agrupado[c.regiao] = [];
    agrupado[c.regiao].push(c);
  });

  Object.keys(agrupado).forEach((r) => {
    const cidades = agrupado[r];
    if (cidades.length < 3) return;

    const pontos = cidades.map((c) => turf.point([c.lng, c.lat]));
    const fc = turf.featureCollection(pontos);

    let hull = turf.concave(fc, { maxEdge: 200 }) || turf.convex(fc);
    if (!hull) return;

    const coords = hull.geometry.coordinates[0].map((c) => [c[1], c[0]]);
    const totalVendas = cidades.reduce((s, c) => s + c.vendas, 0);
    const cor = CORES[r];

    const poly = L.polygon(coords, {
      color: cor,
      fillColor: cor,
      fillOpacity: 0.12,
      weight: 2,
      dashArray: "6 4",
    }).addTo(map);

    poly.bindTooltip(
      `<div class="tooltip-regiao">
        <span class="tooltip-titulo" style="color:${cor}">${NOMES_REGIOES[r]}</span>
        <div class="tooltip-linha"><span>Cidades</span><b>${cidades.length}</b></div>
        <div class="tooltip-linha"><span>Vendas</span><b>${totalVendas.toLocaleString()}</b></div>
       </div>`,
      { className: "tooltip-custom", sticky: true }
    );

    poligonosAtivos.push(poly);
  });
}

/** Renderiza marcadores e polígonos para o filtro dado */
function renderMapa(regiaoFiltro) {
  const todasCidades = carregarCidades();
  const cidadesFiltradas =
    regiaoFiltro === "todas"
      ? todasCidades
      : todasCidades.filter((c) => c.regiao == regiaoFiltro);

  clusterGroup.clearLayers();

  cidadesFiltradas.forEach((c) => {
    const cor = CORES[c.regiao];
    const marker = L.circleMarker([c.lat, c.lng], {
      radius: calcularRaio(c.vendas),
      color: cor,
      fillColor: cor,
      fillOpacity: 0.85,
      weight: 2,
    }).bindPopup(
      `<div class="popup-custom">
        <div class="popup-nome">${c.nome}</div>
        <div class="popup-info"><span style="color:${cor}">●</span> ${NOMES_REGIOES[c.regiao]}</div>
        <div class="popup-vendas">Vendas: <b>${c.vendas}</b></div>
       </div>`,
      { className: "popup-wrapper" }
    );

    clusterGroup.addLayer(marker);
  });

  desenharPoligonos(cidadesFiltradas);

  // Zoom automático ao filtrar uma região específica
  if (regiaoFiltro !== "todas" && poligonosAtivos.length > 0) {
    const bounds = L.featureGroup(poligonosAtivos).getBounds();
    map.fitBounds(bounds, { padding: [60, 60] });
  }
}

/** Atualiza os cards de estatísticas no painel lateral */
function atualizarStats(regiaoFiltro) {
  const todasCidades = carregarCidades();
  const container = document.getElementById("stats-container");
  container.innerHTML = "";

  const regioes = regiaoFiltro === "todas" ? [1, 2, 3, 4, 5] : [Number(regiaoFiltro)];

  regioes.forEach((r) => {
    const cidades = todasCidades.filter((c) => c.regiao === r);
    if (!cidades.length) return;

    const total = cidades.reduce((s, c) => s + c.vendas, 0);
    const maior = cidades.reduce((a, b) => (a.vendas > b.vendas ? a : b));

    container.innerHTML += `
      <div class="stat-card" style="border-left-color: ${CORES[r]}">
        <div class="stat-regiao" style="color:${CORES[r]}">${NOMES_REGIOES[r]}</div>
        <div class="stat-numero">${total.toLocaleString()}</div>
        <div class="stat-detalhe">${cidades.length} cidades · Top: ${maior.nome}</div>
      </div>`;
  });
}