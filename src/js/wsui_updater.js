/* globals iqwerty */
const {webFrame, remote} = require('electron');
const Store = require('electron-store');
const wsutil = require('./ws_utils');
const WalletShellSession = require('./ws_session');
const config = require('./ws_config');

const brwin = remote.getCurrentWindow();
const settings = new Store({name: 'Settings'});
const wsession = new WalletShellSession();

/* sync progress ui */
let circleProgressProcent;
let circleProgressText;
let connInfoDiv;
let nodeAddressDiv;
let nodeFeeDiv;

const SYNC_STATUS_NET_CONNECTED = -10;
const SYNC_STATUS_NET_DISCONNECTED = -50;
const SYNC_STATUS_IDLE = -100;
const SYNC_STATUS_NODE_ERROR = -200;

const WFCLEAR_INTERVAL = 5;
let WFCLEAR_TICK = 0;

function setWinTitle(title){
    let defaultTitle = wsession.get('defaultTitle');
    let newTitle = defaultTitle;
    if(title){
        newTitle = `${defaultTitle} ${title}`;
    }
    brwin.setTitle(newTitle);
}

function triggerTxRefresh(){
    const txUpdateInputFlag = document.getElementById('transaction-updated');
    txUpdateInputFlag.value = 1;
    txUpdateInputFlag.dispatchEvent(new Event('change'));
}

function setCircleSyncProcent(procent) {
	// remove any previous procent
	Array.from(circleProgressProcent.classList).forEach((cls)=>{
		if (cls[0] == 'p') {
			circleProgressProcent.classList.remove(cls);
		}
	});

	// add current procent
	circleProgressProcent.classList.add('p' + procent);
	circleProgressText.innerHTML = procent + '%';
}

function updateSyncProgress(data){
	circleProgressProcent = document.getElementById('circle-progress-procent');
	circleProgressText = document.getElementById('circle-progress-text');
	connInfoDiv = document.getElementById('conn-info');
	nodeAddressDiv = document.getElementById('node-address');
	nodeFeeDiv = document.getElementById('node-fee');

    let blockCount = data.displayBlockCount;
    let knownBlockCount = data.displayKnownBlockCount;
    let blockSyncPercent = data.syncPercent;
    let statusText = '';

    if(knownBlockCount === SYNC_STATUS_NET_CONNECTED){
        statusText = 'RESUMING WALLET SYNC...';
		connInfoDiv.innerHTML = statusText;

        // sync sess flags
        wsession.set('syncStarted', false);
        wsession.set('synchronized', false);
        brwin.setProgressBar(-1);
    }else if(knownBlockCount === SYNC_STATUS_NET_DISCONNECTED){
        statusText = 'PAUSED, NETWORK DISCONNECTED';
		connInfoDiv.innerHTML = statusText;

		nodeAddressDiv.innerHTML = 'N/A';
		nodeFeeDiv.innerHTML = 'N/A';

        // sync sess flags
        wsession.set('syncStarted', false);
        wsession.set('synchronized', false);
        brwin.setProgressBar(-1);
    }else if(knownBlockCount === SYNC_STATUS_IDLE){
        statusText = 'IDLE';
		connInfoDiv.innerHTML = statusText;

		nodeAddressDiv.innerHTML = 'N/A';
		nodeFeeDiv.innerHTML = 'N/A';

        // sync sess flags
        wsession.set('syncStarted', false);
        wsession.set('synchronized', false);
        brwin.setProgressBar(-1);
        // reset wintitle
        setWinTitle();
        // no node connected
        wsession.set('connectedNode', '');
    }else if(knownBlockCount === SYNC_STATUS_NODE_ERROR){
        statusText = 'NODE ERROR';
		connInfoDiv.innerHTML = statusText;

        wsession.set('connectedNode', '');
        brwin.setProgressBar(-1);
    }else{
        // sync sess flags
        wsession.set('syncStarted', true);
        statusText = `${blockCount}/${knownBlockCount}`;
		connInfoDiv.innerHTML = statusText;

        if(blockCount+1 >= knownBlockCount && knownBlockCount !== 0) {
            // sync status sess flag
            wsession.set('synchronized', true);
            brwin.setProgressBar(-1);
         } else {
            // sync status sess flag
            wsession.set('synchronized', false);
            let taskbarProgress = +(parseFloat(blockSyncPercent)/100).toFixed(2);
            brwin.setProgressBar(taskbarProgress);
        }

        let connNodeFee = wsession.get('nodeFee');

		nodeAddressDiv.innerHTML = wsession.get('connectedNode');
		nodeFeeDiv.innerHTML = `${connNodeFee.toFixed(config.decimalPlaces)} ${config.assetTicker}`;

		let procent = Math.min(100, parseInt((blockCount * 100) / knownBlockCount));
		procent = Math.max(0, procent);
		setCircleSyncProcent(procent);
    }

    if(WFCLEAR_TICK === 0 || WFCLEAR_TICK === WFCLEAR_INTERVAL){
        webFrame.clearCache();
        WFCLEAR_TICK = 0;
    }
    WFCLEAR_TICK++;
}

