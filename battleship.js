// ---- Constants ----
const ROWS = "ABCDEFGHIJ";
const BOARD_SIZE = 10;
const DIRECTIONS = ["horizontal", "vertical"];

const SHIPS = [
    { name: "Aircraft Carrier", letter: "A", size: 5 },
    { name: "Battleship", letter: "B", size: 4 },
    { name: "Cruiser", letter: "C", size: 3 },
];

let isPlayerTurn = true; //Player will always go first.
let gameOver = false; 

// --- Board Creation Functions ----

function createHeaderRow() {
    const headerRow = document.createElement("tr");
    headerRow.appendChild(document.createElement("th"));
    for (let c = 1; c <= BOARD_SIZE; c++) {
        const th = document.createElement("th");
        th.textContent = c;
        headerRow.appendChild(th);
    }
    return headerRow;
}

function createBoardRow(prefix, rowLetter) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = rowLetter;
    tr.appendChild(th);
    for (let c = 1; c <= BOARD_SIZE; c++) {
        const td = document.createElement("td");
        td.id = prefix + rowLetter + c;
        tr.appendChild(td);
    }
    return tr;
}

// ---- Board Creation ----

function createBoard(boardId, prefix) {
    const board = document.getElementById(boardId);

    board.querySelector("thead").appendChild(createHeaderRow());

    for (let r = 0; r < ROWS.length; r++) {
        board.querySelector("tbody").appendChild(createBoardRow(prefix, ROWS[r]));
    }
}

// ---- Ship Placement Helpers ----

/** Returns a cell ID (e.g. "comp-A5") offset from a starting position in the given direction. */
function getCellId(prefix, direction, startRowIndex, startCol, offset) {
    if (direction === "horizontal") {
        return prefix + ROWS[startRowIndex] + (startCol + offset);
    }
    return prefix + ROWS[startRowIndex + offset] + startCol;
}

/** Returns a random direction, row index and column for ship placement. */
function getRandomPosition() {
    const direction = DIRECTIONS[Math.floor(Math.random() * 2)];
    const startRowIndex = Math.floor(Math.random() * BOARD_SIZE);
    const startCol = Math.floor(Math.random() * BOARD_SIZE) + 1;
    return { direction, startRowIndex, startCol };
}

/** Checks whether a ship of the given size fits on the board from the start position. */
function shipFits(direction, startRowIndex, startCol, size) {
    if (direction === "horizontal") {
        return startCol + size - 1 <= BOARD_SIZE;
    }
    return startRowIndex + size - 1 <= BOARD_SIZE - 1;
}

/** Returns true if any cell in the proposed range already contains a ship. */
function hasOverlap(prefix, direction, startRowIndex, startCol, size) {
    for (let i = 0; i < size; i++) {
        const cellId = getCellId(prefix, direction, startRowIndex, startCol, i);
        const cell = document.getElementById(cellId);
        if (cell.classList.contains("ship")) {
            return true;
        }
    }
    return false;
}

function placeShip(prefix, ship, direction, startRowIndex, startCol) {
    for (let i = 0; i < ship.size; i++) {
        const cellId = getCellId(prefix, direction, startRowIndex, startCol, i);
        const cell = document.getElementById(cellId);
        cell.classList.add("ship");
        cell.dataset.ship = ship.letter;
        cell.textContent = ship.letter;
    }
}

// ---- Ship Placement ----

function placeCompShips() {
    for (const ship of SHIPS) {
        let placed = false;
        while (!placed) {
            const { direction, startRowIndex, startCol } = getRandomPosition();

            if (!shipFits(direction, startRowIndex, startCol, ship.size)) continue;
            if (hasOverlap("comp-", direction, startRowIndex, startCol, ship.size)) continue;

            placeShip("comp-", ship, direction, startRowIndex, startCol);
            placed = true;
        }
    }
}

// ---- Player Ship Placement ----

/**
 * parseCellId — extracts the row letter and column number from a cell ID.
 * e.g. "player-A5" with prefix "player-" → { rowIndex: 0, col: 5 }
 * 
 * We need this because when the player hovers over a cell, we only know
 * the cell's DOM id. We have to reverse-engineer the grid position from it
 * so we can calculate which cells the ship would cover.
 */
function parseCellId(prefix, cellId) {
    const stripped = cellId.replace(prefix, "");   // "A5"
    const rowLetter = stripped[0];                  // "A"
    const col = parseInt(stripped.slice(1));         // 5
    return { rowIndex: ROWS.indexOf(rowLetter), col: col };
}

