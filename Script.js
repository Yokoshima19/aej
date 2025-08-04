
// Elementos do DOM
const fileInput = document.getElementById('fileInput');
const processButton = document.getElementById('processButton');
const fileNameDisplay = document.getElementById('fileName');
const downloadLink = document.getElementById('downloadLink');
const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');
const dataInicioInput = document.getElementById('dataInicio');
const dataFimInput = document.getElementById('dataFim');

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

fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        fileNameDisplay.textContent = `Arquivo selecionado: ${fileInput.files[0].name}`;
        errorBox.classList.add('hidden');
        downloadLink.classList.add('hidden');
    } else {
        fileNameDisplay.textContent = '';
    }
});

processButton.addEventListener('click', processarArquivo);

function showMessage(message) {
    errorMessage.textContent = message;
    errorBox.classList.remove('hidden');
}

function processarArquivo() {
    if (!fileInput.files[0]) {
        showMessage("Por favor, selecione o arquivo aej.txt antes de processar.");
        return;
    }

    processButton.disabled = true;
    processButton.textContent = 'Processando...';
    errorBox.classList.add('hidden');
    downloadLink.classList.add('hidden');

    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const dataInicio = new Date(dataInicioInput.value);
            const dataFim = new Date(dataFimInput.value);

            const linhas = e.target.result.split(/\r?\n/);
            const cpfParaPrimeiroId = {};
            const idSubstituicoes = {};

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
                    try {
                        const dataLinha = new Date(dataISO).toISOString().slice(0, 10);
                        const dataJS = new Date(dataLinha);
                        if (dataJS >= dataInicio && dataJS <= dataFim) {
                            linhasFiltradas.push(linha);
                        }
                    } catch {}
                } else if (["07"].includes(tipo)) {
                    const dataISO = partes[3];
                    try {
                        const dataLinha = new Date(dataISO).toISOString().slice(0, 10);
                        const dataJS = new Date(dataLinha);
                        if (dataJS >= dataInicio && dataJS <= dataFim) {
                            linhasFiltradas.push(linha);
                        }
                    } catch {}
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
                        return partes.join("|");
                    }
                }
                return linha;
            });

            const cpfIdsMantidos = new Set();
            
            const linha08 = linhas.find(l => l.startsWith("08|"));
            const linha99 = linhas.find(l => l.startsWith("99|"));
            const assinatura = linhas.find(l => l.startsWith("ASSINATURA_DIGITAL_"));

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

            
            if (linha08) {
                linhasFinais.push(linha08);
            }
            if (linha99) {
                linhasFinais.push(linha99);
            }
            if (assinatura) {
                linhasFinais.push(assinatura);
            }
            const conteudoFinal = linhasFinais.join("\r\n");
    
            const blob = new Blob([conteudoFinal], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);

            downloadLink.href = url;
            downloadLink.download = "aej_final.txt";
            downloadLink.textContent = "📥 Baixar Arquivo Processado";
            downloadLink.classList.remove('hidden');

        } catch (err) {
            showMessage("Erro: " + err.message);
        } finally {
            processButton.disabled = false;
            processButton.textContent = "Processar Arquivo";
        }
    };

    reader.readAsText(fileInput.files[0], "UTF-8");
}

window.addEventListener('DOMContentLoaded', setDefaultDates);