function updateBalance(data){
    const balanceAvailableField = document.querySelector('#balance-available > span');
    const balanceLockedField = document.querySelector('#balance-locked > span');
    const maxSendFormHelp = document.getElementById('sendFormHelp');
    const sendMaxAmount = document.getElementById('sendMaxAmount');
    let inputSendAmountField = document.getElementById('input-send-amount');

    if(!data) return;
    let availableBalance = parseFloat(data.availableBalance) || 0;
	let bUnlocked = wsutil.amountForMortal(availableBalance);
	let bLocked = wsutil.amountForMortal(data.lockedAmount);
	let fees = (wsession.get('nodeFee') + (config.minimumFee / config.decimalDivisor));
	let maxSendRaw = (bUnlocked - fees);

	if (maxSendRaw <= 0) {
        inputSendAmountField.value = 0;
        inputSendAmountField.setAttribute('max','0.0000');
        inputSendAmountField.setAttribute('disabled','disabled');
        maxSendFormHelp.innerHTML = "You don't have any funds to be sent.";
        maxSendFormHelp.classList.add('warning');
        sendMaxAmount.dataset.maxsend = 0;
        sendMaxAmount.classList.add('hidden');
        wsession.set('walletUnlockedBalance', 0);
        wsession.set('walletLockedBalance', 0);
        if(availableBalance < 0) return;
    }

    balanceAvailableField.innerHTML = bUnlocked;
    balanceLockedField.innerHTML = bLocked;
    wsession.set('walletUnlockedBalance', bUnlocked);
    wsession.set('walletLockedBalance', bLocked);

	// update fusion progress
    if (true === wsession.get('fusionProgress')) {
        if (wsession.get('fusionStarted') && parseInt(bLocked, 10) <= 0) {
			const fusionProgressBar = document.getElementById('fusion-progress');
            fusionProgressBar.classList.add('hidden');
			const sendOptimize = document.getElementById('button-send-optimize');
			sendOptimize.classList.remove('hidden');
            wsession.set('fusionStarted', false);
            wsession.set('fusionProgress', false);
            wsutil.showToast('Optimization completed. You may need to repeat the process until your wallet is fully optimized.', 5000);
			log.debug(`Wallet optimization completed`);
        } else {
            if (parseInt(bLocked, 10) > 0) {
                wsession.set('fusionStarted', true);
            }
        }
    }

    let walletFile = require('path').basename(settings.get('recentWallet'));
    let wintitle = `(${walletFile}) - ${bUnlocked} ${config.assetTicker}`;
    setWinTitle(wintitle);

    if (maxSendRaw > 0) {
		let maxSend = (maxSendRaw).toFixed(config.decimalPlaces);
        inputSendAmountField.setAttribute('max',maxSend);
        inputSendAmountField.removeAttribute('disabled');
        maxSendFormHelp.innerHTML = `Enter the amount you would like to send`;
		maxSendFormHelp.classList.remove('warning');
        sendMaxAmount.dataset.maxsend = maxSend;
        sendMaxAmount.classList.remove('hidden');
    }
}

