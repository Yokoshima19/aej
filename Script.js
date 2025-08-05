
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
        errorBox.classList.remove('hidden');
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function setDefaultDates() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        dataInicioInput.value = formatDate(firstDay);
        dataFimInput.value = formatDate(lastDay);
    }

    fileInput?.addEventListener("change", () => {
        if (fileInput.files.length > 0) {
            fileNameDisplay.textContent = `Arquivo selecionado: ${fileInput.files[0].name}`;
            errorBox.classList.add('hidden');
            downloadLink.classList.add('hidden');
        } else {
            fileNameDisplay.textContent = '';
        }
    });

    processButton?.addEventListener("click", () => {
        const file = fileInput.files[0];
        if (!file) return showMessage("Por favor, selecione um arquivo .txt.");

        const dataInicio = new Date(dataInicioInput.value);
        const dataFim = new Date(dataFimInput.value);
        const dataInicioStr = dataInicioInput.value;
        const dataFimStr = dataFimInput.value;

        processButton.disabled = true;
        processButton.textContent = "Processando...";
        errorBox.classList.add('hidden');
        downloadLink.classList.add('hidden');

        const reader = new FileReader();

        reader.onload = function (e) {
            try {
                const linhas = e.target.result.split(/\r?\n/);
                const cpfParaPrimeiroId = {};
                const idSubstituicoes = {};
                const linha08 = linhas.find(l => l.startsWith("08|"));
                const linha99 = linhas.find(l => l.startsWith("99|"));
                const assinatura = linhas.find(l => l.startsWith("ASSINATURA_DIGITAL_"));

                // Corrige a linha "01" com as datas definidas
                const indexLinha01 = linhas.findIndex(l => l.startsWith("01|"));
                if (indexLinha01 !== -1) {
                    const partes01 = linhas[indexLinha01].split("|");
                    if (partes01.length >= 8) {
                        partes01[6] = dataInicioStr;
                        partes01[7] = dataFimStr;
                        linhas[indexLinha01] = partes01.join("|");
                    }
                }

                for (const linha of linhas) {
                    if (linha.startsWith("03|")) {
                        const partes = linha.split("|");
                        const id = partes[1];
                        const cpf = partes[2];
                        if (cpf && !(cpf in cpfParaPrimeiroId)) {
                            cpfParaPrimeiroId[cpf] = id;
                        }
                        if (cpf) {
                            idSubstituicoes[id] = cpfParaPrimeiroId[cpf];
                        }
                    }
                }

                const linhasFiltradas = [];
                for (const linha of linhas) {
                    const partes = linha.split("|");
                    const tipo = partes[0];

                    if (["05"].includes(tipo)) {
                        const dataISO = partes[2];
                        const dataLinha = new Date(dataISO);
                        if (!isNaN(dataLinha) && dataLinha >= dataInicio && dataLinha <= dataFim) {
                            linhasFiltradas.push(linha);
                        }
                    } else if (["07"].includes(tipo)) {
                        const dataISO = partes[3];
                        const dataLinha = new Date(dataISO);
                        if (!isNaN(dataLinha) && dataLinha >= dataInicio && dataLinha <= dataFim) {
                            linhasFiltradas.push(linha);
                        }
                    } else if (["01", "02", "03", "04"].includes(tipo)) {
                        linhasFiltradas.push(linha);
                    }
                }

                const linhasSubstituidas = linhasFiltradas.map(linha => {
                    const partes = linha.split("|");
                    const tipo = partes[0];
                    if (["03", "05", "07"].includes(tipo)) {
                        const id = partes[1];
                        const novoId = idSubstituicoes[id];
                        if (novoId) {
                            partes[1] = novoId;
                        }
                    }
                    return partes.join("|");
                });

                const cpfIdsMantidos = new Set();
                const linhasFinais = [];

                for (const linha of linhasSubstituidas) {
                    const partes = linha.split("|");
                    const tipo = partes[0];
                    if (tipo === "03") {
                        const id = partes[1];
                        const cpf = partes[2];
                        const chave = cpf + "|" + id;
                        if (cpfParaPrimeiroId[cpf] === id && !cpfIdsMantidos.has(chave)) {
                            cpfIdsMantidos.add(chave);
                            linhasFinais.push(linha);
                        }
                    } else {
                        linhasFinais.push(linha);
                    }
                }

                if (linha08) linhasFinais.push(linha08);
                if (linha99) linhasFinais.push(linha99);
                if (assinatura) linhasFinais.push(assinatura);

                const conteudoFinal = linhasFinais.join("\r\n");
                const blob = new Blob([conteudoFinal], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);

                downloadLink.href = url;
                downloadLink.download = "aej_final.txt";
                downloadLink.textContent = "📥 Baixar Arquivo Processado";
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
