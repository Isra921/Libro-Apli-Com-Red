(() => {
  'use strict';

  const page = document.body;
  const config = {
    caseUrl: page.dataset.caseUrl,
    questionsUrl: page.dataset.questionsUrl,
    timeMinutes: Number(page.dataset.timeMinutes) || 45
  };

  const typeMeta = {
    opcion_multiple: { label: 'Opción múltiple', icon: 'fa-circle-dot' },
    seleccion_multiple: { label: 'Selección múltiple', icon: 'fa-list-check' },
    clasificar: { label: 'Clasificación', icon: 'fa-layer-group' },
    interpretar_datos: { label: 'Interpretación de datos', icon: 'fa-chart-column' },
    identificar_error: { label: 'Identificación de error', icon: 'fa-triangle-exclamation' },
    ordenar_proceso: { label: 'Ordenar proceso', icon: 'fa-arrow-down-1-9' }
  };

  const expectedCounts = {
    opcion_multiple: 4,
    seleccion_multiple: 4,
    clasificar: 4,
    interpretar_datos: 4,
    identificar_error: 4,
    ordenar_proceso: 4
  };

  const attemptCounts = {
    opcion_multiple: 4,
    seleccion_multiple: 4,
    clasificar: 4,
    interpretar_datos: 4,
    identificar_error: 4,
    ordenar_proceso: 4
  };

  const performanceCategories = [
    'Tema de ejemplo',
    'Organizaci?n de informaci?n',
    'Búsqueda',
    'Exploración y vuelta atrás'
  ];

  let caseData = null;
  let baseQuestions = [];
  let questions = [];
  let currentIndex = 0;
  let answers = new Map();
  let orderState = new Map();
  let touchedOrders = new Set();
  let startedAt = 0;
  let deadline = 0;
  let timerId = null;
  let lastDialogFocus = null;

  const $ = id => document.getElementById(id);
  const loadingState = $('loadingState');
  const loadError = $('loadError');
  const introScreen = $('introScreen');
  const evaluationScreen = $('evaluationScreen');
  const resultsScreen = $('resultsScreen');
  const questionCard = $('questionCard');

  function escapeHtml(value) {
    return String(value ? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function shuffle(values) {
    const result = [...values];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
    }
    return result;
  }

  function shuffledDifferent(values) {
    const result = shuffle(values);
    const unchanged = result.every((value, index) => value === values[index]);
    if (unchanged && result.length > 1) result.push(result.shift());
    return result;
  }

  function arraysEqualAsSets(left = [], right = []) {
    if (left.length !== right.length) return false;
    const normalizedLeft = [...left].sort();
    const normalizedRight = [...right].sort();
    return normalizedLeft.every((value, index) => value === normalizedRight[index]);
  }

  function validateData(loadedCase, loadedQuestions) {
    if (!loadedCase || !Array.isArray(loadedCase.sections) || !Array.isArray(loadedCase.resources)) {
      throw new Error('El archivo del caso no contiene las secciones o recursos esperados.');
    }
    if (!Array.isArray(loadedQuestions) || loadedQuestions.length !== 24) {
      throw new Error('El banco debe contener exactamente 24 preguntas.');
    }

    const ids = new Set(loadedQuestions.map(question => question.id));
    if (ids.size !== 24) throw new Error('Los identificadores de las preguntas deben ser únicos.');

    Object.entries(expectedCounts).forEach(([type, expected]) => {
      const total = loadedQuestions.filter(question => question.type === type).length;
      if (total !== expected) throw new Error(`El tipo ${type} debe contener ${expected} preguntas.`);
    });

    const resourceIds = new Set((loadedCase.resources || []).map(resource => resource.id));
    loadedQuestions
      .filter(question => question.resourceId)
      .forEach(question => {
        if (!resourceIds.has(question.resourceId)) {
          throw new Error(`No existe el recurso ${question.resourceId}.`);
        }
      });
  }

  async function loadEvaluation() {
    clearInterval(timerId);
    loadingState.classList.remove('is-hidden');
    loadError.classList.add('is-hidden');
    introScreen.classList.add('is-hidden');
    evaluationScreen.classList.add('is-hidden');
    resultsScreen.classList.add('is-hidden');

    try {
      const [caseResponse, questionsResponse] = await Promise.all([
        fetch(config.caseUrl),
        fetch(config.questionsUrl)
      ]);
      if (!caseResponse.ok || !questionsResponse.ok) throw new Error('No se pudieron leer los archivos JSON.');

      const [loadedCase, loadedQuestions] = await Promise.all([
        caseResponse.json(),
        questionsResponse.json()
      ]);
      validateData(loadedCase, loadedQuestions);

      caseData = loadedCase;
      baseQuestions = loadedQuestions;
      renderCaseContent($('casePresentation'), 'case');

      loadingState.classList.add('is-hidden');
      introScreen.classList.remove('is-hidden');
    } catch (error) {
      loadingState.classList.add('is-hidden');
      loadError.classList.remove('is-hidden');
      $('loadErrorMessage').textContent = error.message || 'Verifica los archivos de datos e intenta nuevamente.';
    }
  }

  function resourceMarkup(resource, compact = false) {
    if (!resource) return '';
    const title = escapeHtml(resource.title);
    const description = escapeHtml(resource.description);

    if (resource.type === 'table') {
      const headings = resource.columns.map(column => `<th scope="col">${escapeHtml(column)}</th>`).join('');
      const rows = resource.rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
      return `<section class="resource-card resource-${escapeHtml(resource.id)}" data-resource-id="${escapeHtml(resource.id)}">
        <h3><i class="fas fa-table" aria-hidden="true"></i>${title}</h3>
        <p>${description}</p>
        <div class="table-scroll" tabindex="0" aria-label="Tabla desplazable: ${title}">
          <table class="data-table"><thead><tr>${headings}</tr></thead><tbody>${rows}</tbody></table>
        </div>
      </section>`;
    }

    const maximum = Number(resource.max) || 100;
    const bars = resource.bars.map(bar => {
      const value = Number(bar.value);
      const height = Math.max(2, Math.min(100, (value / maximum) * 100));
      return `<div class="bar-item">
        <span class="bar-value">${escapeHtml(value)}${escapeHtml(resource.unit || '')}</span>
        <div class="bar-column" style="--bar-height:${height}%" aria-hidden="true"></div>
        <span class="bar-label">${escapeHtml(bar.label)}</span>
      </div>`;
    }).join('');
    return `<section class="resource-card resource-${escapeHtml(resource.id)}" data-resource-id="${escapeHtml(resource.id)}">
      <h3><i class="fas fa-chart-column" aria-hidden="true"></i>${title}</h3>
      <p>${description}</p>
      <div class="bar-chart" role="img" aria-label="${title}. ${resource.bars.map(bar => `${bar.label}: ${bar.value}${resource.unit || ''}`).join('. ')}">${bars}</div>
    </section>`;
  }

  function renderCaseContent(target, prefix) {
    if (!target || !caseData) return;
    const section = id => caseData.sections.find(item => item.id === id);
    const resource = id => (caseData.resources || []).find(item => item.id === id);
    const sectionMarkup = (item, id = '') => {
      if (!item) return '';
      return `<article ${id ? `id="${id}"` : ''} class="case-detail">
      <h3><i class="fas ${escapeHtml(item.icon)}" aria-hidden="true"></i>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.content)}</p>
    </article>`;
    };
    const designSections = ['algoritmia', 'organizaci?n de informaci?n', 'busqueda', 'exploracion']
      .map(id => sectionMarkup(section(id))).join('');

    const hasResults = resource('tabla_resultados') || resource('grafica_control') || resource('grafica_motivos');

    target.innerHTML = `
      <section id="${prefix}-summary" class="case-content-section case-general-section">
        <div class="reading-column">
          <p class="case-block-label">Información general</p>
          <h3 class="case-main-title">${escapeHtml(caseData.title)}</h3>
        </div>
        <div class="case-general-copy">
          <article class="case-detail case-summary"><h3><i class="fas fa-file-lines" aria-hidden="true"></i>Resumen del caso</h3><p>${escapeHtml(caseData.summary)}</p></article>
          ${sectionMarkup(section('contexto'))}
          ${sectionMarkup(section('objetivo'))}
        </div>
      </section>
      <section id="${prefix}-procedure" class="case-content-section case-design-section">
        <div class="case-section-title reading-column"><p class="case-block-label">Recorrido por la unidad</p><h3>Cómo resolvió Ana cada problema</h3></div>
        <div class="case-design-grid">${designSections}${sectionMarkup(section('limitaciones'), `${prefix}-limitations`)}</div>
      </section>
      ${hasResults ? `<section id="${prefix}-results" class="case-content-section case-results-section">
        <div class="case-section-title reading-column"><p class="case-block-label">Resultados</p><h3>Datos del caso</h3></div>
        <div id="${prefix}-visuals" class="case-results-layout">
          <div class="result-wide">${resourceMarkup(resource('tabla_resultados'))}</div>
          <div class="result-charts">${resourceMarkup(resource('grafica_control'))}${resourceMarkup(resource('grafica_motivos'))}</div>
          <div class="result-wide">${resourceMarkup(resource('tabla_contingencia'))}</div>
        </div>
        ${caseData.resultsNarrative ? `<div class="case-results-narrative"><div class="reading-column"><strong>Descripción general de los hallazgos</strong><p>${escapeHtml(caseData.resultsNarrative)}</p></div></div>` : ''}
      </section>` : ''}`;
  }

  function prepareAttempt() {
    answers = new Map();
    orderState = new Map();
    touchedOrders = new Set();
    currentIndex = 0;
    const selectedQuestions = Object.entries(attemptCounts).flatMap(([type, total]) =>
      shuffle(baseQuestions.filter(question => question.type === type)).slice(0, total)
    );
    questions = shuffle(selectedQuestions).map(question => {
      const prepared = { ...question };
      if (Array.isArray(question.options)) prepared.displayOptions = shuffle(question.options);
      if (question.type === 'clasificar') prepared.displayItems = shuffle(question.items);
      if (question.type === 'ordenar_proceso') {
        const segments = shuffledDifferent(question.segments);
        prepared.displaySegments = segments;
        orderState.set(question.id, [...segments]);
      }
      return prepared;
    });
  }

  function startEvaluation() {
    prepareAttempt();
    document.querySelector('.evaluation-header')?.classList.add('is-hidden');
    introScreen.classList.add('is-hidden');
    resultsScreen.classList.add('is-hidden');
    evaluationScreen.classList.remove('is-hidden');
    startedAt = Date.now();
    deadline = startedAt + config.timeMinutes * 60 * 1000;
    document.querySelector('.question-progress')?.setAttribute('aria-valuemax', String(questions.length));
    startTimer();
    renderQuestion();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startTimer() {
    clearInterval(timerId);
    updateTimer();
    timerId = window.setInterval(updateTimer, 1000);
  }

  function updateTimer() {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    $('timerValue').textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    if (remaining <= 0) {
      clearInterval(timerId);
      closePendingDialog();
      submitEvaluation(true);
    }
  }

  function currentQuestion() {
    return questions[currentIndex];
  }

  function questionHeading(question) {
    return escapeHtml(question.question || question.instruction || 'Clasifica los elementos.');
  }

  function singleChoiceMarkup(question) {
    const selected = answers.get(question.id) || '';
    return `<div class="options-list">${question.displayOptions.map((option, index) => {
      const checked = selected === option;
      return `<label class="option-label${checked ? ' is-selected' : ''}">
        <input type="radio" name="question-${question.id}" value="${escapeHtml(option)}" ${checked ? 'checked' : ''}>
        <span>${escapeHtml(option)}</span>
      </label>`;
    }).join('')}</div>`;
  }

  function multipleChoiceMarkup(question) {
    const selected = answers.get(question.id) || [];
    return `<div class="options-list">${question.displayOptions.map(option => {
      const checked = selected.includes(option);
      return `<label class="option-label${checked ? ' is-selected' : ''}">
        <input type="checkbox" name="question-${question.id}" value="${escapeHtml(option)}" ${checked ? 'checked' : ''}>
        <span>${escapeHtml(option)}</span>
      </label>`;
    }).join('')}</div>`;
  }

  function classificationMarkup(question) {
    const selected = answers.get(question.id) || {};
    const options = question.categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
    return `<div class="classification-list">${question.displayItems.map(item => `
      <label class="classification-item">
        <span>${escapeHtml(item.text)}</span>
        <select class="classification-select" data-item="${escapeHtml(item.text)}" aria-label="Clasificar: ${escapeHtml(item.text)}">
          <option value="">Selecciona una categoría</option>
          ${options.replace(`value="${escapeHtml(selected[item.text])}"`, `value="${escapeHtml(selected[item.text])}" selected`)}
        </select>
      </label>`).join('')}</div>`;
  }

  function orderingMarkup(question) {
    const segments = orderState.get(question.id) || question.displaySegments;
    return `<div class="ordering-list">${segments.map((segment, index) => `
      <div class="order-item">
        <span class="order-number">${index + 1}</span>
        <span>${escapeHtml(segment)}</span>
        <span class="order-actions">
          <button class="order-button" type="button" data-order-action="up" data-order-index="${index}" aria-label="Subir: ${escapeHtml(segment)}" ${index === 0 ? 'disabled' : ''}><i class="fas fa-arrow-up" aria-hidden="true"></i></button>
          <button class="order-button" type="button" data-order-action="down" data-order-index="${index}" aria-label="Bajar: ${escapeHtml(segment)}" ${index === segments.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-down" aria-hidden="true"></i></button>
        </span>
      </div>`).join('')}</div>`;
  }

  function renderQuestion() {
    const question = currentQuestion();
    if (!question) return;
    questionCard.dataset.questionId = String(question.id);
    const meta = typeMeta[question.type];
    const instruction = question.instruction && question.instruction !== question.question
      ? `<p class="question-instruction">${escapeHtml(question.instruction)}</p>` : '';
    const scenario = question.scenario ? `<div class="scenario-box"><strong>Situación:</strong> ${escapeHtml(question.scenario)}</div>` : '';
    const resource = question.resourceId
      ? `<div class="question-resource">${resourceMarkup((caseData.resources || []).find(item => item.id === question.resourceId), true)}</div>` : '';

    let interaction = '';
    if (['opcion_multiple', 'interpretar_datos', 'identificar_error'].includes(question.type)) interaction = singleChoiceMarkup(question);
    if (question.type === 'seleccion_multiple') interaction = multipleChoiceMarkup(question);
    if (question.type === 'clasificar') interaction = classificationMarkup(question);
    if (question.type === 'ordenar_proceso') interaction = orderingMarkup(question);

    questionCard.innerHTML = `
      <div class="question-card-heading">
        <span class="question-number-icon" aria-hidden="true"><i class="fas ${meta.icon}"></i></span>
        <div><strong>Pregunta ${currentIndex + 1}</strong><span class="question-type">${meta.label}</span></div>
      </div>
      ${scenario}
      <h3>${questionHeading(question)}</h3>
      ${instruction}
      ${resource}
      ${interaction}`;

    updateEvaluationProgress();
    updateNavigation();
  }

  function isAnswered(question) {
    const answer = answers.get(question.id);
    if (['opcion_multiple', 'interpretar_datos', 'identificar_error'].includes(question.type)) return Boolean(answer);
    if (question.type === 'seleccion_multiple') return Array.isArray(answer) && answer.length > 0;
    if (question.type === 'clasificar') return question.items.every(item => Boolean(answer?.[item.text]));
    if (question.type === 'ordenar_proceso') return touchedOrders.has(question.id);
    return false;
  }

  function updateEvaluationProgress() {
    const answered = questions.filter(isAnswered).length;
    $('questionCounter').textContent = `Pregunta ${currentIndex + 1} de ${questions.length}`;
    $('answeredCounter').textContent = `${answered} ${answered === 1 ? 'respondida' : 'respondidas'}`;
    const progress = (answered / questions.length) * 100;
    $('questionProgressBar').style.width = `${progress}%`;
    const progressElement = document.querySelector('.question-progress');
    progressElement?.setAttribute('aria-valuenow', String(answered));
  }

  function updateNavigation() {
    $('previousQuestionBtn').disabled = currentIndex === 0;
    const onLast = currentIndex === questions.length - 1;
    $('nextQuestionBtn').classList.toggle('is-hidden', onLast);
    $('evaluateFinalBtn').classList.toggle('is-hidden', !onLast);
    $('questionDots').innerHTML = questions.map((question, index) => `<button type="button" class="question-dot${index === currentIndex ? ' is-current' : ''}${isAnswered(question) ? ' is-answered' : ''}" data-question-index="${index}" aria-label="Ir a la pregunta ${index + 1}" ${index === currentIndex ? 'aria-current="step"' : ''}>${index + 1}</button>`).join('');
  }

  function goToQuestion(index) {
    if (index < 0 || index >= questions.length) return;
    currentIndex = index;
    renderQuestion();
    questionCard.focus?.({ preventScroll: true });
    window.scrollTo({ top: Math.max(0, questionCard.offsetTop - 90), behavior: 'smooth' });
  }

  function handleQuestionChange(event) {
    const question = currentQuestion();
    if (!question) return;

    if (event.target.matches('input[type="radio"]')) {
      answers.set(question.id, event.target.value);
      questionCard.querySelectorAll('.option-label').forEach(label => label.classList.toggle('is-selected', label.querySelector('input')?.checked));
    }

    if (event.target.matches('input[type="checkbox"]')) {
      const selected = [...questionCard.querySelectorAll('input[type="checkbox"]:checked')].map(input => input.value);
      answers.set(question.id, selected);
      questionCard.querySelectorAll('.option-label').forEach(label => label.classList.toggle('is-selected', label.querySelector('input')?.checked));
    }

    if (event.target.matches('.classification-select')) {
      const selected = { ...(answers.get(question.id) || {}) };
      if (event.target.value) selected[event.target.dataset.item] = event.target.value;
      else delete selected[event.target.dataset.item];
      answers.set(question.id, selected);
    }

    updateEvaluationProgress();
    updateNavigation();
  }

  function handleQuestionClick(event) {
    const button = event.target.closest('[data-order-action]');
    if (!button) return;
    const question = currentQuestion();
    const segments = [...(orderState.get(question.id) || [])];
    const index = Number(button.dataset.orderIndex);
    const targetIndex = button.dataset.orderAction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= segments.length) return;
    [segments[index], segments[targetIndex]] = [segments[targetIndex], segments[index]];
    orderState.set(question.id, segments);
    answers.set(question.id, [...segments]);
    touchedOrders.add(question.id);
    renderQuestion();
  }

  function openCaseDrawer() {
    lastDialogFocus = document.activeElement;
    if ($('casePresentation').parentElement !== $('caseDrawerContent')) {
      $('caseDrawerContent').appendChild($('casePresentation'));
    }
    $('caseDrawerOverlay').classList.remove('is-hidden');
    $('caseDrawerOverlay').setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    $('caseDrawer').focus();
  }

  function closeCaseDrawer() {
    $('caseDrawerOverlay').classList.add('is-hidden');
    $('caseDrawerOverlay').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    lastDialogFocus?.focus?.();
    lastDialogFocus = null;
  }

  function openPendingDialog() {
    const pending = questions.filter(question => !isAnswered(question)).length;
    lastDialogFocus = document.activeElement;
    $('pendingDialogText').textContent = `Faltan ${pending} ${pending === 1 ? 'pregunta' : 'preguntas'}. Si entregas ahora, se contarán como incorrectas.`;
    $('pendingDialog').classList.remove('is-hidden');
    $('pendingDialog').setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    $('continueEvaluationBtn').focus();
  }

  function closePendingDialog() {
    $('pendingDialog').classList.add('is-hidden');
    $('pendingDialog').setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    lastDialogFocus?.focus?.();
    lastDialogFocus = null;
  }

  function isCorrect(question) {
    const answer = answers.get(question.id);
    if (!isAnswered(question)) return false;
    if (['opcion_multiple', 'interpretar_datos', 'identificar_error'].includes(question.type)) return answer === question.answer;
    if (question.type === 'seleccion_multiple') return arraysEqualAsSets(answer, question.answer);
    if (question.type === 'clasificar') return question.items.every(item => answer[item.text] === item.category);
    if (question.type === 'ordenar_proceso') return answer.every((segment, index) => segment === question.answer[index]);
    return false;
  }

  function formatDuration(totalSeconds) {
    const seconds = Math.max(0, Math.round(totalSeconds));
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds % 60;
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  }

  function formatAnswer(question, answer, correct = false) {
    if (!answer || (Array.isArray(answer) && answer.length === 0)) return 'Sin respuesta';
    if (question.type === 'clasificar') {
      const source = correct ? Object.fromEntries(question.items.map(item => [item.text, item.category])) : answer;
      return question.items.map(item => `${item.text}  ${source?.[item.text] || 'Sin clasificar'}`).join(' | ');
    }
    if (Array.isArray(answer)) return answer.join('  ');
    return String(answer);
  }

  function correctAnswerFor(question) {
    if (question.type === 'clasificar') return Object.fromEntries(question.items.map(item => [item.text, item.category]));
    return question.answer;
  }

  function submitEvaluation(timeExpired = false) {
    clearInterval(timerId);
    closePendingDialog();
    closeCaseDrawer();
    const elapsedSeconds = Math.min(config.timeMinutes * 60, (Date.now() - startedAt) / 1000);
    const correct = questions.filter(isCorrect).length;
    const unanswered = questions.filter(question => !isAnswered(question)).length;
    const incorrect = questions.length - correct - unanswered;
    const percentage = (correct / questions.length) * 100;
    const grade = percentage / 10;

    evaluationScreen.classList.add('is-hidden');
    resultsScreen.classList.remove('is-hidden');
    $('gradeValue').textContent = grade.toFixed(1);
    $('resultsMessage').textContent = timeExpired
      ? 'El tiempo terminó. Revisa cada respuesta y utiliza la retroalimentación para fortalecer tu análisis.'
      : 'Compara tus decisiones con la evidencia del caso y revisa la explicación de cada reactivo.';

    const summary = [
      ['Correctas', correct],
      ['Incorrectas', incorrect],
      ['Sin responder', unanswered],
      ['Porcentaje', `${percentage.toFixed(1)} %`],
      ['Tiempo utilizado', formatDuration(elapsedSeconds)]
    ];
    $('resultsSummary').innerHTML = summary.map(([label, value]) => `<div class="summary-stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join('');

    $('categoryPerformance').innerHTML = performanceCategories.map(category => {
      const categoryQuestions = questions.filter(question => question.category === category);
      const categoryCorrect = categoryQuestions.filter(isCorrect).length;
      const categoryPercentage = categoryQuestions.length ? (categoryCorrect / categoryQuestions.length) * 100 : 0;
      return `<div class="category-row">
        <strong>${escapeHtml(category)}</strong>
        <div class="category-track" role="progressbar" aria-label="${escapeHtml(category)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${categoryPercentage.toFixed(0)}"><div style="width:${categoryPercentage}%"></div></div>
        <span>${categoryCorrect}/${categoryQuestions.length}</span>
      </div>`;
    }).join('');

    $('questionReview').innerHTML = questions.map((question, index) => {
      const correctQuestion = isCorrect(question);
      const answer = answers.get(question.id);
      const visualResource = question.resourceId
        ? `<div class="question-resource">${resourceMarkup((caseData.resources || []).find(resource => resource.id === question.resourceId), true)}</div>` : '';
      return `<details class="review-item">
        <summary><span class="review-status ${correctQuestion ? 'correct' : 'incorrect'}"><i class="fas ${correctQuestion ? 'fa-check' : 'fa-times'}" aria-hidden="true"></i></span><span>Pregunta ${index + 1}: ${questionHeading(question)}</span></summary>
        <div class="review-detail">
          <div class="answer-comparison">
            <div class="answer-box"><span>Tu respuesta</span>${escapeHtml(formatAnswer(question, answer))}</div>
            <div class="answer-box"><span>Respuesta correcta</span>${escapeHtml(formatAnswer(question, correctAnswerFor(question), true))}</div>
          </div>
          <p class="review-explanation"><strong>Explicación:</strong> ${escapeHtml(question.explanation)}</p>
          ${visualResource}
        </div>
      </details>`;
    }).join('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function requestEvaluation() {
    const pending = questions.filter(question => !isAnswered(question)).length;
    if (pending > 0) openPendingDialog();
    else submitEvaluation(false);
  }

  function returnToCase() {
    clearInterval(timerId);
    answers = new Map();
    orderState = new Map();
    touchedOrders = new Set();
    questions = [];
    currentIndex = 0;
    $('timerValue').textContent = `${config.timeMinutes}:00`;
    resultsScreen.classList.add('is-hidden');
    evaluationScreen.classList.add('is-hidden');
    document.querySelector('.case-card')?.appendChild($('casePresentation'));
    introScreen.classList.remove('is-hidden');
    document.querySelector('.evaluation-header')?.classList.remove('is-hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleGlobalKeydown(event) {
    if (event.key !== 'Escape') return;
    if (!$('pendingDialog').classList.contains('is-hidden')) closePendingDialog();
    else if (!$('caseDrawerOverlay').classList.contains('is-hidden')) closeCaseDrawer();
    else if ($('sidebarNav')?.classList.contains('open')) closeSidebar();
  }

  function setSidebarState(isOpen, restoreFocus = false) {
    const menuToggle = $('menuToggle');
    const sidebar = $('sidebarNav');
    const overlay = $('sidebarOverlay');
    if (!menuToggle || !sidebar || !overlay) return;
    sidebar.classList.toggle('open', isOpen);
    overlay.classList.toggle('active', isOpen);
    document.body.classList.toggle('sidebar-open', isOpen);
    sidebar.setAttribute('aria-hidden', String(!isOpen));
    overlay.setAttribute('aria-hidden', String(!isOpen));
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
    menuToggle.querySelector('i')?.classList.toggle('fa-bars', !isOpen);
    menuToggle.querySelector('i')?.classList.toggle('fa-xmark', isOpen);
    if (isOpen) sidebar.querySelector('a')?.focus();
    else if (restoreFocus) menuToggle.focus();
  }

  function closeSidebar(restoreFocus = true) {
    setSidebarState(false, restoreFocus);
  }

  function updatePageControls() {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    $('readingProgressBar').style.width = `${Math.min(100, (scrollTop / scrollable) * 100)}%`;
    $('scrollToTop').classList.toggle('show', scrollTop > 420);
  }
function descargarResultadosFinalPDF() {
  if (!window.jspdf?.jsPDF) {
    alert('No se cargó la librería para generar el PDF.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const margen = 16;
  const ancho = pdf.internal.pageSize.getWidth();
  const alto = pdf.internal.pageSize.getHeight();
  const contenido = ancho - (margen * 2);
  const limite = alto - margen;
  const total = questions.length;
  const correctas = questions.filter(isCorrect).length;
  const sinResponder = questions.filter(q => !isAnswered(q)).length;
  const incorrectas = total - correctas - sinResponder;
  let y = 0;

  const limpiar = valor =>
    String(valor ? '')
      .replace(//g, ' -> ')
      .replace(/\s+/g, ' ')
      .trim();

  function encabezado() {
    pdf.setFillColor(30, 64, 175);
    pdf.rect(0, 0, ancho, 22, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.text('Resultados de la actividad final', margen, 13);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(new Date().toLocaleDateString('es-MX'), ancho - margen, 13, { align: 'right' });

    y = 32;
  }

  function nuevaPagina() {
    pdf.addPage();
    encabezado();
  }

  function espacio(altura) {
    if (y + altura > limite) nuevaPagina();
  }

  function titulo(texto) {
    espacio(12);
    pdf.setTextColor(30, 64, 175);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text(texto, margen, y);
    y += 3;

    pdf.setDrawColor(191, 219, 254);
    pdf.line(margen, y, ancho - margen, y);
    y += 6;
  }

  function linea(etiqueta, valor) {
    const prefijo = `${etiqueta}: `;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);

    const anchoPrefijo = pdf.getTextWidth(prefijo);
    const lineas = pdf.splitTextToSize(limpiar(valor), contenido - anchoPrefijo);

    lineas.forEach((texto, indice) => {
      espacio(4.5);

      if (indice === 0) {
        pdf.setTextColor(30, 64, 175);
        pdf.setFont('helvetica', 'bold');
        pdf.text(prefijo, margen, y);
      }

      pdf.setTextColor(31, 41, 55);
      pdf.setFont('helvetica', 'normal');
      pdf.text(texto, margen + anchoPrefijo, y);
      y += 4.5;
    });
  }

  function preguntaPDF(question, index) {
    const respondida = isAnswered(question);
    const correcta = isCorrect(question);
    const estado = !respondida
      ? 'Sin responder'
      : correcta ? 'Correcta' : 'Incorrecta';

    const enunciado = limpiar(question.question || question.instruction);
    const usuario = limpiar(formatAnswer(question, answers.get(question.id)));
    const correctaTexto = limpiar(formatAnswer(question, correctAnswerFor(question), true));
    const explicacion = limpiar(question.explanation || 'Sin explicación disponible.');

    const lineas = [
      ...pdf.splitTextToSize(enunciado, contenido - 8),
      ...pdf.splitTextToSize(`Tu respuesta: ${usuario}`, contenido - 8),
      ...pdf.splitTextToSize(`Respuesta correcta: ${correctaTexto}`, contenido - 8),
      ...pdf.splitTextToSize(`Explicación: ${explicacion}`, contenido - 8)
    ];

    const alturaLinea = 4.1;
    const alturaCaja = 12 + (lineas.length * alturaLinea);

    espacio(alturaCaja);

    const color = correcta
      ? [22, 163, 74]
      : respondida ? [220, 38, 38] : [100, 116, 139];

    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(...color);
    pdf.roundedRect(margen, y, contenido, alturaCaja, 1.5, 1.5, 'FD');

    y += 5;
    pdf.setTextColor(...color);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(`Pregunta ${index + 1} - ${estado}`, margen + 4, y);

    y += alturaLinea;
    pdf.setTextColor(31, 41, 55);
    pdf.setFont('helvetica', 'normal');
    pdf.text(lineas, margen + 4, y);

    y += (lineas.length * alturaLinea) + 3;
  }

  encabezado();

  pdf.setFillColor(239, 246, 255);
  pdf.setDrawColor(147, 197, 253);
  pdf.roundedRect(margen, y, contenido, 28, 2, 2, 'FD');

  pdf.setTextColor(30, 64, 175);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Calificación', ancho / 2, y + 8, { align: 'center' });

  pdf.setFontSize(25);
  pdf.text(`${$('gradeValue').textContent.trim()} / 10`, ancho / 2, y + 18, { align: 'center' });

  y += 38;

  titulo('Resumen');
  linea('Preguntas', total);
  linea('Correctas', correctas);
  linea('Incorrectas', incorrectas);
  linea('Sin responder', sinResponder);

  titulo('Detalle de respuestas');
  questions.forEach(preguntaPDF);

  pdf.save('Resultados_Actividad_Final.pdf');
}
  questionCard.addEventListener('change', handleQuestionChange);
  questionCard.addEventListener('click', handleQuestionClick);
  $('questionDots').addEventListener('click', event => {
    const button = event.target.closest('[data-question-index]');
    if (button) goToQuestion(Number(button.dataset.questionIndex));
  });
  $('previousQuestionBtn').addEventListener('click', () => goToQuestion(currentIndex - 1));
  $('nextQuestionBtn').addEventListener('click', () => goToQuestion(currentIndex + 1));
  $('evaluateFinalBtn').addEventListener('click', requestEvaluation);
  $('startEvaluationBtn').addEventListener('click', startEvaluation);
  $('retryEvaluationBtn').addEventListener('click', returnToCase);
  $('downloadPdfBtn')?.addEventListener('click', descargarResultadosFinalPDF);
  $('consultCaseBtn').addEventListener('click', openCaseDrawer);
  $('closeCaseDrawerBtn').addEventListener('click', closeCaseDrawer);
  $('caseDrawerOverlay').addEventListener('click', event => {
    if (event.target === $('caseDrawerOverlay')) closeCaseDrawer();
  });
  document.querySelector('.drawer-tabs')?.addEventListener('click', event => {
    const button = event.target.closest('[data-case-target]');
    if (!button) return;
    document.getElementById(button.dataset.caseTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('continueEvaluationBtn').addEventListener('click', closePendingDialog);
  $('confirmSubmitBtn').addEventListener('click', () => submitEvaluation(false));
  $('retryLoadBtn').addEventListener('click', loadEvaluation);
  $('menuToggle')?.addEventListener('click', () => {
    setSidebarState(!$('sidebarNav')?.classList.contains('open'));
  });
  $('sidebarOverlay')?.addEventListener('click', () => closeSidebar());
  $('sidebarNav')?.addEventListener('click', event => {
    if (event.target.closest('a')) closeSidebar(false);
  });
  $('scrollToTop').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  window.addEventListener('scroll', updatePageControls, { passive: true });
  window.addEventListener('resize', updatePageControls);
  document.addEventListener('keydown', handleGlobalKeydown);
  function init() {
    updatePageControls();
    loadEvaluation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

