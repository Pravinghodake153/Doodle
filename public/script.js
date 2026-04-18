const socket = io();

// ====== Get UI Elements ======
const joinUI = document.getElementById("join-ui");
const gameUI = document.getElementById("game-ui");
const nameInput = document.getElementById("playerName");
const roomInput = document.getElementById("roomId");
const joinBtn = document.getElementById("joinBtn");
const playerCountSpan = document.getElementById("player-count");

const canvas = document.getElementById("drawing-board");
const ctx = canvas.getContext("2d");
const canvasWrapper = document.querySelector(".canvas-wrapper");

const playersList = document.getElementById("players-list");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatForm = document.getElementById("chat-form");
const timerDisplay = document.getElementById("timer");
const wordDisplay = document.getElementById("word-display");

const brushColorPicker = document.getElementById("brush-color");
const fillColorPicker = document.getElementById("fill-color");
const sizePicker = document.getElementById("size-picker");
const brushBtn = document.getElementById("brush-btn");
const fillBtn = document.getElementById("fill-btn");
const clearBtn = document.getElementById("clear-btn");
const eraserBtn = document.getElementById("eraser-btn");
const undoBtn = document.getElementById("undo-btn");
const redoBtn = document.getElementById("redo-btn");
const toolbar = document.getElementById("toolbar");
const wordSelection = document.getElementById("word-selection");
const wordOptionsDiv = document.getElementById("word-options");

// ====== State Variables ======
let currentTool = "brush"; // "brush", "eraser", "fill"
let isDrawer = false;
let isDrawing = false;
let currentX = 0;
let currentY = 0;
let brushColor = "#000000";
let fillColorHex = "#ff0000";
let drawSize = 5;
let isEraser = false;
let currentTheme = localStorage.getItem("skribblTheme") || "white"; // "white", "dark"

// UI Elements for new features
const brushPreview = document.getElementById("brush-preview");
const themeWhiteBtn = document.getElementById("theme-white-btn");
const themeDarkBtn = document.getElementById("theme-dark-btn");

// Apply theme on load
function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem("skribblTheme", theme);
    document.body.className = `theme-${theme}`;
    
    // Update button states in modal
    if(themeWhiteBtn && themeDarkBtn) {
        themeWhiteBtn.classList.toggle('active', theme === 'white');
        themeDarkBtn.classList.toggle('active', theme === 'dark');
    }
}
applyTheme(currentTheme);

themeWhiteBtn.addEventListener("click", () => applyTheme("white"));
themeDarkBtn.addEventListener("click", () => applyTheme("dark"));

