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

        this.aux1On =  (bytes[8] & 0b00000001) > 0;
        this.aux2On = (bytes[8] & 0b00000010) > 0;
        this.aux3On = (bytes[8] & 0b00000100) > 0;
        this.aux4On = (bytes[8] & 0b00001000) > 0;
        this.aux5On = (bytes[8] & 0b00010000) > 0;
        this.aux6On = (bytes[8] & 0b00100000) > 0;
        this.aux7On = (bytes[8] & 0b01000000) > 0;
        this.aux8On = (bytes[8] & 0b10000000) > 0;
        this.heatOn = (bytes[9] & 0b00000010) > 0;
        this.poolHeaterOn = (bytes[10] & 0b00110000) > 0;
        this.spaHeaterOn = (bytes[10] & 0b11000000) > 0;
        this.poolWaterTemp = bytes[11] * 0.25;
        this.spaWaterTemp = bytes[13] * 0.25;
        this.desiredPoolWaterTemp = bytes[15] * 0.25;
        this.desiredSpaWaterTemp = bytes[16] * 0.25;
        this.airTemp = bytes[17] * 0.5;
    }
}

class Command {
    constructor(lastStatus) {
        this.bytes = Buffer.from("\xFF\xAA\x00\x01\x82\x09\x00\x00\x00\x00\x00\x00\x00\x00\x00", 'binary');
        // copy over the bits we do need
        if (lastStatus) {
            this.bytes[10] = lastStatus.bytes[10] & 0b11110000;
        }
    }

    toggleAux(idx) {
        this.bytes[8] |= (1 << (idx-1));
        this.enableBit(2);
    }

    setPoolHeater(on) {
        this.bytes[10] &= ~0b00110000;
        if (on)
            this.bytes[10] |= 0b00010000;
        this.enableBit(4);
    }

    setSpaHeater(on) {
        this.bytes[10] &= ~0b11000000;
        if (on)
            this.bytes[10] |= 0b01000000;
        this.enableBit(4);
    }

    setPoolTemp(value) {
        let temp = Number(value) * 4;
        this.bytes[11] = temp;
        this.enableBit(5);
    }

    setSpaTemp(value) {
        let temp = Number(value) * 4;
        this.bytes[12] = temp;
        this.enableBit(6);
    }

    enableBit(bit) {
        this.bytes[14] |= (1 << bit);
    }

    serialize() {
        let checksum = Buffer.alloc(2);
        checksum.writeUInt16BE(calculateChecksum(this.bytes));
        return Buffer.concat([this.bytes, checksum]);
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
