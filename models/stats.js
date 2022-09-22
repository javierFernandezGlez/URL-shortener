const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const stats = new Schema({
    totalClicks: {
        type: Number,
        required: true,
        default: 0
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