class StatusMessage {
    airTemp = 0.0;
}

module.export = function (bytes) {
    if (bytes[0] == 15) {
        return parseStatusMessage(bytes);
    }
    return null;
}

function parseStatusMessage(bytes) {
    if (bytes.length < 24) return null;
    let msg = new StatusMessage();
    msg.airTemp = bytes[17] * 0.5;
    return msg;
}