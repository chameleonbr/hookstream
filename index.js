delete process.env['HTTP_PROXY']
delete process.env['http_proxy']
delete process.env['HTTPS_PROXY']
delete process.env['https_proxy']


const config = require('./config');

const polka = require('polka');
const send = require('@polka/send-type');
const Redis = require('ioredis');
const bodyParser = require('body-parser');

const consumers = require('./lib/consumers')(config);
const producer = require('./lib/producer')(config);

const {
    PORT = 4000
} = process.env;

const app = polka();

let redis = new Redis(config.redis);

app.use(bodyParser.json({
    type: '*/*'
}));

app.post('/trigger/:channel', (req, res) => {
    let channel = req.params.channel;
    res.writeHead(200, {
        'Content-Type': 'application/json'
    });
    producer.push(channel, JSON.stringify(req.body));
    let json = JSON.stringify(req.body);
    res.end('ok');
});

app.listen(PORT);