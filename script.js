// Grid configuration
const GRID_ROWS = 25;
const GRID_COLS = 50;
const START_ROW = 12;
const START_COL = 10;
const END_ROW = 12;
const END_COL = 40;

// Grid state
let grid = [];
let isMousePressed = false;
let isRunning = false;
let startNode = null;
let endNode = null;

// DOM elements
const gridElement = document.getElementById('grid');
const algorithmSelect = document.getElementById('algorithm');
const speedSelect = document.getElementById('speed');
const visualizeBtn = document.getElementById('visualize');
const clearPathBtn = document.getElementById('clear-path');
const clearWallsBtn = document.getElementById('clear-walls');
const clearAllBtn = document.getElementById('clear-all');
const nodesVisitedSpan = document.getElementById('nodes-visited');
const pathLengthSpan = document.getElementById('path-length');
const timeTakenSpan = document.getElementById('time-taken');

// Node class
class Node {
    constructor(row, col) {
        this.row = row;
        this.col = col;
        this.isStart = false;
        this.isEnd = false;
        this.isWall = false;
        this.isVisited = false;
        this.isPath = false;
        this.distance = Infinity;
        this.heuristic = 0;
        this.fScore = Infinity;
        this.parent = null;
        this.element = null;
    }

    reset() {
        this.isVisited = false;
        this.isPath = false;
        this.distance = Infinity;
        this.heuristic = 0;
        this.fScore = Infinity;
        this.parent = null;
        this.updateElement();
    }

    updateElement() {
        if (!this.element) return;
        
        this.element.className = 'cell';
        
        if (this.isStart) {
            this.element.classList.add('start');
        } else if (this.isEnd) {
            this.element.classList.add('end');
        } else if (this.isWall) {
            this.element.classList.add('wall');
        } else if (this.isPath) {
            this.element.classList.add('path');
        } else if (this.isVisited) {
            this.element.classList.add('visited');
        }
    }
}

// Initialize grid
function initializeGrid() {
    grid = [];
    gridElement.innerHTML = '';
    
    // Adjust grid size for mobile
    const isMobile = window.innerWidth <= 768;
    const rows = isMobile ? 20 : GRID_ROWS;
    const cols = isMobile ? 30 : GRID_COLS;
    
    gridElement.style.gridTemplateColumns = `repeat(${cols}, ${isMobile ? '12px' : '16px'})`;
    gridElement.style.gridTemplateRows = `repeat(${rows}, ${isMobile ? '12px' : '16px'})`;
    
    for (let row = 0; row < rows; row++) {
        const currentRow = [];
        for (let col = 0; col < cols; col++) {
            const node = new Node(row, col);
            const cellElement = document.createElement('div');
            cellElement.className = 'cell';
            cellElement.dataset.row = row;
            cellElement.dataset.col = col;
            
            // Set start and end nodes
            if (row === Math.floor(rows / 2) && col === Math.floor(cols / 4)) {
                node.isStart = true;
                startNode = node;
                cellElement.classList.add('start');
            } else if (row === Math.floor(rows / 2) && col === Math.floor(3 * cols / 4)) {
                node.isEnd = true;
                endNode = node;
                cellElement.classList.add('end');
            }
            
            node.element = cellElement;
            
            // Add event listeners
            cellElement.addEventListener('mousedown', handleMouseDown);
            cellElement.addEventListener('mouseenter', handleMouseEnter);
            cellElement.addEventListener('mouseup', handleMouseUp);
            
            gridElement.appendChild(cellElement);
            currentRow.push(node);
        }
        grid.push(currentRow);
    }
}

// Mouse event handlers
function handleMouseDown(e) {
    if (isRunning) return;
    
    isMousePressed = true;
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const node = grid[row][col];
    
    if (!node.isStart && !node.isEnd) {
        node.isWall = !node.isWall;
        node.updateElement();
    }
}

function handleMouseEnter(e) {
    if (!isMousePressed || isRunning) return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    const node = grid[row][col];
    
    if (!node.isStart && !node.isEnd) {
        node.isWall = true;
        node.updateElement();
    }
}

function handleMouseUp() {
    isMousePressed = false;
}