// Brush Preview Logic
function updateBrushPreview(e) {
    if (!isDrawer || currentTool === "fill") {
        brushPreview.style.display = "none";
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Position using CSS pixels relative to the container
    brushPreview.style.left = x + "px";
    brushPreview.style.top = y + "px";
    
    // We need to account for canvas scaling if the CSS width != internal width
    const cssToCanvasScale = rect.width / canvas.width;
    const previewSize = drawSize * cssToCanvasScale;
    
    brushPreview.style.width = previewSize + "px";
    brushPreview.style.height = previewSize + "px";
    brushPreview.style.display = "block";
}

canvas.addEventListener("mousemove", (e) => {
    updateBrushPreview(e);
});
canvas.addEventListener("mouseenter", () => {
    if(isDrawer && currentTool !== "fill") brushPreview.style.display = "block";
});
canvas.addEventListener("mouseleave", () => {
    brushPreview.style.display = "none";
});

// Throttling for socket emissions (prevent lag)
let lastEmitTime = 0;

// Proper scaling to prevent blurry lines
function resizeCanvas() {
    const parentWidth = canvasWrapper.clientWidth;
    const parentHeight = canvasWrapper.clientHeight - (toolbar.style.display !== "none" ? toolbar.clientHeight : 0);
    
    // Support High-DPI screens
    const ratio = window.devicePixelRatio || 1;
    
    // Save previous drawing
    const imageData = canvas.width > 0 ? ctx.getImageData(0, 0, canvas.width, canvas.height) : null;

    canvas.width = parentWidth * ratio;
    canvas.height = parentHeight * ratio;
    
    // Keep canvas visually the same size
    canvas.style.width = parentWidth + "px";
    canvas.style.height = parentHeight + "px";

    ctx.scale(ratio, ratio);
    
    if (imageData) {
        ctx.putImageData(imageData, 0, 0);
    }
}

// ====== Resize Handle Logic ====== //
function makeResizable(resizer, sidebar, isLeft) {
    let startX, startWidth;

    resizer.addEventListener('mousedown', function(e) {
        startX = e.clientX;
        startWidth = parseInt(document.defaultView.getComputedStyle(sidebar).width, 10);
        
        // Prevent iframing issues like selecting text
        document.body.style.userSelect = 'none';
        
        document.documentElement.addEventListener('mousemove', doDrag);
        document.documentElement.addEventListener('mouseup', stopDrag);
    });

    // Touch support for mobile dragging
    resizer.addEventListener('touchstart', function(e) {
        startX = e.touches[0].clientX;
        startWidth = parseInt(document.defaultView.getComputedStyle(sidebar).width, 10);
        document.body.style.userSelect = 'none';
        document.documentElement.addEventListener('touchmove', doDragTouch, {passive: false});
        document.documentElement.addEventListener('touchend', stopDragTouch);
    });

    function doDrag(e) {
        if(isLeft) {
             sidebar.style.width = (startWidth + e.clientX - startX) + 'px';
        } else {
             sidebar.style.width = (startWidth - e.clientX + startX) + 'px';
        }
        resizeCanvas();
    }
    
    function doDragTouch(e) {
        if(isLeft) {
             sidebar.style.width = (startWidth + e.touches[0].clientX - startX) + 'px';
        } else {
             sidebar.style.width = (startWidth - e.touches[0].clientX + startX) + 'px';
        }
        resizeCanvas();
    }

    function stopDrag() {
        document.documentElement.removeEventListener('mousemove', doDrag);
        document.documentElement.removeEventListener('mouseup', stopDrag);
        document.body.style.userSelect = '';
    }
    
    function stopDragTouch() {
        document.documentElement.removeEventListener('touchmove', doDragTouch);
        document.documentElement.removeEventListener('touchend', stopDragTouch);
        document.body.style.userSelect = '';
    }
}

makeResizable(document.getElementById('resizer-left'), document.getElementById('left-sidebar'), true);
makeResizable(document.getElementById('resizer-right'), document.getElementById('right-sidebar'), false);

// ====== LocalStorage & Invite Setup ======
const urlParams = new URLSearchParams(window.location.search);
const inviteRoom = urlParams.get('room');
const savedName = localStorage.getItem("skribblName");
const savedRoom = localStorage.getItem("skribblRoom");

if (savedName) nameInput.value = savedName;
if (inviteRoom) {
    roomInput.value = inviteRoom;
    // Hide the room input if joining via direct invite link
    roomInput.style.display = "none";
} else if (savedRoom) {
    roomInput.value = savedRoom;
}

// Settings Modal
const settingsModal = document.getElementById('settings-modal');
document.getElementById('settings-btn').addEventListener('click', () => {
    settingsModal.style.display = 'flex';
    document.getElementById('modal-room-id').innerText = socket.roomId || roomInput.value;
    document.getElementById('invite-link').value = `${window.location.origin}/?room=${socket.roomId || roomInput.value}`;
});
document.getElementById('header-invite-btn').addEventListener('click', () => document.getElementById('settings-btn').click());
document.querySelector('.close-btn').addEventListener('click', () => settingsModal.style.display = 'none');
document.getElementById('copy-btn').addEventListener('click', () => {
    const linkInput = document.getElementById('invite-link');
    linkInput.select(); document.execCommand('copy');
    alert("Invite link copied!");
});

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById("mobile-menu-btn");
const leftSidebar = document.getElementById("left-sidebar");
if (mobileMenuBtn && leftSidebar) {
    mobileMenuBtn.addEventListener("click", () => {
        leftSidebar.classList.toggle("mobile-hide");
        // Update button text for feedback
        mobileMenuBtn.textContent = leftSidebar.classList.contains("mobile-hide") ? "📊" : "☰";
        resizeCanvas();
    });
}

// ====== Join Room Mechanism ======
joinBtn.addEventListener("click", () => {
    const playerName = nameInput.value.trim();
    const roomId = roomInput.value.trim();
    
    if (playerName && roomId) {
        localStorage.setItem("skribblName", playerName);
        localStorage.setItem("skribblRoom", roomId);
        socket.roomId = roomId; // Local tracking
        
        joinUI.style.display = "none";
        gameUI.style.display = "flex";
        
        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        // Wait for server acknowledgement to verify name isn't taken
        socket.emit("joinRoom", { playerName, roomId }, (response) => {
            if (response && response.error) {
                alert(response.error);
                // Reveal UI again if failed
                joinUI.style.display = "flex";
                gameUI.style.display = "none";
                return;
            }
        });
    } else {
        alert("Please enter both Name and Room ID");
    }
});

// ====== Canvas Drawing Mechanism ======

function setTool(tool) {
    currentTool = tool;
    isEraser = (tool === "eraser");
    
    // Manage active states using B&W classes
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    
    // Reset inline styles that might have been applied previously
    brushBtn.style.background = "";
    fillBtn.style.background = "";
    eraserBtn.style.background = "";
    undoBtn.style.background = "";
    redoBtn.style.background = "";
    clearBtn.style.background = "";
    
    if (tool === "brush") brushBtn.classList.add('active');
    else if (tool === "fill") fillBtn.classList.add('active');
    else if (tool === "eraser") eraserBtn.classList.add('active');
}

brushBtn.addEventListener("click", () => setTool("brush"));
fillBtn.addEventListener("click", () => setTool("fill"));
eraserBtn.addEventListener("click", () => setTool("eraser"));

brushColorPicker.addEventListener("change", e => {
    brushColor = e.target.value;
    if(currentTool === "fill" || currentTool === "eraser") setTool("brush");
});
fillColorPicker.addEventListener("change", e => {
    fillColorHex = e.target.value;
    if(currentTool === "brush" || currentTool === "eraser") setTool("fill");
});

sizePicker.addEventListener("change", e => drawSize = e.target.value);

// ====== Undo / Redo Mechanism ======
let undoStack = [];
let redoStack = [];

function saveState() {
    if(!isDrawer) return;
    // Save image as base64 string because it handles scaling natively across different clients
    undoStack.push(canvas.toDataURL());
    // Limit history memory
    if(undoStack.length > 20) undoStack.shift(); 
    redoStack = []; // Any new action clears the redo future
}

function restoreState(stackToPop, stackToPush) {
    if(stackToPop.length === 0) return;
    
    // Save current state before overriding
    stackToPush.push(canvas.toDataURL());
    
    const stateStr = stackToPop.pop();
    
    const img = new Image();
    img.src = stateStr;
    img.onload = () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        // Broadcast the exact canvas pixels to everyone to keep them perfectly synced
        if(isDrawer) {
            socket.emit("syncCanvas", canvas.toDataURL());
        }
    };
}