function updateTransactions(result){
    let txlistExisting = wsession.get('txList');

    const blockItems = result.items;

    if(!txlistExisting.length && !blockItems.length){
        document.getElementById('transaction-export').parentNode.parentNode.parentNode.classList.add('hidden');
    }else{
        document.getElementById('transaction-export').parentNode.parentNode.parentNode.classList.remove('hidden');
    }

    if(!blockItems.length) return;

    let txListNew = [];

    Array.from(blockItems).forEach((block) => {
		block.transactions.map((tx) => {
            if(tx.amount !== 0 && !wsutil.objInArray(txlistExisting, tx, 'transactionHash')){
                tx.amount = wsutil.amountForMortal(tx.amount);
                tx.timeStr = new Date(tx.timestamp*1000).toUTCString();
                tx.fee = wsutil.amountForMortal(tx.fee);
                tx.paymentId = tx.paymentId.length ? tx.paymentId : '-';
                tx.txType = (tx.amount > 0 ? 'in' : 'out');
				tx.rawAmount = tx.amount;
                tx.rawFee = tx.fee;
                tx.rawPaymentId = tx.paymentId;
                tx.rawHash = tx.transactionHash;
                txListNew.unshift(tx);
            }
        });
    });

    if(!txListNew.length) return;
    let latestTx = txListNew[0];
    let newLastHash = latestTx.transactionHash;
    let newLastTimestamp = latestTx.timestamp;
    let newTxAmount = latestTx.amount;

    // store it
    wsession.set('txLastHash',newLastHash);
    wsession.set('txLastTimestamp', newLastTimestamp);
    let txList = txListNew.concat(txlistExisting);
    wsession.set('txList', txList);
    wsession.set('txLen', txList.length);
    wsession.set('txNew', txListNew);

    let currentDate = new Date();
    currentDate = `${currentDate.getUTCFullYear()}-${currentDate.getUTCMonth()+1}-${currentDate.getUTCDate()}`;
    let lastTxDate = new Date(newLastTimestamp*1000);
    lastTxDate = `${lastTxDate.getUTCFullYear()}-${lastTxDate.getUTCMonth()+1}-${lastTxDate.getUTCDate()}`;

    // amount to check
    triggerTxRefresh();

    let rememberedLastHash = settings.get('last_notification', '');
    let notify = true;
    if(lastTxDate !== currentDate || (newTxAmount < 0) || rememberedLastHash === newLastHash ){
        notify = false;
    }

    if(notify){
        settings.set('last_notification', newLastHash);
        let notiOptions = {
            'body': `Amount: ${(newTxAmount)} ${config.assetTicker}\nHash: ${newLastHash.substring(24,-0)}...`,
            'icon': '../assets/walletshell_icon.png'
        };
        let itNotification = new Notification('Incoming Transfer', notiOptions);
        itNotification.onclick = (event) => {
            event.preventDefault();
            let  txNotifyFiled = document.getElementById('transaction-notify');
            txNotifyFiled.value = 1;
            txNotifyFiled.dispatchEvent(new Event('change'));
            if(!brwin.isVisible()) brwin.show();
            if(brwin.isMinimized()) brwin.restore();
            if(!brwin.isFocused()) brwin.focus();
        };
    }
}

