import { supabase, SESSION_ID } from '../config/supabaseClient.js';

const loginView = document.getElementById('login-view');
const classView = document.getElementById('class-view');
const studentNameInput = document.getElementById('student-name');
const btnJoin = document.getElementById('btn-join');
const slideTitle = document.getElementById('slide-title');
const questionArea = document.getElementById('question-area');
const questionText = document.getElementById('question-text');
const optionsList = document.getElementById('options-list');
const openResponse = document.getElementById('open-response');
const responseText = document.getElementById('response-text');
const btnSubmitText = document.getElementById('btn-submit-text');
const waitMessage = document.getElementById('wait-message');

let currentStudent = null;
let currentSlideIndex = -1;
let currentQuestionId = null;
let hasAnswered = false;

// Initialize from LocalStorage if exists
const savedStudent = localStorage.getItem('student_data');
if (savedStudent) {
    currentStudent = JSON.parse(savedStudent);
    showClassView();
    startRealtimeSync();
}

btnJoin.addEventListener('click', async () => {
    const nombre = studentNameInput.value.trim();
    if (!nombre) return alert('Por favor ingresa tu nombre');

    const { data, error } = await supabase
        .from('estudiantes')
        .insert([{ nombre, sesion_id: SESSION_ID }])
        .select()
        .single();

    if (error) return alert('Error al ingresar: ' + error.message);

    currentStudent = data;
    localStorage.setItem('student_data', JSON.stringify(data));
    showClassView();
    startRealtimeSync();
});

function showClassView() {
    loginView.classList.add('hidden');
    classView.classList.remove('hidden');
    document.body.style.alignItems = 'flex-start';
    document.body.style.paddingTop = '5vh';
}

async function startRealtimeSync() {
    // 1. Initial Fetch
    const { data: session } = await supabase
        .from('sesion')
        .select('*')
        .eq('id', SESSION_ID)
        .single();

    if (session) {
        updateView(session);
    }

    // 2. Realtime Subscription
    supabase
        .channel('public:sesion')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sesion', filter: `id=eq.${SESSION_ID}` }, payload => {
            updateView(payload.new);
        })
        .subscribe();
}

async function updateView(session) {
    if (currentSlideIndex === session.slide_actual && !session.pregunta_abierta) return;

    currentSlideIndex = session.slide_actual;
    hasAnswered = false;
    waitMessage.classList.add('hidden');

    // Fetch current question for this slide index
    const { data: question } = await supabase
        .from('preguntas')
        .select('*')
        .eq('orden', session.slide_actual)
        .single();

    if (question && session.pregunta_abierta) {
        currentQuestionId = question.id;
        showQuestion(question);
    } else {
        showWaitSlide();
    }
}

function showWaitSlide() {
    slideTitle.textContent = "Diapositiva " + currentSlideIndex;
    questionArea.classList.add('hidden');
}

function showQuestion(q) {
    slideTitle.textContent = "Actividad en curso";
    questionArea.classList.remove('hidden');
    questionText.textContent = q.texto;
    optionsList.innerHTML = '';
    openResponse.classList.add('hidden');

    if (q.tipo === 'multiple' || q.tipo === 'vf') {
        const options = q.tipo === 'vf' ? ['Verdadero', 'Falso'] : [q.opcion_a, q.opcion_b, q.opcion_c, q.opcion_d].filter(Boolean);
        options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn animate-fade';
            btn.textContent = opt;
            btn.onclick = () => submitAnswer(opt, btn);
            optionsList.appendChild(btn);
        });
    } else {
        openResponse.classList.remove('hidden');
        btnSubmitText.onclick = () => submitAnswer(responseText.value);
    }
}

async function submitAnswer(answer, btn = null) {
    if (hasAnswered) return;
    if (!answer.trim()) return;

    const { error } = await supabase
        .from('respuestas')
        .insert([{
            estudiante_id: currentStudent.id,
            pregunta_id: currentQuestionId,
            respuesta: answer
        }]);

    if (error) {
        if (error.code === '23505') alert('Ya has respondido esta pregunta');
        else alert('Error al enviar: ' + error.message);
        return;
    }

    hasAnswered = true;
    if (btn) btn.classList.add('selected');

    questionArea.classList.add('hidden');
    waitMessage.classList.remove('hidden');
}