/**
 * getShipCellIds — returns an array of cell IDs that a ship would occupy.
 * 
 * Starting from (startRowIndex, startCol), going in `direction`, 
 * we generate `size` cell IDs. If ANY cell falls off the board, 
 * we return null to signal "doesn't fit".
 * 
 * This is used by both the hover preview and the click-to-place logic.
 */
function getShipCellIds(prefix, direction, startRowIndex, startCol, size) {
    const ids = [];
    for (let i = 0; i < size; i++) {
        let r = startRowIndex;
        let c = startCol;
        if (direction === "horizontal") {
            c += i;
        } else {
            r += i;
        }
        // Check bounds
        if (r < 0 || r >= BOARD_SIZE || c < 1 || c > BOARD_SIZE) {
            return null;  // ship goes off the board
        }
        ids.push(prefix + ROWS[r] + c);
    }
    return ids;
}

/**
 * setupPlayerPlacement — the main function that wires up the entire
 * placement phase. It:
 *   1. Listens for mouse hover on player board cells → shows preview
 *   2. Listens for clicks on player board cells → places ships
 *   3. Listens for the rotate button → toggles direction
 *   4. Moves to the game phase when all ships are placed
 */
function setupPlayerPlacement() {
    // --- State ---
    // These variables live inside this function (closure).
    // They persist across hover/click events but aren't global.
    let currentShipIndex = 0;
    let currentDirection = "horizontal";

    // --- DOM references ---
    const playerBoard = document.getElementById("player-board");
    const statusMsg = document.getElementById("status-msg");
    const rotateBtn = document.getElementById("rotate-btn");

    // Add a CSS class so we can style the board differently during placement
    playerBoard.classList.add("placing");

    // --- Helper: update the status message ---
    function updateStatus() {
        const ship = SHIPS[currentShipIndex];
        statusMsg.textContent = "Place your " + ship.name + " (" + ship.size + ")";
    }

    // --- Helper: clear any preview highlights ---
    function clearPreview() {
        const previews = playerBoard.querySelectorAll(".preview, .preview-invalid");
        previews.forEach(function (cell) {
            cell.classList.remove("preview", "preview-invalid");
        });
    }

    /**
     * showPreview — highlights the cells a ship would cover.
     * 
     * "valid" means: all cells fit on the board AND none overlap existing ships.
     * Valid → blue highlight (class "preview")
     * Invalid → red highlight (class "preview-invalid")
     */
    function showPreview(startRowIndex, startCol) {
        const ship = SHIPS[currentShipIndex];
        const cellIds = getShipCellIds("player-", currentDirection, startRowIndex, startCol, ship.size);

        // If ship goes off the board, show invalid on just the hovered cell
        if (cellIds === null) {
            const hovered = document.getElementById("player-" + ROWS[startRowIndex] + startCol);
            if (hovered) hovered.classList.add("preview-invalid");
            return false;
        }

        // Check if any cell already has a ship
        let valid = true;
        for (const id of cellIds) {
            const cell = document.getElementById(id);
            if (cell.classList.contains("ship")) {
                valid = false;
                break;
            }
        }

        // Add the appropriate highlight class
        const previewClass = valid ? "preview" : "preview-invalid";
        for (const id of cellIds) {
            document.getElementById(id).classList.add(previewClass);
        }

        return valid;
    }

    // --- Event: mouse enters a cell → show preview ---
    playerBoard.addEventListener("mouseover", function (e) {
        // Only respond to <td> elements (ignore <th> headers)
        if (e.target.tagName !== "TD") return;
        if (currentShipIndex >= SHIPS.length) return;

        clearPreview();
        const pos = parseCellId("player-", e.target.id);
        showPreview(pos.rowIndex, pos.col);
    });

    // --- Event: mouse leaves the board → clear preview ---
    playerBoard.addEventListener("mouseout", function (e) {
        if (e.target.tagName !== "TD") return;
        clearPreview();
    });

    // --- Event: click a cell → place the ship ---
    playerBoard.addEventListener("click", function (e) {
        if (e.target.tagName !== "TD") return;
        if (currentShipIndex >= SHIPS.length) return;

        clearPreview();
        const pos = parseCellId("player-", e.target.id);
        const ship = SHIPS[currentShipIndex];

        // Re-check validity before placing
        if (!shipFits(currentDirection, pos.rowIndex, pos.col, ship.size)) return;
        if (hasOverlap("player-", currentDirection, pos.rowIndex, pos.col, ship.size)) return;

        // Place the ship using the existing helper function
        placeShip("player-", ship, currentDirection, pos.rowIndex, pos.col);

        // Move to the next ship
        currentShipIndex++;

        if (currentShipIndex >= SHIPS.length) {
            // All ships placed — transition to game phase!
            startGame();
        } else {
            updateStatus();
        }
    });

    // --- Event: rotate button → toggle direction ---
    rotateBtn.addEventListener("click", function () {
        if (currentDirection === "horizontal") {
            currentDirection = "vertical";
            rotateBtn.textContent = "Rotate: Vertical";
        } else {
            currentDirection = "horizontal";
            rotateBtn.textContent = "Rotate: Horizontal";
        }
    });
}

