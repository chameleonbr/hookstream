const Redis = require('ioredis');

const {
    Worker,
    MessageChannel,
    MessagePort,
    isMainThread,
    parentPort
} = require('worker_threads');

const sleep = require('sleep-promise');

Redis.Command.setReplyTransformer('xinfo', function (result) {
    let sResult = [];
    if (Array.isArray(result)) {
        for (line of result) {
            var obj = {};
            for (var i = 0; i < line.length; i += 2) {
                obj[line[i]] = line[i + 1];
            }
            sResult.push(obj);
        }
    }
    return sResult;
});

const os = require('os');

const hostname = os.hostname();

const consumers = async (config) => {
    let redis = new Redis(config.redis);

    let groupsConfig = await redis.smembers('HS:GROUPS').then((groups) => {
        try {
            return Promise.all(groups.map((groupName) => {
                let config = null;
                return redis.hgetall(`HS:GROUP:${groupName}`).then((groupInfo) => {
                    config = groupInfo;
                    return redis.smembers(`HS:GROUP:${groupName}:STREAMS`);
                }).then(async (streams) => {
                    await Promise.all(streams.map((stream) => {
                        console.log(`${groupName} => ${stream}`);
                        return redis.xgroup('CREATE', 'HS:' + stream, groupName, config.id, 'MKSTREAM');
                    })).catch((e) => {
                        if (!e.message.includes('BUSYGROUP')) {
                            throw e;
                        }
                    });
                    return {
                        group: groupName,
                        config,
                        streams
                    };
                });
            }));
        } catch (e) {
            throw e;
        }
    });

    let streamConfig = await redis.smembers('HS:STREAMS').then((streams) => {
        try {
            return Promise.all(streams.map((streamName) => {
                let streamConfig = null;
                let groups = null;

                return redis.hgetall(`HS:STREAM:${streamName}`).then((_streamConfig) => {
                    console.log(_streamConfig);
                    streamConfig = _streamConfig;
                    return redis.smembers(`HS:STREAM:${streamName}:GROUPS`)
                }).then((_groups) => {
                    groups = _groups;
                    return redis.xinfo('GROUPS', 'HS:' + streamName);
                }).then((info) => {
                    return {
                        stream: streamName,
                        groups,
                        config: streamConfig,
                        info
                    }
                }).catch((e) => {
                    throw e;
                });
            }));
        } catch (e) {
            throw e;
        }
    }).catch((e) => {
        console.log(e);
        throw e;
    });

    let consId = 0;
    let worker = [];
    await sleep(5000);

    for (let group of groupsConfig) {
        worker[consId] = new Worker('./lib/consumer.js', {
            workerData: {
                ...group,
                id: consId
            }
        });
        consId++;
    }

    console.table(streamConfig)
    console.table(groupsConfig)


    return {
        streams: streamConfig,
        groups: groupsConfig
    }
}



module.exports = consumers;