
// ============ BANCO DE 20 PREGUNTAS (4 tipos mezclados) ============
const questions = [
  { type:"mc", text:"Qu es un algoritmo?", options:["Un conjunto finito y ordenado de instrucciones para resolver un problema","Un lenguaje de programacin especfico","Un tipo de estructura de datos no lineal","Un dispositivo de hardware para procesar datos"], correct:0 },
  { type:"mc", text:"Cul de las siguientes NO es una caracterstica esperada de un algoritmo?", options:["Exactitud","Limitacin (finitud)","Determinstico","Aleatoriedad obligatoria"], correct:3 },
  { type:"tf", text:"Un algoritmo determinstico da resultados distintos cada vez que se ejecuta con los mismos datos de entrada.", correct:false },
  { type:"mc", text:"Un algoritmo que ubica un dato concreto dentro de un conjunto grande de informacin se llama:", options:["Algoritmo de bsqueda","Algoritmo de organizaci?n de informaci?n","Algoritmo voraz","Algoritmo probabilstico"], correct:0 },
  { type:"fill", text:"Un algoritmo debe ser ______, lo que significa que con los mismos datos de entrada siempre produce los mismos resultados.", options:["determinstico","probabilstico","voraz","indefinido"], correct:0 },
  { type:"mc", text:"Un algoritmo voraz (greedy) se caracteriza por:", options:["Tomar la mejor decisin disponible en el momento presente, sin ver el futuro","Usar siempre nmeros aleatorios para decidir","Revisar todas las combinaciones posibles antes de decidir","Nunca terminar su ejecucin"], correct:0 },
  { type:"mc", text:"Un algoritmo probabilstico se diferencia de uno determinista en que:", options:["Puede tomar decisiones distintas en cada ejecucin mediante un generador de nmeros aleatorios","Siempre da el mismo resultado con la misma entrada","No requiere datos de entrada","Solo se usa para ordenar listas"], correct:0 },
  { type:"tf", text:"El pseudocdigo se usa comnmente en la fase de diseo de software, antes de codificar en un lenguaje de programacin.", correct:true },
  { type:"mc", text:"Qu es el pseudocdigo?", options:["Un recurso para representar de manera abstracta y simplificada los pasos de un algoritmo","Un lenguaje de programacin compilado","Un tipo de estructura de datos lineal","Un mtodo de organizaci?n de informaci?n de listas"], correct:0 },
  { type:"order", text:"Ordena las palabras para formar la oracin correcta:", words:["La","abstraccin","simplifica","la","representacin","de","un","problema."], correct:["La","abstraccin","simplifica","la","representacin","de","un","problema."] },
  { type:"mc", text:"La abstraccin en informtica consiste en:", options:["Simplificar la representacin de un problema considerando solo los aspectos ms relevantes","Agregar todos los detalles posibles a un problema","Eliminar por completo la lgica de un programa","Convertir un algoritmo en pseudocdigo"], correct:0 },
  { type:"mc", text:"Un Tipo de Dato Abstracto (TDA) se define como:", options:["Un conjunto de datos junto con las operaciones que pueden realizarse sobre ellos, sin mostrar su implementacin interna","Un algoritmo de organizaci?n de informaci?n","Una variable de tipo entero","Un mtodo para medir la organizaci?n de un algoritmo"], correct:0 },
  { type:"fill", text:"La ______ permite separar el comportamiento de los datos de su implementacin especfica.", options:["abstraccin","organizaci?n","iteracin","recursividad"], correct:0 },
  { type:"order", text:"Ordena las palabras para formar la oracin correcta:", words:["Un","Tipo","de","Dato","Abstracto","oculta","su","implementacin","interna."], correct:["Un","Tipo","de","Dato","Abstracto","oculta","su","implementacin","interna."] },
  { type:"mc", text:"En un tipo de dato abstracto lineal, cada elemento tiene:", options:["Un nico predecesor y un nico sucesor (excepto el primero y el ltimo)","Mltiples predecesores y sucesores formando una red","Ninguna relacin con los dems elementos","Solo un sucesor pero varios predecesores"], correct:0 },
  { type:"tf", text:"Los contenidos de bsqueda se encargan de reorganizar los elementos de una lista en orden ascendente o descendente.", correct:false },
  { type:"mc", text:"Qu mide el orden de organizaci?n O() de un algoritmo?", options:["La eficiencia del algoritmo, estimando cmo crecen las operaciones al aumentar los datos","La cantidad exacta de lneas de cdigo del programa","El lenguaje de programacin utilizado","El nmero de variables declaradas"], correct:0 },
  { type:"mc", text:"Cmo se le conoce comnmente a la notacin O() usada para medir la eficiencia de un algoritmo?", options:["Notacin Big O","Notacin TDA","Notacin pseudocdigo","Notacin de abstraccin"], correct:0 },
  { type:"tf", text:"La notacin Big-O permite estimar cmo crece el nmero de operaciones de un algoritmo conforme aumenta la cantidad de datos.", correct:true },
  { type:"mc", text:"Segn Weiss (2014), el anlisis de contenidos (algoritmia) permite:", options:["Determinar la eficiencia de un algoritmo y elegir la mejor solucin segn tiempo y memoria","Eliminar la necesidad de recursos digitales","Sustituir el pseudocdigo por diagramas de flujo","Evitar el uso de la notacin Big-O"], correct:0 }
];

