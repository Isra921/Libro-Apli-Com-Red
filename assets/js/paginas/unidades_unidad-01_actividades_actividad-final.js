/* ==========================================================================
   ACTIVIDAD FINAL · UNIDAD 1
   Simulador de sockets TCP/UDP, misiones, retos calificados y constancia PDF.
   Plantilla base: las demás unidades pueden reutilizar esta estructura
   cambiando los escenarios, las misiones y los retos.
   ========================================================================== */
(() => {
    'use strict';

    /* ----------------------------------------------------------------------
       CONFIGURACIÓN
       ---------------------------------------------------------------------- */
    const STORAGE_KEY = 'polilibro-red:u1-actividad-final:v1';
    const JSPDF_URL = 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js';

    const SERVER_IP = '10.0.0.1';
    const CLIENT_IP = '192.168.1.50';

    const PUNTOS_MISION = 10; // 4 misiones × 10 = 40
    const PUNTOS_RETO = 15;   // 4 retos × 15 = 60

    const MISIONES = {
        handshake: 'Conexión TCP completa',
        udp: 'Datagrama sin conexión',
        refused: 'Conexión rechazada (ECONNREFUSED)',
        fault: 'Falla en el camino (firewall o pérdida)'
    };

    const SERVICIOS = {
        80:   { nombre: 'HTTP',  peticion: 'GET / HTTP/1.1',         respuesta: 'HTTP/1.1 200 OK (1.2 KB)' },
        443:  { nombre: 'HTTPS', peticion: 'TLS ClientHello',        respuesta: 'TLS ServerHello + certificado' },
        8080: { nombre: 'API',   peticion: '{"cmd":"ping"}',         respuesta: '{"status":"pong"}' },
        22:   { nombre: 'SSH',   peticion: 'SSH-2.0-Cliente_ESCOM',  respuesta: 'SSH-2.0-OpenSSH_9.6' },
        53:   { nombre: 'DNS',   peticion: 'Consulta A escom.ipn.mx', respuesta: 'Respuesta A 148.204.x.x' }
    };

    const ESTADOS_SERVIDOR = {
        normal:   { badge: 'LISTEN',          clase: 'node-badge-ok',     icono: 'fa-headphones',    canal: 'Enlace IP estable' },
        closed:   { badge: 'Puerto cerrado',  clase: 'node-badge-error',  icono: 'fa-door-closed',   canal: 'Enlace IP estable' },
        firewall: { badge: 'Firewall DROP',   clase: 'node-badge-warn',   icono: 'fa-shield-halved', canal: 'Firewall en el camino' },
        loss:     { badge: 'Enlace inestable', clase: 'node-badge-warn',  icono: 'fa-wave-square',   canal: 'Enlace con pérdida' }
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ----------------------------------------------------------------------
       UTILIDADES
       ---------------------------------------------------------------------- */
    const $ = (id) => document.getElementById(id);
    const sleep = (ms) => new Promise((r) => setTimeout(r, reduceMotion ? Math.min(ms, 120) : ms));

    /* ----------------------------------------------------------------------
       ESTADO PERSISTENTE
       ---------------------------------------------------------------------- */
    function estadoInicial() {
        return { missions: {}, retos: {}, nombre: '', inicio: null };
    }

    let estado = cargarEstado();

    function cargarEstado() {
        try {
            const crudo = localStorage.getItem(STORAGE_KEY);
            if (!crudo) return estadoInicial();
            const datos = JSON.parse(crudo);
            return { ...estadoInicial(), ...datos };
        } catch {
            return estadoInicial();
        }
    }

    function guardarEstado() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
        } catch {
            /* almacenamiento no disponible (modo privado): se continúa sin guardar */
        }
    }

    function calcularPuntaje() {
        const misiones = Object.keys(MISIONES).filter((m) => estado.missions[m]).length;
        const retosRespondidos = Object.keys(estado.retos).length;
        const aciertos = Object.values(estado.retos).filter((r) => r.correcta).length;
        const pMisiones = misiones * PUNTOS_MISION;
        const pRetos = aciertos * PUNTOS_RETO;
        return {
            misiones,
            retosRespondidos,
            aciertos,
            pMisiones,
            pRetos,
            total: pMisiones + pRetos,
            totalRetos: document.querySelectorAll('.challenge-item[data-reto]').length,
            terminado: retosRespondidos >= document.querySelectorAll('.challenge-item[data-reto]').length
        };
    }

    /* ----------------------------------------------------------------------
       TERMINAL
       ---------------------------------------------------------------------- */
    function log(texto, tipo = '') {
        const body = $('netConsoleBody');
        if (!body) return;
        const linea = document.createElement('div');
        linea.className = 'console-line';

        const hora = document.createElement('span');
        hora.className = 'log-time';
        hora.textContent = new Date().toLocaleTimeString('es-MX', { hour12: false });

        const msg = document.createElement('span');
        if (tipo) msg.className = `log-${tipo}`;
        msg.textContent = texto;

        linea.append(hora, ' ', msg);
        body.appendChild(linea);
        body.scrollTop = body.scrollHeight;
    }

    function limpiarConsola() {
        const body = $('netConsoleBody');
        if (body) body.textContent = '';
        log('Terminal lista. Elige protocolo, puerto y estado del servidor y pulsa "Transmitir".', 'info');
    }

    /* ----------------------------------------------------------------------
       ANIMACIÓN DEL PAQUETE
       Funciona en horizontal (escritorio) y vertical (móvil) según la forma
       del canal, calculada en tiempo real.
       ---------------------------------------------------------------------- */
    function geometriaCanal() {
        const linea = $('channelLine');
        const paquete = $('netPacketAnim');
        const tw = linea.clientWidth;
        const th = linea.clientHeight;
        const pw = paquete.offsetWidth;
        const ph = paquete.offsetHeight;
        const horizontal = tw >= th;
        if (horizontal) {
            const y = (th - ph) / 2;
            return { inicio: `translate(0px, ${y}px)`, fin: `translate(${tw - pw}px, ${y}px)`, medio: `translate(${(tw - pw) * 0.62}px, ${y}px)` };
        }
        const x = (tw - pw) / 2;
        return { inicio: `translate(${x}px, 0px)`, fin: `translate(${x}px, ${th - ph}px)`, medio: `translate(${x}px, ${(th - ph) * 0.62}px)` };
    }

    /**
     * Mueve el paquete por el canal.
     * @param {'right'|'left'} direccion  right = cliente → servidor
     * @param {string} etiqueta           texto dentro del paquete (SYN, ACK...)
     * @param {string} tipo               clase visual: syn | ack | data | rst | icmp | fin
     * @param {boolean} perdido           si es true, el paquete se pierde a mitad del camino
     */
    async function animarPaquete(direccion, etiqueta, tipo, perdido = false) {
        const paquete = $('netPacketAnim');
        if (!paquete) return;

        paquete.textContent = etiqueta;
        paquete.className = `channel-packet is-visible pkt-${tipo}`;

        const g = geometriaCanal();
        const desde = direccion === 'right' ? g.inicio : g.fin;
        const hasta = perdido ? g.medio : (direccion === 'right' ? g.fin : g.inicio);
        const duracion = reduceMotion ? 80 : 850;

        try {
            await paquete.animate(
                [{ transform: desde, opacity: 0.2 }, { transform: desde, opacity: 1, offset: 0.12 }, { transform: hasta, opacity: 1 }],
                { duration: duracion, easing: 'ease-in-out', fill: 'forwards' }
            ).finished;

            if (perdido) {
                paquete.classList.add('is-lost');
                paquete.textContent = '✕';
                await paquete.animate(
                    [{ transform: `${hasta} scale(1)`, opacity: 1 }, { transform: `${hasta} scale(1.6)`, opacity: 0 }],
                    { duration: reduceMotion ? 80 : 650, easing: 'ease-out', fill: 'forwards' }
                ).finished;
            }
        } catch {
            /* animación cancelada */
        }
        await sleep(120);
        paquete.getAnimations().forEach((a) => a.cancel());
        paquete.className = 'channel-packet';
    }

    /* ----------------------------------------------------------------------
       ESCENARIOS
       Cada escenario es una lista de pasos. Un paso puede:
       - escribir en la terminal (log)
       - mover un paquete (pkt)
       - esperar (wait)
       Al final devuelve el resultado y la misión que se desbloquea.
       ---------------------------------------------------------------------- */
    function construirEscenario(protocolo, puerto, estadoSrv) {
        const s = SERVICIOS[puerto];
        const destino = `${SERVER_IP}:${puerto}`;
        const pasos = [];
        const L = (texto, tipo) => pasos.push({ log: texto, tipo });
        const P = (dir, etiqueta, tipo, perdido = false) => pasos.push({ pkt: [dir, etiqueta, tipo, perdido] });
        const W = (ms) => pasos.push({ wait: ms });

        let resultado = { texto: 'OK', estado: 'ok', mision: null };

        if (protocolo === 'TCP') {
            L('sock = socket(AF_INET, SOCK_STREAM, 0)', 'info');
            L(`connect(sock, ${destino})  →  inicia el three-way handshake`, 'info');

            if (estadoSrv === 'closed') {
                P('right', 'SYN', 'syn');
                L(`${CLIENT_IP} → ${destino}  [SYN] Seq=0`);
                P('left', 'RST', 'rst');
                L(`${destino} → ${CLIENT_IP}  [RST, ACK] Seq=0 Ack=1`, 'error');
                L('El host está activo, pero ningún proceso escucha en ese puerto.', 'warning');
                L('connect() falló: ECONNREFUSED (Connection refused)', 'error');
                resultado = { texto: 'ECONNREFUSED', estado: 'error', mision: 'refused' };
            } else if (estadoSrv === 'firewall') {
                const esperas = [1, 2, 4];
                for (let i = 0; i < esperas.length; i++) {
                    P('right', 'SYN', 'syn', true);
                    L(`${CLIENT_IP} → ${destino}  [SYN] ${i === 0 ? 'intento inicial' : `retransmisión #${i}`}`);
                    L(`Sin respuesta. El firewall descartó el segmento. Esperando ${esperas[i]} s (RTO)...`, 'warning');
                    W(350);
                }
                L('connect() falló: ETIMEDOUT (Connection timed out)', 'error');
                L('Diagnóstico: el silencio total indica un filtro (DROP), no un puerto cerrado.', 'info');
                resultado = { texto: 'ETIMEDOUT', estado: 'error', mision: 'fault' };
            } else {
                P('right', 'SYN', 'syn');
                L(`${CLIENT_IP} → ${destino}  [SYN] Seq=0`);
                P('left', 'SYN-ACK', 'ack');
                L(`${destino} → ${CLIENT_IP}  [SYN, ACK] Seq=0 Ack=1`, 'success');
                P('right', 'ACK', 'ack');
                L(`${CLIENT_IP} → ${destino}  [ACK] Ack=1  ·  estado: ESTABLISHED`, 'success');

                L(`send(sock, "${s.peticion}")`, 'info');
                if (estadoSrv === 'loss') {
                    P('right', 'DATA', 'data', true);
                    L(`${CLIENT_IP} → ${destino}  [PSH, ACK] Len=${s.peticion.length}  ·  segmento PERDIDO`, 'warning');
                    L('No llega ACK del servidor. Expira el temporizador de retransmisión (RTO).', 'warning');
                    W(300);
                    P('right', 'DATA', 'data');
                    L(`${CLIENT_IP} → ${destino}  [PSH, ACK] RETRANSMISIÓN Len=${s.peticion.length}`, 'info');
                } else {
                    P('right', 'DATA', 'data');
                    L(`${CLIENT_IP} → ${destino}  [PSH, ACK] Len=${s.peticion.length}`);
                }
                P('left', 'DATA', 'data');
                L(`recv(sock)  ←  "${s.respuesta}"`, 'success');
                P('right', 'FIN', 'fin');
                L('close(sock)  →  [FIN, ACK]');
                P('left', 'FIN', 'fin');
                L(`${destino} → ${CLIENT_IP}  [FIN, ACK]  ·  conexión cerrada`, 'success');

                if (estadoSrv === 'loss') {
                    L('TCP recuperó el segmento perdido: la aplicación nunca se enteró.', 'info');
                    resultado = { texto: 'OK (retransmitido)', estado: 'warn', mision: 'fault' };
                } else {
                    resultado = { texto: 'OK', estado: 'ok', mision: 'handshake' };
                }
            }
        } else {
            L('sock = socket(AF_INET, SOCK_DGRAM, 0)', 'info');
            L('UDP no establece conexión: no hay handshake.', 'info');

            if (estadoSrv === 'closed') {
                L(`sendto(sock, "${s.peticion}", ${destino})  →  retorna OK`, 'info');
                P('right', 'UDP', 'data');
                L(`${CLIENT_IP} → ${destino}  UDP Len=${s.peticion.length}`);
                P('left', 'ICMP', 'icmp');
                L(`${SERVER_IP} → ${CLIENT_IP}  ICMP Destination Unreachable (Port Unreachable)`, 'error');
                L('sendto() ya había retornado con éxito: el error solo aparece después (o nunca, si se filtra el ICMP).', 'warning');
                resultado = { texto: 'ICMP Port Unreachable', estado: 'error', mision: null };
            } else if (estadoSrv === 'firewall') {
                L(`sendto(sock, "${s.peticion}", ${destino})  →  retorna OK`, 'info');
                P('right', 'UDP', 'data', true);
                L(`${CLIENT_IP} → ${destino}  UDP Len=${s.peticion.length}  ·  descartado por el firewall`, 'warning');
                L('recvfrom() espera... (timeout de la aplicación: 2 s)', 'warning');
                W(500);
                L('socket.timeout: UDP no retransmite; la aplicación decide si reintentar.', 'error');
                resultado = { texto: 'Timeout (sin respuesta)', estado: 'error', mision: 'fault' };
            } else if (estadoSrv === 'loss') {
                for (let i = 1; i <= 3; i++) {
                    const perdido = i === 2;
                    L(`sendto(sock, lectura #${i}, ${destino})`, 'info');
                    P('right', `#${i}`, 'data', perdido);
                    L(perdido ? `Datagrama #${i} PERDIDO en la red` : `Datagrama #${i} entregado`, perdido ? 'warning' : 'success');
                }
                L('El servidor recibió #1 y #3. UDP no avisa ni retransmite el #2.', 'info');
                resultado = { texto: '1 de 3 perdido', estado: 'warn', mision: 'fault' };
            } else {
                L(`sendto(sock, "${s.peticion}", ${destino})`, 'info');
                P('right', 'UDP', 'data');
                L(`${CLIENT_IP} → ${destino}  UDP Len=${s.peticion.length}  ·  cabecera de 8 bytes`);
                P('left', 'UDP', 'ack');
                L(`recvfrom(sock)  ←  "${s.respuesta}"`, 'success');
                L('Solo 2 paquetes en total (TCP necesitó 7 para el mismo intercambio).', 'info');
                resultado = { texto: 'OK', estado: 'ok', mision: 'udp' };
            }
        }

        return { pasos, resultado };
    }

    /* ----------------------------------------------------------------------
       EJECUCIÓN DE LA SIMULACIÓN
       ---------------------------------------------------------------------- */
    let protocolo = 'TCP';
    let simulando = false;

    function controlesSimulador() {
        return [$('btnSimulate'), $('btnProtocolTcp'), $('btnProtocolUdp'), $('targetPortSelect'), $('serverStateSelect')];
    }

    function estadoBadge(texto, clase = '') {
        const badge = $('workbenchStatusBadge');
        const txt = $('workbenchStatusText');
        if (txt) txt.textContent = texto;
        if (badge) badge.className = `workbench-status-badge ${clase}`.trim();
    }

    async function simularTransmision() {
        if (simulando) return;
        simulando = true;
        controlesSimulador().forEach((c) => c && (c.disabled = true));

        const puerto = Number($('targetPortSelect').value);
        const estadoSrv = $('serverStateSelect').value;
        const { pasos, resultado } = construirEscenario(protocolo, puerto, estadoSrv);

        let paquetes = 0;
        let perdidos = 0;
        $('statPackets').textContent = '0';
        $('statLost').textContent = '0';
        $('statResult').textContent = '…';
        $('statResult').className = '';

        estadoBadge('Transmitiendo…', 'transmitting');
        log(`>>> ${protocolo} hacia ${SERVER_IP}:${puerto} (${SERVICIOS[puerto].nombre}) · servidor: ${$('serverStateSelect').selectedOptions[0].text}`, 'header');

        for (const paso of pasos) {
            if (paso.log) {
                log(paso.log, paso.tipo);
                await sleep(140);
            } else if (paso.pkt) {
                paquetes++;
                if (paso.pkt[3]) perdidos++;
                $('statPackets').textContent = String(paquetes);
                $('statLost').textContent = String(perdidos);
                await animarPaquete(...paso.pkt);
            } else if (paso.wait) {
                await sleep(paso.wait);
            }
        }

        $('statResult').textContent = resultado.texto;
        $('statResult').className = `stat-${resultado.estado}`;
        const etiquetas = { ok: 'Completado', warn: 'Completado con incidencias', error: 'Falló la comunicación' };
        estadoBadge(etiquetas[resultado.estado], `is-${resultado.estado}`);

        if (resultado.mision) completarMision(resultado.mision);

        controlesSimulador().forEach((c) => c && (c.disabled = false));
        simulando = false;
    }

    function setProtocol(proto) {
        if (simulando || proto === protocolo) return;
        protocolo = proto;
        const tcp = $('btnProtocolTcp');
        const udp = $('btnProtocolUdp');
        tcp.classList.toggle('active', proto === 'TCP');
        udp.classList.toggle('active', proto === 'UDP');
        tcp.setAttribute('aria-pressed', String(proto === 'TCP'));
        udp.setAttribute('aria-pressed', String(proto === 'UDP'));
        $('channelProtocolBadge').textContent = proto === 'TCP' ? 'TCP · SOCK_STREAM' : 'UDP · SOCK_DGRAM';
        log(proto === 'TCP'
            ? 'Protocolo: TCP (orientado a conexión, confiable, con control de flujo).'
            : 'Protocolo: UDP (sin conexión, datagramas independientes, sin retransmisión).', 'info');
    }

    function actualizarTopologia() {
        const puerto = $('targetPortSelect').value;
        const est = ESTADOS_SERVIDOR[$('serverStateSelect').value];
        $('serverAddress').textContent = `${SERVER_IP}:${puerto}`;

        const badge = $('serverBadge');
        badge.className = `node-badge ${est.clase}`;
        badge.innerHTML = `<i class="fas ${est.icono}" aria-hidden="true"></i> <span></span>`;
        badge.querySelector('span').textContent = est.badge;

        const canal = $('channelLine');
        canal.classList.toggle('is-unstable', $('serverStateSelect').value === 'loss');
        canal.classList.toggle('is-filtered', $('serverStateSelect').value === 'firewall');
        $('channelCaption').textContent = est.canal;
    }

    /* ----------------------------------------------------------------------
       MISIONES
       ---------------------------------------------------------------------- */
    function completarMision(id) {
        if (!MISIONES[id] || estado.missions[id]) return;
        estado.missions[id] = new Date().toISOString();
        if (!estado.inicio) estado.inicio = estado.missions[id];
        guardarEstado();
        log(`★ Misión completada: ${MISIONES[id]} (+${PUNTOS_MISION} pts)`, 'mission');
        renderTodo();
    }

    function renderMisiones() {
        document.querySelectorAll('.mission-item').forEach((item) => {
            const hecha = Boolean(estado.missions[item.dataset.mission]);
            item.classList.toggle('is-done', hecha);
            const icono = item.querySelector('.mission-check i');
            if (icono) icono.className = hecha ? 'fas fa-circle-check' : 'far fa-circle';
        });
    }

    /* ----------------------------------------------------------------------
       RETOS
       ---------------------------------------------------------------------- */
    function iniciarRetos() {
        document.querySelectorAll('.challenge-item[data-reto]').forEach((reto) => {
            reto.querySelectorAll('.option-btn').forEach((btn, i) => {
                btn.dataset.index = String(i);
                btn.addEventListener('click', () => responderReto(reto, btn));
            });
        });
    }

    function responderReto(reto, btn) {
        const id = reto.dataset.reto;
        if (estado.retos[id] || reto.classList.contains('is-locked')) return;

        const correcta = btn.dataset.correct === 'true';
        estado.retos[id] = { opcion: Number(btn.dataset.index), correcta };
        if (!estado.inicio) estado.inicio = new Date().toISOString();
        guardarEstado();
        renderTodo();

        if (calcularPuntaje().terminado) {
            const card = $('resultsCard');
            setTimeout(() => {
                card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
                card.focus({ preventScroll: true });
            }, 400);
        }
    }

    function renderRetos() {
        document.querySelectorAll('.challenge-item[data-reto]').forEach((reto) => {
            const id = reto.dataset.reto;
            const requisito = reto.dataset.requires;
            const bloqueado = Boolean(requisito) && !estado.missions[requisito];
            const respuesta = estado.retos[id];
            const opciones = reto.querySelectorAll('.option-btn');
            const banner = reto.querySelector('.feedback-banner');
            const aviso = reto.querySelector('.challenge-lock');

            reto.classList.toggle('is-locked', bloqueado && !respuesta);
            reto.classList.toggle('is-answered', Boolean(respuesta));
            if (aviso) aviso.hidden = !bloqueado || Boolean(respuesta);

            opciones.forEach((btn, i) => {
                btn.classList.remove('correct', 'incorrect', 'reveal');
                btn.disabled = Boolean(respuesta) || bloqueado;
                btn.removeAttribute('aria-describedby');
                if (!respuesta) return;
                const esCorrecta = btn.dataset.correct === 'true';
                if (i === respuesta.opcion) btn.classList.add(respuesta.correcta ? 'correct' : 'incorrect');
                else if (esCorrecta) btn.classList.add('reveal');
            });

            if (!banner) return;
            if (!respuesta) {
                banner.className = 'feedback-banner';
                banner.textContent = '';
                return;
            }
            const elegida = opciones[respuesta.opcion];
            const correctaBtn = reto.querySelector('.option-btn[data-correct="true"]');
            banner.className = `feedback-banner show ${respuesta.correcta ? 'success' : 'error'}`;
            banner.innerHTML = '';
            const icono = document.createElement('i');
            icono.className = `fas ${respuesta.correcta ? 'fa-circle-check' : 'fa-circle-xmark'}`;
            icono.setAttribute('aria-hidden', 'true');
            const texto = document.createElement('div');
            const titulo = document.createElement('strong');
            titulo.textContent = respuesta.correcta ? `¡Correcto! +${PUNTOS_RETO} pts. ` : 'Incorrecto. ';
            texto.append(titulo, elegida?.dataset.feedback || '');
            if (!respuesta.correcta && correctaBtn) {
                const extra = document.createElement('p');
                extra.className = 'feedback-correct';
                extra.textContent = `Respuesta correcta (${correctaBtn.querySelector('.option-letter')?.textContent}): ${correctaBtn.dataset.feedback}`;
                texto.append(extra);
            }
            banner.append(icono, texto);
        });
    }

    /* ----------------------------------------------------------------------
       PROGRESO Y RESULTADOS
       ---------------------------------------------------------------------- */
    function mensajeResultado(total) {
        if (total >= 90) return 'Excelente dominio de sockets y diagnóstico de red.';
        if (total >= 70) return 'Buen desempeño. Repasa los puntos donde fallaste.';
        if (total >= 60) return 'Aprobado. Te conviene repasar los temas de la unidad.';
        return 'Aún no alcanzas el mínimo. Revisa el material de apoyo y vuelve a intentarlo.';
    }

    function renderProgreso() {
        const p = calcularPuntaje();
        const avance = Math.round(((p.misiones + p.retosRespondidos) / (Object.keys(MISIONES).length + p.totalRetos)) * 100);

        $('missionsCount').textContent = `${p.misiones} / ${Object.keys(MISIONES).length}`;
        $('sidebarGrade').textContent = String(p.total);
        $('sidebarMissions').textContent = `${p.misiones} / ${Object.keys(MISIONES).length}`;
        $('sidebarRetos').textContent = `${p.retosRespondidos} / ${p.totalRetos}`;
        $('sidebarCorrect').textContent = `${p.aciertos} de ${p.retosRespondidos}`;
        $('sidebarProgressFill').style.width = `${avance}%`;
        $('sidebarProgress').setAttribute('aria-valuenow', String(avance));

        const status = $('sidebarStatus');
        if (p.terminado) {
            status.textContent = 'Terminada';
            status.className = 'summary-val status-done';
        } else if (p.misiones || p.retosRespondidos) {
            status.textContent = 'En curso';
            status.className = 'summary-val status-progress';
        } else {
            status.textContent = 'Sin iniciar';
            status.className = 'summary-val';
        }

        const card = $('resultsCard');
        card.classList.toggle('is-hidden', !p.terminado);
        if (p.terminado) {
            $('resultsGrade').textContent = String(p.total);
            $('resultsMissions').textContent = `${p.pMisiones} / 40`;
            $('resultsRetos').textContent = `${p.pRetos} / 60`;
            let msg = mensajeResultado(p.total);
            if (p.misiones < Object.keys(MISIONES).length) {
                msg += ` Aún puedes completar ${Object.keys(MISIONES).length - p.misiones} misión(es) en el simulador para subir tu calificación.`;
            }
            $('resultsMessage').textContent = msg;
            const circulo = $('resultsGradeCircle');
            circulo.style.setProperty('--grade', String(p.total));
            circulo.classList.toggle('is-fail', p.total < 60);
        }
    }

    function renderTodo() {
        renderMisiones();
        renderRetos();
        renderProgreso();
    }

    function reiniciar() {
        if (simulando) return;
        if (!window.confirm('¿Reiniciar la actividad? Se borrarán tus misiones y respuestas.')) return;
        estado = estadoInicial();
        guardarEstado();
        $('studentName').value = '';
        $('statPackets').textContent = '0';
        $('statLost').textContent = '0';
        $('statResult').textContent = '—';
        $('statResult').className = '';
        estadoBadge('En espera');
        limpiarConsola();
        renderTodo();
        document.querySelector('.workbench-card')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }

    /* ----------------------------------------------------------------------
       CONSTANCIA PDF (jsPDF se carga solo cuando se necesita)
       ---------------------------------------------------------------------- */
    let jsPdfPromise = null;

    function cargarJsPDF() {
        if (window.jspdf?.jsPDF) return Promise.resolve();
        if (jsPdfPromise) return jsPdfPromise;
        jsPdfPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = JSPDF_URL;
            script.async = true;
            script.onload = () => (window.jspdf?.jsPDF ? resolve() : reject(new Error('jsPDF no disponible')));
            script.onerror = () => {
                jsPdfPromise = null;
                reject(new Error('No se pudo descargar jsPDF'));
            };
            document.head.appendChild(script);
        });
        return jsPdfPromise;
    }

    function textoPlano(el) {
        return (el?.textContent || '').replace(/\s+/g, ' ').trim();
    }

    async function generarPDF() {
        const boton = $('btnDownloadPdf');
        const original = boton.innerHTML;
        boton.disabled = true;
        boton.innerHTML = '<i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Generando…';

        try {
            await cargarJsPDF();
        } catch {
            window.alert('No se pudo cargar el generador de PDF. Revisa tu conexión a internet e inténtalo de nuevo.');
            boton.disabled = false;
            boton.innerHTML = original;
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const AZUL = [8, 47, 66];
        const ACENTO = [42, 98, 136];
        const TEXTO = [31, 41, 55];
        const SUAVE = [100, 116, 139];
        const VERDE = [22, 128, 82];
        const ROJO = [185, 50, 50];

        const margen = 16;
        const ancho = doc.internal.pageSize.getWidth();
        const alto = doc.internal.pageSize.getHeight();
        const util = ancho - margen * 2;
        let y = 0;

        const p = calcularPuntaje();
        const nombre = ($('studentName').value || '').trim() || 'Sin nombre';
        const fecha = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });

        function encabezado() {
            doc.setFillColor(...AZUL);
            doc.rect(0, 0, ancho, 26, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.text('Constancia de actividad final · Unidad 1', margen, 12);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text('Aplicaciones para Comunicaciones en Red · ESCOM-IPN', margen, 19);
            y = 36;
        }

        function espacio(h) {
            if (y + h > alto - 18) {
                doc.addPage();
                encabezado();
            }
        }

        function titulo(t) {
            espacio(14);
            doc.setTextColor(...ACENTO);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(t, margen, y);
            y += 2.5;
            doc.setDrawColor(...ACENTO);
            doc.setLineWidth(0.4);
            doc.line(margen, y, ancho - margen, y);
            y += 6;
        }

        function parrafo(t, { size = 9.5, color = TEXTO, bold = false, indent = 0 } = {}) {
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.setFontSize(size);
            doc.setTextColor(...color);
            const lineas = doc.splitTextToSize(t, util - indent);
            const lh = size * 0.45;
            lineas.forEach((l) => {
                espacio(lh);
                doc.text(l, margen + indent, y);
                y += lh;
            });
            y += 1.2;
        }

        encabezado();

        // Datos y calificación
        doc.setFillColor(240, 247, 252);
        doc.setDrawColor(...ACENTO);
        doc.roundedRect(margen, y, util, 34, 2, 2, 'FD');
        doc.setTextColor(...TEXTO);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('Estudiante:', margen + 5, y + 9);
        doc.text('Fecha:', margen + 5, y + 17);
        doc.text('Actividad:', margen + 5, y + 25);
        doc.setFont('helvetica', 'normal');
        doc.text(doc.splitTextToSize(nombre, util - 75)[0], margen + 28, y + 9);
        doc.text(fecha, margen + 28, y + 17);
        doc.text('Diagnóstico de arquitecturas en red', margen + 28, y + 25);

        const aprobado = p.total >= 60;
        doc.setTextColor(...(aprobado ? VERDE : ROJO));
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.text(String(p.total), ancho - margen - 22, y + 18, { align: 'center' });
        doc.setFontSize(9);
        doc.text('/ 100', ancho - margen - 22, y + 25, { align: 'center' });
        y += 42;

        parrafo(mensajeResultado(p.total), { size: 10, bold: true, color: aprobado ? VERDE : ROJO });
        parrafo(`Misiones del simulador: ${p.pMisiones} / 40 pts  ·  Retos de diagnóstico: ${p.pRetos} / 60 pts`, { color: SUAVE });
        y += 2;

        // Misiones
        titulo('Misiones del simulador (40%)');
        Object.entries(MISIONES).forEach(([id, nombreMision]) => {
            const hecha = Boolean(estado.missions[id]);
            parrafo(`${hecha ? '[OK]' : '[  ]'}  ${nombreMision}  ·  ${hecha ? `+${PUNTOS_MISION} pts` : '0 pts'}`, { color: hecha ? VERDE : SUAVE });
        });
        y += 2;

        // Retos
        titulo('Retos de diagnóstico (60%)');
        document.querySelectorAll('.challenge-item[data-reto]').forEach((reto) => {
            const id = reto.dataset.reto;
            const r = estado.retos[id];
            const opciones = reto.querySelectorAll('.option-btn');
            const correcta = reto.querySelector('.option-btn[data-correct="true"]');

            espacio(26);
            parrafo(`Reto ${id}. ${textoPlano(reto.querySelector('.challenge-title'))}`, { bold: true, size: 10 });
            parrafo(textoPlano(reto.querySelector('.challenge-desc')), { color: SUAVE, size: 9 });

            if (!r) {
                parrafo('Sin responder  ·  0 pts', { color: ROJO, indent: 4 });
            } else {
                const elegida = opciones[r.opcion];
                parrafo(`Tu respuesta: ${textoPlano(elegida)}`, { indent: 4, color: r.correcta ? VERDE : ROJO, bold: true, size: 9 });
                if (!r.correcta && correcta) {
                    parrafo(`Respuesta correcta: ${textoPlano(correcta)}`, { indent: 4, size: 9 });
                }
                parrafo(`Explicación: ${(r.correcta ? elegida : correcta)?.dataset.feedback || ''}`, { indent: 4, color: SUAVE, size: 8.5 });
                parrafo(r.correcta ? `+${PUNTOS_RETO} pts` : '0 pts', { indent: 4, size: 9, bold: true, color: r.correcta ? VERDE : ROJO });
            }
            y += 2;
        });

        // Pie en todas las páginas
        const total = doc.getNumberOfPages();
        for (let i = 1; i <= total; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(...SUAVE);
            doc.text('Polilibro académico · ESCOM-IPN · Documento generado automáticamente', margen, alto - 8);
            doc.text(`Página ${i} de ${total}`, ancho - margen, alto - 8, { align: 'right' });
        }

        const archivo = nombre === 'Sin nombre'
            ? 'Constancia_U1_Actividad_Final.pdf'
            : `Constancia_U1_${nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]+/g, '_')}.pdf`;
        doc.save(archivo);

        boton.disabled = false;
        boton.innerHTML = original;
    }

    /* ----------------------------------------------------------------------
       PROGRESO DE LECTURA Y BOTÓN "VOLVER ARRIBA"
       ---------------------------------------------------------------------- */
    function iniciarScroll() {
        const barra = $('readingProgressBar');
        const subir = $('scrollToTop');
        let pendiente = false;

        const actualizar = () => {
            pendiente = false;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            if (barra) barra.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
            if (subir) subir.classList.toggle('show', window.scrollY > 500);
        };

        window.addEventListener('scroll', () => {
            if (!pendiente) {
                pendiente = true;
                requestAnimationFrame(actualizar);
            }
        }, { passive: true });

        subir?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
        actualizar();
    }

    /* ----------------------------------------------------------------------
       INICIO
       ---------------------------------------------------------------------- */
    function init() {
        $('btnProtocolTcp')?.addEventListener('click', () => setProtocol('TCP'));
        $('btnProtocolUdp')?.addEventListener('click', () => setProtocol('UDP'));
        $('btnSimulate')?.addEventListener('click', simularTransmision);
        $('btnClearConsole')?.addEventListener('click', limpiarConsola);
        $('targetPortSelect')?.addEventListener('change', actualizarTopologia);
        $('serverStateSelect')?.addEventListener('change', actualizarTopologia);
        $('btnDownloadPdf')?.addEventListener('click', generarPDF);
        $('btnResetResults')?.addEventListener('click', reiniciar);
        $('btnResetSidebar')?.addEventListener('click', reiniciar);

        const nombre = $('studentName');
        if (nombre) {
            nombre.value = estado.nombre || '';
            nombre.addEventListener('input', () => {
                estado.nombre = nombre.value;
                guardarEstado();
            });
        }

        iniciarRetos();
        iniciarScroll();
        actualizarTopologia();
        limpiarConsola();
        log('Topología cliente-servidor conectada.', 'success');
        renderTodo();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