/**
 * startGame — called when all player ships are placed.
 * Hides placement UI, shows fire controls, removes the "placing" class.
 */
function startGame() {
    document.getElementById("player-board").classList.remove("placing");
    document.getElementById("placement-controls").style.display = "none";
    document.getElementById("game-controls").style.display = "block";
    document.getElementById("status-msg").textContent = "Your turn! - choose a cell to fire at.";
}

// ---- Dropdown Helpers ----

/** Creates and appends an <option> element to a <select>. */
function addOption(selectElement, value) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectElement.appendChild(option);
}

// ---- Dropdown Setup ----

/** Fills the row and column dropdown menus with their options. */
function populateDropdowns() {
    const rowSelect = document.getElementById("row-select");
    for (let r = 0; r < ROWS.length; r++) {
        addOption(rowSelect, ROWS[r]);
    }

    const colSelect = document.getElementById("column-select");
    for (let c = 1; c <= BOARD_SIZE; c++) {
        addOption(colSelect, c);
    }
}

// ---- Game Logic Helpers ----

function alreadyFired(cell) {
    return cell.classList.contains("hit") || cell.classList.contains("miss");
}

function fireAtCell(cell) {
    if (cell.classList.contains("ship")) {
        cell.classList.add("hit");
        cell.textContent = "X";
    } else {
        cell.classList.add("miss");
        cell.textContent = "O";
    }
}

function countHits (prefix) {
    let hits = 0;
    for (const rowLetter of ROWS) {
        for (let c = 1; c <= BOARD_SIZE; c++) {
            const cell = document.getElementById(prefix + rowLetter + c);
            if (cell.classList.contains("ship") && cell.classList.contains("hit")) {
                hits++;
            }
        }
    }
    return hits;
}

function getTotalShipCells() {
    let total = 0;
    for (const ship of SHIPS) {
        total += ship.size;
    }
    return total;
}

function checkForWin(prefix) {
    return countHits(prefix) === getTotalShipCells();
}

function compTurn() {
    const statusMsg = document.getElementById("status-msg");
    statusMsg.textContent = "Computer's turn...";

    setTimeout(function () {
        let cell;
        do {
            const rowIndex = Math.floor(Math.random() * BOARD_SIZE);
            const col = Math.floor(Math.random() * BOARD_SIZE) + 1;
            cell = document.getElementById("player-" + ROWS[rowIndex] + col);
        } while (alreadyFired(cell));

        fireAtCell(cell);

        if (checkForWin("player-")) {
            alert("Computer wins! All your ships have been sunk.");
            gameOver = true;
            return;
        }

        isPlayerTurn = true;
        statusMsg.textContent = "Your turn!";
    }, 1000); 
}



// ---- Game Logic ----

function setupFireButton() {
    const rowSelect = document.getElementById("row-select");
    const colSelect = document.getElementById("column-select");

    document.getElementById("fire-btn").addEventListener("click", function () {
        if (gameOver) {
            return;
        }
        if (!isPlayerTurn) {
            return;
        }

        const cellId = "comp-" + rowSelect.value + colSelect.value;
        const cell = document.getElementById(cellId);

        if (alreadyFired(cell)) {
            alert("You already fired there! Pick another cell.");
            return;
        }

        fireAtCell(cell);

        if (checkForWin("comp-")) {
            gameOver = true;
            document.getElementById("status-msg").textContent = "You win! All enemy ships have been sunk.";
            return;
        }

        isPlayerTurn = false;
        compTurn();
    });
}

// ---- Initialise ----
function init() {
    createBoard("comp-board", "comp-");
    createBoard("player-board", "player-");
    placeCompShips();          // Computer places ships randomly (hidden from player)
    populateDropdowns();       // Fill the Row/Column dropdowns for firing later
    setupFireButton();         // Wire up the Fire button for later
    setupPlayerPlacement();    // Start the placement phase on the player board
}

init();