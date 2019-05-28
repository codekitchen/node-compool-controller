function calculateChecksum(bytes) {
    let val = 0;
    for (let i = 0; i < bytes.length; ++i) {
        val += bytes[i];
    }
    return val;
}

class Message {
    constructor(bytes) {
        this.bytes = bytes;
    }

    givenChecksum() {
        return this.bytes.readUInt16BE(this.bytes.length-2);
    }

    calculatedChecksum() {
        return calculateChecksum(this.bytes.slice(0, -2));
    }

    checksumIsValid() {
        return this.givenChecksum() == this.calculatedChecksum();
    }

    isAck() {
        return false;
    }
}

class AckMessage extends Message {
    constructor(bytes) {
        super(bytes);
    }

    isAck() {
        return true;
    }
}

class StatusMessage extends Message {
    constructor(bytes) {
        super(bytes);

        this.spaOn =  (bytes[8] & 0b00000001) > 0;
        this.poolOn = (bytes[8] & 0b00000010) > 0;
        this.aux1On = (bytes[8] & 0b00000100) > 0;
        this.aux2On = (bytes[8] & 0b00001000) > 0;
        this.aux3On = (bytes[8] & 0b00010000) > 0;
        this.aux4On = (bytes[8] & 0b00100000) > 0;
        this.aux5On = (bytes[8] & 0b01000000) > 0;
        this.aux6On = (bytes[8] & 0b10000000) > 0;
        this.heatOn = (bytes[9] & 0b00000010) > 0;
        this.poolWaterTemp = bytes[11] * 0.25;
        this.spaWaterTemp = bytes[13] * 0.25;
        this.airTemp = bytes[17] * 0.5;
    }
}

class Command {
    constructor() {
        this.statusBytes = Buffer.alloc(5);
        this.enabledBytes = 0;
    }

    toggleAux(idx) {
        this.statusBytes[0] |= (1 << (idx+1));
        this.enabledBytes |= 0b100;
    }

    serialize() {
        let bytes = Buffer.concat([
            Buffer.from("\xFF\xAA\x00\x01\x82\x09\x00\x00", 'binary'),
            this.statusBytes,
            Buffer.from([0, this.enabledBytes])
        ]);
        let checksum = Buffer.alloc(2);
        checksum.writeUInt16BE(calculateChecksum(bytes));
        return Buffer.concat([bytes, checksum]);
    }
}

module.exports = { Command };
module.exports.ParseMessage = function (bytes) {
    if (bytes[4] == 0x02) {
        return parseStatusMessage(bytes);
    } else if (bytes[4] == 0x01) {
        return new AckMessage(bytes.slice(0, 9));
    }
    console.log("other message", bytes);
    return null;
}

function parseStatusMessage(bytes) {
    if (bytes.length < 24) return null;
    bytes = bytes.slice(0, 24);
    let msg = new StatusMessage(bytes);
    if (!msg.checksumIsValid()) {
        console.log(`invalid checksum, given: ${msg.givenChecksum()} calc: ${msg.calculatedChecksum()}`);
        console.log("bytes:", msg.bytes);
        // TODO: error
        return null;
    }
    return msg;
}
