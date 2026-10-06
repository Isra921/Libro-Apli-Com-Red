(() => {
    'use strict';

    const root = document.getElementById('diagnostic-exam');
    if (!root) return;

    const elements = {
        loading: document.getElementById('diagnostic-loading'),
        error: document.getElementById('diagnostic-error'),
        errorText: document.getElementById('diagnostic-error-text'),
        form: document.getElementById('diagnostic-form'),
        questions: document.getElementById('diagnostic-questions'),
        progressText: document.getElementById('diagnostic-progress-text'),
        progressPercent: document.getElementById('diagnostic-progress-percent'),
        progressBar: document.getElementById('diagnostic-progress-bar'),
        message: document.getElementById('diagnostic-form-message'),
        result: document.getElementById('diagnostic-result'),
        resultSummary: document.getElementById('diagnostic-result-summary'),
        restart: document.getElementById('diagnostic-restart')
    };

    let exam = null;
    let examSource = null;

    function shuffle(items) {
        const shuffled = [...items];
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
            const randomIndex = Math.floor(Math.random() * (index + 1));
            [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
        }
        return shuffled;
    }

    function prepareExam() {
        const requestedAmount = Number(examSource.configuracion?.cantidadPreguntas);
        const amount = Number.isInteger(requestedAmount) && requestedAmount > 0
            ? Math.min(requestedAmount, examSource.preguntas.length)
            : examSource.preguntas.length;
        const questionPool = examSource.configuracion?.mezclarPreguntas
            ? shuffle(examSource.preguntas)
            : [...examSource.preguntas];

        exam = {
            ...examSource,
            preguntas: questionPool.slice(0, amount)
        };

        const fragment = document.createDocumentFragment();
        exam.preguntas.forEach((question, index) => {
            fragment.append(renderQuestion(question, index));
        });
        elements.questions.replaceChildren(fragment);
    }

    function showError(message) {
        if (elements.loading) elements.loading.hidden = true;
        if (elements.form) elements.form.hidden = true;
        if (elements.errorText) elements.errorText.textContent = message;
        if (elements.error) elements.error.hidden = false;
    }

    function makeOption(question, value, text) {
        const label = document.createElement('label');
        label.className = 'diagnostic-option';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = `pregunta-${question.id}`;
        input.value = value;
        input.required = question.obligatoria !== false;

        const copy = document.createElement('span');
        copy.textContent = text;
        label.append(input, copy);
        return label;
    }

    function renderQuestion(question, index) {
        const questionCard = document.createElement('section');
        const headingId = `diagnostic-question-${question.id}`;
        questionCard.className = 'diagnostic-question';
        questionCard.dataset.questionId = question.id;
        questionCard.setAttribute('role', 'group');
        questionCard.setAttribute('aria-labelledby', headingId);

        const heading = document.createElement('h5');
        heading.id = headingId;
        heading.className = 'diagnostic-question-title';
        heading.textContent = `${index + 1}. ${question.enunciado}`;
        if (question.obligatoria !== false) {
            const required = document.createElement('span');
            required.className = 'diagnostic-required';
            required.textContent = ' *';
            required.setAttribute('aria-label', 'obligatoria');
            heading.append(required);
        }
        questionCard.append(heading);

        if (question.tipo === 'opcion-multiple') {
            const options = document.createElement('div');
            options.className = 'diagnostic-options';
            question.opciones.forEach(option => {
                options.append(makeOption(question, option.id, option.texto));
            });
            questionCard.append(options);
        } else if (question.tipo === 'verdadero-falso') {
            const options = document.createElement('div');
            options.className = 'diagnostic-options';
            options.append(
                makeOption(question, 'verdadero', 'Verdadero'),
                makeOption(question, 'falso', 'Falso')
            );
            questionCard.append(options);
        } else if (question.tipo === 'abierta') {
            const textarea = document.createElement('textarea');
            const limit = Number(question.limiteCaracteres) || 500;
            textarea.name = `pregunta-${question.id}`;
            textarea.maxLength = limit;
            textarea.required = question.obligatoria !== false;
            textarea.setAttribute('aria-label', `Respuesta a la pregunta ${index + 1}`);

            const counter = document.createElement('small');
            counter.className = 'diagnostic-character-count';
            counter.textContent = `0 / ${limit}`;
            textarea.addEventListener('input', () => {
                counter.textContent = `${textarea.value.length} / ${limit}`;
            });
            questionCard.append(textarea, counter);
        } else {
            throw new Error(`Tipo de pregunta no compatible: ${question.tipo}`);
        }

        return questionCard;
    }

    function answerFor(question) {
        if (!elements.form) return '';
        const control = elements.form.elements.namedItem(`pregunta-${question.id}`);
        if (!control) return '';
        return typeof control.value === 'string' ? control.value.trim() : '';
    }

    function updateProgress() {
        if (!exam || !elements.progressText || !elements.progressBar || !elements.progressPercent) return;
        const total = exam.preguntas.length;
        const answered = exam.preguntas.filter(question => answerFor(question)).length;
        const percent = total ? Math.round((answered / total) * 100) : 0;
        elements.progressText.textContent = `${answered} de ${total} reactivos respondidos`;
        elements.progressPercent.textContent = `${percent}%`;
        elements.progressBar.style.width = `${percent}%`;
    }

    function validateExam(data) {
        if (!data || !Array.isArray(data.preguntas)) {
            throw new Error('El archivo JSON no contiene un banco de preguntas válido.');
        }
        const ids = new Set();
        data.preguntas.forEach(question => {
            if (!question.id || ids.has(question.id) || !question.enunciado || !question.tipo) {
                throw new Error('Hay una pregunta incompleta o con un identificador repetido.');
            }
            ids.add(question.id);
            if (question.tipo === 'opcion-multiple' && (!Array.isArray(question.opciones) || question.opciones.length < 2)) {
                throw new Error(`La pregunta ${question.id} necesita al menos dos opciones.`);
            }
        });
        return data;
    }

    function scoreAnswers(answers) {
        let assessable = 0;
        let correct = 0;
        exam.preguntas.forEach(question => {
            if (!Object.hasOwn(question, 'respuestaCorrecta')) return;
            assessable += 1;
            if (answers[question.id] === question.respuestaCorrecta) correct += 1;
        });
        return { assessable, correct };
    }

    function resetExam() {
        if (!elements.form) return;
        elements.form.reset();
        prepareExam();
        if (elements.result) elements.result.hidden = true;
        if (elements.form) elements.form.hidden = false;
        if (elements.message) elements.message.textContent = '';
        updateProgress();
        const idField = document.getElementById('diagnostic-student-id');
        if (idField) idField.focus();
    }

    function submitExam(event) {
        event.preventDefault();
        if (elements.message) elements.message.textContent = '';

        if (!elements.form.checkValidity()) {
            elements.form.reportValidity();
            if (elements.message) {
                elements.message.textContent = 'Completa los datos y reactivos obligatorios antes de finalizar.';
            }
            return;
        }

        const answers = Object.fromEntries(
            exam.preguntas.map(question => [question.id, answerFor(question)])
        );
        const result = scoreAnswers(answers);
        const shouldShowScore = exam.configuracion?.mostrarResultado && result.assessable > 0;

        if (elements.resultSummary) {
            elements.resultSummary.textContent = shouldShowScore
                ? `Respuestas evaluables correctas: ${result.correct} de ${result.assessable} (${Math.round((result.correct / result.assessable) * 100)}%).`
                : 'Tus respuestas fueron procesadas correctamente en esta sesión.';
        }
        elements.form.hidden = true;
        if (elements.result) {
            elements.result.hidden = false;
            elements.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async function initialize() {
        try {
            const fileUrl = root.dataset.questionFile || 'assets/data/examen-diagnostico.json';
            const response = await fetch(fileUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Error HTTP ${response.status}`);
            examSource = validateExam(await response.json());

            if (examSource.preguntas.length === 0) {
                showError('El examen está preparado, pero el banco de reactivos todavía está vacío.');
                return;
            }

            prepareExam();
            if (elements.loading) elements.loading.hidden = true;
            if (elements.form) elements.form.hidden = false;
            updateProgress();
        } catch (error) {
            console.error('[examen-diagnostico]', error);
            const localHint = window.location.protocol === 'file:'
                ? ' Abre el proyecto mediante un servidor local para permitir la lectura del JSON.'
                : '';
            showError(`No fue posible cargar el banco de preguntas.${localHint}`);
        }
    }

    if (elements.form) {
        elements.form.addEventListener('input', updateProgress);
        elements.form.addEventListener('change', updateProgress);
        elements.form.addEventListener('submit', submitExam);
    }
    if (elements.restart) {
        elements.restart.addEventListener('click', resetExam);
    }
    initialize();
})();
