const T_SIZE = 32;
const PATH_X = { LEFT: 64, CENTER: 256, RIGHT: 448 };
const FREQS = {'G':392, 'A':440, 'B':493, 'C':523, 'D':587, 'E':659, 'G_HIGH':784, 'F_HIGH':698, 'E_HIGH':659};

const melody = ['G','G','A','G','C','B', 'G','G','A','G','D','C', 'G','G','G_HIGH','E_HIGH','C','B','A', 'F_HIGH','F_HIGH','E_HIGH','C','D','C'];
const pathSeq = ["LEFT", "CENTER", "RIGHT", "LEFT", "CENTER", "RIGHT", "CENTER", "LEFT", "RIGHT", "LEFT", "CENTER", "LEFT", "RIGHT", "LEFT", "CENTER", "RIGHT", "LEFT", "CENTER", "LEFT", "RIGHT", "CENTER", "RIGHT", "LEFT", "LEFT", "CENTER"];

let currentStage = 0;
let isMoving = true; 
let notesReady = false; 
let mapBottom = 0;
let walkInt = null;
let audioCtx = null;
let stageNoteData = {}; 

const forest = document.getElementById('forest-scene');
const deer = document.getElementById('deer-sprite');
const playBtn = document.getElementById('play-btn');
const overlay = document.getElementById('overlay-ui');
const container = document.getElementById('game-container');

// --- ADDED PRE-LOADING LOGIC ---
const preloadCache = [];
function preloadImages() {
    Object.keys(FREQS).forEach(note => {
        const img = new Image();
        const file = `note_${note.toLowerCase().replace('_high','')}${note.includes('HIGH') ? '_high' : ''}.png`;
        img.src = `images/${file}`;
        preloadCache.push(img);
    });
}
// -------------------------------

function resize() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const scale = Math.min(vw / 544, vh / 960);
    container.style.transform = `scale(${scale})`;
}
window.addEventListener('resize', resize);
resize();

function setFrame(n) { deer.style.backgroundPositionX = `-${n * T_SIZE}px`; }

