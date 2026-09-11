(() => {
  "use strict";

  const supportedQuestionTypes = new Set([
    "opcion_multiple",
    "completar_oracion",
    "verdadero_falso",
    "ordenar_oracion",
  ]);
  const configuredQuestionCount = Number.parseInt(
    document.body.dataset.totalQuestions || "20",
    10,
  );
  const defaultQuestionCount =
    Number.isFinite(configuredQuestionCount) && configuredQuestionCount > 0
      ? configuredQuestionCount
      : 20;
  const secondsPerQuestion = 30;

  let time = 0;
  let feedbackRules = [];
  let gameOver = false;
  let timerInterval;
  let sidebarOpen = false;
  let selectedAnswers = {};
  let completed = 0;
  let questions = [];
  let correctCount = 0;
  let timeLimit = 0;
  let timeRemaining = 0;
  let activityStarted = false;
  let questionsReady = false;

  function getActivityTimeLimit(questionCount) {
    const configuredTimeLimit = Number.parseInt(
      document.body.dataset.timeLimitSeconds || "",
      10,
    );
    return Number.isFinite(configuredTimeLimit) && configuredTimeLimit > 0
      ? configuredTimeLimit
      : questionCount * secondsPerQuestion;
  }

  function shuffleArray(array) {
    for (let index = array.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [array[index], array[randomIndex]] = [array[randomIndex], array[index]];
    }
    return array;
  }

  function startTimer() {
    clearInterval(timerInterval);
    updateTimerDisplay();
    timerInterval = window.setInterval(() => {
      time += 1;
      timeRemaining = Math.max(0, timeLimit - time);
      updateTimerDisplay();
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        evaluateActivity(true);
      }
    }, 1000);
  }

  function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function updateTimerDisplay() {
    const floatingTimerValue = document.getElementById("floatingTimerValue");
    if (floatingTimerValue)
      floatingTimerValue.textContent = formatTime(timeRemaining);
  }

  function calculateScore(correct, total) {
    return total > 0 ? Math.round((correct / total) * 100) / 10 : 0;
  }

  function calculateGrade(correct) {
    return questions.length > 0
      ? Math.round((correct / questions.length) * 100) / 10
      : 0;
  }

  function formatGrade(grade) {
    return Number.isInteger(grade) ? String(grade) : grade.toFixed(1);
  }

  function getFeedback(correct) {
    return (
      feedbackRules.find((rule) => rule.aciertos === correct) || {
        type: "victory",
        icon: "fas fa-trophy",
        text: "Actividad finalizada!",
      }
    );
  }

  function showGameStatus(message, type) {
    const status = document.getElementById("gameStatus");
    if (!status) return;
    status.innerHTML = message;
    status.className = `game-status ${type}`;
    status.style.display = "block";
  }

  let activityFeedbackState = {};
  let activityDragState = null;
  let unansweredModalResolve = null;
  let unansweredModalPreviousFocus = null;

  function getLastGradeStorageKey() {
    return (
      document.body.dataset.storageKey ||
      `${document.body.dataset.activityId || "actividad"}_ultima_calificacion`
    );
  }

  function updateLastGradeDisplay() {
    const lastGradeValue = document.getElementById("lastGradeValue");
    if (!lastGradeValue) return;
    lastGradeValue.textContent =
      sessionStorage.getItem(getLastGradeStorageKey()) || "Sin calificacin";
  }

  function hasStoredLastGrade() {
    return Boolean(sessionStorage.getItem(getLastGradeStorageKey()));
  }

  function setTopActionButton(mode = "auto") {
    const startActivityBtn = document.getElementById("startActivityBtn");
    const resetActivityBtn = document.getElementById("resetActivityBtn");
    const shouldShowRetry =
      mode === "retry" || (mode === "auto" && hasStoredLastGrade());

    startActivityBtn?.classList.toggle("is-hidden", shouldShowRetry);
    resetActivityBtn?.classList.toggle("is-hidden", !shouldShowRetry);
  }

  function escapeHtml(value) {
    return String(value ? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDurationLabel(totalSeconds) {
    return totalSeconds % 60 === 0
      ? `${totalSeconds / 60} min`
      : formatTime(totalSeconds);
  }

  function getQuestionKey(question) {
    return String(question.id);
  }

  function findActivityQuestion(questionId) {
    return questions.find(
      (question) => getQuestionKey(question) === String(questionId),
    );
  }

  function normalizeActivityQuestion(rawQuestion, index) {
    const type = rawQuestion.type;
    const id = rawQuestion.id;

    if (
      !supportedQuestionTypes.has(type) ||
      (typeof id !== "string" && typeof id !== "number")
    ) {
      throw new Error(
        `Pregunta ${index + 1} pendiente de migrar al esquema definitivo.`,
      );
    }

    const base = { id, type };

    if (type === "verdadero_falso") {
      if (
        typeof rawQuestion.statement !== "string" ||
        typeof rawQuestion.answer !== "boolean"
      ) {
        throw new Error(
          `Pregunta ${index + 1} con formato invlido de verdadero/falso.`,
        );
      }
      return {
        ...base,
        statement: rawQuestion.statement,
        answer: rawQuestion.answer,
      };
    }

    if (type === "ordenar_oracion") {
      if (
        !Array.isArray(rawQuestion.segments) ||
        !Array.isArray(rawQuestion.answer)
      ) {
        throw new Error(
          `Pregunta ${index + 1} con formato invlido de ordenar oracin.`,
        );
      }
      return {
        ...base,
        question: rawQuestion.question || "",
        segments: [...rawQuestion.segments],
        answer: [...rawQuestion.answer],
      };
    }

    if (type === "completar_oracion") {
      const questionText = rawQuestion.question;
      const wordBank =
        rawQuestion.wordBank ? rawQuestion.options ? rawQuestion.opciones;
      const answer = Array.isArray(rawQuestion.answer)
        ? [...rawQuestion.answer]
        : [rawQuestion.respuesta_correcta ? rawQuestion.answer].filter(
            Boolean,
          );

      if (!questionText || !Array.isArray(wordBank) || answer.length === 0) {
        throw new Error(
          `Pregunta ${index + 1} con formato invlido de completar oracin.`,
        );
      }

      answer.forEach((expectedWord) => {
        if (!wordBank.includes(expectedWord)) {
          throw new Error(
            `La respuesta no coincide con el banco de palabras en la pregunta ${index + 1}.`,
          );
        }
      });

      return {
        ...base,
        type: "completar_oracion",
        question: questionText,
        wordBank: shuffleArray([...wordBank]),
        answer,
      };
    }

    const questionText = rawQuestion.pregunta ? rawQuestion.question;
    const options = rawQuestion.opciones ? rawQuestion.options;
    const answer = rawQuestion.respuesta_correcta ? rawQuestion.answer;

    if (
      !questionText ||
      !Array.isArray(options) ||
      typeof answer !== "string"
    ) {
      throw new Error(`Pregunta ${index + 1} con formato invlido.`);
    }

    if (!options.includes(answer)) {
      throw new Error(
        `La respuesta no coincide con ninguna opcin en la pregunta ${index + 1}.`,
      );
    }

    return {
      ...base,
      type: "opcion_multiple",
      question: questionText,
      options: shuffleArray([...options]),
      answer,
    };
  }

  function getAnsweredQuestionsCount() {
    return questions.filter(isActivityQuestionAnswered).length;
  }

  function isActivityQuestionAnswered(question) {
    const key = getQuestionKey(question);
    if (!Object.prototype.hasOwnProperty.call(selectedAnswers, key))
      return false;
    const answer = selectedAnswers[key];
    if (question.type === "completar_oracion") {
      return (
        Array.isArray(answer) &&
        answer.length === question.answer.length &&
        answer.every((wordIndex) => Number.isInteger(wordIndex))
      );
    }
    if (question.type === "ordenar_oracion") {
      return (
        Array.isArray(answer) && answer.length === question.segments.length
      );
    }
    return answer !== undefined && answer !== null && answer !== "";
  }

  function arraysMatch(left, right) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((item, index) => item === right[index])
    );
  }

  function isActivityQuestionCorrect(question) {
    const key = getQuestionKey(question);
    if (!isActivityQuestionAnswered(question)) return false;

    const answer = selectedAnswers[key];
    if (question.type === "verdadero_falso") {
      return answer === question.answer;
    }
    if (question.type === "completar_oracion") {
      const placedWords = answer.map(
        (wordIndex) => question.wordBank[wordIndex],
      );
      return arraysMatch(placedWords, question.answer);
    }
    if (question.type === "ordenar_oracion") {
      const arrangedSegments = answer.map(
        (segmentIndex) => question.segments[segmentIndex],
      );
      return arraysMatch(arrangedSegments, question.answer);
    }
    return answer === question.answer;
  }

  function getOrderAnswer(question) {
    const answer = selectedAnswers[getQuestionKey(question)];
    return Array.isArray(answer) ? [...answer] : [];
  }

  function getCompletionAnswer(question) {
    const answer = selectedAnswers[getQuestionKey(question)];
    const blanks = Array(question.answer.length).fill(null);
    if (!Array.isArray(answer)) return blanks;
    answer.slice(0, blanks.length).forEach((wordIndex, index) => {
      blanks[index] = Number.isInteger(wordIndex) ? wordIndex : null;
    });
    return blanks;
  }

  function getFeedbackClass(question, value, optionKind = "single") {
    if (
      !gameOver ||
      activityFeedbackState[getQuestionKey(question)] === undefined
    )
      return "";
    const correct = activityFeedbackState[getQuestionKey(question)];

    if (optionKind === "order-zone" || optionKind === "completion-slot") {
      return correct ? " correct" : " incorrect";
    }

    const selectedAnswer = selectedAnswers[getQuestionKey(question)];
    if (selectedAnswer !== value) return "";
    return correct ? " correct" : " incorrect";
  }

  function renderSingleChoiceQuestion(question) {
    const selectedAnswer = selectedAnswers[getQuestionKey(question)];
    return `
      <div class="options" role="radiogroup" aria-label="Opciones de respuesta">
        ${question.options
          .map((option, optionIndex) => {
            const selected = selectedAnswer === option;
            const stateClass = selected ? " selected" : "";
            const feedbackClass = getFeedbackClass(question, option);
            const disabled = gameOver ? " disabled" : "";
            return `
            <button type="button" class="option${stateClass}${feedbackClass}" data-action="select-option" data-question-id="${escapeHtml(question.id)}" data-option-index="${optionIndex}" role="radio" aria-checked="${selected}"${disabled}>
              <span class="option-letter">${String.fromCharCode(97 + optionIndex)})</span>
              <span class="option-text">${escapeHtml(option)}</span>
            </button>
          `;
          })
          .join("")}
      </div>
    `;
  }

  function renderCompletionQuestion(question) {
    const placedWords = getCompletionAnswer(question);
    const usedWords = new Set(
      placedWords.filter((wordIndex) => Number.isInteger(wordIndex)),
    );
    const sentenceParts = question.question.split("_____");
    const disabled = gameOver ? " disabled" : "";

    return `
      <div class="completion-sentence">
        ${sentenceParts
          .map((part, index) => {
            const slotIndex = index;
            const wordIndex = placedWords[slotIndex];
            const hasSlot = slotIndex < question.answer.length;
            const hasAnswer = Number.isInteger(wordIndex);
            const stateClass = hasAnswer ? " has-answer" : "";
            const feedbackClass = gameOver
              ? getFeedbackClass(question, null, "completion-slot")
              : "";
            return `${escapeHtml(part)}${
              hasSlot
                ? `
            <button type="button" class="completion-inline-slot${stateClass}${feedbackClass}" data-action="clear-completion-slot" data-question-id="${escapeHtml(question.id)}" data-slot-index="${slotIndex}" data-drop-target="completion" aria-label="Espacio ${slotIndex + 1}"${disabled}>
              ${hasAnswer ? escapeHtml(question.wordBank[wordIndex]) : ""}
            </button>
          `
                : ""
            }`;
          })
          .join("")}
      </div>
      <div class="completion-word-bank" role="list" aria-label="Banco de palabras">
        ${question.wordBank
          .map((word, wordIndex) => {
            if (usedWords.has(wordIndex)) return "";
            return `
            <button type="button" class="completion-word" data-action="place-completion-word" data-question-id="${escapeHtml(question.id)}" data-word-index="${wordIndex}" draggable="${!gameOver}"${disabled}>
              ${escapeHtml(word)}
            </button>
          `;
          })
          .join("")}
      </div>
    `;
  }

  function renderTrueFalseQuestion(question) {
    const choices = [
      { letter: "a)", label: "Verdadero", value: true },
      { letter: "b)", label: "Falso", value: false },
    ];
    const selectedAnswer = selectedAnswers[getQuestionKey(question)];
    const disabled = gameOver ? " disabled" : "";

    return `
      <div class="options true-false-options" role="radiogroup" aria-label="Selecciona verdadero o falso">
        ${choices
          .map((choice) => {
            const selected = selectedAnswer === choice.value;
            const stateClass = selected ? " selected" : "";
            const feedbackClass = getFeedbackClass(question, choice.value);
            return `
            <button type="button" class="option true-false-choice${stateClass}${feedbackClass}" data-action="select-true-false" data-question-id="${escapeHtml(question.id)}" data-value="${choice.value}" role="radio" aria-checked="${selected}"${disabled}>
              <span class="option-letter">${choice.letter}</span>
              <span class="option-text">${choice.label}</span>
            </button>
          `;
          })
          .join("")}
      </div>
    `;
  }

  function renderOrderingQuestion(question) {
    const order = getOrderAnswer(question);
    const usedSegments = new Set(order);
    const availableSegments = question.segments
      .map((segment, segmentIndex) => ({ segment, segmentIndex }))
      .filter((item) => !usedSegments.has(item.segmentIndex));
    const disabled = gameOver ? " disabled" : "";
    const feedbackClass = gameOver
      ? getFeedbackClass(question, null, "order-zone")
      : "";

    return `
      <div class="ordering-board" data-order-question="${escapeHtml(question.id)}">
        <div class="ordering-placed${order.length ? "" : " is-ordering-empty"}${feedbackClass}" data-order-dropzone data-question-id="${escapeHtml(question.id)}" role="list" aria-label="Segmentos colocados">
          ${
            order.length
              ? order
                  .map(
                    (segmentIndex, placedIndex) => `
            <button type="button" class="ordering-segment placed" data-action="remove-segment" data-question-id="${escapeHtml(question.id)}" data-segment-index="${segmentIndex}" data-placed-index="${placedIndex}" draggable="${!gameOver}" aria-label="Quitar segmento: ${escapeHtml(question.segments[segmentIndex])}"${disabled}>
              ${escapeHtml(question.segments[segmentIndex])}
            </button>
          `,
                  )
                  .join("")
              : ""
          }
        </div>

        <div class="ordering-available" role="list" aria-label="Fragmentos">
          ${availableSegments
            .map(
              ({ segment, segmentIndex }) => `
            <button type="button" class="ordering-segment available" data-action="add-segment" data-question-id="${escapeHtml(question.id)}" data-segment-index="${segmentIndex}" draggable="${!gameOver}" aria-label="Agregar segmento: ${escapeHtml(segment)}"${disabled}>
              ${escapeHtml(segment)}
            </button>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderActivityQuestion(question, index) {
    const typePresentation = {
      opcion_multiple: { icon: "fa-list-ul", label: "Opcin mltiple" },
      completar_oracion: {
        icon: "fa-pen-to-square",
        label: "Completar oracin",
      },
      verdadero_falso: { icon: "fa-circle-check", label: "Verdadero o falso" },
      ordenar_oracion: {
        icon: "fa-arrow-down-wide-short",
        label: "Ordenar oracin",
      },
    };
    const presentation = typePresentation[question.type];
    const prompt =
      question.type === "verdadero_falso"
        ? question.statement
        : question.question;
    let interaction = "";

    if (question.type === "completar_oracion") {
      interaction = renderCompletionQuestion(question);
    } else if (question.type === "verdadero_falso") {
      interaction = renderTrueFalseQuestion(question);
    } else if (question.type === "ordenar_oracion") {
      interaction = renderOrderingQuestion(question);
    } else {
      interaction = renderSingleChoiceQuestion(question);
    }

    return `
      <div class="question" data-question-id="${escapeHtml(question.id)}" data-question-type="${escapeHtml(question.type)}">
        <div class="question-number" aria-label="${escapeHtml(presentation.label)}, pregunta ${index + 1}">
          <span class="instruction-type-icon question-type-icon" aria-hidden="true">
            <i class="fas ${presentation.icon}"></i>
          </span>
          <span>Pregunta ${index + 1}</span>
        </div>
        ${question.type !== "completar_oracion" && question.type !== "ordenar_oracion" ? `<div class="question-text">${escapeHtml(prompt)}</div>` : ""}
        ${interaction}
      </div>
    `;
  }

  function renderActivityQuestions() {
    const container = document.getElementById("questionsContainer");
    if (!container) return;
    container.innerHTML = questions.map(renderActivityQuestion).join("");
  }

  async function initGame() {
    const container = document.getElementById("questionsContainer");
    const startActivityBtn = document.getElementById("startActivityBtn");
    questionsReady = false;

    if (startActivityBtn) {
      startActivityBtn.disabled = true;
      startActivityBtn.setAttribute("aria-busy", "true");
    }

    try {
      try {
        const ponderacionesResponse = await fetch(
          "js/ponderaciones.json",
        );
        feedbackRules = ponderacionesResponse.ok
          ? await ponderacionesResponse.json()
          : [];
      } catch (_) {
        feedbackRules = [];
      }

      const questionFile = document.body.dataset.questionFile;
      if (!questionFile) {
        throw new Error(
          "No se defini data-question-file en la pgina de actividad.",
        );
      }

      const response = await fetch(questionFile);
      if (!response.ok) {
        throw new Error(
          `No se pudo cargar ${questionFile} (HTTP ${response.status})`,
        );
      }

      const allQuestionsRaw = await response.json();
      if (!Array.isArray(allQuestionsRaw) || allQuestionsRaw.length === 0) {
        throw new Error("El JSON no contiene un arreglo de preguntas.");
      }

      if (allQuestionsRaw.length < defaultQuestionCount) {
        throw new Error(
          `El banco requiere al menos ${defaultQuestionCount} preguntas con el esquema definitivo.`,
        );
      }

      const normalizedQuestions = allQuestionsRaw.map(
        normalizeActivityQuestion,
      );
      const selectedRawQuestions = shuffleArray([...normalizedQuestions]).slice(
        0,
        defaultQuestionCount,
      );
      questions = selectedRawQuestions;

      selectedAnswers = {};
      activityFeedbackState = {};
      activityDragState = null;
      time = 0;
      completed = 0;
      correctCount = 0;
      gameOver = false;
      activityStarted = false;
      timeLimit = getActivityTimeLimit(questions.length);
      timeRemaining = timeLimit;
      clearInterval(timerInterval);

      renderActivityQuestions();

      const totalQuestionsValue = document.getElementById(
        "totalQuestionsValue",
      );
      const timeAvailableValue = document.getElementById("timeAvailableValue");
      const evaluateBtn = document.getElementById("evaluateBtn");
      const gameStatus = document.getElementById("gameStatus");

      if (totalQuestionsValue)
        totalQuestionsValue.textContent = questions.length;
      if (timeAvailableValue)
        timeAvailableValue.textContent = formatDurationLabel(timeLimit);
      updateLastGradeDisplay();
      setTopActionButton("auto");
      if (evaluateBtn) evaluateBtn.disabled = false;
      if (gameStatus) gameStatus.style.display = "none";
      document.body.style.animation = "none";

      setEvaluationVisibility(false);
      questionsReady = true;
      if (startActivityBtn) {
        startActivityBtn.disabled = false;
        startActivityBtn.removeAttribute("aria-busy");
      }
      updateUI();
      return true;
    } catch (_) {
      clearInterval(timerInterval);
      questions = [];
      selectedAnswers = {};
      activityStarted = false;
      questionsReady = false;
      timeRemaining = 0;

      if (container) {
        container.innerHTML = `
          <div class="activity-pending" role="status">
            <i class="fas fa-hourglass-half" aria-hidden="true"></i>
            <div>
              <strong>Contenido pendiente de integracin</strong>
              <p>El banco de preguntas de esta actividad todava no utiliza el esquema definitivo.</p>
            </div>
          </div>`;
      }

      document
        .getElementById("questionsSection")
        ?.classList.remove("is-hidden");
      document.getElementById("activityControls")?.classList.add("is-hidden");
      document.getElementById("floatingTimer")?.classList.add("is-hidden");
      document
        .querySelector(".evaluation-overview")
        ?.classList.add("is-unavailable");
      if (startActivityBtn) {
        startActivityBtn.disabled = true;
        startActivityBtn.removeAttribute("aria-busy");
      }
      document.getElementById("resetActivityBtn")?.classList.add("is-hidden");
      return false;
    }
  }

  function setEvaluationVisibility(isVisible) {
    const questionsSection = document.getElementById("questionsSection");
    const activityControls = document.getElementById("activityControls");
    const retryControls = document.getElementById("retryControls");
    const floatingTimer = document.getElementById("floatingTimer");
    const startActivityBtn = document.getElementById("startActivityBtn");
    const evaluateBtn = document.getElementById("evaluateBtn");
    const evaluationOverview = document.querySelector(".evaluation-overview");

    questionsSection?.classList.toggle("is-hidden", !isVisible);
    activityControls?.classList.toggle("is-hidden", !isVisible);
    retryControls?.classList.add("is-hidden");
    floatingTimer?.classList.toggle("is-hidden", !isVisible);
    evaluationOverview?.classList.remove(
      "activity-results-heading",
      "is-unavailable",
    );
    evaluationOverview?.classList.toggle(
      "activity-questions-heading",
      isVisible,
    );
    evaluationOverview?.classList.remove("is-hidden");
    if (isVisible) {
      startActivityBtn?.classList.add("is-hidden");
      document.getElementById("resetActivityBtn")?.classList.add("is-hidden");
    } else {
      setTopActionButton("auto");
    }
    if (evaluateBtn) evaluateBtn.disabled = false;
  }

  async function startActivity() {
    if (activityStarted || gameOver) return;
    if (!questionsReady || questions.length === 0) {
      const ready = await initGame();
      if (!ready) return;
    }

    activityStarted = true;
    gameOver = false;
    activityFeedbackState = {};
    time = 0;
    timeRemaining = timeLimit;
    const gameStatus = document.getElementById("gameStatus");
    if (gameStatus) gameStatus.style.display = "none";
    document
      .querySelector(".evaluation-overview")
      ?.classList.remove("activity-results-heading");
    setEvaluationVisibility(true);
    renderActivityQuestions();
    updateProgress();
    updateTimerDisplay();
    startTimer();
    document
      .getElementById("questionsSection")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateProgress() {
    completed = getAnsweredQuestionsCount();
  }

  function updateUI() {
    const totalQuestions =
      questions.length > 0 ? questions.length : defaultQuestionCount;
    const totalQuestionsValue = document.getElementById("totalQuestionsValue");
    const timeAvailableValue = document.getElementById("timeAvailableValue");
    if (totalQuestionsValue) totalQuestionsValue.textContent = totalQuestions;
    if (timeAvailableValue && timeLimit > 0)
      timeAvailableValue.textContent = formatDurationLabel(timeLimit);
    updateTimerDisplay();
  }

  function setSingleAnswer(question, value) {
    if (gameOver || !activityStarted) return;
    selectedAnswers[getQuestionKey(question)] = value;
    renderActivityQuestions();
    updateProgress();
  }

  function placeCompletionWord(question, wordIndex, slotIndex = null) {
    if (gameOver || !activityStarted) return;
    const key = getQuestionKey(question);
    const nextAnswer = getCompletionAnswer(question).map((currentWordIndex) =>
      currentWordIndex === wordIndex ? null : currentWordIndex,
    );
    const targetSlot =
      slotIndex === null
        ? nextAnswer.findIndex((currentWordIndex) => currentWordIndex === null)
        : slotIndex;
    if (targetSlot < 0 || targetSlot >= question.answer.length) return;

    nextAnswer[targetSlot] = wordIndex;
    selectedAnswers[key] = nextAnswer;
    renderActivityQuestions();
    updateProgress();
  }

  function clearCompletionSlot(question, slotIndex) {
    if (gameOver || !activityStarted) return;
    const key = getQuestionKey(question);
    const nextAnswer = getCompletionAnswer(question);
    if (slotIndex < 0 || slotIndex >= nextAnswer.length) return;
    nextAnswer[slotIndex] = null;
    if (nextAnswer.some((wordIndex) => Number.isInteger(wordIndex))) {
      selectedAnswers[key] = nextAnswer;
    } else {
      delete selectedAnswers[key];
    }
    renderActivityQuestions();
    updateProgress();
  }

  function placeOrderSegment(question, segmentIndex, insertIndex = null) {
    if (gameOver || !activityStarted) return;
    const key = getQuestionKey(question);
    const currentOrder = getOrderAnswer(question);
    const existingIndex = currentOrder.indexOf(segmentIndex);
    const nextOrder = currentOrder.filter((item) => item !== segmentIndex);
    let targetIndex =
      insertIndex === null
        ? nextOrder.length
        : Math.max(0, Math.min(insertIndex, nextOrder.length));
    if (
      existingIndex > -1 &&
      insertIndex !== null &&
      existingIndex < insertIndex
    ) {
      targetIndex = Math.max(0, targetIndex - 1);
    }
    nextOrder.splice(targetIndex, 0, segmentIndex);
    selectedAnswers[key] = nextOrder;
    renderActivityQuestions();
    updateProgress();
  }

  function removeOrderSegment(question, segmentIndex) {
    if (gameOver || !activityStarted) return;
    const key = getQuestionKey(question);
    const nextOrder = getOrderAnswer(question).filter(
      (item) => item !== segmentIndex,
    );
    if (nextOrder.length) {
      selectedAnswers[key] = nextOrder;
    } else {
      delete selectedAnswers[key];
    }
    renderActivityQuestions();
    updateProgress();
  }

  function handleActivityAction(actionElement) {
    const question = findActivityQuestion(actionElement.dataset.questionId);
    if (!question || gameOver || !activityStarted) return;

    if (actionElement.dataset.action === "select-option") {
      setSingleAnswer(
        question,
        question.options[Number(actionElement.dataset.optionIndex)],
      );
    } else if (actionElement.dataset.action === "place-completion-word") {
      placeCompletionWord(question, Number(actionElement.dataset.wordIndex));
    } else if (actionElement.dataset.action === "clear-completion-slot") {
      clearCompletionSlot(question, Number(actionElement.dataset.slotIndex));
    } else if (actionElement.dataset.action === "select-true-false") {
      setSingleAnswer(question, actionElement.dataset.value === "true");
    } else if (actionElement.dataset.action === "add-segment") {
      placeOrderSegment(question, Number(actionElement.dataset.segmentIndex));
    } else if (actionElement.dataset.action === "remove-segment") {
      removeOrderSegment(question, Number(actionElement.dataset.segmentIndex));
    }
  }

  function handleActivityClick(event) {
    const actionElement = event.target.closest("[data-action]");
    if (
      !actionElement ||
      !document.getElementById("questionsContainer")?.contains(actionElement)
    )
      return;
    event.preventDefault();
    handleActivityAction(actionElement);
  }

  function handleActivityKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const actionElement = event.target.closest("[data-action]");
    if (
      !actionElement ||
      !document.getElementById("questionsContainer")?.contains(actionElement)
    )
      return;
    event.preventDefault();
    handleActivityAction(actionElement);
  }

  function handleActivityDragStart(event) {
    if (gameOver || !activityStarted) return;
    const completionChoice = event.target.closest(
      '[data-action="place-completion-word"]',
    );
    const orderingSegment = event.target.closest(
      ".ordering-segment[data-segment-index]",
    );

    if (completionChoice) {
      activityDragState = {
        type: "completion",
        questionId: completionChoice.dataset.questionId,
        wordIndex: Number(completionChoice.dataset.wordIndex),
      };
    } else if (orderingSegment) {
      activityDragState = {
        type: "order",
        questionId: orderingSegment.dataset.questionId,
        segmentIndex: Number(orderingSegment.dataset.segmentIndex),
      };
    } else {
      activityDragState = null;
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(activityDragState));
  }

  function handleActivityDragOver(event) {
    if (!activityDragState || gameOver || !activityStarted) return;
    const completionTarget = event.target.closest(
      '[data-drop-target="completion"]',
    );
    const orderTarget = event.target.closest(
      "[data-order-dropzone], .ordering-segment.placed",
    );
    if (completionTarget || orderTarget) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      (completionTarget || orderTarget).classList.add("is-drag-over");
    }
  }

  function handleActivityDragLeave(event) {
    event.target.closest(".is-drag-over")?.classList.remove("is-drag-over");
  }

  function handleActivityDrop(event) {
    if (!activityDragState || gameOver || !activityStarted) return;
    event.preventDefault();
    document
      .querySelectorAll(".is-drag-over")
      .forEach((element) => element.classList.remove("is-drag-over"));

    if (activityDragState.type === "completion") {
      const completionTarget = event.target.closest(
        '[data-drop-target="completion"]',
      );
      const question = findActivityQuestion(activityDragState.questionId);
      if (completionTarget && question) {
        placeCompletionWord(
          question,
          activityDragState.wordIndex,
          Number(completionTarget.dataset.slotIndex),
        );
      }
    }

    if (activityDragState.type === "order") {
      const orderTarget = event.target.closest(
        "[data-order-dropzone], .ordering-segment.placed",
      );
      const questionId =
        orderTarget?.dataset.questionId ||
        orderTarget?.closest("[data-order-question]")?.dataset.orderQuestion;
      const question = findActivityQuestion(questionId);
      if (orderTarget && question) {
        const targetSegment = event.target.closest(".ordering-segment.placed");
        const insertIndex = targetSegment
          ? Number(targetSegment.dataset.placedIndex)
          : null;
        placeOrderSegment(
          question,
          activityDragState.segmentIndex,
          insertIndex,
        );
      }
    }

    activityDragState = null;
  }

  function handleActivityDragEnd() {
    activityDragState = null;
    document
      .querySelectorAll(".is-drag-over")
      .forEach((element) => element.classList.remove("is-drag-over"));
  }

  function getUnansweredModalFocusableElements() {
    const modal = document.querySelector("#unansweredModal .activity-modal");
    if (!modal) return [];
    return [
      ...modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      ),
    ].filter((element) => !element.disabled && element.offsetParent !== null);
  }

  function showUnansweredModal(pending) {
    const overlay = document.getElementById("unansweredModal");
    const modal = overlay?.querySelector(".activity-modal");
    const message = document.getElementById("unansweredModalMessage");

    if (!overlay || !modal || !message) return Promise.resolve(false);

    unansweredModalPreviousFocus = document.activeElement;
    message.textContent = `Hay ${pending} preguntas sin responder. Si continas, se contarn como incorrectas. Deseas evaluar ahora?`;
    overlay.classList.remove("is-hidden");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", handleUnansweredModalKeydown);

    window.requestAnimationFrame(() => {
      document.getElementById("continueAnsweringBtn")?.focus();
    });

    return new Promise((resolve) => {
      unansweredModalResolve = resolve;
    });
  }

  function closeUnansweredModal(shouldEvaluate) {
    const overlay = document.getElementById("unansweredModal");
    overlay?.classList.add("is-hidden");
    overlay?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    document.removeEventListener("keydown", handleUnansweredModalKeydown);

    const resolve = unansweredModalResolve;
    unansweredModalResolve = null;

    const focusTarget =
      document.getElementById("evaluateBtn") || unansweredModalPreviousFocus;
    unansweredModalPreviousFocus = null;
    focusTarget?.focus?.();

    if (resolve) resolve(shouldEvaluate);
  }

  function handleUnansweredModalKeydown(event) {
    const overlay = document.getElementById("unansweredModal");
    if (!overlay || overlay.classList.contains("is-hidden")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeUnansweredModal(false);
      return;
    }

    if (event.key !== "Tab") return;
    const focusableElements = getUnansweredModalFocusableElements();
    if (focusableElements.length === 0) return;
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  async function evaluateActivity(force = false) {
    force = force === true;
    if (gameOver || !activityStarted) return;
    if (force && unansweredModalResolve) {
      closeUnansweredModal(false);
    }

    updateProgress();
    const pending = questions.length - completed;
    if (!force && pending > 0) {
      const confirmEvaluation = await showUnansweredModal(pending);
      if (!confirmEvaluation) return;
    }

    clearInterval(timerInterval);
    correctCount = questions.reduce(
      (total, question) =>
        total + (isActivityQuestionCorrect(question) ? 1 : 0),
      0,
    );
    activityFeedbackState = questions.reduce((state, question) => {
      state[getQuestionKey(question)] = isActivityQuestionCorrect(question);
      return state;
    }, {});

    const score = calculateScore(correctCount, questions.length);
    const grade = calculateGrade(correctCount);
    gameOver = true;
    activityStarted = false;
    renderActivityQuestions();
    updateUI();
    checkGameEnd(correctCount, grade, score, force);
  }

  function checkGameEnd(correct, grade, score, timeExpired = false) {
    const feedback = getFeedback(correct);
    clearInterval(timerInterval);
    sessionStorage.setItem(getLastGradeStorageKey(), formatGrade(grade));
    updateLastGradeDisplay();

    showGameStatus(
      `<div class="quiz-result ${feedback.type}">
        <div class="grade-value">${formatGrade(grade)}</div>
        <div class="score-value">Aciertos: ${correct} de ${questions.length}</div>
        <div class="quiz-message">${timeExpired ? "El tiempo se agot. " : ""}${feedback.text}</div>
      </div>`,
      feedback.type,
    );

    document.getElementById("activityControls")?.classList.add("is-hidden");
    document.getElementById("retryControls")?.classList.remove("is-hidden");
    document.getElementById("floatingTimer")?.classList.add("is-hidden");
    const evaluationOverview = document.querySelector(".evaluation-overview");
    evaluationOverview?.classList.remove(
      "is-hidden",
      "activity-questions-heading",
    );
    evaluationOverview?.classList.add("activity-results-heading");
    setTopActionButton("retry");
    document
      .getElementById("evaluateBtn")
      ?.setAttribute("disabled", "disabled");
    document.body.style.animation =
      score >= 8
        ? "victoryGlow 2s infinite"
        : score <= 5
          ? "defeatPulse 1s infinite"
          : "none";
  }

  async function resetActivity() {
    clearInterval(timerInterval);
    const ready = await initGame();
    if (!ready) return;
    await startActivity();
    document
      .getElementById("questionsSection")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  window.renderSidebarNavigation?.({ mode: "actividad" });

  /* Toggle men lateral */
  const menuToggle = document.getElementById("menuToggle");
  const sidebarNav = document.getElementById("sidebarNav");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  menuToggle?.setAttribute("aria-controls", "sidebarNav");
  menuToggle?.setAttribute("aria-expanded", "false");
  menuToggle?.setAttribute("aria-label", "Abrir men de navegacin");

  function toggleSidebar() {
    sidebarOpen = !sidebarOpen;
    if (sidebarOpen) {
      sidebarNav.classList.add("active");
      sidebarOverlay.classList.add("active");
      menuToggle.classList.add("active");
      menuToggle.innerHTML = '<i class="fas fa-times"></i>';
      menuToggle.setAttribute("aria-expanded", "true");
      menuToggle.setAttribute("aria-label", "Cerrar men de navegacin");
    } else {
      sidebarNav.classList.remove("active");
      sidebarOverlay.classList.remove("active");
      menuToggle.classList.remove("active");
      menuToggle.innerHTML = '<i class="fas fa-bars"></i>';
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Abrir men de navegacin");
    }
    updateContainerSpacing();
  }

  menuToggle?.addEventListener("click", toggleSidebar);
  sidebarOverlay?.addEventListener("click", toggleSidebar);

  function updateContainerSpacing() {
    const container = document.querySelector(".container");
    if (window.innerWidth <= 768) {
      if (!container) return;
      container.style.marginLeft = "auto";
      container.style.marginRight = "auto";
      container.style.padding = "10px";
    } else {
      container.style.marginLeft = sidebarOpen ? "370px" : "auto";
      container.style.marginRight = sidebarOpen ? "90px" : "auto";
      container.style.padding = "20px";
    }
  }

  function updateReadingProgress() {
    const scroll = document.documentElement.scrollTop;
    const height =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const percent = Math.min((scroll / height) * 100, 100);
    const progressBar = document.getElementById("readingProgressBar");
    if (progressBar) progressBar.style.width = `${percent}%`;
  }

  const scrollToTopBtn = document.getElementById("scrollToTop");
  window.addEventListener("scroll", () => {
    updateReadingProgress();
    if (window.pageYOffset > 300) {
      scrollToTopBtn.classList.add("visible");
    } else {
      scrollToTopBtn.classList.remove("visible");
    }
  });
  scrollToTopBtn?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && sidebarOpen) toggleSidebar();
    updateContainerSpacing();
  });

  document.addEventListener("DOMContentLoaded", () => {
    initGame();
    document
      .getElementById("startActivityBtn")
      ?.addEventListener("click", startActivity);
    document
      .getElementById("evaluateBtn")
      ?.addEventListener("click", () => evaluateActivity(false));
    document
      .getElementById("resetActivityBtn")
      ?.addEventListener("click", resetActivity);
    document
      .getElementById("resetActivityBottomBtn")
      ?.addEventListener("click", resetActivity);
    document
      .getElementById("continueAnsweringBtn")
      ?.addEventListener("click", () => closeUnansweredModal(false));
    document
      .getElementById("confirmEvaluateBtn")
      ?.addEventListener("click", () => closeUnansweredModal(true));
    document
      .getElementById("questionsContainer")
      ?.addEventListener("click", handleActivityClick);
    document
      .getElementById("questionsContainer")
      ?.addEventListener("keydown", handleActivityKeydown);
    document
      .getElementById("questionsContainer")
      ?.addEventListener("dragstart", handleActivityDragStart);
    document
      .getElementById("questionsContainer")
      ?.addEventListener("dragover", handleActivityDragOver);
    document
      .getElementById("questionsContainer")
      ?.addEventListener("dragleave", handleActivityDragLeave);
    document
      .getElementById("questionsContainer")
      ?.addEventListener("drop", handleActivityDrop);
    document
      .getElementById("questionsContainer")
      ?.addEventListener("dragend", handleActivityDragEnd);
    updateContainerSpacing();
  });
})();


