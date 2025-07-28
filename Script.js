document.addEventListener("DOMContentLoaded", function () {
  const fileInput = document.getElementById("fileInput");
  const processButton = document.getElementById("processButton");
  const outputContent = document.getElementById("outputContentInitial");
  const downloadTxtButton = document.getElementById("downloadTxtButton");
  const downloadButton = document.getElementById("downloadButton");
  const tabButtons = document.querySelectorAll(".tab");
  const tabPanels = document.querySelectorAll(".tab-content");

  function switchTab(targetId) {
    tabButtons.forEach(btn => {
      const isActive = btn.id === targetId;
      btn.setAttribute("aria-selected", isActive);
      btn.classList.toggle("bg-blue-600", isActive);
      btn.classList.toggle("text-white", isActive);
      btn.classList.toggle("bg-white", !isActive);
      btn.classList.toggle("text-blue-600", !isActive);
    });

    tabPanels.forEach(panel => {
      const shouldShow = document.getElementById(targetId).getAttribute("aria-controls") === panel.id;
      panel.hidden = !shouldShow;
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.id));
  });

  processButton.addEventListener("click", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const content = e.target.result;
      outputContent.value = content;

      const lines = content.split("\n").filter(line => line.startsWith("03|"));
      const headers = ["Tipo", "ID Vínculo", "CPF", "Nome"];
      const headerRow = document.getElementById("tableHeaderRow");
      const body = document.getElementById("tableBody");

      headerRow.innerHTML = "";
      body.innerHTML = "";

      headers.forEach(h => {
        const th = document.createElement("th");
        th.textContent = h;
        headerRow.appendChild(th);
      });

      lines.forEach(line => {
        const parts = line.split("|");
        const tr = document.createElement("tr");
        for (let i = 0; i < headers.length; i++) {
          const td = document.createElement("td");
          td.textContent = parts[i] || "";
          tr.appendChild(td);
        }
        body.appendChild(tr);
      });

      $('#filteredTable').DataTable({
        destroy: true,
        dom: 'Bfrtip',
        buttons: ['excel'],
        scrollX: true
      });

      switchTab("tabAdvancedFilter");
    };
    reader.readAsText(file);
  });

  downloadTxtButton.addEventListener("click", () => {
    const content = outputContent.value;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "arquivo_aej_processado.txt";
    link.click();
  });

  if (downloadButton) {
    downloadButton.addEventListener("click", () => {
      const table = $('#filteredTable').DataTable();
      table.button('.buttons-excel').trigger();
    });
  }
});