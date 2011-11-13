var CONFIG = {};

var env = process.env.NODE_ENV;

switch (env) {
case "production":
    CONFIG.LOGDIR = "/home/mikami/log";
    break;
case "test":
    CONFIG.LOGDIR = "/home/mikami/log";
    break;
default:
    CONFIG.LOGDIR = "/Users/shun/log";
}

module.exports = CONFIG;