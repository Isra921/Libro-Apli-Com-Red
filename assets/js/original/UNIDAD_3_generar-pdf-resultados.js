(() => {
  "use strict";

  const JSPDF_URL = "https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js";
  const PDF_COLOR = [30, 64, 175];
  const TEXT_COLOR = [31, 41, 55];
  const MUTED_COLOR = [71, 85, 105];
  let jsPdfPromise = null;
  let caseData = null;
  let resultsData = null;

  const $ = (id) => document.getElementById(id);

  function loadJsPDF() {
    if (window.jspdf?.jsPDF) return Promise.resolve();

    if (!jsPdfPromise) {
      jsPdfPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = JSPDF_URL;
        script.onload = resolve;
        script.onerror = () =>
          reject(new Error("No se pudo cargar la biblioteca para crear el PDF."));
        document.head.appendChild(script);
      });
    }

    return jsPdfPromise;
  }

  function plainText(value) {
    return String(value ? "")
      .replace(/[\u2010-\u2015]/g, "-")
      .replace(/\u2192/g, "->")
      .replace(/\u2026/g, "...")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function createPdfWriter(shortTitle) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 16;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margin * 2;
    const bottomLimit = pageHeight - 18;
    let y = 0;

    function header() {
      pdf.setFillColor(...PDF_COLOR);
      pdf.rect(0, 0, pageWidth, 22, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(shortTitle, margin, 13);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text("Unidad 3", pageWidth - margin, 13, { align: "right" });
      y = 31;
    }

    function newPage() {
      pdf.addPage();
      header();
    }

    function ensureSpace(height) {
      if (y + height > bottomLimit) newPage();
    }

    function lines(value, width = contentWidth, fontSize = 10) {
      pdf.setFontSize(fontSize);
      return pdf.splitTextToSize(plainText(value), width);
    }

    function paragraph(
      value,
      {
        fontSize = 10,
        bold = false,
        italic = false,
        color = TEXT_COLOR,
        indent = 0,
        after = 2,
      } = {},
    ) {
      const availableWidth = contentWidth - indent;
      const wrapped = lines(value, availableWidth, fontSize);
      const lineHeight = Math.max(4.2, fontSize * 0.47);
      const fontStyle = bold ? "bold" : italic ? "italic" : "normal";

      wrapped.forEach((line) => {
        ensureSpace(lineHeight);
        pdf.setTextColor(...color);
        pdf.setFont("helvetica", fontStyle);
        pdf.setFontSize(fontSize);
        pdf.text(line, margin + indent, y);
        y += lineHeight;
      });
      y += after;
    }

    function documentTitle(value, subtitle = "") {
      paragraph(value, {
        fontSize: 18,
        bold: true,
        color: PDF_COLOR,
        after: 3,
      });
      if (subtitle) {
        paragraph(subtitle, {
          fontSize: 10,
          color: MUTED_COLOR,
          after: 5,
        });
      }
    }

    function section(value) {
      ensureSpace(14);
      y += 2;
      pdf.setTextColor(...PDF_COLOR);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.text(plainText(value), margin, y);
      y += 3;
      pdf.setDrawColor(191, 219, 254);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 6;
    }

    function subsection(value, color = PDF_COLOR) {
      ensureSpace(9);
      paragraph(value, { fontSize: 11, bold: true, color, after: 2 });
    }

    function labelValue(label, value) {
      const safeLabel = `${plainText(label)}:`;
      const safeValue = plainText(value) || "No disponible";
      ensureSpace(8);
      paragraph(safeLabel, {
        fontSize: 9,
        bold: true,
        color: MUTED_COLOR,
        after: 0,
      });
      paragraph(safeValue, { fontSize: 9, indent: 4, after: 2 });
    }

    function spacer(height = 3) {
      ensureSpace(height);
      y += height;
    }

    function addFooters() {
      const totalPages = pdf.getNumberOfPages();
      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        pdf.setPage(pageNumber);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
        pdf.setTextColor(...MUTED_COLOR);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.text(
          `Generado el ${new Date().toLocaleDateString("es-MX")}`,
          margin,
          pageHeight - 7,
        );
        pdf.text(
          `${pageNumber} de ${totalPages}`,
          pageWidth - margin,
          pageHeight - 7,
          { align: "right" },
        );
      }
    }

    header();

    return {
      pdf,
      documentTitle,
      section,
      subsection,
      paragraph,
      labelValue,
      spacer,
      ensureSpace,
      addFooters,
    };
  }

  function addResource(writer, resource) {
    writer.subsection(resource.title);
    writer.paragraph(resource.description, {
      fontSize: 9,
      italic: true,
      color: MUTED_COLOR,
      after: 3,
    });

    if (resource.type === "table") {
      resource.rows.forEach((row, index) => {
        writer.ensureSpace(14);
        writer.paragraph(`Registro ${index + 1}`, {
          fontSize: 9,
          bold: true,
          color: PDF_COLOR,
          after: 1,
        });
        resource.columns.forEach((column, columnIndex) => {
          writer.labelValue(column, row[columnIndex]);
        });
        writer.spacer(2);
      });
      return;
    }

    (resource.bars || []).forEach((bar) => {
      writer.labelValue(bar.label, `${bar.value}${resource.unit || ""}`);
    });
  }

  async function downloadCasePdf() {
    if (!caseData) {
      alert(
        "El caso todava no termina de cargar. Intenta nuevamente en un momento.",
      );
      return;
    }

    await loadJsPDF();
    if (!window.jspdf?.jsPDF) {
      throw new Error("La biblioteca de PDF no est disponible.");
    }

    const writer = createPdfWriter("Caso de la actividad final");
    writer.documentTitle(caseData.title, "Actividad final de la Unidad 3");
    writer.section("Resumen del caso");
    writer.paragraph(caseData.summary);

    caseData.sections.forEach((section) => {
      writer.subsection(section.title);
      writer.paragraph(section.content);
    });

    writer.section("Resultados y recursos del caso");
    caseData.resources.forEach((resource) => addResource(writer, resource));
    writer.ensureSpace(30);
    writer.section("Descripcin general de los hallazgos");
    writer.paragraph(caseData.resultsNarrative);
    writer.addFooters();
    writer.pdf.save("Caso_Actividad_Final_Unidad_3.pdf");
  }

  async function downloadResultsPdf() {
    if (!resultsData) {
      alert("Primero finaliza la actividad para generar el PDF de resultados.");
      return;
    }

    await loadJsPDF();
    if (!window.jspdf?.jsPDF) {
      throw new Error("La biblioteca de PDF no est disponible.");
    }

    const writer = createPdfWriter("Resultados de la actividad final");
    const { summary } = resultsData;
    writer.documentTitle(
      "Resultados de Operacin Enlace",
      resultsData.caseTitle,
    );

    writer.section("Resumen del intento");
    writer.labelValue("Calificacin", `${summary.grade} / 10`);
    writer.labelValue("Porcentaje", `${summary.percentage} %`);
    writer.labelValue("Preguntas", summary.total);
    writer.labelValue("Correctas", summary.correct);
    writer.labelValue("Incorrectas", summary.incorrect);
    writer.labelValue("Sin responder", summary.unanswered);
    writer.labelValue("Tiempo utilizado", summary.elapsedText);
    if (summary.timeExpired) {
      writer.paragraph(
        "El intento finaliz al agotarse el tiempo disponible.",
        {
          fontSize: 9,
          bold: true,
          color: [185, 28, 28],
        },
      );
    }

    writer.section("Desempeo por categora");
    resultsData.categories.forEach((item) => {
      const percentage = item.total
        ? ((item.correct / item.total) * 100).toFixed(1)
        : "0.0";
      writer.labelValue(
        item.category,
        `${item.correct} de ${item.total} correctas (${percentage} %)`,
      );
    });

    writer.section("Detalle de respuestas");
    resultsData.responses.forEach((response) => {
      const status = response.correct
        ? "Correcta"
        : response.answered
          ? "Incorrecta"
          : "Sin responder";
      const statusColor = response.correct
        ? [22, 163, 74]
        : response.answered
          ? [185, 28, 28]
          : MUTED_COLOR;

      writer.ensureSpace(30);
      writer.subsection(
        `Pregunta ${response.number} - ${status}`,
        statusColor,
      );
      writer.labelValue("Tipo", response.type);
      writer.labelValue("Categora", response.category);
      if (response.scenario) {
        writer.labelValue("Situacin", response.scenario);
      }
      writer.labelValue("Pregunta", response.question);
      if (response.instruction) {
        writer.labelValue("Indicacin", response.instruction);
      }
      if (response.resourceTitle) {
        writer.labelValue("Recurso consultado", response.resourceTitle);
      }
      writer.labelValue("Tu respuesta", response.userAnswer);
      writer.labelValue("Respuesta correcta", response.correctAnswer);
      writer.labelValue("Explicacin", response.explanation);
      writer.spacer(3);
    });

    writer.addFooters();
    writer.pdf.save("Resultados_Actividad_Final_Unidad_3.pdf");
  }

  async function runDownload(button, pendingLabel, download, isAvailable) {
    const originalContent = button.innerHTML;
    button.disabled = true;
    button.innerHTML =
      `<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> ${pendingLabel}`;

    try {
      await download();
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      alert(`No se pudo generar el PDF: ${error.message || error}`);
    } finally {
      button.innerHTML = originalContent;
      button.disabled = !isAvailable();
    }
  }

  document.addEventListener("actividad-final:caso-cargado", (event) => {
    caseData = event.detail;
    $("downloadCasePdfBtn").disabled = false;
  });

  document.addEventListener("actividad-final:resultados-listos", (event) => {
    resultsData = event.detail;
    $("downloadResultsPdfBtn").disabled = false;
  });

  $("downloadCasePdfBtn").addEventListener("click", () =>
    runDownload(
      $("downloadCasePdfBtn"),
      "Generando caso...",
      downloadCasePdf,
      () => Boolean(caseData),
    ),
  );

  $("downloadResultsPdfBtn").addEventListener("click", () =>
    runDownload(
      $("downloadResultsPdfBtn"),
      "Generando resultados...",
      downloadResultsPdf,
      () => Boolean(resultsData),
    ),
  );

  window.descargarCasoPDF = downloadCasePdf;
  window.descargarResultadosPDF = downloadResultsPdf;
})();


