# User Requirements: Android Automation Workflow Editor

## 1. Overview
As a non-programmer user, I want to automate repetitive tasks in my Android games (e.g., daily login, resource farming) without writing Python code. The current script editor is too complex and requires me to understand programming concepts like variables and loops in code syntax.

## 2. Pain Points
- **Coding is Hard**: I don't know Python. Writing `if exists("image.png"): click()` is error-prone.
- **Coordinate Hunting**: Finding X,Y coordinates manually is tedious.
- **Linear Execution**: It's hard to visualize "loops" or "if-else" logic in text.
- **Debugging**: When a script fails, I don't know which step failed easily.

## 3. Desired Solution (The "n8n" Experience)
I want a visual workflow editor where I can drag and drop actions.

### Core Features
1.  **Visual Flow**: Nodes connected by wires.
    -   **Start Node**: Where the automation begins.
    -   **Action Nodes**: Things the bot does (Click, Swipe, Type).
    -   **Decision Nodes**: "If image exists, go this way, else go that way."
2.  **Android Integration**:
    -   **Find Image**: Upload an image (or take a screenshot and crop) to find it on screen.
    -   **Click**: Click a point or click a found image.
    -   **Swipe**: Simulate drag.
    -   **Wait**: Wait for an image to appear (smart wait) or wait for X seconds.
3.  **Interactive Debugging**:
    -   I want to click a single node and press "Execute Step" to see if it works *right now*.
    -   I want to see a green checkmark if a step passes, or a red error if it fails.
    -   I want to see the "flow" lighting up as it runs.

### Example Workflow: "Daily Login"
1.  **Start**
2.  **Wait for Image** ("Game Icon") -> Timeout 10s
3.  **Click Image** ("Game Icon")
4.  **Wait** (15s for loading)
5.  **If Image Exists** ("News Popup")
    -   **True**: Click ("Close Button")
    -   **False**: Continue
6.  **Click Image** ("Daily Reward")
7.  **Log**: "Reward Collected"

## 4. Technical Constraints (User Perspective)
-   Must work with my connected Android device (ADB).
-   Must handle screen resolution differences (maybe fuzzy matching?).
-   Must be able to save/load workflows as files.
