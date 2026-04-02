/**
 * editor.js
 * Tabela interativa para reatribuir cidades a regiões.
 * Inclui edição de nomes de regiões.
 * Salva no localStorage ao clicar em "Salvar".
 */

/** Renderiza os inputs de nome de cada região */
function renderizarNomes() {
  const container = document.getElementById("nomes-regioes");
  container.innerHTML = "";

  [1, 2, 3, 4, 5].forEach((r) => {
    const cor = CORES[r];
    container.innerHTML += `
      <div class="nome-row">
        <span class="nome-badge" style="background:${cor}22; color:${cor}; border-color:${cor}44">R${r}</span>
        <input
          type="text"
          class="input-nome"
          data-regiao="${r}"
          value="${NOMES_REGIOES[r]}"
          placeholder="Nome da Região ${r}"
        />
      </div>`;
  });
}

/** Atualiza o badge de status da conexão com a planilha */
function atualizarStatusConexao() {
  const badge = document.getElementById("badge-api-status");
  if (!badge) return;
  if (apiConectada) {
    badge.textContent = "Conectado à planilha";
    badge.className = "badge-api-status conectado";
  } else {
    badge.textContent = "Sem conexão com a planilha — salvamento bloqueado";
    badge.className = "badge-api-status desconectado";
  }
}

/** Renderiza a tabela com todas as cidades e selects de região */
async function renderizarEditor() {
  const cidades = await carregarCidades();
  atualizarStatusConexao();
  const tbody = document.getElementById("editor-tbody");
  tbody.innerHTML = "";

  // Ordena por região, depois por nome
  const ordenadas = [...cidades].sort((a, b) =>
    a.regiao !== b.regiao ? a.regiao - b.regiao : a.nome.localeCompare(b.nome)
  );

  ordenadas.forEach((cidade, idx) => {
    const idxOriginal = cidades.findIndex((c) => c.nome === cidade.nome);
    const cor = CORES[cidade.regiao];

    const opcoes = [1, 2, 3, 4, 5]
      .map(
        (r) =>
          `<option value="${r}" ${r === cidade.regiao ? "selected" : ""}>${r} – ${NOMES_REGIOES[r]}</option>`
      )
      .join("");

    tbody.innerHTML += `
      <tr data-idx="${idxOriginal}">
        <td class="td-cidade">${cidade.nome}</td>
        <td>
          <span class="badge-regiao" style="background:${cor}22; color:${cor}; border-color:${cor}44">
            ${NOMES_REGIOES[cidade.regiao]}
          </span>
        </td>
        <td class="td-vendas">${cidade.vendas}</td>
        <td>
          <select class="select-regiao" data-idx="${idxOriginal}" onchange="marcarAlterado(this)">
            ${opcoes}
          </select>
        </td>
      </tr>`;
  });

  atualizarContadorAlteracoes();
}

/** Destaca a linha quando o usuário muda uma região */
async function marcarAlterado(select) {
  const row = select.closest("tr");
  const idxOriginal = Number(select.dataset.idx);
  const cidades = await carregarCidades();
  const valorOriginal = cidades[idxOriginal].regiao;
  const valorNovo = Number(select.value);

  if (valorNovo !== valorOriginal) {
    row.classList.add("linha-alterada");
  } else {
    row.classList.remove("linha-alterada");
  }

  atualizarContadorAlteracoes();
}

/** Conta e exibe quantas cidades foram alteradas (não salvas ainda) */
async function atualizarContadorAlteracoes() {
  const selects = document.querySelectorAll(".select-regiao");
  const cidades = await carregarCidades();
  let count = 0;

  selects.forEach((sel) => {
    const idx = Number(sel.dataset.idx);
    if (Number(sel.value) !== cidades[idx].regiao) count++;
  });

  const badge = document.getElementById("badge-alteracoes");
  badge.textContent = count > 0 ? `${count} alteração${count > 1 ? "ões" : ""} pendente${count > 1 ? "s" : ""}` : "";
  badge.style.display = count > 0 ? "inline-flex" : "none";
}

