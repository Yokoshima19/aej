
document.addEventListener("DOMContentLoaded", function () {
    const fileInput = document.getElementById("file-input");
    const fileNameDisplay = document.getElementById("file-name");
    const processBtn = document.getElementById("process-btn");
    const output = document.getElementById("output");

    let fileContent = "";

    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
            const reader = new FileReader();
            reader.onload = function (e) {
                fileContent = e.target.result;
            };
            reader.readAsText(file);
        } else {
            fileNameDisplay.textContent = "Nenhum arquivo selecionado";
            fileContent = "";
        }
    });

    processBtn.addEventListener("click", () => {
        if (!fileContent) {
            output.textContent = "Nenhum conteúdo carregado.";
            return;
        }
        const filtered = fileContent.split("\n").filter(line => line.startsWith("05|") || line.startsWith("07|"));
        output.textContent = filtered.join("\n");
    });
});
