"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var user_model_js_1 = require("../../models/user.model.js");
var crypto_1 = require("crypto");
var router = (0, express_1.Router)();
var CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || '';
// Verify Clerk webhook signature
// function verifyClerkSignature(req: any): boolean {
//   const svixId = req.headers['svix-id'];
//   const svixTimestamp = req.headers['svix-timestamp'];
//   const svixSignature = req.headers['svix-signature'];
//   if (!svixId || !svixTimestamp || !svixSignature) return false;
//   const payload = req.body.toString('utf8');
//   const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
//   const secret = Buffer.from(CLERK_WEBHOOK_SECRET, 'base64');
//   const expectedSignature = crypto
//     .createHmac('sha256', secret)
//     .update(signedContent)
//     .digest('base64');
//   return svixSignature.includes(expectedSignature);
// }
function verifyClerkSignature(req) {
    var svixId = req.headers['svix-id'];
    var svixTimestamp = req.headers['svix-timestamp'];
    var svixSignature = req.headers['svix-signature']; // may be 'v1,...'
    if (!svixId || !svixTimestamp || !svixSignature)
        return false;
    var payload = req.body.toString('utf8');
    var signedContent = "".concat(svixId, ".").concat(svixTimestamp, ".").concat(payload);
    var secret = Buffer.from(CLERK_WEBHOOK_SECRET, 'base64');
    var expectedSignature = crypto_1.default
        .createHmac('sha256', secret)
        .update(signedContent)
        .digest('base64');
    // svix-signature header can have multiple comma-separated signatures with versions
    // e.g., "v1,abcd,v1,efgh"
    var valid = svixSignature.split(',').some(function (sig) { return sig.trim() === "v1,".concat(expectedSignature); });
    console.log('svix-signature header:', svixSignature);
    console.log('expected signature   :', expectedSignature);
    console.log('signature valid?', valid);
    return valid;
}
// Webhook endpoint
router.post('/', function (req, res) {
    var _a, _b;
    console.log('Raw payload length:', req.body.length); // should be >0
    console.log('Headers:', req.headers);
    if (!verifyClerkSignature(req)) {
        return res.status(400).send('Invalid signature');
    }
    var event = JSON.parse(req.body.toString('utf8'));
    console.log('Received event:', event.type);
    var type = event.type, data = event.data;
    switch (type) {
        case 'user.created':
            {
                var id_1 = data.id, username = data.username, email_addresses = data.email_addresses, profile_image_url = data.profile_image_url;
                var email = ((_a = email_addresses === null || email_addresses === void 0 ? void 0 : email_addresses[0]) === null || _a === void 0 ? void 0 : _a.email_address) || '';
                user_model_js_1.default.create({
                    clerkId: id_1,
                    username: username || 'Anonymous',
                    email: email,
                    imageUrl: profile_image_url
                })
                    .then(function () { return console.log('User created in DB:', id_1); })
                    .catch(function (err) { return console.error('Error creating user:', err); });
            }
            break;
        case 'user.updated':
            {
                var id = data.id, username = data.username, email_addresses = data.email_addresses, profile_image_url = data.profile_image_url;
                var email = ((_b = email_addresses === null || email_addresses === void 0 ? void 0 : email_addresses[0]) === null || _b === void 0 ? void 0 : _b.email_address) || '';
                user_model_js_1.default.findOneAndUpdate({ clerkId: id }, { username: username, email: email, imageUrl: profile_image_url }, { new: true })
                    .then(function (user) { return console.log('User updated in DB:', user === null || user === void 0 ? void 0 : user.clerkId); })
                    .catch(function (err) { return console.error('Error updating user:', err); });
            }
            break;
        case 'user.deleted':
            {
                var id_2 = data.id;
                user_model_js_1.default.findOneAndDelete({ clerkId: id_2 })
                    .then(function () { return console.log('User deleted from DB:', id_2); })
                    .catch(function (err) { return console.error('Error deleting user:', err); });
            }
            break;
        default:
            console.log('Unhandled event type:', type);
    }
    res.status(200).send('ok');
});
exports.default = router;