function showFeeWarning(fee){
    fee = fee || 0; // fee vale already for mortal
    let nodeFee = parseFloat(fee);
    if(nodeFee <= 0) return;

    let dialog = document.getElementById('main-dialog');
    if(dialog.hasAttribute('open')) return;

    dialog.classList.add('dialog-warning');
    let htmlStr = `
        <h5>Fee Info</h5>
        <p>You are connected to a public node (${settings.get('daemon_host')}:${settings.get('daemon_port')}) that charges a fee to send transactions.<p>
        <p>The fee for sending transactions is: <strong>${fee.toFixed(config.decimalPlaces)} ${config.assetTicker} </strong>.<br>
            If you don't want to pay the node fee, please close your wallet, reopen and choose different public node (or run your own node).
        </p>
        <p style="text-align:center;margin-top: 1.25rem;"><button  type="button" class="form-bt button-blue" id="dialog-end">OK, I Understand</button></p>
    `;

    wsutil.innerHTML(dialog, htmlStr);
    let dialogEnd = document.getElementById('dialog-end');
    dialogEnd.addEventListener('click', () => {
        try{
            dialog.classList.remove('dialog-warning');
            document.getElementById('main-dialog').close();
        }catch(e){}
    });
    dialog = document.getElementById('main-dialog');
    dialog.showModal();
    dialog.addEventListener('close', function(){
        wsutil.clearChild(dialog);
    });
}

function updateQr(address){
    if(!address){
        triggerTxRefresh();
        return;
    }

    let walletHash = wsutil.b2sSum(address);
    wsession.set('walletHash', walletHash);

    let oldImg = document.getElementById('qr-gen-img');
    if(oldImg) oldImg.remove();

    let qr_base64 = wsutil.genQrDataUrl(address);
    if(qr_base64.length){
        let qrBox = document.getElementById('div-w-qr');
        let qrImg = document.createElement("img");
        qrImg.setAttribute('id', 'qr-gen-img');
        qrImg.setAttribute('src', qr_base64);
        qrBox.prepend(qrImg);
    }

	connInfoDiv.innerHTML = 'connected';
}

function resetFormState(){
    const allFormInputs = document.querySelectorAll('.section input,.section textarea');
    if(!allFormInputs) return;

    for(var i=0;i<allFormInputs.length;i++){
        let el = allFormInputs[i];
        if(el.dataset.initial){
            if(!el.dataset.noclear){
                el.value = settings.has(el.dataset.initial) ? settings.get(el.dataset.initial) : '';
                if(el.getAttribute('type') === 'checkbox'){
                    el.checked = settings.get(el.dataset.initial);
                }
            }
        }else{
            if(!el.dataset.noclear) el.value = '';
        }
    }

    /*
	const settingsBackBtn = document.getElementById('button-settings-back');
    if(wsession.get('serviceReady')){
        settingsBackBtn.dataset.section = 'section-welcome';
    }else{
        if (connInfoDiv) connInfoDiv.textContent = 'N/A';
        settingsBackBtn.dataset.section = 'section-overview';
    }
	*/
}

// update ui state, push from svc_main
function updateUiState(msg){
	// do something with msg
    switch (msg.type) {
        case 'blockUpdated':
            updateSyncProgress(msg.data);
            break;
        case 'balanceUpdated':
            updateBalance(msg.data);
            break;
        case 'transactionUpdated':
            updateTransactions(msg.data);
            break;
        case 'nodeFeeUpdated':
            showFeeWarning(msg.data);
            break;
        case 'addressUpdated':
            updateQr(msg.data);
            break;
        case 'sectionChanged':
            if(msg.data) resetFormState(msg.data);
            break;
        case 'fusionTxCompleted':
			const fusionProgressBar = document.getElementById('fusion-progress');
			const sendOptimize = document.getElementById('button-send-optimize');
			if (msg.code === 0) { // skipped
                wsession.set('fusionProgress', false);
                fusionProgressBar.classList.add('hidden');
				sendOptimize.classList.remove('hidden');
				wsutil.showToast(msg.data, 5000);
            } else {
                wsession.set('fusionProgress', true);
                fusionProgressBar.classList.remove('hidden');
				// do nothing, just wait
            }
            break;
        default:
            console.log('invalid command received by ui', msg);
            break;
    }
}

module.exports = {updateUiState};