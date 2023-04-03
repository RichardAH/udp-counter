const port = 12001
const return_port = 12002
const dgram = require('dgram')
const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })

// mapping: timeslice => ip => hit count
let table = {};


socket.on('message', (msg, rinfo) =>
{
    console.log(`socket got: ${msg} from ${rinfo.address}:${rinfo.port}`);

    const timeslice_float = (+new Date())/60000;
    const inv_fraction = 1.0 - (timeslice_float % 1.0);
    const timeslice_curr = Math.floor(timeslice_float);
    const timeslice_prev = timeslice_curr - 1;

    // msg is the IP
    msg = (msg + '').toLowerCase().trim();

    // increment current time window
    if (table[timeslice_curr] === undefined)
        table[timeslice_curr] = {};

    if (table[timeslice_curr][msg] === undefined)
        table[timeslice_curr][msg] = 1;
    else
        table[timeslice_curr][msg]++;

    // compute time window across current and previous via average
    const current_count =
        Math.ceil(
        (table[timeslice_prev] === undefined || table[timeslice_prev][msg] === undefined ? 0 : table[timeslice_prev][msg]) * inv_fraction +
            table[timeslice_curr][msg]);
    
    // send count back
    const outmsg = msg + '-' + current_count + "\n";
    socket.send(outmsg, 0, outmsg.length, return_port, rinfo.address);

    // garbage collection
    let to_clean = Object.keys(table).sort();
    for (let x in to_clean)
    {
        const timeslice_expired = to_clean[x];
        if (timeslice_expired >= timeslice_prev)
            break;

        delete table[timeslice_expired];
    }

});


socket.on('listening', () =>
{
  const address = socket.address();
  console.log(`socket listening ${address.address}:${address.port}`);
});

socket.bind(port);