/** Coleta selects de região + inputs de nome e salva tudo na API */
async function salvarAlteracoes() {
  if (!apiConectada) {
    mostrarToast("offline");
    return;
  }

  const btn = document.getElementById("btn-salvar");
  btn.textContent = "Salvando...";
  btn.disabled = true;
  mostrarToast("saving");

  try {
    const cidades = await carregarCidades();
    document.querySelectorAll(".select-regiao").forEach((sel) => {
      cidades[Number(sel.dataset.idx)].regiao = Number(sel.value);
    });

    const nomes = {};
    document.querySelectorAll(".input-nome").forEach((inp) => {
      nomes[Number(inp.dataset.regiao)] = inp.value.trim() || NOMES_REGIOES_PADRAO[inp.dataset.regiao];
    });

    await salvarDados(cidades, nomes);

    mostrarToast("success");
    btn.textContent = "✓ Salvo!";
    btn.classList.add("btn-salvo");
    setTimeout(() => {
      btn.textContent = "Salvar Alterações";
      btn.classList.remove("btn-salvo");
      btn.disabled = false;
    }, 2000);

    renderizarEditor();
    renderizarNomes();
    const regiaoAtiva = document.getElementById("filtro")?.value || "todas";
    renderMapa(regiaoAtiva);
    atualizarStats(regiaoAtiva);
    atualizarSelectFiltro();

  } catch (err) {
    mostrarToast("error");
    btn.textContent = "Erro ao salvar";
    btn.style.background = "#ef4444";
    setTimeout(() => {
      btn.textContent = "Salvar Alterações";
      btn.style.background = "";
      btn.disabled = false;
    }, 3000);
    console.error(err);
  }
}

/** Reseta tudo para os dados padrão após confirmação */
function restaurarPadrao() {
  if (!confirm("Restaurar todas as regiões e nomes para o padrão original?")) return;
  resetarCidades();
  renderizarEditor();
  renderizarNomes();
  atualizarSelectFiltro();
  renderMapa("todas");
  atualizarStats("todas");
}

/** Filtra a tabela pelo campo de busca */
function filtrarTabela(termo) {
  const linhas = document.querySelectorAll("#editor-tbody tr");
  const lower = termo.toLowerCase();
  linhas.forEach((linha) => {
    const nome = linha.querySelector(".td-cidade").textContent.toLowerCase();
    linha.style.display = nome.includes(lower) ? "" : "none";
  });
}

/**
 * Exibe um toast no canto da tela.
 * estado: "saving" | "success" | "error"
 */
function mostrarToast(estado) {
  let toast = document.getElementById("toast-salvar");

  // Cria o elemento na primeira vez
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast-salvar";
    document.body.appendChild(toast);
  }

  const config = {
    saving: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
               <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
             </svg>`,
      texto: "Salvando na planilha…",
      cor: "var(--accent)",
      spin: true,
      duracao: null,
    },
    success: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
               <polyline points="20 6 9 17 4 12"/>
             </svg>`,
      texto: "Salvo com sucesso!",
      cor: "#22c55e",
      spin: false,
      duracao: 3000,
    },
    error: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
               <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
             </svg>`,
      texto: "Erro ao salvar. Tente novamente.",
      cor: "#ef4444",
      spin: false,
      duracao: 4000,
    },
    offline: {
      icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
               <line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>
             </svg>`,
      texto: "Planilha não conectada. Recarregue a página e tente novamente.",
      cor: "#f59e0b",
      spin: false,
      duracao: 5000,
    },
  };

  const c = config[estado];

  toast.innerHTML = `
    <span class="toast-icon ${c.spin ? "spin" : ""}" style="color:${c.cor}">${c.icon}</span>
    <span>${c.texto}</span>
  `;
  toast.style.setProperty("--toast-border", c.cor);
  toast.classList.remove("toast-hide");
  toast.classList.add("toast-show");

  if (c.duracao) {
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.replace("toast-show", "toast-hide");
    }, c.duracao);
  }
}