let userAnswers = {};
let orderState = {};
let timeLeftSeconds = 10 * 60;
let timerInterval = null;
let evaluated = false;

function shuffle(arr){ const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }

function startQuiz(){
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('timerBar').style.display = 'flex';
    document.getElementById('actionButtons').style.display = 'flex';
    document.getElementById('quizArea').style.display = 'block';
    renderQuestions();
    startTimer();
}

function renderQuestions(){
    const area = document.getElementById('quizArea');
    area.innerHTML = '';
    const typeLabel = { mc:"Opcin mltiple", fill:"Completar oracin", tf:"Verdadero o falso", order:"Ordenar oracin" };

    questions.forEach((q, i) => {
        const div = document.createElement('div');
        div.className = 'question';
        let inner = `<div class="question-header"><span class="question-number">Pregunta ${i+1}</span><span class="question-type">${typeLabel[q.type]}</span></div>`;
        inner += `<div class="question-text">${q.text}</div>`;

        if (q.type === 'mc' || q.type === 'fill') {
            inner += `<div class="options" id="opts-${i}">`;
            q.options.forEach((opt, j) => {
                inner += `<div class="option" id="q${i}opt${j}" onclick="selectOption(${i}, ${j})">
                    <div class="option-letter">${String.fromCharCode(97+j)})</div><div>${opt}</div>
                </div>`;
            });
            inner += `</div>`;
        } else if (q.type === 'tf') {
            inner += `<div class="tf-options" id="opts-${i}">
                <div class="tf-btn" id="q${i}optV" onclick="selectTF(${i}, true)"><i class="fas fa-check"></i> Verdadero</div>
                <div class="tf-btn" id="q${i}optF" onclick="selectTF(${i}, false)"><i class="fas fa-times"></i> Falso</div>
            </div>`;
        } else if (q.type === 'order') {
            const shuffled = shuffle(q.words);
            orderState[i] = { bank: shuffled, answer: [] };
            inner += `<div class="order-answer" id="order-answer-${i}"></div>
                       <div class="order-hint">Da clic en las palabras en el orden correcto. Puedes hacer clic en una palabra ya usada para quitarla.</div>
                       <div class="order-bank" id="order-bank-${i}"></div>`;
        }

        div.innerHTML = inner;
        area.appendChild(div);

        if (q.type === 'order') renderOrderWidget(i);
    });
}