undoBtn.addEventListener("click", () => {
    if(isDrawer) restoreState(undoStack, redoStack);
});

redoBtn.addEventListener("click", () => {
    if(isDrawer) restoreState(redoStack, undoStack);
});

// Receive sync canvas string
socket.on("syncCanvas", (dataStr) => {
    const img = new Image();
    img.src = dataStr;
    img.onload = () => {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.restore();
    };
});

function drawLine(x0, y0, x1, y1, color, size, emit = false, eraserMode = false) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    
    // Smooth drawing
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = size;
    
    // Eraser Logic
    if (eraserMode) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = size * 2; // Make eraser slightly bigger
    } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = color;
    }
    
    ctx.stroke();
    ctx.closePath();

    // Aggressive Socket Emission rate (5ms throttle) for absolute raw drawing speed
    const now = Date.now();
    if (emit && isDrawer && (now - lastEmitTime > 5)) {
        // We use absolute pixels because the canvas handles the scale() internally
        socket.emit("draw", {
             x0: x0, 
             y0: y0, 
             x1: x1, 
             y1: y1, 
             color, 
             size,
             eraserMode
        });
        lastEmitTime = now;
    }
}

// Mouse position calculation
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    // Get mouse/touch relative to visual canvas size (not internal buffer size)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    return {
        x: (clientX - rect.left),
        y: (clientY - rect.top)
    };
}

