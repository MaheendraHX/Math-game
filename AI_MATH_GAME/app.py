import streamlit as st
import random
import cv2
import mediapipe as mp
import numpy as np

st.set_page_config(page_title="AI Math Finger Game", page_icon="🧮")
st.title("🖐️ AI Finger Count Math Game")
st.write("Answer the math question by showing the correct number of fingers to your webcam!")

# 1. Initialize MediaPipe Hand Tracking
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(static_image_mode=True, max_num_hands=2, min_detection_confidence=0.5)

# 2. Setup the Game State (keeps the question fixed until answered)
if 'num1' not in st.session_state:
    st.session_state.num1 = random.randint(1, 5)
    st.session_state.num2 = random.randint(0, 4)
    st.session_state.operation = random.choice(['+', '-', '*', '/'])
    
    # Ensure no negative answers or messy decimals for a finger game
    if st.session_state.operation == '-':
        if st.session_state.num1 < st.session_state.num2:
            st.session_state.num1, st.session_state.num2 = st.session_state.num2, st.session_state.num1
    elif st.session_state.operation == '/':
        st.session_state.num2 = random.choice([1, 2, 3])
        st.session_state.num1 = st.session_state.num2 * random.randint(1, 3)

# Calculate correct answer
n1, n2, op = st.session_state.num1, st.session_state.num2, st.session_state.operation
if op == '+': correct_ans = n1 + n2
elif op == '-': correct_ans = n1 - n2
elif op == '*': correct_ans = n1 * n2
elif op == '/': correct_ans = int(n1 / n2)

# Display Question
op_symbol = {'+': '+', '-': '-', '*': '×', '/': '÷'}[op]
st.subheader(f"🧠 Question: What is {n1} {op_symbol} {n2}?")

# 3. Webcam Input
img_file_buffer = st.camera_input("Show your answer using your fingers!")

if img_file_buffer is not None:
    # Convert image for MediaPipe
    file_bytes = np.asarray(bytearray(img_file_buffer.read()), dtype=np.uint8)
    image = cv2.imdecode(file_bytes, 1)
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    
    # Process image and find hands
    results = hands.process(image_rgb)
    
    total_fingers = 0
    
    if results.multi_hand_landmarks:
        for hand_landmarks in results.multi_hand_landmarks:
            # Tip IDs for index, middle, ring, and pinky fingers
            finger_tips = [8, 12, 16, 20]
            pip_joints = [6, 10, 14, 18]
            
            # Check 4 fingers (if tip is higher than the lower joint)
            for i in range(4):
                if hand_landmarks.landmark[finger_tips[i]].y < hand_landmarks.landmark[pip_joints[i]].y:
                    total_fingers += 1
                    
            # Check Thumb (Basic horizontal check)
            thumb_tip = hand_landmarks.landmark[4]
            thumb_ip = hand_landmarks.landmark[3]
            # Adjust thumb detection based on hand orientation (rough estimate)
            if abs(thumb_tip.x - hand_landmarks.landmark[17].x) > abs(thumb_ip.x - hand_landmarks.landmark[17].x):
                total_fingers += 1

        st.info(f"🤖 AI detected **{total_fingers}** fingers up!")
        
        # 4. Check Answer
        if total_fingers == correct_ans:
            st.success("🎉 CORRECT! Brilliant job!")
            if st.button("Next Question ➡️"):
                # Reset session state for a new question
                for key in list(st.session_state.keys()):
                    del st.session_state[key]
                st.rerun()
        else:
            st.error(f"❌ Oops! You showed {total_fingers} fingers, but the correct answer is {correct_ans}. Try again!")
    else:
        st.warning("👋 Couldn't see your hands clearly. Make sure your fingers are fully in the camera frame!")