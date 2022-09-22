const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

let userSchema = new Schema({
    name : String,
    email : String,
    password : {
        type : String,
        select : false
    },
    resetPasswordToken : String,
    resetPasswordExpires : Date,
    urls: [{ type: Schema.Types.ObjectId, ref: 'Url' }]
});

userSchema.plugin(passportLocalMongoose, {usernameField : 'email'});
module.exports = mongoose.model('User', userSchema);