// Flood Fill Algorithm (Paint Bucket)
function floodFill(startX, startY, fillColorHex, emit = false) {
    const ratio = window.devicePixelRatio || 1;
    // Get actual pixel coordinates based on retina display scaling
    const x = Math.round(startX * ratio);
    const y = Math.round(startY * ratio);
    
    // Convert hex to RGBA
    const r = parseInt(fillColorHex.slice(1,3), 16);
    const g = parseInt(fillColorHex.slice(3,5), 16);
    const b = parseInt(fillColorHex.slice(5,7), 16);
    const a = 255;
    
    // We must temporarily remove transform to read full unscaled image buffer
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    const data = imageData.data;
    const w = canvas.width;
    const h = canvas.height;
    
    if(x < 0 || y < 0 || x >= w || y >= h) return;
    
    const startPos = (y * w + x) * 4;
    const startR = data[startPos];
    const startG = data[startPos + 1];
    const startB = data[startPos + 2];
    const startA = data[startPos + 3];

    // If clicking same color, do nothing
    if (r === startR && g === startG && b === startB && a === startA) return;

    const matchStartColor = (pos) => {
        // Fast blank canvas check (sometimes Alpha is 0 instead of white)
        if(startA === 0 && data[pos+3] === 0) return true;
        return data[pos] === startR && data[pos+1] === startG && data[pos+2] === startB && data[pos+3] === startA;
    }

    const pixelStack = [[x, y]];
    
    // Optimized Scanline Flood Fill
    while(pixelStack.length > 0) {
        const newPos = pixelStack.pop();
        let currX = newPos[0];
        let currY = newPos[1];
        let pixelPos = (currY * w + currX) * 4;
        
        while(currY-- >= 0 && matchStartColor(pixelPos)) {
            pixelPos -= w * 4;
        }
        
        pixelPos += w * 4;
        currY++;
        
        let reachLeft = false;
        let reachRight = false;
        
        while(currY++ < h - 1 && matchStartColor(pixelPos)) {
            data[pixelPos] = r;
            data[pixelPos+1] = g;
            data[pixelPos+2] = b;
            data[pixelPos+3] = 255; // Solid color
            
            if(currX > 0) {
                if(matchStartColor(pixelPos - 4)) {
                    if(!reachLeft) {
                        pixelStack.push([currX - 1, currY]);
                        reachLeft = true;
                    }
                } else if(reachLeft) {
                    reachLeft = false;
                }
            }
            
            if(currX < w - 1) {
                if(matchStartColor(pixelPos + 4)) {
                    if(!reachRight) {
                        pixelStack.push([currX + 1, currY]);
                        reachRight = true;
                    }
                } else if(reachRight) {
                    reachRight = false;
                }
            }
            pixelPos += w * 4;
        }
    }
    
    // Write back
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.putImageData(imageData, 0, 0);
    ctx.restore();

    if (emit && isDrawer) {
        socket.emit("fill", { x: startX, y: startY, color: fillColorHex });
    }
}

function startDraw(e) {
    if(!isDrawer) return;
    
    saveState(); // Save state before modifying
    
    const pos = getPos(e);
    
    if (currentTool === "fill") {
        floodFill(pos.x, pos.y, fillColorHex, true);
        isDrawing = false;
        return;
    }

    isDrawing = true;
    currentX = pos.x;
    currentY = pos.y;
}

function draw(e) {
    if(!isDrawing || !isDrawer || currentTool === "fill") return;
    const pos = getPos(e);
    drawLine(currentX, currentY, pos.x, pos.y, brushColor, drawSize, true, isEraser);
    currentX = pos.x;
    currentY = pos.y;
}

function endDraw() {
    if (!isDrawing) return;
    isDrawing = false;
    // Send one final unthrottled draw event so the last dot connects perfectly
    socket.emit("draw", {
         x0: currentX, 
         y0: currentY, 
         x1: currentX, 
         y1: currentY, 
         color: brushColor, 
         size: drawSize,
         eraserMode: isEraser
    });
}

