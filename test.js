const config = require('./config');

const Redis = require('ioredis');

let redis = new Redis(config.redis);

const init = async () => {

    let streamName = 'hello';

    let streamOptions = {
        maxlen: 1000,
    }

    let groupName = 'helloRecv';

    let groupOptions = {
        id: '$',
        count: 1,
        block: 1000,
        url: 'http://localhost:4001/proc',
        headers: `{"Content-Type":"application/json"}`,
        retry: 10,
        timeout: 60,
        unique: false
    }

    await redis.sadd('HS:STREAMS', streamName);
    await redis.sadd('HS:GROUPS', groupName);
    await redis.hmset(`HS:STREAM:${streamName}`, streamOptions);
    await redis.sadd(`HS:STREAM:${streamName}:GROUPS`, groupName);
    await redis.sadd(`HS:GROUP:${groupName}:STREAMS`, streamName);
    await redis.hmset(`HS:GROUP:${groupName}`, groupOptions);


    groupName = 'worldRecv';

    groupOptions = {
        id: '$',
        count: 10,
        block: 1000,
        url: 'http://localhost:4001/proc',
        headers: `{"Content-Type":"application/json"}`,
        retry: 10,
        timeout: 60,
        unique: false
    }
    

    await redis.sadd(`HS:STREAM:${streamName}:GROUPS`, groupName);
    await redis.sadd(`HS:GROUP:${groupName}:STREAMS`, streamName);
    await redis.hmset(`HS:GROUP:${groupName}`, groupOptions);
    await redis.sadd('HS:GROUPS', groupName);


    streamName = 'world';

    streamOptions = {
        maxlen: 10000,
    }
    await redis.sadd('HS:STREAMS', streamName);
    await redis.sadd('HS:GROUPS', groupName);
    await redis.hmset(`HS:STREAM:${streamName}`, streamOptions);
    await redis.sadd(`HS:STREAM:${streamName}:GROUPS`, groupName);
    await redis.sadd(`HS:GROUP:${groupName}:STREAMS`, streamName);

    process.exit(1);
}

init();