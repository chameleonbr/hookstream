delete process.env['HTTP_PROXY']
delete process.env['http_proxy']
delete process.env['HTTPS_PROXY']
delete process.env['https_proxy']

const Redis = require('ioredis');

const config = require('../config');

let redis = new Redis(config.redis);

const axios = require('axios');

const logger = require('pino')();

const {
    workerData
} = require('worker_threads');

let lastIdStreams = null;

(async () => {

    lastIdStreams = await Promise.all(workerData.streams.map((stream) => {
        return redis.get(`HS:${workerData.group}:${stream}`).then((data) => {
            if (data != null) {
                return data;
            } else {
                return '>';
            }
        })
    }));
    while (1) {
        let data = await redis.xreadgroup('GROUP', workerData.group, `cn-${workerData.id}`, 'COUNT', workerData.config.count, 'BLOCK', workerData.config.block, 'STREAMS', workerData.streams.map((stream) => 'HS:' + stream), lastIdStreams);
        if (data != null) {
            let channel = data[0][0];
            let [msgId, payload] = data[0][1][0];
            //console.log(workerData.group, data[0][1]);


            let msgs = data[0][1].map((doc) => {
                return {
                    id: doc[0],
                    payload: JSON.parse(doc[1][1])
                }
            });
            logger.info(workerData.group, msgs);
            try {
                workerData.config.headers['X-Msg-Id'] = msgId;
                let res = await axios({
                    method: 'post',
                    url: workerData.config.url,
                    headers: workerData.config.headers,
                    timeout: workerData.config.timeout,
                    data: msgs
                });
                if (res.status == 200) {
                    redis.xack(channel, workerData.group, msgs.map((doc)=>{return doc.id}));
                }
                logger.info(msgId, 'ok');

            } catch (e) {
                logger.error(e,{
                    method: 'post',
                    url: workerData.config.url,
                    headers: workerData.config.headers,
                    timeout: workerData.config.timeout,
                    data: payload[1]
                });
                redis.xack(channel, workerData.group, msgs.map((doc)=>{return doc.id}));
            }
        }
    }
})();