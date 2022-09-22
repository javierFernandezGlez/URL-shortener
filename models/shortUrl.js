const mongoose = require('mongoose');
const shortId = require('shortid');
const Schema = mongoose.Schema;

const urlSchema = new Schema({
    long: {
        type: String,
        required: true,
    },

    short: {
        type: String,
        required: true,
        default: shortId.generate
    },

    clicks: {
        type: Number,
        required: true,
        default: 0
    },

    dateCreated: {
        type: String,
        // required:true,
    }

    //user: [{ type: Schema.Types.ObjectId, ref: 'User' }]
})

module.exports = mongoose.model('Url', urlSchema)