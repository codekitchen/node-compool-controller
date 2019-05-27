class StatusMessage {
    constructor() {
        this.airTemp = 0.0;
    }
}

module.exports = function (bytes) {
    if (bytes[0] == 15) {
        return parseStatusMessage(bytes);
    }
    return null;
}

function parseStatusMessage(bytes) {
    if (bytes.length < 24) return null;
    let msg = new StatusMessage();
    msg.airTemp = bytes[15] * 0.5;
    return msg;
}
