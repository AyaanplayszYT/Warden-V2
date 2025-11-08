// Simple in-memory spam log store
const logs = [];

function add(entry) {
    logs.push(entry);
    if (logs.length > 100) logs.shift(); // Keep last 100 logs
}

function getAll() {
    return logs.slice().reverse();
}

module.exports = { add, getAll };
