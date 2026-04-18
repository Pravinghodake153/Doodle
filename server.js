const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// Store game state for multiple rooms
const rooms = {};

// Hardcoded word list for the game
const wordList = [
    "apple", "computer", "mountain", "car", "banana", "tree", "sun", "moon", 
    "phone", "cat", "dog", "fish", "butterfly", "pizza", "guitar", "doctor",
    "hospital", "house", "window", "ocean", "beach", "spider", "snake"
];

// Helper to pick 3 random words for the drawer to choose from
function generateWords() {
    const shuffled = wordList.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
}

// Logic to advance the game to the next player's turn
function nextTurn(roomId) {
    const room = rooms[roomId];
    if (!room || room.players.length === 0) return;

    // Reset round state
    room.timer = 80;
    room.word = ""; // Word is blank until drawer chooses
    room.guessedCorrectly = [];
    room.roundPoints = {}; // Track who earned what this specific round
    
    // Select the next player as the drawer (rotate through list)
    room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
    room.currentDrawer = room.players[room.currentPlayerIndex].id;

    // Send the 3 options to the drawer
    const options = generateWords();
    const drawerName = room.players[room.currentPlayerIndex].name;

    io.to(roomId).emit("turnStart", {
        drawerId: room.currentDrawer,
        drawerName: drawerName,
        timer: room.timer
    });
    
    io.to(roomId).emit("updatePlayers", room.players); // Re-broadcast to show 🎨 badge
    
    const dSocket = io.sockets.sockets.get(room.currentDrawer);
    if (dSocket) {
        dSocket.emit("wordOptions", options);
    }

    // clear canvas
    io.to(roomId).emit("clearCanvas");
    // Send a placeholder timer update during selection
    io.to(roomId).emit("timerUpdate", "80");

    // ============================================
    // Auto Pick Logic (8 Second Limit)
    // ============================================
    if (room.selectionTimeout) clearTimeout(room.selectionTimeout);
    
    const expectedDrawerId = room.currentDrawer;
    room.selectionTimeout = setTimeout(() => {
        // Only trigger if no word was picked yet, and room remains active under the original Drawer
        if (!room.word && room.currentDrawer === expectedDrawerId) {
            room.word = options[0];
            io.to(roomId).emit("wordChosen", room.word.length);
            
            const targetS = io.sockets.sockets.get(expectedDrawerId);
            if (targetS) targetS.emit("drawerWord", room.word);
            
            startRound(roomId);
        }
    }, 8000);
}

function startRound(roomId) {
    const room = rooms[roomId];
    if(!room) return;
    
    room.timer = 80; // 80 seconds per round
    
    // Setup the initial hint string array
    room.hintTokens = room.word.split("").map(char => char === " " ? "  " : "_");
    io.to(roomId).emit("wordHint", room.hintTokens.join(" "));
    
    // Clear any existing timer
    if(room.timerInterval) clearInterval(room.timerInterval);
    
    room.timerInterval = setInterval(() => {
        room.timer--;
        // Broadcast the remaining time to all room players
        io.to(roomId).emit("timerUpdate", room.timer);
        
        // Calculate Max Hints needed
        let maxHints = 3;
        if (room.word.length <= 3) maxHints = 1;
        else if (room.word.length === 4) maxHints = 2;

        // Distribute hint drop times based on allowed max hints
        let shouldDropHint = false;
        if (maxHints === 3 && (room.timer === 60 || room.timer === 40 || room.timer === 20)) shouldDropHint = true;
        if (maxHints === 2 && (room.timer === 55 || room.timer === 25)) shouldDropHint = true;
        if (maxHints === 1 && room.timer === 40) shouldDropHint = true;

        if (shouldDropHint) {
            let unrevealed = [];
            for (let i = 0; i < room.word.length; i++) {
                if (room.hintTokens[i] === "_") unrevealed.push(i);
            }
            if (unrevealed.length > 0) {
                const rndIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
                room.hintTokens[rndIndex] = room.word[rndIndex];
                io.to(roomId).emit("wordHint", room.hintTokens.join(" "));
            }
        }

        // Check if time is up
        if (room.timer <= 0) {
            clearInterval(room.timerInterval);
            io.to(roomId).emit("chatMessage", { sender: "System", text: `Time's up! The word was '${room.word || 'not chosen'}'` });
            const nextDrawerIdx = (room.currentPlayerIndex + 1) % room.players.length;
            const nextDrawer = room.players[nextDrawerIdx];
            io.to(roomId).emit("roundOver", { 
                word: room.word, 
                roundPoints: room.roundPoints || {}, 
                players: room.players,
                nextDrawerId: nextDrawer ? nextDrawer.id : null 
            });
            setTimeout(() => nextTurn(roomId), 10000);
        } 
        // Check if everyone (except drawer) has guessed the word correctly
        else if (room.word && room.guessedCorrectly.length === room.players.length - 1 && room.players.length > 1) {
             clearInterval(room.timerInterval);
             io.to(roomId).emit("chatMessage", { sender: "System", text: `Everyone guessed the word!` });
             
             const nextDrawerIdx = (room.currentPlayerIndex + 1) % room.players.length;
             const nextDrawer = room.players[nextDrawerIdx];
             io.to(roomId).emit("roundOver", { 
                 word: room.word, 
                 roundPoints: room.roundPoints || {}, 
                 players: room.players,
                 nextDrawerId: nextDrawer ? nextDrawer.id : null 
             });
             setTimeout(() => nextTurn(roomId), 10000);
        }
    }, 1000);
}