// Get neighbors of a node
function getNeighbors(node) {
    const neighbors = [];
    const { row, col } = node;
    
    // Check all 4 directions
    const directions = [
        [-1, 0], [1, 0], [0, -1], [0, 1]
    ];
    
    for (const [dRow, dCol] of directions) {
        const newRow = row + dRow;
        const newCol = col + dCol;
        
        if (newRow >= 0 && newRow < grid.length && 
            newCol >= 0 && newCol < grid[0].length) {
            neighbors.push(grid[newRow][newCol]);
        }
    }
    
    return neighbors;
}

// Manhattan distance heuristic for A*
function manhattanDistance(nodeA, nodeB) {
    return Math.abs(nodeA.row - nodeB.row) + Math.abs(nodeA.col - nodeB.col);
}

// Dijkstra's algorithm
async function dijkstra() {
    const visitedNodes = [];
    const unvisitedNodes = [];
    
    // Initialize
    for (const row of grid) {
        for (const node of row) {
            if (!node.isWall) {
                unvisitedNodes.push(node);
            }
        }
    }
    
    startNode.distance = 0;
    
    while (unvisitedNodes.length > 0) {
        // Sort nodes by distance
        unvisitedNodes.sort((a, b) => a.distance - b.distance);
        const currentNode = unvisitedNodes.shift();
        
        if (currentNode.distance === Infinity) break;
        
        currentNode.isVisited = true;
        visitedNodes.push(currentNode);
        
        if (currentNode === endNode) break;
        
        // Update neighbors
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            if (!neighbor.isWall && !neighbor.isVisited) {
                const tentativeDistance = currentNode.distance + 1;
                if (tentativeDistance < neighbor.distance) {
                    neighbor.distance = tentativeDistance;
                    neighbor.parent = currentNode;
                }
            }
        }
    }
    
    return visitedNodes;
}

// A* algorithm
async function aStar() {
    const visitedNodes = [];
    const openSet = [startNode];
    const closedSet = [];
    
    startNode.distance = 0;
    startNode.heuristic = manhattanDistance(startNode, endNode);
    startNode.fScore = startNode.heuristic;
    
    while (openSet.length > 0) {
        // Find node with lowest fScore
        openSet.sort((a, b) => a.fScore - b.fScore);
        const currentNode = openSet.shift();
        
        closedSet.push(currentNode);
        currentNode.isVisited = true;
        visitedNodes.push(currentNode);
        
        if (currentNode === endNode) break;
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            if (neighbor.isWall || closedSet.includes(neighbor)) continue;
            
            const tentativeGScore = currentNode.distance + 1;
            
            if (!openSet.includes(neighbor)) {
                openSet.push(neighbor);
            } else if (tentativeGScore >= neighbor.distance) {
                continue;
            }
            
            neighbor.parent = currentNode;
            neighbor.distance = tentativeGScore;
            neighbor.heuristic = manhattanDistance(neighbor, endNode);
            neighbor.fScore = neighbor.distance + neighbor.heuristic;
        }
    }
    
    return visitedNodes;
}

// Breadth-First Search
async function bfs() {
    const visitedNodes = [];
    const queue = [startNode];
    
    startNode.isVisited = true;
    
    while (queue.length > 0) {
        const currentNode = queue.shift();
        visitedNodes.push(currentNode);
        
        if (currentNode === endNode) break;
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            if (!neighbor.isWall && !neighbor.isVisited) {
                neighbor.isVisited = true;
                neighbor.parent = currentNode;
                queue.push(neighbor);
            }
        }
    }
    
    return visitedNodes;
}

// Depth-First Search
async function dfs() {
    const visitedNodes = [];
    const stack = [startNode];
    
    while (stack.length > 0) {
        const currentNode = stack.pop();
        
        if (currentNode.isVisited) continue;
        
        currentNode.isVisited = true;
        visitedNodes.push(currentNode);
        
        if (currentNode === endNode) break;
        
        const neighbors = getNeighbors(currentNode);
        for (const neighbor of neighbors) {
            if (!neighbor.isWall && !neighbor.isVisited) {
                neighbor.parent = currentNode;
                stack.push(neighbor);
            }
        }
    }
    
    return visitedNodes;
}

// Get shortest path
function getShortestPath() {
    const path = [];
    let currentNode = endNode;
    
    while (currentNode !== null) {
        path.unshift(currentNode);
        currentNode = currentNode.parent;
    }
    
    return path[0] === startNode ? path : [];
}

