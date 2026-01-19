const messages = require('../messages.json');

const getMessage = (path, params = {}) => {
    const keys = path.split('.');
    let msg = messages;
    for (const key of keys) {
        msg = msg[key];
        if (!msg) return path; // Return key if not found
    }

    if (typeof msg !== 'string') return path;

    return msg.replace(/{(\w+)}/g, (match, key) => {
        return typeof params[key] !== 'undefined' ? params[key] : match;
    });
};

module.exports = { getMessage };