function playNote(f, duration = 0.5) {
    if (!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.setValueAtTime(f, audioCtx.currentTime);
    o.type = 'triangle';
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    o.stop(audioCtx.currentTime + duration);
}

function spawnStageNotes(index) {
    notesReady = false;
    document.querySelectorAll('.current-notes').forEach(el => el.remove());
    
    const stageY = (index * 8 * T_SIZE) + 64;
    const correct = melody[index];
    const correctP = pathSeq[index];
    let others = Object.keys(FREQS).filter(n => n !== correct).sort(() => Math.random() - 0.5);

    let currentNotes = {};
    const fragment = document.createDocumentFragment();

    ["LEFT", "CENTER", "RIGHT"].forEach(p => {
        let noteName = (p === correctP) ? correct : others.pop();
        currentNotes[p] = noteName;
        
        const noteEl = document.createElement('div');
        noteEl.className = 'note-graphic current-notes';
        const file = `note_${noteName.toLowerCase().replace('_high','')}${noteName.includes('HIGH') ? '_high' : ''}.png`;
        
        noteEl.style.backgroundImage = `url('images/${file}')`;
        noteEl.style.left = `${PATH_X[p]}px`;
        noteEl.style.bottom = `${stageY + 256}px`; 
        fragment.appendChild(noteEl);
    });

    stageNoteData = currentNotes; 
    forest.appendChild(fragment); 
    
    setTimeout(() => {
        notesReady = true;
        isMoving = false;
    }, 100);
}

async function moveStage(p) {
    if (isMoving || !notesReady) return;
    isMoving = true;

    deer.style.left = `${PATH_X[p]}px`;
    setFrame(p === "LEFT" ? 1 : p === "RIGHT" ? 2 : 3);
    
    if (stageNoteData[p]) {
        playNote(FREQS[stageNoteData[p]]);
    }

    if (p === pathSeq[currentStage]) {
        await new Promise(r => setTimeout(r, 400));
        document.querySelectorAll('.current-notes').forEach(el => el.remove());
        notesReady = false;
        startWalkAnim();
        
        const freezeThreshold = - (23 * 8 * T_SIZE); 
        if (mapBottom > freezeThreshold) {
            mapBottom -= (8 * T_SIZE);
            forest.style.bottom = `${mapBottom}px`;
        } else {
            let curB = parseInt(window.getComputedStyle(deer).bottom);
            deer.style.bottom = (curB + (8 * T_SIZE)) + "px";
        }

        setTimeout(() => {
            stopWalkAnim();
            if (currentStage < 23) deer.style.left = `256px`; 
            currentStage++;
            if (currentStage < melody.length) {
                spawnStageNotes(currentStage);
            } else {
                handleEndSequence();
            }
        }, 1200); 
    } else {
        isMoving = false; 
    }
}

async function handleEndSequence() {
    isMoving = true;
    playBtn.style.bottom = "-120px";
    await new Promise(r => setTimeout(r, 1000));
    startWalkAnim();
    deer.style.transition = "bottom 3.5s linear";
    deer.style.bottom = "1100px"; 
    
    setTimeout(async () => {
        stopWalkAnim();
        overlay.innerHTML = "<h1>REPLAY</h1>";
        overlay.style.display = "flex";
        mapBottom = 0;
        forest.style.bottom = "0px";
        await new Promise(r => setTimeout(r, 2000));
        overlay.style.display = "none";
        runBirthdayReplay();
    }, 3500);
}

async function runBirthdayReplay() {
    deer.style.transition = "none";
    deer.style.bottom = "256px";
    deer.style.left = "256px";
    setFrame(0);
    await new Promise(r => setTimeout(r, 500));
    startWalkAnim();
    const rhythm = [400, 400, 800, 800, 800, 1200]; 
    for (let i = 0; i < melody.length; i++) {
        const path = pathSeq[i];
        const stepTime = rhythm[i % rhythm.length] || 600;
        deer.style.transition = "left 0.1s linear";
        deer.style.left = `${PATH_X[path]}px`;
        setFrame(path === "LEFT" ? 1 : path === "RIGHT" ? 2 : 3);
        await new Promise(r => setTimeout(r, 100));
        const walkDuration = (stepTime - 100) / 1000;
        deer.style.transition = `bottom ${walkDuration}s linear`;
        forest.style.transition = `bottom ${walkDuration}s linear`;
        mapBottom -= (8 * T_SIZE);
        forest.style.bottom = `${mapBottom}px`;
        playNote(FREQS[melody[i]], 0.4);
        await new Promise(r => setTimeout(r, stepTime - 100));
    }
    await new Promise(r => setTimeout(r, 500));
    deer.style.transition = "bottom 3.5s linear";
    deer.style.bottom = "1100px";
    setTimeout(() => {
        stopWalkAnim();
        playBtn.style.bottom = "-2px"; 
        playBtn.onclick = () => location.reload();
    }, 15000);
}

function startWalkAnim() { if(!walkInt) { let t=true; walkInt = setInterval(()=>{setFrame(t?3:4);t=!t;},150); } }
function stopWalkAnim() { clearInterval(walkInt); walkInt = null; setFrame(0); }

overlay.onclick = () => {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume();
    preloadImages(); // Added call here
    overlay.style.display = "none";
    startWalkAnim();
    deer.style.transition = "bottom 2s ease-in-out"; 
    deer.style.bottom = "256px";
    playBtn.style.bottom = "-2px";
    setTimeout(() => {
        stopWalkAnim();
        spawnStageNotes(0);
    }, 2000);
};

container.onclick = (e) => {
    if (e.target.id === 'play-btn' || isMoving || !notesReady) return;
    const rect = container.getBoundingClientRect();
    const scale = rect.width / 544;
    const x = (e.clientX - rect.left) / scale;
    if (x < 181) moveStage("LEFT");
    else if (x > 362) moveStage("RIGHT");
    else moveStage("CENTER");
};

playBtn.onclick = (e) => { 
    e.stopPropagation(); 
    if (!isMoving && notesReady) playNote(FREQS[melody[currentStage]]); 
};

window.onkeydown = (e) => {
    if (e.key === "ArrowLeft") moveStage("LEFT");
    if (e.key === "ArrowUp") moveStage("CENTER");
    if (e.key === "ArrowRight") moveStage("RIGHT");
};

