# hockey-air

**A neon-styled air hockey game you can play anywhere - against the computer, a friend nearby, or people online.**

## What Makes It Special

- **Glowing neon visuals** with particle sparks, screen shake, and smooth animations
- **Realistic puck physics** - the puck bounces, glides, and reacts naturally to hits
- **Play three ways**: Battle smart AI, share a screen with a friend, or create online rooms to play across devices
- **Works everywhere** - in your browser, on your phone, or installed as an app
- **No waiting** - instant play, no signup needed

## How to Play

**Goal:** Hit the puck into your opponent's goal. First to the target score wins!

**Controls:**
- Move your mouse or touch and drag to control your mallet
- Second player (local): Use WASD or Arrow keys
- Press ESC or P to pause

**Game Modes:**
- **VS Computer** - Choose from Easy, Medium, Hard, or Pro difficulty
- **VS Player 2** - Play on the same screen with a friend
- **Online** - Create a room with a code and invite anyone to join

## Features

### Game Options
- Pick your winning score: 3, 5, 7, or 10 points
- Choose table layout: Horizontal (landscape) or Vertical (portrait)
- Adjust AI difficulty to match your skill level

### Online Play
- Create rooms with simple 4-letter codes (like "A7B2")
- Join friends by entering their room code
- Play smoothly across different devices

### Polish & Details
- Sparks fly when the puck hits walls and mallets
- The puck leaves a glowing trail as it moves
- Goals flash with celebration effects
- Confetti bursts when you win
- Sound effects for every hit and score

## Technical Details

Built as a Progressive Web App (PWA) with:
- HTML5 Canvas for smooth 60fps gameplay
- WebSocket-based online multiplayer
- React Native mobile app version
- Responsive design that adapts to any screen size

## Getting Started

Simply open `air_hockey.html` in your browser to play single-player or local multiplayer, or use the full version with online support at `web/public/game.html`.

For the online multiplayer experience, run the Node.js server from `server/server.js`.
