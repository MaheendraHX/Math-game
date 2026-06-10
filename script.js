const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const resultBox = document.getElementById('result-box');
const timerOverlay = document.getElementById('timer-overlay');
const nextBtn = document.getElementById('next-btn');

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

function generateQuestion() {
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
    
    // Clear state profiles safely
    isEvaluationLocked = false;
    timerDuration = 4.0;
    clearInterval(countdownInterval);
    
    nextBtn.disabled = true;
    resultBox.innerText = "Scanning fingers...";
    resultBox.className = ""; 
    
    // Fire off absolute timer execution
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
            // Timeout reached: Evaluate current state (will result in wrong/timeout penalty)
            evaluateAnswer(false, 4.0); 
        } else {
            timerOverlay.innerText = `${timerDuration.toFixed(1)}s`;
        }
    }, 100);
}

// Handles calculations right when an answer triggers
function evaluateAnswer(isCorrect, elapsedSeconds) {
    isEvaluationLocked = true;
    clearInterval(countdownInterval); // Instantly stop the clock
    timerOverlay.classList.add('hidden');
    nextBtn.disabled = false; // Unlock next button control hook

    if (isCorrect) {
        currentStreak++;
        questionsAnsweredCount++;
        totalSolvedTime += elapsedSeconds;

        // Check if this answer sets a new record for fastest speed
        if (elapsedSeconds < minTime) {
            minTime = elapsedSeconds;
            document.getElementById('min-time').innerText = `${minTime.toFixed(2)}s`;
        }

        // Keep all-time high streak scoreboard records synchronized
        if (currentStreak > maxStreak) {
            maxStreak = currentStreak;
            document.getElementById('max-streak').innerText = maxStreak;
        }

        // Update live average metrics window
        document.getElementById('avg-time').innerText = `${(totalSolvedTime / questionsAnsweredCount).toFixed(2)}s`;
        
        resultBox.innerText = `CORRECT! 🎉 Solved in exactly ${elapsedSeconds.toFixed(2)}s!`;
        resultBox.className = "correct";
    } else {
        // Strike penalty routine handles failures or complete time timeouts
        currentStreak = 0;
        resultBox.innerText = `TIMEOUT / WRONG! ❌ Correct answer was ${correctAnswer}.`;
        resultBox.className = "incorrect";
    }

    document.getElementById('current-streak').innerText = currentStreak;
}

function onResults(results) {
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // If answer is already captured or time expired, keep the screen static
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

        // INSTANT DETECTION TRIGGER RULE:
        // The exact millisecond the count equals the correct answer, process it!
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