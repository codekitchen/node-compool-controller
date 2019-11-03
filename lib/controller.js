const EventEmitter = require('events');

const SerialPort = require('serialport');
const Delimiter = require('@serialport/parser-delimiter');
const Queue = require('queue');

const { ParseMessage, Command } = require('./message_parser');
const SyncBytes = Buffer.from('\xFF\xAA', 'binary');

class Controller extends EventEmitter {
    constructor(path) {
        super();
        this.lastStatus = null;
        this.path = path;
        this.queue = new Queue({ concurrency: 1, autostart: true });
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

    sendCommand(edit, cb) {
        let command = new Command(this.lastStatus);
        edit(command);
        this.queue.push((qcb) => {
            this.port.write(command.serialize());
            this.waitForAck((err) => { cb(err); qcb(null); });
        });
    }

    toggleAux(idx, cb) {
        this.sendCommand(c => c.toggleAux(idx), cb);
    }

    setPoolHeater(on, cb) {
        this.sendCommand(c => c.setPoolHeater(on), cb);
    }

    setSpaHeater(on, cb) {
        this.sendCommand(c => c.setSpaHeater(on), cb);
    }

    setPoolTemp(value, cb) {
        this.sendCommand(c => c.setPoolTemp(value), cb);
    }

    setSpaTemp(value, cb) {
        this.sendCommand(c => c.setSpaTemp(value), cb);
    }

    setTime(hour, minute, cb) {
        this.sendCommand(c => c.setTime(hour, minute), cb);
    }

    waitForAck(cb) {
        let gotAck = false;
        let fn = () => { gotAck = true; cb(null); };
        this.once('ack', fn);
        // Wait 1s and then assume error
        setTimeout(() => {
            if (gotAck) return;
            this.off('ack', fn);
            cb(new Error('did not get ack'));
        }, 1000);
    }

    serialError(err) {
        this.emit('error', err);
    }
}

module.exports = Controller;