// Handle all Socket.io Events
io.on("connection", (socket) => {
    
    // Player joins a room
    socket.on("joinRoom", ({ playerName, roomId }, callback) => {
        // Prevent duplicate names in the same room
        if (rooms[roomId]) {
            const nameTaken = rooms[roomId].players.some(p => p.name.trim().toLowerCase() === playerName.trim().toLowerCase());
            if (nameTaken) {
                if (callback) callback({ error: `The name '${playerName}' is already taken in this room! Please choose a different name.` });
                return;
            }
        }
        
        socket.join(roomId);

        // Create the room structure if it doesn't exist yet
        if(!rooms[roomId]) {
            rooms[roomId] = {
                roomId,
                players: [],
                currentDrawer: null,
                word: "",
                timer: 0,
                timerInterval: null,
                currentPlayerIndex: -1,
                guessedCorrectly: [],
                roundPoints: {},
                kickVotes: {},
                selectionTimeout: null
            };
        }

        // Add player to the room
        const newPlayer = { id: socket.id, name: playerName, score: 0 };
        rooms[roomId].players.push(newPlayer);
        socket.roomId = roomId; // Store the room ID on the socket for future events
        
        // Broadcast updated player list and join message
        io.to(roomId).emit("updatePlayers", rooms[roomId].players);
        io.to(roomId).emit("chatMessage", { sender: "System", text: `${playerName} joined the room.` });

        // If at least 2 players are in the room and game hasn't started, start it
        if(rooms[roomId].players.length > 1 && !rooms[roomId].currentDrawer) {
            nextTurn(roomId);
        } else if (rooms[roomId].currentDrawer) {
            // Late joiner support: send current game state
            const room = rooms[roomId];
            const drawer = room.players.find(p => p.id === room.currentDrawer);
            socket.emit("turnStart", {
                drawerId: room.currentDrawer,
                drawerName: drawer ? drawer.name : "Someone",
                timer: room.timer || "80"
            });
            if (room.word) {
                socket.emit("wordChosen", room.word.length);
            }
        }

        // Acknowledge successful join
        if (callback) callback({ success: true });
    });

    socket.on("chooseWord", (word) => {
        const room = rooms[socket.roomId];
        if(!room || room.currentDrawer !== socket.id || room.word !== "") return;
        
        // Disable auto-pick since they manually clicked!
        if (room.selectionTimeout) {
            clearTimeout(room.selectionTimeout);
            room.selectionTimeout = null;
        }

        room.word = word;
        
        // Notify others about word length
        io.to(room.roomId).emit("wordChosen", word.length);
        // Only verify back to drawer what they picked
        socket.emit("drawerWord", word);

        // Start the timer for drawing visually
        startRound(room.roomId);
    });

    // Sync drawing coordinates
    socket.on("draw", (data) => {
         const room = rooms[socket.roomId];
         if(room && room.currentDrawer === socket.id) {
             socket.to(socket.roomId).emit("draw", data);
         }
    });

    // Sync Fill tools
    socket.on("fill", (data) => {
         const room = rooms[socket.roomId];
         if(room && room.currentDrawer === socket.id) {
             socket.to(socket.roomId).emit("fill", data);
         }
    });

    // Sync Entire Canvas states (used by Undo/Redo for perfect pixel mapping)
    socket.on("syncCanvas", (dataStr) => {
         const room = rooms[socket.roomId];
         if(room && room.currentDrawer === socket.id) {
             socket.to(socket.roomId).emit("syncCanvas", dataStr);
         }
    });

    // Sync clear canvas action
    socket.on("clearCanvas", () => {
         const room = rooms[socket.roomId];
         if(room && room.currentDrawer === socket.id) {
             io.to(socket.roomId).emit("clearCanvas");
         }
    });

    // Handle chat Messages and guesses
    socket.on("chatMessage", (msg) => {
        const room = rooms[socket.roomId];
        if(!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if(!player) return;

        // Guess checking logic: Make it case insensitive
        const isCorrectGuess = room.word && msg.toLowerCase() === room.word.toLowerCase();
        
        // Prevent Drawer from guessing, and prevent users who already guessed from guessing again
        if (isCorrectGuess && room.currentDrawer !== socket.id && !room.guessedCorrectly.includes(socket.id)) {
            // Correct guess!
            room.guessedCorrectly.push(socket.id);
            
            // Fair Scoring Formula:
            // 1. Guessers earn points smoothly tied to the raw percentage of time remaining.
            const pointsFromTime = Math.max(25, Math.floor((room.timer / 80) * 500));
            
            // 2. Prevent Drawer from getting 10x points in an 11 player lobby!
            // We strictly divide the reward by the total amount of guessers in the room,
            // capping the Drawer's maximum theoretical points to roughly match a 1st place guesser.
            const totalGuessers = Math.max(1, room.players.length - 1);
            const drawerPoints = Math.floor(pointsFromTime / totalGuessers);
            
            player.score += pointsFromTime;
            room.roundPoints[socket.id] = (room.roundPoints[socket.id] || 0) + pointsFromTime;
            
            // Reward Drawer for drawing well enough to be guessed
            const drawer = room.players.find(p => p.id === room.currentDrawer);
            if(drawer) {
                drawer.score += drawerPoints;
                room.roundPoints[drawer.id] = (room.roundPoints[drawer.id] || 0) + drawerPoints;
            }

            io.to(room.roomId).emit("updatePlayers", room.players);
            io.to(room.roomId).emit("chatMessage", { sender: "System", text: `${player.name} guessed the word!`, highlight: true });
        } 
        // If not a correct guess, it's just a normal chat message
        else if (!isCorrectGuess) {
             io.to(room.roomId).emit("chatMessage", { sender: player.name, text: msg });
        }
    });

    // Handle Democratic Voting to Kick
    socket.on("kickPlayer", (targetId) => {
        const room = rooms[socket.roomId];
        if(!room) return;
        
        // Ensure tracking exists
        if(!room.kickVotes) room.kickVotes = {};
        if(!room.kickVotes[targetId]) room.kickVotes[targetId] = new Set();
        
        // Register this player's vote
        room.kickVotes[targetId].add(socket.id);
        
        // Find target details
        const targetPlayer = room.players.find(p => p.id === targetId);
        const votingPlayer = room.players.find(p => p.id === socket.id);
        if(!targetPlayer || !votingPlayer) return;

        const currentVotes = room.kickVotes[targetId].size;
        // Total players excluding the target
        const requiredVotes = Math.max(1, Math.ceil((room.players.length - 1) * 0.6));
        
        // Announce the vote cast
        io.to(room.roomId).emit("chatMessage", { sender: "System", text: `[Vote Kick] ${votingPlayer.name} voted to kick ${targetPlayer.name} (${currentVotes}/${requiredVotes} required)` });

        // Kick logic
        if(currentVotes >= requiredVotes) {
            const targetSocket = io.sockets.sockets.get(targetId);
            if(targetSocket && targetSocket.roomId === socket.roomId) {
                 io.to(room.roomId).emit("chatMessage", { sender: "System", text: `${targetPlayer.name} was successfully kicked from the room.` });
                 targetSocket.emit("kicked");
                 targetSocket.leave(socket.roomId);
                 targetSocket.disconnect(true);
            }
        }
    });

    // Handle Disconnects
    socket.on("disconnect", () => {
        const roomId = socket.roomId;
        if(rooms[roomId]) {
            const room = rooms[roomId];
            const playerIndex = room.players.findIndex(p => p.id === socket.id);
            
            if(playerIndex !== -1) {
                const playerName = room.players[playerIndex].name;
                room.players.splice(playerIndex, 1);
                
                // Cleanup their existing kick record mappings
                if(room.kickVotes && room.kickVotes[socket.id]) {
                    delete room.kickVotes[socket.id];
                }
                
                // Update players list and notify room
                io.to(roomId).emit("updatePlayers", room.players);
                io.to(roomId).emit("chatMessage", { sender: "System", text: `${playerName} left the room.` });

                if(room.players.length === 0) {
                    clearInterval(room.timerInterval);
                    delete rooms[roomId];
                } else if(room.currentDrawer === socket.id) {
                    // Drawer left
                    io.to(roomId).emit("chatMessage", { sender: "System", text: `⚠️ The current drawer disconnected! Skipping turn...` });
                    nextTurn(roomId);
                }
            }
        }
    });
});

// Load environment variables for local development
try {
    require("dotenv").config();
} catch (e) {
    // dotenv not installed, using system env or defaults
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
