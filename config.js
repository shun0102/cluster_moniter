var CONFIG = {};

var env = process.env.NODE_ENV;

switch (env) {
case "production":
    CONFIG.HOST = "tsukuba000.intrigger.omni.hpcc.jp";
    CONFIG.PORT = 3000;
    CONFIG.LOGDIR = "/data/local/mikami/log";
    break;
case "test":
    CONFIG.LOGDIR = "/home/mikami/log";
    break;
default:
    CONFIG.HOST = "localhost";
    CONFIG.PORT = 8000;
    CONFIG.LOGDIR = "/Users/shun/log";
}

module.exports = CONFIG;