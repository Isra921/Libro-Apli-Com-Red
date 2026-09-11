
        // ====== Variables del juego (mismas que 1.1) ======
        let time=0, attempts=0, errors=0;
        let monsterHP=20; const maxHP=20; const maxErrors=3;
        let gameOver=false, timerInterval, sidebarOpen=false;
        let selectedAnswers={}, completed=0, questions=[];

        // ====== Carga desde JSON (ES/EN compatible) ======
        async function initGame() {
  const container = document.getElementById('questionsContainer');
  try {
    const response = await fetch('preguntas_1.3.json');
    if (!response.ok) throw new Error(`No se pudo cargar preguntas_1.3.json (HTTP ${response.status})`);
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

        function shuffleArray(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

        // ====== HUD / Juego ======
        function startTimer(){timerInterval=setInterval(()=>{time++;document.getElementById('timerValue').textContent=`${time}s`},1000)}
        function updateProgress(){completed=Object.keys(selectedAnswers).length;document.getElementById('progressFill').style.width=`${(completed/questions.length)*100}%`}
        function updateMonsterAvatar(){
        const avatar=document.getElementById('monsterAvatar');
        const hpPct=(monsterHP/maxHP)*100;
        if(hpPct>70) avatar.textContent='️️';
        else if(hpPct>40) avatar.textContent='';
        else if(hpPct>0) avatar.textContent='';
        else avatar.textContent='';
        }
        function updateUI(){
        document.getElementById('healthBar').style.width=`${(monsterHP/maxHP)*100}%`;
        document.getElementById('healthText').textContent=`${monsterHP} / ${maxHP} HP`;
        document.getElementById('attemptsValue').textContent=attempts;
        document.getElementById('errorsValue').textContent=`${errors} / ${maxErrors}`;
        const dots=document.querySelectorAll('.error-dot'); dots.forEach((d,i)=>d.classList.toggle('filled',i<errors));
        updateMonsterAvatar();
        }
        function selectOption(qIndex,oIndex){
        for(let i=0;i<questions[qIndex].options.length;i++){document.getElementById(`q${qIndex}opt${i}`).classList.remove('selected')}
        document.getElementById(`q${qIndex}opt${oIndex}`).classList.add('selected');
        selectedAnswers[qIndex]=oIndex; updateProgress();
        }
        function attack(){
        if(gameOver) return;
        if(completed<questions.length) return showGameStatus("️ ¡Responde todas las preguntas antes de atacar!","continue");
        attempts++; let correct=0;
        questions.forEach((q,i)=>{
            const user=selectedAnswers[i]; const ans=q.correct;
            for(let j=0;j<q.options.length;j++){
            const el=document.getElementById(`q${i}opt${j}`);
            el.classList.remove('selected','correct','incorrect');
            if(j===ans) el.classList.add('correct'); else if(j===user) el.classList.add('incorrect');
            }
            if(user===ans) correct++;
        });
        monsterHP=Math.max(0,monsterHP-correct);
        errors=Math.min(maxErrors,questions.length-correct);
        updateUI(); checkGameEnd();
        }
        function checkGameEnd(){
        const btn=document.getElementById('attackBtn');
        if(monsterHP<=0){
            gameOver=true; clearInterval(timerInterval);
            showGameStatus(`<i class="fas fa-trophy"></i> ¡VICTORIA! Tiempo: ${time}s`,'victory');
            btn.disabled=true; document.body.style.animation='victoryGlow 2s infinite';
            document.getElementById('monsterAvatar').textContent='';
        }else if(errors>=maxErrors){
            gameOver=true; clearInterval(timerInterval);
            showGameStatus(`<i class="fas fa-skull"></i> ¡DERROTA! Demasiados errores`,'defeat');
            btn.disabled=true; document.body.style.animation='defeatPulse 1s infinite';
        }
        }
        function resetBattle(){
        time=attempts=errors=completed=0; monsterHP=maxHP; gameOver=false; selectedAnswers={};
        document.getElementById('timerValue').textContent='0s';
        document.getElementById('attemptsValue').textContent='0';
        document.getElementById('errorsValue').textContent=`0 / ${maxErrors}`;
        document.getElementById('gameStatus').style.display='none';
        document.getElementById('attackBtn').disabled=false;
        document.getElementById('progressFill').style.width='0%';
        document.body.style.animation='none';
        questions.forEach((q,i)=>{q.options.forEach((_,j)=>{const el=document.getElementById(`q${i}opt${j}`); if(el) el.classList.remove('selected','correct','incorrect');})});
        updateUI(); clearInterval(timerInterval); startTimer();
        }
        function showGameStatus(msg,type){
        const div=document.getElementById('gameStatus'); div.innerHTML=msg; div.className=`game-status ${type}`; div.style.display='block';
        if(type==='continue') setTimeout(()=>div.style.display='none',4000);
        }
        function showSolutions(){
        const answers=questions.map((q,i)=>`${i+1}. ${q.options[q.correct]}`).join('\n');
        alert(` Respuestas Correctas:\n\n${answers}`);
        }

        // ====== Utilidades de layout (igual que 1.1) ======
        const menuToggle=document.getElementById('menuToggle');
        const sidebarNav=document.getElementById('sidebarNav');
        const sidebarOverlay=document.getElementById('sidebarOverlay');
        const scrollToTopBtn=document.getElementById('scrollToTop');
        const floatingHomeBtn=document.querySelector('.floating-home-btn');

        function toggleSidebar(){
        sidebarOpen=!sidebarOpen;
        if(sidebarOpen){sidebarNav.classList.add('active');sidebarOverlay.classList.add('active');menuToggle.classList.add('active');menuToggle.innerHTML='<i class="fas fa-times"></i>';document.body.style.overflow='hidden'}
        else{sidebarNav.classList.remove('active');sidebarOverlay.classList.remove('active');menuToggle.classList.remove('active');menuToggle.innerHTML='<i class="fas fa-bars"></i>';document.body.style.overflow='auto'}
        updateContainerSpacing();
        }
        menuToggle.addEventListener('click',toggleSidebar);
        sidebarOverlay.addEventListener('click',toggleSidebar);

        function updateContainerSpacing(){
        const container=document.querySelector('.container');
        if(window.innerWidth<=768){container.style.margin='0 20px'}
        else{container.style.margin=sidebarOpen?'0 90px 0 370px':'0 90px'}
        }
        function updateReadingProgress(){
        const scroll=document.documentElement.scrollTop;
        const height=document.documentElement.scrollHeight-document.documentElement.clientHeight;
        const percent=Math.min((scroll/height)*100,100);
        document.getElementById('readingProgressBar').style.width=`${percent}%`;
        }
        function toggleFloatingButtons(){
        const y=window.pageYOffset, h=window.innerHeight, dh=document.documentElement.scrollHeight;
        if(y>300) scrollToTopBtn.classList.add('visible'); else scrollToTopBtn.classList.remove('visible');
        const nearBottom=y+h>=dh-100; if(nearBottom) floatingHomeBtn.classList.add('hidden'); else floatingHomeBtn.classList.remove('hidden');
        }
        scrollToTopBtn.addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
        window.addEventListener('scroll',()=>{updateReadingProgress();toggleFloatingButtons()});
        window.addEventListener('resize',()=>{if(window.innerWidth>768 && sidebarOpen) toggleSidebar(); updateContainerSpacing()});
        document.addEventListener('keydown',e=>{
        if(e.key==='Escape' && sidebarOpen) toggleSidebar();
        if((e.key==='Enter'||e.key==='NumpadEnter') && !gameOver) attack();
        });

        // Init
        document.addEventListener('DOMContentLoaded',()=>{
        initGame(); updateContainerSpacing(); updateReadingProgress();
        if(window.innerWidth<=768){sidebarNav.classList.remove('active')}
        });
    