function selectOption(qIndex, optIndex){
    if (evaluated) return;
    const q = questions[qIndex];
    for (let j=0; j<q.options.length; j++) {
        const el = document.getElementById(`q${qIndex}opt${j}`);
        if (el) el.classList.remove('selected');
    }
    const target = document.getElementById(`q${qIndex}opt${optIndex}`);
    if (target) target.classList.add('selected');
    userAnswers[qIndex] = optIndex;
}

function selectTF(qIndex, value){
    if (evaluated) return;
    const vEl = document.getElementById(`q${qIndex}optV`);
    const fEl = document.getElementById(`q${qIndex}optF`);
    if (vEl) vEl.classList.remove('selected');
    if (fEl) fEl.classList.remove('selected');
    
    const target = value ? vEl : fEl;
    if (target) target.classList.add('selected');
    userAnswers[qIndex] = value;
}

function renderOrderWidget(qIndex){
    const state = orderState[qIndex];
    const bankEl = document.getElementById(`order-bank-${qIndex}`);
    const answerEl = document.getElementById(`order-answer-${qIndex}`);
    if (!bankEl || !answerEl) return;
    
    bankEl.innerHTML = '';
    answerEl.innerHTML = '';

    state.bank.forEach((word, idx) => {
        const chip = document.createElement('div');
        chip.className = 'word-chip' + (state.answer.includes(idx) ? ' used' : '');
        chip.textContent = word;
        chip.onclick = () => {
            if (evaluated || state.answer.includes(idx)) return;
            state.answer.push(idx);
            userAnswers[qIndex] = state.answer.map(i2 => state.bank[i2]);
            renderOrderWidget(qIndex);
        };
        bankEl.appendChild(chip);
    });

    state.answer.forEach((idx, pos) => {
        const chip = document.createElement('div');
        chip.className = 'word-chip';
        chip.textContent = state.bank[idx];
        chip.onclick = () => {
            if (evaluated) return;
            state.answer.splice(pos, 1);
            if (state.answer.length === 0) {
                delete userAnswers[qIndex];
            } else {
                userAnswers[qIndex] = state.answer.map(i2 => state.bank[i2]);
            }
            renderOrderWidget(qIndex);
        };
        answerEl.appendChild(chip);
    });
}

function startTimer(){
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeftSeconds--;
        updateTimerDisplay();
        if (timeLeftSeconds <= 0){
            clearInterval(timerInterval);
            procesarEvaluacion(true);
        }
    }, 1000);
}

function updateTimerDisplay(){
    const m = Math.floor(timeLeftSeconds/60).toString().padStart(2,'0');
    const s = (timeLeftSeconds%60).toString().padStart(2,'0');
    const display = document.getElementById('timeLeft');
    if (display) display.textContent = `${m}:${s}`;
    
    const bar = document.getElementById('timerBar');
    if (bar) {
        bar.classList.toggle('warning', timeLeftSeconds <= 120 && timeLeftSeconds > 60);
        bar.classList.toggle('danger', timeLeftSeconds <= 60);
    }
}

function tryEvaluate(){
    let answeredCount = 0;
    questions.forEach((q, i) => {
        if (userAnswers[i] !== undefined) answeredCount++;
    });

    if (answeredCount < questions.length) {
        document.getElementById('confirmModal').classList.add('show');
    } else {
        procesarEvaluacion(false);
    }
}

function closeModal(){ 
    document.getElementById('confirmModal').classList.remove('show'); 
}

