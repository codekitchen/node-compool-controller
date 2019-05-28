const EventEmitter = require('events');

const SerialPort = require('serialport');
const Delimiter = require('@serialport/parser-delimiter');

const { ParseMessage, Command } = require('./message_parser');
const SyncBytes = Buffer.from('\xFF\xAA', 'binary');

class Controller extends EventEmitter {
    constructor(path) {
        super();
        this.lastStatus = null;
        this.path = path;
        this.port = new SerialPort(path, { baudRate: 9600 });
        this.delim = this.port.pipe(new Delimiter({ delimiter: SyncBytes }));
        this.delim.on('error', (err) => this.serialError(err));
        this.delim.on('data', bytes => {
            bytes = Buffer.concat([SyncBytes, bytes]);
            let msg = ParseMessage(bytes);
            if (!msg) return;
            if (msg.isAck()) {
                this.emit('ack', msg);
            } else {
                this.lastStatus = msg;
                this.emit('status', msg);
            }
        })
    }

    toggleAux(idx, cb) {
        let command = new Command();
        command.toggleAux(idx);
        this.port.write(command.serialize());
        this.waitForAck(cb);
    }

    waitForAck(cb) {
        let gotAck = false;
        let fn = () => { gotAck = true; cb(null); };
        this.once('ack', fn);
        // Wait 1s and then assume error
        setTimeout(() => {
            if (gotAck) return;
            this.off(fn);
            cb(new Error('did not get ack'));
        }, 1000);
    }

    serialError(err) {
        this.emit('error', err);
    }
}

module.exports = Controller;
