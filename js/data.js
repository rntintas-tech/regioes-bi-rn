/**
 * data.js
 * Lê via JSONP (contorna CORS no GET) e salva via POST no-cors.
 * Fallback para localStorage se API offline.
 */

const API_URL = "https://script.google.com/macros/s/AKfycbw4nUcIgqn-rhavxBPA6vtBLwNDIYa1H9ah2NpOZKOKbdhu7Zai_hqRHbAS8k74Kbsysw/exec";

const CORES = {
  1: "#22c55e",
  2: "#3b82f6",
  3: "#f59e0b",
  4: "#ef4444",
  5: "#a855f7",
};

const NOMES_REGIOES_PADRAO = {
  1: "Varginha e Entorno",
  2: "Pouso Alegre e Fronteira SP",
  3: "Alfenas e Sudoeste",
  4: "Lavras e Centro-Sul",
  5: "Sul e Divisa SP",
};

let NOMES_REGIOES = { ...NOMES_REGIOES_PADRAO };

/**
 * Faz GET via JSONP — injeta uma tag <script> com ?callback=fn
 * Isso contorna CORS porque <script> não tem restrição de origem.
 */
function fetchJSONP(url) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Date.now();
    const script = document.createElement("script");

    window[cb] = (data) => {
      delete window[cb];
      script.remove();
      resolve(data);
    };

    script.onerror = () => {
      delete window[cb];
      script.remove();
      reject(new Error("JSONP falhou"));
    };

    script.src = `${url}?callback=${cb}`;
    document.head.appendChild(script);

    // Timeout de 8 segundos
    setTimeout(() => {
      if (window[cb]) {
        delete window[cb];
        script.remove();
        reject(new Error("JSONP timeout"));
      }
    }, 8000);
  });
}

/** Carrega dados da API (JSONP) com fallback para localStorage */
async function carregarCidades() {
  try {
    const data = await fetchJSONP(API_URL);

    if (data.nomes) Object.assign(NOMES_REGIOES, data.nomes);
    localStorage.setItem("mapa_bi_backup", JSON.stringify(data));

    return data.cidades;
  } catch (err) {
    console.warn("API offline, usando cache local:", err);
    const backup = localStorage.getItem("mapa_bi_backup");
    if (backup) {
      const data = JSON.parse(backup);
      if (data.nomes) Object.assign(NOMES_REGIOES, data.nomes);
      return data.cidades;
    }
    return CIDADES_PADRAO;
  }
}

/**
 * Salva via POST com no-cors.
 * no-cors = o browser envia mas não lê a resposta (suficiente para gravar).
 */
async function salvarDados(cidades, nomes) {
  localStorage.setItem("mapa_bi_backup", JSON.stringify({ cidades, nomes }));
  Object.assign(NOMES_REGIOES, nomes);

  await fetch(API_URL, {
    method: "POST",
    mode: "no-cors",   // envia sem precisar de header CORS na resposta
    body: JSON.stringify({ cidades, nomes }),
  });
  // no-cors sempre retorna response.type = "opaque" — não dá pra checar ok
  // mas a gravação na planilha acontece normalmente
}

function resetarCidades() {
  localStorage.removeItem("mapa_bi_backup");
  Object.assign(NOMES_REGIOES, NOMES_REGIOES_PADRAO);
}

