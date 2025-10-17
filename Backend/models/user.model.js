"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var mongoose_1 = require("mongoose");
var userSchema = new mongoose_1.Schema({
    name: {
        type: String,
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        unique: true
    },
    image: {
        type: String,
        default: ""
    },
    clerkId: { type: String, required: true, unique: true },
}, {
    timestamps: true
});
var User = mongoose_1.default.model('User', userSchema);
exports.default = User;
