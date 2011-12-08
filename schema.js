var mongoose = require('mongoose')
    , Schema = mongoose.Schema;

var dstatSchema = new Schema({
	hostname:String,
	dstat: {},
	time: Date,
	type: String
    });

mongoose.model('Dstat', dstatSchema);
var Dstat = mongoose.model('Dstat');

mongoose.connect('mongodb://localhost/fluent');

//Dstat.where('hostname', 'tsukuba000').limit(1).desc('time').run(print);
module.exports = Dstat;