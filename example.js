const udp_counter = (()=>
{
    const config = 
    {
        port: 12001,
        return_port: 12002,
        ip: "127.0.0.1"
    };


    const dgram = require('dgram');
    const socket_out = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    // timeslice -> ip -> hitcount
    let cache = {};

    socket.on('message', (msg, rinfo) =>
    {
        console.log(`socket pid=${process.pid} got: ${msg} from ${rinfo.address}:${rinfo.port}`);
        
        msg = (msg + '').trim();
        msg = msg.split('-', 2);
    
        if (msg.length != 2)
            return;

        const msg_ip = msg[0];
        const msg_count = msg[1];

        const timeslice = Math.floor((+ new Date())/90000);

        if (cache[timeslice] === undefined)
            cache[timeslice] = {};

        cache[timeslice][msg_ip] = msg_count;
        
        const timeslice_prev = timeslice - 1;
        let to_clean = Object.keys(cache).sort();
        for (let x in to_clean)
        {
            const timeslice_expired = to_clean[x];
            if (timeslice_expired >= timeslice_prev)
                break;

            delete cache[timeslice_expired];
        }
    });

    socket.on('listening', () =>
    {
      const address = socket.address();
      console.log(`socket listening ${address.address}:${address.port}, pid=${process.pid}`);
    });

    socket.bind(config.return_port);

    return (ip_raw) => { 
            ip_out = (ip_raw + '').toLowerCase().trim();
            // report the hit
            socket_out.send(ip_out, 0, ip_out.length, config.port, config.ip);
            // check the cache
            const timeslice = Math.floor((+ new Date())/90000);
            const timeslice_prev = timeslice - 1;
            console.log("Timeslice: " + timeslice);

            if (cache[timeslice] !== undefined && cache[timeslice][ip_out] !== undefined)
                return cache[timeslice][ip_out];
            
            if (cache[timeslice_prev] !== undefined && cache[timeslice_prev][ip_out] !== undefined)
                return cache[timeslice_prev][ip_out];
           
            return false;
        
    };
})();


console.log("Type an IP/ID to increment and get its counter:");

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
    console.log("udp_counter(" + line + ") = " + udp_counter(line));
});

rl.once('close', () => {
     // end of input
});
