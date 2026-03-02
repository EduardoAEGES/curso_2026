import { supabase, SESSION_ID } from '../config/supabaseClient.js';

const slideTitle = document.getElementById('current-slide');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnToggleQ = document.getElementById('btn-toggle-q');
const studentCount = document.getElementById('student-count');
const studentList = document.getElementById('student-list');
const resultsDashboard = document.getElementById('results-dashboard');
const adminQuestionView = document.getElementById('admin-question-view');
const adminQuestionText = document.getElementById('admin-question-text');
const btnExport = document.getElementById('btn-export');

let currentSession = null;
let currentQuestion = null;

async function init() {
    // 1. Fetch Session
    const { data: session } = await supabase
        .from('sesion')
        .select('*')
        .eq('id', SESSION_ID)
        .single();

    currentSession = session;
    updateUI();

    // 2. Fetch Students
    fetchStudents();

    // 3. Realtime for Students and Answers
    supabase.channel('admin-room')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'estudiantes' }, fetchStudents)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'respuestas' }, fetchResults)
        .subscribe();
}

async function fetchStudents() {
    const { data } = await supabase
        .from('estudiantes')
        .select('nombre')
        .eq('sesion_id', SESSION_ID);

    studentCount.textContent = `${data.length} conectados`;
    studentList.innerHTML = data.map(s => `<li class="student-item">${s.nombre}</li>`).join('');
}

async function updateUI() {
    slideTitle.textContent = `Diapositiva Actual: ${currentSession.slide_actual}`;
    btnToggleQ.textContent = currentSession.pregunta_abierta ? 'Cerrar Pregunta' : 'Abrir Pregunta';

    // Fetch current question
    const { data: question } = await supabase
        .from('preguntas')
        .select('*')
        .eq('orden', currentSession.slide_actual)
        .single();

    if (question) {
        currentQuestion = question;
        adminQuestionView.classList.remove('hidden');
        adminQuestionText.textContent = question.texto;
        fetchResults();
    } else {
        adminQuestionView.classList.add('hidden');
    }
}

async function fetchResults() {
    if (!currentQuestion) return;

    const { data: responses } = await supabase
        .from('respuestas')
        .select('respuesta')
        .eq('pregunta_id', currentQuestion.id);

    renderChart(responses);
}

function renderChart(responses) {
    if (currentQuestion.tipo === 'multiple' || currentQuestion.tipo === 'vf') {
        const counts = {};
        const options = currentQuestion.tipo === 'vf' ? ['Verdadero', 'Falso'] : [currentQuestion.opcion_a, currentQuestion.opcion_b, currentQuestion.opcion_c, currentQuestion.opcion_d].filter(Boolean);

        options.forEach(opt => counts[opt] = 0);
        responses.forEach(r => {
            if (counts[r.respuesta] !== undefined) counts[r.respuesta]++;
        });

        const total = responses.length || 1;
        resultsDashboard.innerHTML = options.map(opt => {
            const pct = (counts[opt] / total) * 100;
            return `
                <div style="margin-bottom: 1rem;">
                    <div style="display:flex; justify-content:space-between; font-size: 0.9rem;">
                        <span>${opt}</span>
                        <span>${Math.round(pct)}% (${counts[opt]})</span>
                    </div>
                    <div class="bar-container">
                        <div class="bar" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    } else {
        // Open question: just list responses
        resultsDashboard.innerHTML = `<h4>Respuestas Abiertas:</h4><ul class="student-list">` +
            responses.map(r => `<li class="student-item">${r.respuesta}</li>`).join('') + `</ul>`;
    }
}

async function updateSession(updates) {
    const { data, error } = await supabase
        .from('sesion')
        .update(updates)
        .eq('id', SESSION_ID)
        .select()
        .single();

    if (data) {
        currentSession = data;
        updateUI();
    }
}

btnNext.addEventListener('click', () => updateSession({ slide_actual: currentSession.slide_actual + 1, pregunta_abierta: false }));
btnPrev.addEventListener('click', () => updateSession({ slide_actual: Math.max(0, currentSession.slide_actual - 1), pregunta_abierta: false }));
btnToggleQ.addEventListener('click', () => updateSession({ pregunta_abierta: !currentSession.pregunta_abierta }));

btnExport.addEventListener('click', async () => {
    const { data } = await supabase
        .from('respuestas')
        .select('student:estudiantes(nombre), question:preguntas(texto), respuesta, fecha');

    const csv = 'Estudiante,Pregunta,Respuesta,Fecha\n' +
        data.map(r => `"${r.student.nombre}","${r.question.texto}","${r.respuesta}","${r.fecha}"`).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resultados_clase.csv';
    a.click();
});

init();