function procesarEvaluacion(fromModal){
    closeModal();
    if (evaluated) return;
    evaluated = true;
    clearInterval(timerInterval);

    let correctCount = 0;
    questions.forEach((q, i) => {
        const user = userAnswers[i];
        let isCorrect = false;

        if (q.type === 'mc' || q.type === 'fill') {
            q.options.forEach((opt, j) => {
                const el = document.getElementById(`q${i}opt${j}`);
                if (el) {
                    el.classList.remove('selected');
                    if (j === q.correct) el.classList.add('correct');
                    else if (j === user) el.classList.add('incorrect');
                }
            });
            isCorrect = (user === q.correct);
        } else if (q.type === 'tf') {
            const vEl = document.getElementById(`q${i}optV`);
            const fEl = document.getElementById(`q${i}optF`);
            if (vEl) vEl.classList.remove('selected'); 
            if (fEl) fEl.classList.remove('selected');
            
            if (q.correct === true && vEl) vEl.classList.add('correct'); 
            if (q.correct === false && fEl) fEl.classList.add('correct');
            
            if (user === true && q.correct !== true && vEl) vEl.classList.add('incorrect');
            if (user === false && q.correct !== false && fEl) fEl.classList.add('incorrect');
            isCorrect = (user === q.correct);
        } else if (q.type === 'order') {
            const userArr = Array.isArray(user) ? user : [];
            isCorrect = JSON.stringify(userArr) === JSON.stringify(q.correct);
            const answerEl = document.getElementById(`order-answer-${i}`);
            if (answerEl) answerEl.style.borderColor = isCorrect ? 'var(--success)' : 'var(--accent)';
        }

        if (isCorrect) correctCount++;
    });

    const scorePct = Math.round((correctCount / questions.length) * 100);
    const banner = document.getElementById('resultBanner');
    if (banner) {
        banner.classList.add('show');
        if (scorePct >= 70) {
            banner.classList.add('pass');
            banner.innerHTML = `<i class="fas fa-trophy"></i> Aprobado! ${correctCount}/${questions.length} correctas (${scorePct}%)`;
        } else {
            banner.classList.add('fail');
            banner.innerHTML = `<i class="fas fa-redo"></i> ${correctCount}/${questions.length} correctas (${scorePct}%). Te recomendamos repasar el tema e intentar de nuevo.`;
        }
        banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        document.getElementById('btnDescargarPDF').style.display = 'inline-flex';
    }
    
    const scoreDisplay = document.getElementById('lastScore');
    if (scoreDisplay) scoreDisplay.textContent = `${scorePct}%`;
}

function resetQuiz(){
    userAnswers = {};
    orderState = {};
    timeLeftSeconds = 10 * 60;
    evaluated = false;
    clearInterval(timerInterval);
    
    const banner = document.getElementById('resultBanner');
    if (banner) {
        banner.classList.remove('show','pass','fail');
        banner.innerHTML = '';
    }
    
    document.getElementById('startScreen').style.display = 'block';
    document.getElementById('timerBar').style.display = 'none';
    document.getElementById('actionButtons').style.display = 'none';
    document.getElementById('quizArea').style.display = 'none';
    document.getElementById('quizArea').innerHTML = '';
    document.getElementById('btnDescargarPDF').style.display = 'none';
}



    function generarPDFActividad() {
        const elemento = document.querySelector('.container'); 
        const botonesNav = document.querySelector('.nav-buttons');
        const botonDescarga = document.getElementById('btnDescargarPDF');
        
        botonesNav.style.display = 'none';
        botonDescarga.style.display = 'none';

        // Forzar estilos temporales para impresin limpia en PDF (fondo blanco, texto oscuro)
        const originalBg = elemento.style.background;
        const originalColor = elemento.style.color;
        elemento.style.background = 'var(--surface)';
        elemento.style.color = 'var(--primary)';

        // Ajustar textos oscuros internos temporalmente para que se lean bien
        const textos = elemento.querySelectorAll('.question-text, h1, .subtitle, .meta-card .value, .meta-card .label');
        textos.forEach(el => el.style.color = 'var(--primary)');

        const opciones = {
            margin:       [10, 10, 10, 10],
            filename:     'Evaluacion_Actividad_1_1.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opciones).from(elemento).save().then(() => {
            // Restaurar estilos originales en la vista web
            elemento.style.background = originalBg;
            elemento.style.color = originalColor;
            textos.forEach(el => el.style.color = '');

            botonesNav.style.display = 'flex';
            botonDescarga.style.display = 'inline-flex';
        });
    }



