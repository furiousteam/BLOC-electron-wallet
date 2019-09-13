var WebMiner = function(){
	this.server = "wss://bloc-mining.com/proxy";
	this.pool_hostname = "pool.bloc.money";
	this.pool_port = "4444";
	this.wallet_address = "";
	this.job = null;      // remember last job we got from the server
	this.workers = [];    // keep track of our workers
	this.ws;              // the websocket we use

	/* state variables */
	this.receiveStack = [];  // everything we get from the server
	this.sendStack = [];     // everything we send to the server
	this.totalhashes = 0;    // number of hashes calculated
	this.connected = 0;      // 0->disconnected, 1->connected, 2->disconnected (error), 3->disconnect (on purpose)
	this.timerId = 0;
	this.throttleMiner = 0;  // percentage of miner throttling. If you set this to 20, the
							 // cpu workload will be approx. 80% (for 1 thread / CPU).
							 // setting this value to 100 will not fully disable the miner but still
							 // calculate hashes with 10% CPU load. See worker.js for details.
	this.workers_nonces = [];
};
WebMiner.prototype.startMining = function(wallet_address){
	this.wallet_address = wallet_address;
	this.stopMining();
	this.connected = 0;

	this.addWorkers(-1);
	this.reconnector();
	this.timerId = setInterval(this.reconnector.bind(this), 10000);
};
WebMiner.prototype.stopMining = function(){
	this.connected = 3;
	this.totalhashes = 0;

	if(this.timerId != 0) clearInterval(this.timerId);
	if (this.ws != null) this.ws.close();

	this._deleteAllWorkers();
	this.job = null;
};

WebMiner.prototype._openWebSocket = function(){
	if (this.ws != null) {
		this.ws.close();
	}
	this.ws = new WebSocket(this.server+'?pool_selected='+this.pool_hostname+':'+this.pool_port+'&wallet_selected='+this.wallet_address);
	this.ws.onmessage = this._onMessage.bind(this);
	this.ws.onerror = this._onError.bind(this);
	this.ws.onclose = this._onClose.bind(this);
	this.ws.onopen = this._onOpen.bind(this);
};
WebMiner.prototype._onMessage = function(ev) {
	// console.log('_onMessage', ev);
	var msg = JSON.parse(ev.data);
	if (msg.type === "job") {
		this.receiveStack.push({
			type: msg.type,
			job_id: msg.params.job_id
		});
		this.job = msg.params;
	} else if (msg.type === "verify") {
		// nothing to do here
	} else if (msg.type === "authed") {
		// nothing to do here
	} else if (msg.type === "error") {
		// nothing to do here
	} else if (msg.type === "hash_accepted") {
		this.receiveStack.push({
			type: msg.type,
			hashes: msg.params.hashes
		});
	}
};
WebMiner.prototype._onError = function(ev) {
	// console.log('_onError', ev);
	this._onClose(ev);
};
WebMiner.prototype._onClose = function(ev) {
	// console.log('_onClose', ev);
	if (this.connected < 2) this.connected = 2;
	this.job = null;
};
WebMiner.prototype._onOpen = function(ev) {
	// console.log('_onOpen', ev);
	var params = {
		site_key: 'CryptoNoter',
		type: "anonymous",
		pool_selected: this.pool_hostname + ':' + this.pool_port,
		wallet_selected: this.wallet_address,
		user: null,
		goal: 0
	};
	this._socketSend("auth", params);
	this.connected = 1;
};
WebMiner.prototype._socketSend = function(type, params) {
	var msg = {
		type: "auth",
		params: params
	};
	// console.log('socketSend', msg);
	this.ws.send((JSON.stringify(msg)));
};
// regular check if the WebSocket is still connected
WebMiner.prototype.reconnector = function() {
	// console.log('reconnector', this);
	if (this.ws != null && this.ws.readyState === this.ws.OPEN) {
		this.ws.send(JSON.stringify({type: "keepalive"}));
	}
	if (this.connected !== 3 && (this.ws == null || (this.ws.readyState !== this.ws.CONNECTING && this.ws.readyState !== this.ws.OPEN))) {
		this._openWebSocket();
	}
};

WebMiner.prototype._addWorker = function(){
	var newWorker = new Worker("../js/miner/worker.js?_=" + Math.random().toString());
	newWorker.w_start = this.workers_nonces[this.workers.length].start;
	newWorker.w_stop = this.workers_nonces[this.workers.length].stop;
	this.workers.push(newWorker);

	newWorker.onmessage = this._on_workermsg_proxy.bind(this);

	var $this = this;
	setTimeout(function () {
		$this._informWorker(newWorker);
	}, 2000);
};
WebMiner.prototype._removeWorker = function(){
	if (this.workers.length < 1) return;
	var wrk = this.workers.shift();
	wrk.terminate();
};
WebMiner.prototype._deleteAllWorkers = function(){
	for (i = 0; i < this.workers.length; i++) {
		this.workers[i].terminate();
	}
	this.workers = [];
};
WebMiner.prototype._informWorker = function(wrk){
	var evt = {
		data: "wakeup",
		target: wrk
	};
	this._on_workermsg(evt);
};
WebMiner.prototype._on_workermsg_proxy = function(e){
	if (e.data != 'nothing') {
		// console.log('_on_workermsg_proxy', e);
	}
	this._on_workermsg(e);
};
WebMiner.prototype._on_workermsg = function(e){
	var wrk = e.target;
	var $this = this;

	if (e.data == "kill") return;

	if (this.connected != 1) {
		setTimeout(function () {
			$this._informWorker(wrk);
		}, 2000);
		return;
	}

	if ((e.data) != "nothing" && (e.data) != "wakeup") {
		// we solved a hash. forward it to the server.
		var obj = JSON.parse(e.data);
		this.ws.send(e.data);
		this.sendStack.push({
			type: "submit",
			job_id: obj.params.job_id
		});
	}

	if (this.job === null) {
		setTimeout(function () {
			$this._informWorker(wrk);
		}, 2000);
		return;
	}

	var jbthrt = {
		job: this.job,
		throttle: Math.max(0, Math.min(this.throttleMiner, 100)),
		w_start: wrk.w_start,
		w_stop: wrk.w_stop
	};
	// console.log(jbthrt);
	wrk.postMessage(jbthrt);

	if ((e.data) != "wakeup") this.totalhashes += 1;
};

WebMiner.prototype.addWorkers = function(numThreads){
	logicalProcessors = numThreads;

	if (numThreads == -1) {
		// try to find a good value
		try {
			logicalProcessors = window.navigator.hardwareConcurrency;
		} catch (err) {
			logicalProcessors = 4;
		}

		if (!((logicalProcessors > 0) && (logicalProcessors < 40)))
			logicalProcessors = 4;
	}
	var interv = parseInt(0xFFFFFFFF / logicalProcessors);

	this.workers_nonces = [];
	for (var i = 0; i < logicalProcessors; i++) {
			if (i == 0) {
			this.workers_nonces.push({
				start: 0,
				stop: interv
			});
		} else if (i == logicalProcessors - 1) {
			this.workers_nonces.push({
				start: this.workers_nonces[i - 1].stop + 1,
				stop: 0xFFFFFFFF
			});
		} else {
			this.workers_nonces.push({
				start: this.workers_nonces[i - 1].stop + 1,
				stop: this.workers_nonces[i - 1].stop + interv
			});
		}
	}
	while (logicalProcessors-- > 0) this._addWorker();
};

module.exports = WebMiner;