// Dados padrão usados como fallback offline
const CIDADES_PADRAO = [
  {nome:"Varginha",lat:-21.5514,lng:-45.4302,regiao:1,vendas:120},
  {nome:"Eloi Mendes",lat:-21.6085,lng:-45.5658,regiao:1,vendas:80},
  {nome:"Três Corações",lat:-21.696,lng:-45.253,regiao:1,vendas:95},
  {nome:"Três Pontas",lat:-21.3697,lng:-45.5123,regiao:1,vendas:70},
  {nome:"Campanha",lat:-21.8367,lng:-45.3993,regiao:1,vendas:60},
  {nome:"Lambari",lat:-21.9749,lng:-45.3498,regiao:1,vendas:50},
  {nome:"Cruzília",lat:-21.8406,lng:-44.8067,regiao:1,vendas:40},
  {nome:"Caxambu",lat:-21.9774,lng:-44.9319,regiao:1,vendas:65},
  {nome:"Baependi",lat:-21.9588,lng:-44.8897,regiao:1,vendas:45},
  {nome:"São Gonçalo do Sapucaí",lat:-21.8937,lng:-45.5933,regiao:1,vendas:55},
  {nome:"São Lourenço",lat:-22.1164,lng:-45.0545,regiao:1,vendas:85},
  {nome:"Itanhandu",lat:-22.2953,lng:-44.9347,regiao:1,vendas:35},
  {nome:"Itamonte",lat:-22.2859,lng:-44.8688,regiao:1,vendas:30},
  {nome:"Boa Esperança",lat:-21.0927,lng:-45.5656,regiao:1,vendas:75},
  {nome:"Nepomuceno",lat:-21.232,lng:-45.2356,regiao:1,vendas:90},
  {nome:"Pouso Alegre",lat:-22.2266,lng:-45.9384,regiao:2,vendas:200},
  {nome:"Extrema",lat:-22.8547,lng:-46.3182,regiao:2,vendas:150},
  {nome:"Camanducaia",lat:-22.7519,lng:-46.1456,regiao:2,vendas:130},
  {nome:"Monte Sião",lat:-22.4335,lng:-46.5725,regiao:2,vendas:120},
  {nome:"Ouro Fino",lat:-22.2833,lng:-46.3717,regiao:2,vendas:110},
  {nome:"Jacutinga",lat:-22.286,lng:-46.6114,regiao:2,vendas:140},
  {nome:"Cambuí",lat:-22.6122,lng:-46.0572,regiao:2,vendas:125},
  {nome:"Santa Rita do Sapucaí",lat:-22.2554,lng:-45.7037,regiao:2,vendas:160},
  {nome:"Borda da Mata",lat:-22.2761,lng:-46.1653,regiao:2,vendas:115},
  {nome:"Estiva",lat:-22.4573,lng:-46.0191,regiao:2,vendas:100},
  {nome:"Alfenas",lat:-21.4256,lng:-45.9475,regiao:3,vendas:90},
  {nome:"Areado",lat:-21.3572,lng:-46.1457,regiao:3,vendas:70},
  {nome:"Alterosa",lat:-21.249,lng:-46.1395,regiao:3,vendas:60},
  {nome:"Machado",lat:-21.6747,lng:-45.9195,regiao:3,vendas:85},
  {nome:"Passos",lat:-20.7189,lng:-46.6097,regiao:3,vendas:110},
  {nome:"Bom Repouso",lat:-22.4724,lng:-46.1431,regiao:3,vendas:75},
  {nome:"Lavras",lat:-21.2453,lng:-45.0003,regiao:4,vendas:130},
  {nome:"Campo Belo",lat:-20.8976,lng:-45.2773,regiao:4,vendas:95},
  {nome:"Perdões",lat:-21.0943,lng:-45.0915,regiao:4,vendas:85},
  {nome:"Oliveira",lat:-20.6965,lng:-44.8271,regiao:4,vendas:110},
  {nome:"Santo Antônio do Amparo",lat:-20.9447,lng:-44.9183,regiao:4,vendas:90},
  {nome:"Campos Gerais",lat:-21.2346,lng:-45.7583,regiao:4,vendas:100},
  {nome:"Itajubá",lat:-22.4225,lng:-45.4524,regiao:5,vendas:170},
  {nome:"Poços de Caldas",lat:-21.7874,lng:-46.5619,regiao:5,vendas:150},
  {nome:"Itapira",lat:-22.4356,lng:-46.8217,regiao:5,vendas:140},
  {nome:"Mogi Guaçu",lat:-22.3673,lng:-46.9428,regiao:5,vendas:160},
  {nome:"Mogi Mirim",lat:-22.433,lng:-46.957,regiao:5,vendas:155},
  {nome:"Jaguariúna",lat:-22.705,lng:-46.9857,regiao:5,vendas:145},
];