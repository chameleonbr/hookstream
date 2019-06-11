const Redis = require('ioredis');

const producer = (config) => {
    let redis = new Redis(config.redis);

    return {
        push: (channel, msg) => {
            redis.xadd('HS:'+channel, '*', 'payload', msg);
        }
    }
}

module.exports = producer;