module.exports = function() {
	io.on('connection', function(socket){
		socket.zoff_id = socket.id;
		socket.emit("get_list");

		var guid = Functions.hash_pass(socket.handshake.headers["user-agent"] + socket.handshake.address + socket.handshake.headers["accept-language"]);

		socket.on('close', function() {
			console.log("closing socket");
		});

		socket.on('pinging', function() {
			socket.emit("ok");
		});

		var ping_timeout;
		var socketid = socket.zoff_id;
		var coll;
		var in_list = false;
		var short_id;
		Chat.get_name(guid, {announce: false});
		Functions.get_short_id(socketid, 4, socket);
		var offline = false;
		var chromecast_object = false;

		socket.emit("guid", guid);

		socket.on('self_ping', function(msg) {
			var channel = msg.channel;
			if(offline) {
				db.collection("connected_users").update({"_id": "offline_users"}, {$addToSet: {users: guid}}, {upsert: true}, function(err, docs){});
			} else {
				db.collection("connected_users").update({"_id": channel}, {$addToSet: {users: guid}}, {upsert: true}, function(err, docs){
					db.collection("frontpage_lists").update({"_id": channel}, {$inc: {viewers: 1}}, {upsert: true}, function(){});
				});
			}
			db.collection("connected_users").update({"_id": "total_users"}, {$inc: {total_users: 1}}, {upsert: true}, function(err, docs){});
		});

		socket.on('chromecast', function(msg) {
			try {
				if(typeof(msg) == "object" && msg.hasOwnProperty("guid") && msg.hasOwnProperty("socket_id") && msg.hasOwnProperty("channel")) {
					db.collection("connected_users").find({"_id": msg.channel}, function(err, connected_users_channel) {
						if(connected_users_channel.length > 0 && connected_users_channel[0].users.indexOf(msg.guid) > -1) {
							guid = msg.guid;
							socketid = msg.socket_id;
							socket.zoff_id = socketid;
							coll = msg.channel;
							in_list = true;
							chromecast_object = true;
							socket.join(coll);
						}
					});
				}
			} catch(e) {
				return;
			}
		});

		socket.on("get_userlists", function(id) {
			db.collection("frontpage_lists_" + id).find(function(err, docs) {
				socket.emit("userlists", [docs]);
			});
		});

		socket.on("get_spread", function(){
			db.collection("connected_users").find({"_id": "total_users"}, function(err, tot) {
                db.collection("connected_users").find({"_id": "offline_users"}, function(err, off) {
					db.collection("connected_users").find({"_id": {$ne: "total_users"}, "_id": {$ne: "offline_users"}}, function(err, users_list) {
	                    if(tot.length > 0 && off.length == 0) {
	                        socket.emit("spread_listeners", {offline: 0, total: tot[0].total_users, online_users: users_list});
	                    } else if(tot.length > 0 && off.length > 0){
							socket.emit("spread_listeners", {offline: off[0].users.length, total: tot[0].total_users, online_users: users_list});
						}
					});
                });
			});
		});

		socket.on('suggest_thumbnail', function(msg){
			Suggestions.thumbnail(msg, coll, guid, offline, socket);
		});

		socket.on('suggest_description', function(msg){
			Suggestions.description(msg, coll, guid, offline, socket);
		});

		socket.on("offline", function(msg){
			if(!msg.hasOwnProperty('status') && !msg.hasOwnProperty('channel')) {
				socket.emit("update_required");
				return;
			}
			var status = msg.status;
			var channel = msg.channel;
			if(status){
				in_list = false;
				offline = true;
				if(channel != "") coll = channel;
				if(coll !== undefined) {
					db.collection("connected_users").findAndModify({
						query: {"_id": coll},
						update: {$pull: {users: guid}},
						upsert: true,
					}, function(err, updated) {
						if(updated.nModified > 0) {
							io.to(coll).emit("viewers", updated.users);
							db.collection("connected_users").update({"_id": "total_users"}, {$inc: {total_users: -1}}, function(err, docs){});
						}
						Functions.remove_name_from_db(guid, name);
					});
				}

				Functions.remove_unique_id(short_id);

				db.collection("connected_users").update({"_id": "offline_users"}, {$addToSet: {users: guid}}, function(err, docs) {});
				db.collection("connected_users").update({"_id": "total_users"}, {$inc: {total_users: 1}}, function(err, docs) {});
			} else {
				offline = false;
				db.collection("connected_users").update({"_id": "offline_users"}, {$pull: {users: guid}}, function(err, docs) {
					Functions.check_inlist(coll, guid, socket, offline);
				});
			}
		});

		socket.on('namechange', function(msg)
		{
            if(coll == undefined) {
                coll = msg.channel;
            }
			Chat.namechange(msg.name, guid, coll);
		});

		socket.on('removename', function()
		{
			Chat.removename(guid, coll);
		});

		socket.on('chat', function (msg) {
			Chat.chat(msg, guid, offline, socket);
		});

		socket.on("all,chat", function(data)
		{
			Chat.all_chat(data, guid, offline, socket);
		});

		socket.on('frontpage_lists', function(msg)
		{
			Frontpage.frontpage_lists(msg, socket);
		});

		socket.on('now_playing', function(list, fn)
		{
			List.now_playing(list, fn, socket);
		});

		socket.on('id', function(arr)
		{
			if(typeof(arr) == 'object')
			io.to(arr.id).emit(arr.id, {type: arr.type, value: arr.value});
		});

		socket.on('list', function(msg)
		{
			try {
	      var list = msg.channel;
	      if(list.length == 0) return;
	      coll = emojiStrip(list).toLowerCase();
	      coll = coll.replace("_", "");
	      coll = encodeURIComponent(coll).replace(/\W/g, '');
	      coll = filter.clean(coll);
	    } catch(e) {
	      return;
	    }
			List.list(msg, guid, coll, offline, socket);
		});

		socket.on('end', function(obj)
		{
			if(coll === undefined) {
	      try {
	        coll = obj.channel;
	        if(coll.length == 0) return;
	        coll = emojiStrip(coll).toLowerCase();
	        coll = coll.replace("_", "");
	        coll = encodeURIComponent(coll).replace(/\W/g, '');
	        coll = filter.clean(coll);
	      } catch(e) {
	        return;
	      }
	    }
			List.end(obj, coll, guid, offline, socket);
		});

		socket.on('add', function(arr)
		{
			if(coll !== undefined) {
	      try {
	        coll = arr.list;
	        if(coll.length == 0) return;
	        coll = emojiStrip(coll).toLowerCase();
	        coll = coll.replace("_", "");
	        coll = encodeURIComponent(coll).replace(/\W/g, '');
	        coll = filter.clean(coll);
	      } catch(e) {
	        return;
	      }
	    }
			ListChange.add(arr, coll, guid, offline, socket);
		});

		socket.on('delete_all', function(msg) {
			if(coll !== undefined) {
				try {
					coll = msg.channel;
					if(coll.length == 0) return;
					coll = emojiStrip(coll).toLowerCase();
					coll = coll.replace("_", "");
					coll = encodeURIComponent(coll).replace(/\W/g, '');
					coll = filter.clean(coll);
				} catch(e) {
					return;
				}
			}

			ListChange.delete_all(msg, coll, guid, offline, socket);
		});

		socket.on('vote', function(msg)
		{
			if(coll !== undefined) {
	      try {
	        coll = msg.channel;
	        if(coll.length == 0) return;
	        coll = emojiStrip(coll).toLowerCase();
	        coll = coll.replace("_", "");
	        coll = encodeURIComponent(coll).replace(/\W/g, '');
	        coll = filter.clean(coll);
	      } catch(e) {
	        return;
	      }
	    }
			ListChange.voteUndecided(msg, coll, guid, offline, socket);
		});

		socket.on('password', function(inp)
		{
			ListSettings.password(inp, coll, guid, offline, socket);
		});

		socket.on('skip', function(list)
		{
			if(coll !== undefined) {
	      try {
	        coll = list.channel;
	        if(coll.length == 0) return;
	        coll = emojiStrip(coll).toLowerCase();
	        coll = coll.replace("_", "");
	        coll = encodeURIComponent(coll).replace(/\W/g, '');
	        coll = filter.clean(coll);
	      } catch(e) {
	        return;
	      }
	    }
			List.skip(list, guid, coll, offline, socket);
		});

		socket.on('conf', function(params)
		{
			ListSettings.conf(params, coll, guid, offline, socket);
		});

		socket.on('shuffle', function(msg)
		{
			if(coll !== undefined) {
	      try {
	        coll = msg.channel;
	        if(coll.length == 0) return;
	        coll = emojiStrip(coll).toLowerCase();
	        coll = coll.replace("_", "");
	        coll = encodeURIComponent(coll).replace(/\W/g, '');
	        coll = filter.clean(coll);
	      } catch(e) {
	        return;
	      }
	    }
			ListChange.shuffle(msg, coll, guid, offline, socket);
		});

		socket.on('change_channel', function(obj)
		{
			if(coll === undefined && obj !== undefined && obj.channel !== undefined){
				try {
					coll = obj.channel;
					if(coll.length == 0) return;
					coll = emojiStrip(coll).toLowerCase();
					coll = coll.replace("_", "");
					coll = encodeURIComponent(coll).replace(/\W/g, '');
					coll = filter.clean(coll);
				} catch(e) {
					return;
				}
			}
			List.left_channel(coll, guid, short_id, in_list, socket, true);
			in_list = false;
		});

		socket.on('disconnect', function()
		{
			console.log("disconnect");
			clearTimeout(ping_timeout);
			List.left_channel(coll, guid, short_id, in_list, socket, false);
		});

		socket.on('disconnected', function()
		{
			console.log("disconnected");
			clearTimeout(ping_timeout);
			List.left_channel(coll, guid, short_id, in_list, socket, false);
		});

		socket.on('reconnect_failed', function()
		{
			console.log("reconnect_failed");
			clearTimeout(ping_timeout);
			List.left_channel(coll, guid, short_id, in_list, socket, false);
		});

		socket.on('connect_timeout', function()
		{
			console.log("connect_timeout");
			clearTimeout(ping_timeout);
			List.left_channel(coll, guid, short_id, in_list, socket, false);
		});

		socket.on('error', function()
		{
			console.log("error");
			clearTimeout(ping_timeout);
			List.left_channel(coll, guid, short_id, in_list, socket, false);
		});

		socket.on('pos', function(obj)
		{

			if(coll !== undefined) {
				try {
					coll = obj.channel;
					if(coll.length == 0) return;
					coll = emojiStrip(coll).toLowerCase();
					coll = coll.replace("_", "");
					coll = encodeURIComponent(coll).replace(/\W/g, '');
					coll = filter.clean(coll);
				} catch(e) {
					return;
				}
			}

			if(coll == "" || coll == undefined || coll == null) {
				socket.emit("update_required");
				return;
			}

			db.collection(coll).find({views: {$exists: true}}, function(err, docs) {
				if(docs.length > 0 && (docs[0].userpass == undefined || docs[0].userpass == "" || (obj.hasOwnProperty('pass') && docs[0].userpass == Functions.decrypt_string(socketid, obj.pass)))) {
					Functions.check_inlist(coll, guid, socket, offline);
					List.send_play(coll, socket);
				} else {
					socket.emit("auth_required");
				}
			});
		});
		/*ping_timeout = setTimeout(function() {
			send_ping(guid, coll, socket);
		}, 3000);

		var send_ping = function(guid, coll, socket) {
			console.log(guid, coll);
			if(coll == undefined) {
				ping_timeout = setTimeout(send_ping, 3000);
			} else {
				db.collection("connected_users").update({"_id": coll}, {$pull: {users: guid}}, function(err, docs) {
					db.collection("connected_users").update({"_id": "total_users"}, {$inc: {total_users: -1}}, function(err, docs) {
						db.collection("frontpage_lists").update({"_id": coll, viewers: {$gt: 0}}, {$inc: {viewers: -1}}, function(err, docs) {
							db.collection("user_names").find({"guid": guid}, function(err, user_name) {
								if(user_name.length > 0) {
									db.collection("user_names").remove({"guid": guid}, function(err, docs) {
										db.collection("user_names").update({"_id": "all_names"}, {$pull: {names: user_name[0].name}}, function(err, docs) {
											socket.emit("self_ping");
											ping_timeout = setTimeout(function(){
												send_ping(guid, coll, socket);
											}, 3000);
										});
									});
								}
							});
						});
					});
				});
			}
		}*/
	});
	send_ping();
}

function send_ping() {
	db.collection("connected_users").update({users: {$exists: true}}, {$set: {users: []}}, {multi: true}, function(err, docs){
		db.collection("connected_users").update({"_id": "total_users"}, {$set: {total_users: 0}}, {multi: true}, function(err, docs){
			db.collection("frontpage_lists").update({viewers: {$ne: 0}}, {$set: {"viewers": 0}}, {multi: true}, function(err, docs) {
				io.emit("self_ping");
				setTimeout(send_ping, 25000);
			});
		});
	});
}