// Animate algorithm
async function animateAlgorithm(visitedNodes, path) {
    const speed = parseInt(speedSelect.value);
    
    // Animate visited nodes
    for (let i = 0; i < visitedNodes.length; i++) {
        const node = visitedNodes[i];
        if (node !== startNode && node !== endNode) {
            node.element.classList.add('current');
            setTimeout(() => {
                node.element.classList.remove('current');
                node.updateElement();
            }, speed);
        }
        
        nodesVisitedSpan.textContent = i + 1;
        
        if (i < visitedNodes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, speed));
        }
    }
    
    // Animate shortest path
    if (path.length > 0) {
        await new Promise(resolve => setTimeout(resolve, speed * 2));
        
        for (let i = 0; i < path.length; i++) {
            const node = path[i];
            if (node !== startNode && node !== endNode) {
                node.isPath = true;
                node.updateElement();
            }
            
            pathLengthSpan.textContent = path.length - 1;
            
            if (i < path.length - 1) {
                await new Promise(resolve => setTimeout(resolve, speed / 2));
            }
        }
    }
}

// Main visualization function
async function visualizeAlgorithm() {
    if (isRunning) return;
    
    isRunning = true;
    visualizeBtn.disabled = true;
    visualizeBtn.textContent = 'Running...';
    
    // Clear previous results
    clearPath();
    
    const startTime = performance.now();
    let visitedNodes = [];
    
    // Run selected algorithm
    const algorithm = algorithmSelect.value;
    switch (algorithm) {
        case 'dijkstra':
            visitedNodes = await dijkstra();
            break;
        case 'astar':
            visitedNodes = await aStar();
            break;
        case 'bfs':
            visitedNodes = await bfs();
            break;
        case 'dfs':
            visitedNodes = await dfs();
            break;
    }
    
    const endTime = performance.now();
    const timeTaken = Math.round(endTime - startTime);
    timeTakenSpan.textContent = `${timeTaken}ms`;
    
    // Get shortest path
    const shortestPath = getShortestPath();
    
    // Animate the algorithm
    await animateAlgorithm(visitedNodes, shortestPath);
    
    isRunning = false;
    visualizeBtn.disabled = false;
    visualizeBtn.textContent = 'Visualize Pathfinding';
}

// Clear functions
function clearPath() {
    for (const row of grid) {
        for (const node of row) {
            if (!node.isWall) {
                node.reset();
            }
        }
    }
    
    nodesVisitedSpan.textContent = '0';
    pathLengthSpan.textContent = '0';
    timeTakenSpan.textContent = '0ms';
}

function clearWalls() {
    for (const row of grid) {
        for (const node of row) {
            if (node.isWall) {
                node.isWall = false;
                node.updateElement();
            }
        }
    }
}

function clearAll() {
    for (const row of grid) {
        for (const node of row) {
            if (!node.isStart && !node.isEnd) {
                node.isWall = false;
                node.reset();
            }
        }
    }
    
    nodesVisitedSpan.textContent = '0';
    pathLengthSpan.textContent = '0';
    timeTakenSpan.textContent = '0ms';
}

// Event listeners
visualizeBtn.addEventListener('click', visualizeAlgorithm);
clearPathBtn.addEventListener('click', clearPath);
clearWallsBtn.addEventListener('click', clearWalls);
clearAllBtn.addEventListener('click', clearAll);

// Prevent context menu on right click
document.addEventListener('contextmenu', e => e.preventDefault());

// Handle window resize
window.addEventListener('resize', () => {
    if (!isRunning) {
        initializeGrid();
    }
});

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeGrid();
    
    // Add some initial walls for demonstration
    setTimeout(() => {
        const centerRow = Math.floor(grid.length / 2);
        const startCol = Math.floor(grid[0].length / 3);
        const endCol = Math.floor(2 * grid[0].length / 3);
        
        // Create a vertical wall with gaps
        for (let col = startCol; col < endCol; col++) {
            if (col % 4 !== 0) { // Leave gaps every 4th cell
                const node = grid[centerRow][col];
                if (!node.isStart && !node.isEnd) {
                    node.isWall = true;
                    node.updateElement();
                }
            }
        }
    }, 500);
});