// Event Listeners
canvas.addEventListener("mousedown", startDraw);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", endDraw);
canvas.addEventListener("mouseout", endDraw);

canvas.addEventListener("touchstart", (e) => { e.preventDefault(); startDraw(e); }, { passive: false });
canvas.addEventListener("touchmove", (e) => { e.preventDefault(); draw(e); }, { passive: false });
canvas.addEventListener("touchend", endDraw);
canvas.addEventListener("touchcancel", endDraw);

// Receive sync drawings using broadcast.emit
socket.on("draw", (data) => {
    drawLine(data.x0, data.y0, data.x1, data.y1, data.color, data.size, false, data.eraserMode);
});

// Receive sync fills
socket.on("fill", (data) => {
    floodFill(data.x, data.y, data.color, false);
});

// Clear canvas
clearBtn.addEventListener("click", () => {
    if(!isDrawer) return;
    saveState();
    socket.emit("clearCanvas");
});
socket.on("clearCanvas", () => {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
});


// ====== Real-Time Gameplay Updates ======
// Player List & Scoreboard Update
socket.on("updatePlayers", (players) => {
    playersList.innerHTML = "";
    playerCountSpan.innerText = players.length;
    players.sort((a,b) => b.score - a.score);
    
    players.forEach((p, index) => {
        const li = document.createElement("li");
        const isDrawingText = (p.id === currentDrawerId) ? `<span style="color:red;font-size:12px;">(🎨 Drawing)</span>` : "";
        const isYou = (socket.id === p.id) ? " (You)" : "";
        
        let kickHTML = "";
        if (socket.id !== p.id) {
            kickHTML = `
                <div class="kebab-menu" onclick="toggleDropdown(event, this)">
                    ⋮
                    <div class="dropdown-content">
                        <span class="dropdown-item" onclick="kickPlayer('${p.id}')">👟 Vote Kick</span>
                    </div>
                </div>
            `;
        }
        
        li.innerHTML = `<span>#${index+1} <strong>${p.name}</strong>${isYou} ${isDrawingText}</span> <div style="display:flex;align-items:center;gap:10px;"><strong>${p.score}</strong> ${kickHTML}</div>`;
        if(p.id === currentDrawerId) li.style.backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--highlight-green').trim();
        playersList.appendChild(li);
    });
});

// Kebab menu drop logic
window.toggleDropdown = function(e, element) {
    e.stopPropagation();
    // Close others
    document.querySelectorAll('.kebab-menu').forEach(menu => {
        if(menu !== element) menu.classList.remove('active');
    });
    element.classList.toggle('active');
};
document.addEventListener('click', () => {
    document.querySelectorAll('.kebab-menu').forEach(menu => menu.classList.remove('active'));
});

// Kick wrapper invoked directly from inline HTML
window.kickPlayer = function(targetId) {
    socket.emit("kickPlayer", targetId);
};

socket.on("kicked", () => {
    alert("You were kicked from the room!");
    window.location.reload();
});

let currentDrawerId = null;

socket.on("turnStart", ({ drawerId, drawerName, timer }) => {
    // Clear history on new turn
    undoStack = [];
    redoStack = [];

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Wipe last drawing
    ctx.restore();

    timerDisplay.innerText = timer;
    wordSelection.style.display = "none";
    currentDrawerId = drawerId;
    isDrawer = socket.id === drawerId;
    setTool("brush"); // Reset to brush when new turn begins
    
    if (isDrawer) {
        toolbar.style.display = "flex";
        wordDisplay.innerText = "Choose a word!";
    } else {
        toolbar.style.display = "none";
        wordDisplay.innerText = `${drawerName} is drawing...`;
    }
    
    // Broadcast drawer status to scoreboard immediately
    const playersListItems = playersList.querySelectorAll("li");
    // (This visually updates local, but updatePlayers socket takes care of it properly too)
    setTimeout(resizeCanvas, 50); 
});

socket.on("wordOptions", (options) => {
    wordOptionsDiv.innerHTML = "";
    wordSelection.style.display = "flex";
    
    options.forEach(word => {
        const btn = document.createElement("button");
        btn.innerText = word;
        btn.addEventListener("click", () => {
            socket.emit("chooseWord", word);
            wordSelection.style.display = "none";
            wordDisplay.innerText = `You: ${word}`;
        });
        wordOptionsDiv.appendChild(btn);
    });
});

