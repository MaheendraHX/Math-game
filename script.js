const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const resultBox = document.getElementById('result-box');
const timerOverlay = document.getElementById('timer-overlay');

// Performance Metrics Tracking Variables
let correctAnswer;
let currentStreak = 0;
let maxStreak = 0;
let totalSolvedTime = 0;
let questionsAnsweredCount = 0;
let minTime = Infinity;

// Timer Configuration Variables
let timerDuration = 4.0; 
let countdownInterval = null;
let autoNextTimeout = null; 
let isEvaluationLocked = false; 
let questionStartTime = null;

function startGame() {
    const welcomeScreen = document.getElementById('welcome-screen');
    welcomeScreen.style.opacity = '0';
    setTimeout(() => {
        welcomeScreen.style.display = 'none';
        generateQuestion(); 
    }, 400);
}

// Automatically takes you to the welcome page and updates max streak
function stopGame() {
    clearInterval(countdownInterval);
    clearTimeout(autoNextTimeout);
    isEvaluationLocked = true;
    
    currentStreak = 0;
    document.getElementById('current-streak').innerText = currentStreak;
    timerOverlay.classList.add('hidden');
    resultBox.innerText = "Get Ready...";
    resultBox.className = "";
    document.getElementById("math-question").innerText = "Loading...";

    const welcomeScreen = document.getElementById('welcome-screen');
    document.getElementById('welcome-max-streak').innerText = maxStreak;
    welcomeScreen.style.display = 'flex';
    setTimeout(() => {
        welcomeScreen.style.opacity = '1';
    }, 10);
}

function generateQuestion() {
    clearTimeout(autoNextTimeout);

    let num1 = Math.floor(Math.random() * 6);
    let num2 = Math.floor(Math.random() * 6);
    let ops = ['+', '-', '*'];
    let op = ops[Math.floor(Math.random() * ops.length)];

    if (op === '+') correctAnswer = num1 + num2;
    else if (op === '-') correctAnswer = num1 - num2;
    else correctAnswer = num1 * num2;

    if (correctAnswer < 0 || correctAnswer > 10) return generateQuestion();

    let symbol = op === '*' ? '×' : op;
    document.getElementById("math-question").innerText = `What is ${num1} ${symbol} ${num2}?`;
    
    isEvaluationLocked = false;
    timerDuration = 4.0;
    clearInterval(countdownInterval);
    
    resultBox.innerText = "Scanning fingers...";
    resultBox.className = ""; 
    
    questionStartTime = performance.now();
    startAbsoluteTimer();
}

function startAbsoluteTimer() {
    timerOverlay.classList.remove('hidden');
    timerOverlay.innerText = `${timerDuration.toFixed(1)}s`;

    countdownInterval = setInterval(() => {
        timerDuration -= 0.1;
        if (timerDuration <= 0) {
            clearInterval(countdownInterval);
            timerOverlay.classList.add('hidden');
            evaluateAnswer(false, 4.0); 
        } else {
            timerOverlay.innerText = `${timerDuration.toFixed(1)}s`;
        }
    }, 100);
}

function evaluateAnswer(isCorrect, elapsedSeconds) {
    isEvaluationLocked = true;
    clearInterval(countdownInterval); 
    timerOverlay.classList.add('hidden');

    if (isCorrect) {
        currentStreak++;
        questionsAnsweredCount++;
        totalSolvedTime += elapsedSeconds;

        if (elapsedSeconds < minTime) {
            minTime = elapsedSeconds;
            document.getElementById('min-time').innerText = `${minTime.toFixed(2)}s`;
        }

        if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
            document.getElementById('max-streak').innerText = maxStreak;
            document.getElementById('welcome-max-streak').innerText = maxStreak;
        }

        document.getElementById('avg-time').innerText = `${(totalSolvedTime / questionsAnsweredCount).toFixed(2)}s`;
        
        resultBox.innerText = `CORRECT! 🎉 Solved in ${elapsedSeconds.toFixed(2)}s! Next in 2s...`;
        resultBox.className = "correct";
    } else {
        currentStreak = 0;
        resultBox.innerText = `TIMEOUT / WRONG! ❌ Answer was ${correctAnswer}. Next in 2s...`;
        resultBox.className = "incorrect";
    }

    document.getElementById('current-streak').innerText = currentStreak;

    // Sets up automatic progression delay loop
    autoNextTimeout = setTimeout(() => {
        generateQuestion();
    }, 2000);
}

function onResults(results) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    if (isEvaluationLocked) return;

    let count = 0;
    const handsDetected = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

    if (handsDetected) {
        for (const lm of results.multiHandLandmarks) {
            canvasCtx.fillStyle = '#ffffff';
            lm.forEach(p => {
                canvasCtx.beginPath();
                canvasCtx.arc(p.x * canvasElement.width, p.y * canvasElement.height, 4, 0, 2 * Math.PI);
                canvasCtx.fill();
            });

            if (lm[8].y < lm[6].y) count++;   
            if (lm[12].y < lm[10].y) count++;  
            if (lm[16].y < lm[14].y) count++;  
            if (lm[20].y < lm[18].y) count++;  

            const isLeft = results.multiHandedness[results.multiHandLandmarks.indexOf(lm)].label === 'Left';
            if (isLeft ? lm[4].x > lm[2].x : lm[4].x < lm[2].x) count++; 
        }

        resultBox.innerText = `Reading current gesture: ${count}`;

        if (count === correctAnswer) {
            const stopTime = performance.now();
            const elapsedSeconds = (stopTime - questionStartTime) / 1000;
            evaluateAnswer(true, elapsedSeconds);
        }
    } else {
        resultBox.innerText = "Show your hand to register a response!";
    }
}

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 440,
    height: 330
});

camera.start();