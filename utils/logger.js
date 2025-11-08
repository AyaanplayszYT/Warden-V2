// A simple logger utility for consistent console output.

const getTimestamp = () => {
    return new Date().toISOString();
};

const info = (message, ...args) => {
    console.log(`[${getTimestamp()}] [INFO] ${message}`, ...args);
};

const warn = (message, ...args) => {
    console.warn(`[${getTimestamp()}] [WARN] ${message}`, ...args);
};

const error = (message, ...args) => {
    console.error(`[${getTimestamp()}] [ERROR] ${message}`, ...args);
};

module.exports = {
    info,
    warn,
    error,
};
