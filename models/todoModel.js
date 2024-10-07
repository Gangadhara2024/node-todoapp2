const mongoose = require("mongoose")

const todoSchema = new mongoose.Schema({
    todo: {
        type: String,
        required: true,
        minLength: 3,
        maxLength: 80,
        trim: true
    },
    username: {
        type: String,
        required: true
    }
},
    {
        timestamps: true,
    }
);
const todoModel = mongoose.model("Todo", todoSchema);
module.exports = todoModel;