// ---- Constants ----
const ROWS = "ABCDEFGHIJ";
const BOARD_SIZE = 10;
const DIRECTIONS = ["horizontal", "vertical"];

const SHIPS = [
    { name: "Aircraft Carrier", letter: "A", size: 5 },
    { name: "Battleship", letter: "B", size: 4 },
    { name: "Cruiser", letter: "C", size: 3 },
];

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

function createBoardRow(rowLetter) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = rowLetter;
    tr.appendChild(th);
    for (let c = 1; c <= BOARD_SIZE; c++) {
        const td = document.createElement("td");
        td.id = rowLetter + c;
        tr.appendChild(td);
    }
    return tr;
}

// ---- Board Creation ----

function createBoard(boardId) {
    const board = document.getElementById(boardId);

    board.querySelector("thead").appendChild(createHeaderRow());

    for (let r = 0; r < ROWS.length; r++) {
        board.querySelector("tbody").appendChild(createBoardRow(ROWS[r]));
    }
}

// ---- Ship Placement Helpers ----

/** Returns a cell ID (e.g. "A5") offset from a starting position in the given direction. */
function getCellId(direction, startRowIndex, startCol, offset) {
    if (direction === "horizontal") {
        return ROWS[startRowIndex] + (startCol + offset);
    }
    return ROWS[startRowIndex + offset] + startCol;
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
function hasOverlap(direction, startRowIndex, startCol, size) {
    for (let i = 0; i < size; i++) {
        const cellId = getCellId(direction, startRowIndex, startCol, i);
        const cell = document.getElementById(cellId);
        if (cell.classList.contains("ship")) {
            return true;
        }
    }
    return false;
}

function placeShip(ship, direction, startRowIndex, startCol) {
    for (let i = 0; i < ship.size; i++) {
        const cellId = getCellId(direction, startRowIndex, startCol, i);
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
            if (hasOverlap(direction, startRowIndex, startCol, ship.size)) continue;

            placeShip(ship, direction, startRowIndex, startCol);
            placed = true;
        }
    }
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

// ---- Game Logic ----

function setupFireButton() {
    const rowSelect = document.getElementById("row-select");
    const colSelect = document.getElementById("column-select");

    document.getElementById("fire-btn").addEventListener("click", function () {
        const cellId = rowSelect.value + colSelect.value;
        const cell = document.getElementById(cellId);

        if (alreadyFired(cell)) {
            alert("You already fired there! Pick another cell.");
            return;
        }

        fireAtCell(cell);
    });
}

// ---- Initialise ----
function init() {
    createBoard("comp-board");
    placeCompShips();
    populateDropdowns();
    setupFireButton();
}

init();