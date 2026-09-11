
        let time = 0, attempts = 0, errors = 0, completed = 0;
        let monsterHP = 20, maxHP = 20, maxErrors = 3;
        let gameOver = false, timerInterval;
        let selectedAnswers = {};
        let questions = [];

       async function initGame() {
  const container = document.getElementById('questionsContainer');
  try {
    const response = await fetch('preguntas_1.2.json');
    if (!response.ok) throw new Error(`No se pudo cargar preguntas_1.2.json (HTTP ${response.status})`);
    const allQuestionsRaw = await response.json();
    if (!Array.isArray(allQuestionsRaw) || allQuestionsRaw.length === 0) {
      throw new Error('El JSON no contiene un arreglo de preguntas.');
    }

    // Barajamos y tomamos 20 preguntas del banco
    shuffleArray(allQuestionsRaw);
    questions = allQuestionsRaw.slice(0, 20).map((q, idx) => {
      const questionText = q.pregunta ? q.question;
      const optionsOrig = q.opciones ? q.options;
      const answerOrig  = q.respuesta_correcta ? q.answer;
      if (!questionText || !Array.isArray(optionsOrig) || !answerOrig) {
        throw new Error(`Pregunta ${idx + 1} con formato inválido.`);
      }
      const optionsShuffled = shuffleArray([...optionsOrig]);
      const norm = s => String(s).trim();
      let correctIndex = optionsShuffled.findIndex(o => norm(o) === norm(answerOrig));
      if (correctIndex === -1) {
        throw new Error(`La respuesta no coincide con ninguna opción en: "${questionText.substring(0, 60)}..."`);
      }
      return { question: questionText, options: optionsShuffled, correct: correctIndex };
    });

    container.innerHTML = '';
    questions.forEach((q, index) => {
      const div = document.createElement('div');
      div.className = 'question';
      div.innerHTML = `
        <div class="question-number">Desafío ${index + 1}</div>
        <div class="question-text">${q.question}</div>
        <div class="options">
          ${q.options.map((option, optIndex) => `
            <div class="option" onclick="selectOption(${index}, ${optIndex})" id="q${index}opt${optIndex}">
              <div class="option-letter">${String.fromCharCode(97 + optIndex)})</div>
              <div class="option-text">${option}</div>
            </div>
          `).join('')}
        </div>
      `;
      container.appendChild(div);
    });

    time = attempts = errors = completed = 0;
    monsterHP = maxHP;
    selectedAnswers = {};
    updateUI();
    clearInterval(timerInterval);
    startTimer();

  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="question">️ <strong>Error al cargar preguntas:</strong><br>${err.message}</div>`;
  }
}

        function shuffleArray(array){ for (let i = array.length - 1; i > 0; i--){ const j = Math.floor(Math.random() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; } return array; }
        function startTimer(){ timerInterval = setInterval(() => { time++; document.getElementById('timerValue').textContent = `${time}s`; }, 1000); }
        function selectOption(qIndex, oIndex){
            for (let i=0; i<questions[qIndex].options.length; i++) document.getElementById(`q${qIndex}opt${i}`).classList.remove('selected');
            document.getElementById(`q${qIndex}opt${oIndex}`).classList.add('selected');
            selectedAnswers[qIndex] = oIndex;
            updateProgress();
        }
        function updateProgress(){ completed = Object.keys(selectedAnswers).length; document.getElementById('progressFill').style.width = `${(completed / questions.length) * 100}%`; }
        function updateUI(){
            document.getElementById('healthBar').style.width = `${(monsterHP / maxHP) * 100}%`;
            document.getElementById('healthText').textContent = `${monsterHP} / ${maxHP} HP`;
            document.getElementById('attemptsValue').textContent = attempts;
            document.getElementById('errorsValue').textContent = `${errors} / ${maxErrors}`;
            const dots = document.querySelectorAll('.error-dot'); dots.forEach((d, i) => d.classList.toggle('filled', i < errors));
        }
        function attack(){
            if (gameOver) return;
            attempts++;
            let correct = true;
            Object.entries(selectedAnswers).forEach(([qIdx, ansIdx]) => {
                const q = questions[qIdx];
                const options = document.querySelectorAll(`#q${qIdx}opt${ansIdx}`);
                if (ansIdx == q.correct) options[0].classList.add('correct');
                else { options[0].classList.add('incorrect'); errors++; correct = false; }
            });
            if (correct) monsterHP--; else errors++;
            updateUI();
            if (monsterHP <= 0){ endGame('victory'); }
            else if (errors >= maxErrors){ endGame('defeat'); }
        }
        function resetStateValues(){ time = attempts = errors = completed = 0; monsterHP = maxHP; selectedAnswers = {}; }
        function resetBattle(){ resetStateValues(); updateUI(); document.getElementById('questionsContainer').innerHTML = ''; initGame(); document.getElementById('gameStatus').style.display = 'none'; }
        function endGame(status){
            gameOver = true; clearInterval(timerInterval);
            const statusDiv = document.getElementById('gameStatus'); statusDiv.style.display = 'block';
            if (status === 'victory') statusDiv.className = 'game-status victory', statusDiv.textContent = '¡Victoria! Has derrotado al Señor del Caos.';
            else if (status === 'defeat') statusDiv.className = 'game-status defeat', statusDiv.textContent = '¡Derrota! Intenta de nuevo.';
        }
        function showSolutions(){
            const container = document.getElementById('questionsContainer');
            questions.forEach((q, qIndex) => {
                q.options.forEach((opt, optIndex) => {
                    const optDiv = document.getElementById(`q${qIndex}opt${optIndex}`);
                    if (optIndex === q.correct) optDiv.classList.add('correct');
                });
            });
        }
        document.addEventListener('DOMContentLoaded', initGame);
    


