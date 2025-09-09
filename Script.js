document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("fileInput");
  const processButton = document.getElementById("processButton");
  const fileNameDisplay = document.getElementById("fileName");
  const downloadLink = document.getElementById("downloadLink");
  const errorBox = document.getElementById("errorBox");
  const errorMessage = document.getElementById("errorMessage");
  const dataInicioInput = document.getElementById("dataInicio");
  const dataFimInput = document.getElementById("dataFim");

  function showMessage(message) {
    errorMessage.textContent = message;
    errorBox.classList.remove("hidden");
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function setDefaultDates() {
    const today = new Date();
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    dataInicioInput.value = formatDate(first);
    dataFimInput.value = formatDate(last);
  }

  // 'YYYY-MM-DD' (ignora hora se houver)
  function extractDateStr(s) {
    if (!s) return null;
    const m = String(s).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }

  // zero-pad de 9 dígitos para o trailer 99
  function pad9(n) { return String(n).padStart(9, "0"); }

  fileInput?.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      fileNameDisplay.textContent = `Arquivo selecionado: ${fileInput.files[0].name}`;
      errorBox.classList.add("hidden");
      downloadLink.classList.add("hidden");
    } else {
      fileNameDisplay.textContent = "";
    }
  });

  processButton?.addEventListener("click", () => {
    const file = fileInput.files?.[0];
    if (!file) return showMessage("Por favor, selecione um arquivo .txt.");

    const dataInicioStr = dataInicioInput.value;
    const dataFimStr = dataFimInput.value;
    if (!dataInicioStr || !dataFimStr || dataInicioStr > dataFimStr) {
      return showMessage("Período inválido. Verifique as datas.");
    }

    processButton.disabled = true;
    processButton.textContent = "Processando...";
    errorBox.classList.add("hidden");
    downloadLink.classList.add("hidden");

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const linhasOrig = e.target.result.split(/\r?\n/).filter(Boolean);

        // --- 1) Captura linhas especiais ---
        const idx01 = linhasOrig.findIndex((l) => l.startsWith("01|"));
        const linha08Orig = linhasOrig.find((l) => l.startsWith("08|"));
        // assinatura antiga não será reaproveitada após edição
        // const assinatura = linhasOrig.find((l) => l.startsWith("ASSINATURA_DIGITAL_"));

        // Atualiza 01 com o período
        const linhasMut = [...linhasOrig];
        if (idx01 !== -1) {
          const p = linhasMut[idx01].split("|");
          if (p.length >= 8) {
            p[6] = dataInicioStr;
            p[7] = dataFimStr;
            linhasMut[idx01] = p.join("|");
          }
        }

        // --- 2) Índices CPF/ID ---
        const cpfPrimeiroId = new Map();   // cpf -> menor id
        const idParaCpf = new Map();       // id -> cpf
        for (let i = 0; i < linhasMut.length; i++) {
          const l = linhasMut[i];
          if (l.startsWith("03|")) {
            const p = l.split("|");
            const id = p[1], cpf = p[2];
            idParaCpf.set(id, cpf);
            if (!cpfPrimeiroId.has(cpf)) {
              cpfPrimeiroId.set(cpf, id);
            } else {
              const atual = cpfPrimeiroId.get(cpf);
              if (String(id).padStart(10,"0") < String(atual).padStart(10,"0")) {
                cpfPrimeiroId.set(cpf, id);
              }
            }
          }
        }

        // --- 3) Filtra 05/07 pelo período e normaliza IDs ---
        const linhas0507Filtradas = [];
        for (const l of linhasMut) {
          if (l.startsWith("05|")) {
            const p = l.split("|");
            const id = p[1];
            const d = extractDateStr(p[2]);
            if (d && d >= dataInicioStr && d <= dataFimStr) {
              const cpf = idParaCpf.get(id);
              p[1] = cpf ? (cpfPrimeiroId.get(cpf) || id) : id;
              linhas0507Filtradas.push(p.join("|"));
            }
          } else if (l.startsWith("07|")) {
            const p = l.split("|");
            const id = p[1];
            const d = extractDateStr(p[3]);
            if (d && d >= dataInicioStr && d <= dataFimStr) {
              const cpf = idParaCpf.get(id);
              p[1] = cpf ? (cpfPrimeiroId.get(cpf) || id) : id;
              linhas0507Filtradas.push(p.join("|"));
            }
          }
        }

        // --- 4) Monta arquivo em ordem lógica ---
        // 01 e 02 originais
        const linhas01e02 = linhasMut.filter((l) => l.startsWith("01|") || l.startsWith("02|"));

        // 03 únicos (deduplicação por CPF, mantendo todos os colaboradores)
        const linhas03Unicas = [];
        const vistosCPF = new Set();
        for (const l of linhasMut) {
          if (!l.startsWith("03|")) continue;
          const p = l.split("|");
          const cpf = p[2];
          if (vistosCPF.has(cpf)) continue;
          p[1] = cpfPrimeiroId.get(cpf) || p[1]; // normaliza id do 03
          linhas03Unicas.push(p.join("|"));
          vistosCPF.add(cpf);
        }

        // 04 e 06 (se existirem)
        const linhas04e06 = linhasMut.filter((l) => l.startsWith("04|") || l.startsWith("06|"));

        // 05/07 ordenados por data
        linhas0507Filtradas.sort((a, b) => {
          const pa = a.split("|");
          const pb = b.split("|");
          const da = extractDateStr(pa[0] === "05" ? pa[2] : pa[3]);
          const db = extractDateStr(pb[0] === "05" ? pb[2] : pb[3]);
          if (da === db) return a.localeCompare(b);
          return da < db ? -1 : 1;
        });

        // 08 original (metadados)
        const linha08 = linha08Orig || "";

        // Recalcula trailer 99 (conta 01..08 após o filtro)
        const todas = [
          ...linhas01e02,
          ...linhas03Unicas,
          ...linhas04e06,
          ...linhas0507Filtradas,
        ];
        const cont = { "01":0, "02":0, "03":0, "04":0, "05":0, "06":0, "07":0, "08":0 };
        for (const l of todas) {
          const t = l.slice(0,2);
          if (cont[t] != null) cont[t]++;
        }
        if (linha08) cont["08"] = 1;

        const linha99 = "99|" + [
          pad9(cont["01"]),
          pad9(cont["02"]),
          pad9(cont["03"]),
          pad9(cont["04"]),
          pad9(cont["05"]),
          pad9(cont["06"]),
          pad9(cont["07"]),
          pad9(cont["08"])
        ].join("|");

        // Saída final (sem ASSINATURA_DIGITAL antiga)
        const saida = [...todas, linha08, linha99].filter(Boolean).join("\r\n") + "\r\n";

        const blob = new Blob([saida], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        downloadLink.href = url;
        downloadLink.download = "aej_final.txt";
        downloadLink.textContent = "Baixar Arquivo Processado";
        downloadLink.classList.remove("hidden");
      } catch (err) {
        showMessage("Erro ao processar: " + err.message);
      } finally {
        processButton.disabled = false;
        processButton.textContent = "Processar Arquivo";
      }
    };

    reader.readAsText(file, "UTF-8");
  });

  setDefaultDates();
});
