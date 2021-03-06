var Functions = require(pathThumbnails + '/handlers/functions.js');
var Notifications = require(pathThumbnails + '/handlers/notifications.js');
var crypto = require('crypto');
var db = require(pathThumbnails + '/handlers/db.js');

function thumbnail(msg, coll, guid, offline, socket) {
    if(msg.thumbnail != undefined && msg.channel && msg.channel != undefined && Functions.isUrl(msg.thumbnail)){
        if(typeof(msg.channel) != "string" || typeof(msg.thumbnail) != "string")
             {
                var result = {
                    channel: {
                        expected: "string",
                        got: msg.hasOwnProperty("channel") ? typeof(msg.channel) : undefined,
                    },
                    pass: {
                        expected: "string",
                        got: msg.hasOwnProperty("pass") ? typeof(msg.pass) : undefined,
                    },
                    thumbnail: {
                        expected: "string",
                        got: msg.hasOwnProperty("thumbnail") ? typeof(msg.thumbnail) : undefined,
                    },
                    adminpass: {
                        expected: "string",
                        got: msg.hasOwnProperty("adminpass") ? typeof(msg.adminpass) : undefined,
                    },
                };
                socket.emit("update_required", result);
                return;
            }
            //coll = coll.replace(/ /g,'');
        Functions.getSessionAdminUser(Functions.getSession(socket), coll, function(userpass, adminpass) {
            if(userpass != "" || msg.pass == undefined) {
                msg.pass = userpass;
            } else if(msg.hasOwnProperty("pass")){
                msg.pass = crypto.createHash('sha256').update(Functions.decrypt_string(msg.pass)).digest("base64");
            }
            if(adminpass != "" || msg.adminpass == undefined) {
                msg.adminpass = Functions.hash_pass(adminpass);
            } else {
                msg.adminpass = Functions.hash_pass(Functions.hash_pass(Functions.decrypt_string(msg.adminpass),true));
            }
            if(msg.thumbnail != "") {
                msg.thumbnail = msg.thumbnail.replace(/^https?\:\/\//i, "");
                if(msg.thumbnail.substring(0,2) != "//") msg.thumbnail = "//" + msg.thumbnail;
            }
            var channel = msg.channel.toLowerCase();
            var hash = msg.adminpass;
            db.collection(channel + "_settings").find({id: "config"}, function(err, docs){
                if(docs.length > 0 && (docs[0].userpass == undefined || docs[0].userpass == "" || (msg.hasOwnProperty('pass') && docs[0].userpass == msg.pass))) {
                    if(docs !== null && docs.length !== 0 && docs[0].adminpass !== "" && docs[0].adminpass == hash){
                        db.collection("suggested_thumbnails").update({channel: channel}, {$set:{thumbnail: msg.thumbnail}}, {upsert:true}, function(err, docs){
                            Notifications.requested_change("thumbnail", msg.thumbnail, channel);
                            socket.emit("toast", "suggested_thumbnail");
                        });
                    }
                } else {
                    socket.emit("auth_required");
                }
            });
        });
    } else {
        socket.emit("toast", "thumbnail_denied");
    }
}

function description(msg, coll, guid, offline, socket) {
    if(msg.description && msg.channel && msg.description.length < 100){
        if(typeof(msg.channel) != "string" || typeof(msg.description) != "string") {
                var result = {
                    channel: {
                        expected: "string",
                        got: msg.hasOwnProperty("channel") ? typeof(msg.channel) : undefined,
                    },
                    pass: {
                        expected: "string",
                        got: msg.hasOwnProperty("pass") ? typeof(msg.pass) : undefined,
                    },
                    description: {
                        expected: "string",
                        got: msg.hasOwnProperty("description") ? typeof(msg.description) : undefined,
                    },
                    adminpass: {
                        expected: "string",
                        got: msg.hasOwnProperty("adminpass") ? typeof(msg.adminpass) : undefined,
                    },
                };
                socket.emit("update_required", result);
                return;
            }
            //coll = coll.replace(/ /g,'');
        Functions.getSessionAdminUser(Functions.getSession(socket), coll, function(userpass, adminpass, gotten) {
            if(userpass != "" || msg.pass == undefined) {
                msg.pass = userpass;
            } else if(msg.hasOwnProperty("pass")) {
                msg.pass = crypto.createHash('sha256').update(Functions.decrypt_string(msg.pass)).digest("base64");
            }
            if(adminpass != "" || msg.adminpass == undefined) {
                msg.adminpass = Functions.hash_pass(adminpass);
            } else {
                msg.adminpass = Functions.hash_pass(Functions.hash_pass(Functions.decrypt_string(msg.adminpass), true));
            }
            var channel = msg.channel.toLowerCase();
            var hash = msg.adminpass;
            db.collection(channel + "_settings").find({id: "config"}, function(err, docs){
                if(docs.length > 0 && (docs[0].userpass == undefined || docs[0].userpass == "" || (msg.hasOwnProperty('pass') && docs[0].userpass == msg.pass))) {
                    if(docs !== null && docs.length !== 0 && docs[0].adminpass !== "" && docs[0].adminpass == hash){
                        db.collection("suggested_descriptions").update({channel: channel}, {$set:{description: msg.description}}, {upsert:true}, function(err, docs){
                            Notifications.requested_change("description", msg.description, channel);
                            socket.emit("toast", "suggested_description");
                        });
                    }
                } else {
                    socket.emit("auth_required");
                }
            });
        });
    } else {
        socket.emit("toast", "description_denied");
    }
}


function rules(msg, coll, guid, offline, socket) {
    if(msg.rules && msg.channel && msg.rules.length < 250){
        if(typeof(msg.channel) != "string" || typeof(msg.rules) != "string") {
                var result = {
                    channel: {
                        expected: "string",
                        got: msg.hasOwnProperty("channel") ? typeof(msg.channel) : undefined,
                    },
                    pass: {
                        expected: "string",
                        got: msg.hasOwnProperty("pass") ? typeof(msg.pass) : undefined,
                    },
                    rules: {
                        expected: "string",
                        got: msg.hasOwnProperty("rules") ? typeof(msg.rules) : undefined,
                    },
                    adminpass: {
                        expected: "string",
                        got: msg.hasOwnProperty("adminpass") ? typeof(msg.adminpass) : undefined,
                    },
                };
                socket.emit("update_required", result);
                return;
            }
            //coll = coll.replace(/ /g,'');
        Functions.getSessionAdminUser(Functions.getSession(socket), coll, function(userpass, adminpass, gotten) {
            if(userpass != "" || msg.pass == undefined) {
                msg.pass = userpass;
            } else if(msg.hasOwnProperty("pass")) {
                msg.pass = crypto.createHash('sha256').update(Functions.decrypt_string(msg.pass)).digest("base64");
            }
            if(adminpass != "" || msg.adminpass == undefined) {
                msg.adminpass = Functions.hash_pass(adminpass);
            } else {
                msg.adminpass = Functions.hash_pass(Functions.hash_pass(Functions.decrypt_string(msg.adminpass), true));
            }
            var channel = msg.channel.toLowerCase();
            var hash = msg.adminpass;
            db.collection(channel + "_settings").find({id: "config"}, function(err, docs){
                if(docs.length > 0 && (docs[0].userpass == undefined || docs[0].userpass == "" || (msg.hasOwnProperty('pass') && docs[0].userpass == msg.pass))) {
                    if(docs !== null && docs.length !== 0 && docs[0].adminpass !== "" && docs[0].adminpass == hash){
                        db.collection("suggested_rules").update({channel: channel}, {$set:{rules: msg.rules}}, {upsert:true}, function(err, docs){
                            Notifications.requested_change("rules", msg.rules, channel);
                            socket.emit("toast", "suggested_rules");
                        });
                    }
                } else {
                    socket.emit("auth_required");
                }
            });
        });
    } else {
        socket.emit("toast", "rules_denied");
    }
}


module.exports.thumbnail = thumbnail;
module.exports.description = description;
module.exports.rules = rules;
