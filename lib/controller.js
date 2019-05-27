const EventEmitter = require('events');

const SerialPort = require('serialport');
const Delimiter = require('@serialport/parser-delimiter');

const MessageParser = require('./message_parser');

class Controller extends EventEmitter {
    constructor(path) {
        super();
        this.path = path;
        let port = new SerialPort(path, { baudRate: 9600 });
        this.port = port.pipe(new Delimiter({ delimiter: Buffer.from('\xFF\xAA', 'binary') }));
        this.port.on('error', (err) => this.serialError(err));
        this.port.on('data', bytes => {
            let msg = MessageParser(bytes);
            if (msg) {
                this.emit('status', msg);
            }
        })
    }

    serialError(err) {
        this.emit('error', err);
    }
}