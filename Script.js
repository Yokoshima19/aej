// Selecionando os elementos do DOM
const fileInput = document.getElementById('fileInput');
const processButton = document.getElementById('processButton');
const fileNameDisplay = document.getElementById('fileName');
const downloadLink = document.getElementById('downloadLink');
const errorBox = document.getElementById('errorBox');
const errorMessage = document.getElementById('errorMessage');

// Novos elementos para o filtro de data
const dataInicioInput = document.getElementById('dataInicio');
const dataFimInput = document.getElementById('dataFim');

// Função para formatar uma data para o padrão 'YYYY-MM-DD'
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Função para definir as datas de início e fim do mês atual
function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    dataInicioInput.value = formatDate(firstDay);
    dataFimInput.value = formatDate(lastDay);
}

// Adiciona um listener para mostrar o nome do arquivo selecionado
fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
        fileNameDisplay.textContent = `Arquivo selecionado: ${fileInput.files[0].name}`;
        errorBox.classList.add('hidden');
        downloadLink.classList.add('hidden');
    } else {
        fileNameDisplay.textContent = '';
    }
});

// Adiciona um listener para o botão de processar
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
            const linhasFiltradas = [];
            const linhasMantidas = [];

            // Separa as linhas que serão filtradas das que devem ser mantidas (cabeçalhos, rodapés, etc.)
            for (const linha of linhas) {
                const tipo = linha.substring(0, 2);
                if (['03', '05', '07'].includes(tipo)) {
                    linhasFiltradas.push(linha);
                } else {
                    linhasMantidas.push(linha);
                }
            }

            const linhasFiltradasPorData = linhasFiltradas.filter(linha => {
                const partes = linha.split('|');
                // Lógica de filtragem
                if (partes.length > 3) {
                    const dataString = partes[3];
                    const dataPartes = dataString.split('/');
                    if (dataPartes.length === 3) {
                        const dataLinha = new Date(dataPartes[2], dataPartes[1] - 1, dataPartes[0]);
                        // Ajusta a data para remover o fuso horário
                        dataLinha.setHours(0, 0, 0, 0);
                        return dataLinha >= dataInicio && dataLinha <= dataFim;
                    }
                }
                return false;
            });
            
            const cpfParaPrimeiroId = {};
            for (const linha of linhasFiltradasPorData) {
                if (linha.startsWith("03|")) {
                    const partes = linha.split("|");
                    const id = partes[1];
                    const cpf = partes[2];
                    if (cpf && !(cpf in cpfParaPrimeiroId)) {
                        cpfParaPrimeiroId[cpf] = id;
                    }
                }
            }

            const idSubstituicoes = {};
            for (const cpf in cpfParaPrimeiroId) {
                const id = cpfParaPrimeiroId[cpf];
                idSubstituicoes[id] = id;
            }

            const linhasSubstituidas = linhasFiltradasPorData.map(linha => {
                const tipo = linha.substring(0, 2);
                if (["03", "05", "07"].includes(tipo)) {
                    const partes = linha.split("|");
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
            const linhasFinais = [...linhasMantidas];
    
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

            const conteudoFinal = linhasFinais.join("\n");
            
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
