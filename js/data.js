/**
 * data.js
 * Fonte de verdade das cidades e regiões.
 * Lê e salva via Google Apps Script (Web App) — compartilhado entre todos os usuários.
 * Fallback para localStorage se a API estiver offline.
 */

// ⚠️ Substitua pela URL gerada no Apps Script → Implantar
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

/** Objeto vivo de nomes — atualizado após carregar da API */
let NOMES_REGIOES = { ...NOMES_REGIOES_PADRAO };

/** Busca dados da API. Em caso de erro, usa o cache do localStorage */
async function carregarCidades() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    if (data.nomes) Object.assign(NOMES_REGIOES, data.nomes);

    // Salva backup local
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
    return [];
  }
}

/** Envia cidades e nomes atualizados para a API */
async function salvarDados(cidades, nomes) {
  // Salva backup local imediatamente
  localStorage.setItem("mapa_bi_backup", JSON.stringify({ cidades, nomes }));
  Object.assign(NOMES_REGIOES, nomes);

  const res = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({ cidades, nomes }),
  });

  if (!res.ok) throw new Error("Falha ao salvar na API");
  return res.json();
}

/** Reseta nomes para o padrão e limpa cache */
function resetarCidades() {
  localStorage.removeItem("mapa_bi_backup");
  Object.assign(NOMES_REGIOES, NOMES_REGIOES_PADRAO);
}