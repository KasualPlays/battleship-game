// ---- Constants ----
const ROWS = "ABCDEFGHIJ";
const BOARD_SIZE = 10;
const DIRECTIONS = ["horizontal", "vertical"];

const SHIPS = [
    { name: "Aircraft Carrier", letter: "A", size: 5 },
    { name: "Battleship", letter: "B", size: 4 },
    { name: "Cruiser", letter: "C", size: 3 },
];

// ---- Board Creation ----
function createBoard(boardId) {
    const board = document.getElementById(boardId);

    // Header row with column numbers
    const headerRow = document.createElement("tr");
    headerRow.appendChild(document.createElement("th")); // empty corner cell
    for (let c = 1; c <= BOARD_SIZE; c++) {
        const th = document.createElement("th");
        th.textContent = c;
        headerRow.appendChild(th);
    }
    board.querySelector("thead").appendChild(headerRow);

    // Grid rows with row letters
    for (let r = 0; r < ROWS.length; r++) {
        const tr = document.createElement("tr");
        const th = document.createElement("th");
        th.textContent = ROWS[r];
        tr.appendChild(th);
        for (let c = 1; c <= BOARD_SIZE; c++) {
            const td = document.createElement("td");
            td.id = ROWS[r] + c;
            tr.appendChild(td);
        }
        board.querySelector("tbody").appendChild(tr);
    }
}

// ---- Ship Placement Helpers ----
function getCellId(direction, startRowIndex, startCol, offset) {
    if (direction === "horizontal") {
        return ROWS[startRowIndex] + (startCol + offset);
    }
    return ROWS[startRowIndex + offset] + startCol;
}

function getRandomPosition() {
    const direction = DIRECTIONS[Math.floor(Math.random() * 2)];
    const startRowIndex = Math.floor(Math.random() * BOARD_SIZE);
    const startCol = Math.floor(Math.random() * BOARD_SIZE) + 1;
    return { direction, startRowIndex, startCol };
}

function shipFits(direction, startRowIndex, startCol, size) {
    if (direction === "horizontal") {
        return startCol + size - 1 <= BOARD_SIZE;
    }
    return startRowIndex + size - 1 <= BOARD_SIZE - 1;
}

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

// ---- Dropdown Setup ----
function populateDropdowns() {
    const rowSelect = document.getElementById("row-select");
    for (let r = 0; r < ROWS.length; r++) {
        const option = document.createElement("option");
        option.value = ROWS[r];
        option.textContent = ROWS[r];
        rowSelect.appendChild(option);
    }

    const colSelect = document.getElementById("column-select");
    for (let c = 1; c <= BOARD_SIZE; c++) {
        const option = document.createElement("option");
        option.value = c;
        option.textContent = c;
        colSelect.appendChild(option);
    }
}

// ---- Game Logic ----
function setupFireButton() {
    const rowSelect = document.getElementById("row-select");
    const colSelect = document.getElementById("column-select");

    document.getElementById("fire-btn").addEventListener("click", function () {
        const cellId = rowSelect.value + colSelect.value;
        const cell = document.getElementById(cellId);

        if (cell.classList.contains("hit") || cell.classList.contains("miss")) {
            alert("You already fired there! Pick another cell.");
            return;
        }

        if (cell.classList.contains("ship")) {
            cell.classList.add("hit");
            cell.textContent = "X";
        } else {
            cell.classList.add("miss");
            cell.textContent = "O";
        }
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