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

// Scaling
function resize() {
    const scale = Math.min(window.innerWidth / 544, window.innerHeight / 960);
    container.style.transform = "scale(" + scale + ")";
}
window.addEventListener('resize', resize);
resize();

function setFrame(n) { deer.style.backgroundPositionX = "-" + (n * T_SIZE) + "px"; }

function playNote(f, duration = 0.5) {
    if (!audioCtx) return;
    try {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.frequency.setValueAtTime(f, audioCtx.currentTime);
        o.type = 'triangle';
        o.connect(g); g.connect(audioCtx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
        o.stop(audioCtx.currentTime + duration);
    } catch(e) { console.log("Audio Error"); }
}

function spawnStageNotes(index) {
    const old = document.querySelectorAll('.current-notes');
    for(let i=0; i<old.length; i++) { old[i].remove(); }
    
    notesReady = false;
    const stageY = (index * 8 * T_SIZE) + 64;
    const correct = melody[index];
    const correctP = pathSeq[index];
    let others = Object.keys(FREQS).filter(function(n) { return n !== correct; }).sort(function() { return 0.5 - Math.random(); });

    let currentNotes = {};
    const paths = ["LEFT", "CENTER", "RIGHT"];
    for(let j=0; j<3; j++) {
        let p = paths[j];
        let noteName = (p === correctP) ? correct : others.pop();
        currentNotes[p] = noteName;
        const noteEl = document.createElement('div');
        noteEl.className = 'note-graphic current-notes';
        const file = "note_" + noteName.toLowerCase().replace('_high','') + (noteName.includes('HIGH') ? '_high' : '') + ".png";
        noteEl.style.backgroundImage = "url('images/" + file + "')";
        noteEl.style.left = PATH_X[p] + "px";
        noteEl.style.bottom = (stageY + 256) + "px"; 
        forest.appendChild(noteEl);
    }
    stageNoteData = currentNotes; 
    setTimeout(function() { notesReady = true; isMoving = false; playNote(FREQS[melody[index]], 0.3); }, 200);
}

async function moveStage(p) {
    if (isMoving || !notesReady) return;
    isMoving = true;
    deer.style.left = PATH_X[p] + "px";
    setFrame(p === "LEFT" ? 1 : p === "RIGHT" ? 2 : 3);
    if (stageNoteData[p]) playNote(FREQS[stageNoteData[p]]);

    if (p === pathSeq[currentStage]) {
        await new Promise(function(r) { setTimeout(r, 400); });
        const old = document.querySelectorAll('.current-notes');
        for(let i=0; i<old.length; i++) { old[i].remove(); }
        notesReady = false;
        startWalkAnim();
        const freezeThreshold = - (23 * 8 * T_SIZE); 
        if (mapBottom > freezeThreshold) {
            mapBottom -= (8 * T_SIZE);
            forest.style.bottom = mapBottom + "px";
        } else {
            let curB = parseInt(window.getComputedStyle(deer).bottom);
            deer.style.bottom = (curB + (8 * T_SIZE)) + "px";
        }
        setTimeout(function() {
            stopWalkAnim();
            if (currentStage < 23) deer.style.left = "256px"; 
            currentStage++;
            if (currentStage < melody.length) spawnStageNotes(currentStage);
            else handleEndSequence();
        }, 1200); 
    } else {
        isMoving = false; 
    }
}

function handleEndSequence() {
    isMoving = true;
    playBtn.style.bottom = "-120px";
    setTimeout(function() {
        startWalkAnim();
        deer.style.transition = "bottom 3.5s linear";
        deer.style.bottom = "1100px"; 
        setTimeout(function() {
            stopWalkAnim();
            overlay.innerHTML = "<h1>REPLAY</h1>";
            overlay.style.display = "flex";
            mapBottom = 0; forest.style.bottom = "0px";
            setTimeout(function() { overlay.style.display = "none"; runBirthdayReplay(); }, 2000);
        }, 3500);
    }, 1000);
}

function runBirthdayReplay() {
    deer.style.transition = "none";
    deer.style.bottom = "256px"; deer.style.left = "256px";
    setFrame(0); 
    setTimeout(function() {
        startWalkAnim();
        loopReplay(0);
    }, 500);
}

async function loopReplay(i) {
    if (i >= melody.length) {
        setTimeout(function() {
            deer.style.transition = "bottom 3.5s linear";
            deer.style.bottom = "1100px";
            setTimeout(function() { stopWalkAnim(); playBtn.style.bottom = "-2px"; playBtn.onclick = function() { location.reload(); }; }, 15000);
        }, 500);
        return;
    }
    const rhythm = [400, 400, 800, 800, 800, 1200];
    const path = pathSeq[i];
    const stepTime = rhythm[i % rhythm.length] || 600;
    deer.style.transition = "left 0.1s linear";
    deer.style.left = PATH_X[path] + "px";
    setFrame(path === "LEFT" ? 1 : path === "RIGHT" ? 2 : 3);
    setTimeout(function() {
        const walkDur = (stepTime - 100) / 1000;
        deer.style.transition = "bottom " + walkDur + "s linear";
        forest.style.transition = "bottom " + walkDur + "s linear";
        mapBottom -= (8 * T_SIZE); forest.style.bottom = mapBottom + "px";
        playNote(FREQS[melody[i]], 0.4);
        setTimeout(function() { loopReplay(i + 1); }, stepTime - 100);
    }, 100);
}

function startWalkAnim() { if(!walkInt) { let t=true; walkInt = setInterval(function(){setFrame(t?3:4);t=!t;},150); } }
function stopWalkAnim() { clearInterval(walkInt); walkInt = null; setFrame(0); }

overlay.addEventListener('click', function() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') { audioCtx.resume(); }
    overlay.style.display = "none";
    startWalkAnim();
    deer.style.transition = "bottom 2s ease-in-out"; 
    deer.style.bottom = "256px";
    playBtn.style.bottom = "-2px";
    setTimeout(function() { stopWalkAnim(); spawnStageNotes(0); }, 2000);
});

container.addEventListener('click', function(e) {
    if (e.target.id === 'play-btn' || isMoving || !notesReady) return;
    const rect = container.getBoundingClientRect();
    const scale = rect.width / 544;
    const x = (e.clientX - rect.left) / scale;
    if (x < 181) moveStage("LEFT");
    else if (x > 362) moveStage("RIGHT");
    else moveStage("CENTER");
});

playBtn.addEventListener('click', function(e) { 
    e.stopPropagation(); 
    if (!isMoving && notesReady) playNote(FREQS[melody[currentStage]]); 
});
