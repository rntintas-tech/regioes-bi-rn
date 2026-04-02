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

/** Renderiza a tabela com todas as cidades e selects de região */
async function renderizarEditor() {
  const cidades = await carregarCidades();
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
function marcarAlterado(select) {
  const row = select.closest("tr");
  const idxOriginal = Number(select.dataset.idx);
  const cidades = carregarCidades();
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
function atualizarContadorAlteracoes() {
  const selects = document.querySelectorAll(".select-regiao");
  const cidades = carregarCidades();
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
  const btn = document.getElementById("btn-salvar");
  btn.textContent = "Salvando...";
  btn.disabled = true;

  try {
    // Coleta cidades com novas regiões
    const cidades = await carregarCidades();
    document.querySelectorAll(".select-regiao").forEach((sel) => {
      cidades[Number(sel.dataset.idx)].regiao = Number(sel.value);
    });

    // Coleta nomes das regiões
    const nomes = {};
    document.querySelectorAll(".input-nome").forEach((inp) => {
      nomes[Number(inp.dataset.regiao)] = inp.value.trim() || NOMES_REGIOES_PADRAO[inp.dataset.regiao];
    });

    await salvarDados(cidades, nomes);

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