socket.on("wordChosen", (length) => {
    if(!isDrawer) {
        // Initial fallback
        wordDisplay.innerText = "_ ".repeat(length).trim();
    }
});

socket.on("drawerWord", (word) => {
    if(isDrawer) {
        wordSelection.style.display = "none";
        wordDisplay.innerText = `You are drawing: ${word}`;
    }
});

socket.on("wordHint", (hintString) => {
    if(!isDrawer) {
        // Formats the spaced-out string: _ _ a _ _
        wordDisplay.innerText = hintString;
    }
});

// Clock tick
socket.on("timerUpdate", (time) => {
    timerDisplay.innerText = time;
    if(time !== "80" && parseInt(time) <= 10) {
        timerDisplay.parentElement.style.backgroundColor = "#ffcccc";
    } else {
        timerDisplay.parentElement.style.backgroundColor = "#f8d7da";
    }
});


// ====== Chat & Guessing System ======
chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = chatInput.value.trim();
    if(msg) {
        socket.emit("chatMessage", msg);
        chatInput.value = ""; 
    }
});

socket.on("chatMessage", ({ sender, text, highlight }) => {
    const div = document.createElement("div");
    
    if(highlight) {
         div.style.backgroundColor = "#d4edda";
         div.style.color = "#155724";
         div.style.fontWeight = "bold";
    } else if(sender === "System") {
         div.style.backgroundColor = "#fff3cd";
         div.style.color = "#856404";
         div.style.fontStyle = "italic";
    }
    
    if (sender === "System") {
         div.innerHTML = `${text}`;
    } else {
         div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    }
    
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight; 
});

// ====== Round Over Logic ======
const roundOverModal = document.getElementById("round-over-modal");
const roundWordDisplay = document.getElementById("round-word-display");
const roundPointsDisplay = document.getElementById("round-points-display");
const roundCloseBtn = document.getElementById("round-modal-close");

socket.on("roundOver", ({ word, roundPoints, players, nextDrawerId }) => {
    roundWordDisplay.innerHTML = `The word was: <strong style="color:gold; font-size: 32px;">${word || "Nothing!"}</strong>`;
    
    // Sort players by who earned the most points this round!
    players.sort((a,b) => (roundPoints[b.id] || 0) - (roundPoints[a.id] || 0));
    
    let htmlList = `<div style="display:flex; flex-direction:column; gap:8px;">`;
    players.forEach((p, index) => {
        const earned = roundPoints[p.id] || 0;
        const YouStr = (p.id === socket.id) ? " (You)" : "";
        if (earned > 0) {
            htmlList += `<div style="display:flex; justify-content:space-between; font-family: monospace; font-size: 18px; color: #4ade80;">
                <span>#${index+1} <strong>${p.name}</strong>${YouStr}</span>
                <span><strong>+${earned}</strong></span>
            </div>`;
        } else {
            htmlList += `<div style="display:flex; justify-content:space-between; font-family: monospace; font-size: 18px; color: #ff4d4d;">
                <span>#${index+1} <strong>${p.name}</strong>${YouStr}</span>
                <span><strong>+0</strong></span>
            </div>`;
        }
    });
    htmlList += `</div>`;
    
    roundPointsDisplay.innerHTML = htmlList;
    
    // Logic for next drawer vs others
    if (socket.id === nextDrawerId) {
        // You are drawing next! Forced wait for 10s to see stats
        roundCloseBtn.style.display = "none";
    } else {
        // You aren't drawing next, you can close it early
        roundCloseBtn.style.display = "block";
    }

    roundOverModal.style.display = "flex";
    
    // Auto-close after 10s for everyone (server will move turn anyway)
    if (window.roundModalTimeout) clearTimeout(window.roundModalTimeout);
    window.roundModalTimeout = setTimeout(() => {
        roundOverModal.style.display = "none";
    }, 10000); 
});

roundCloseBtn.addEventListener("click", () => {
    roundOverModal.style.display = "none";
    if (window.roundModalTimeout) clearTimeout(window.roundModalTimeout);
});
