/*jshint bitwise: false*/
/* globals iqwerty */
/* globals List */
const os = require('os');
const path = require('path');
const fs = require('fs');
const {clipboard, remote, ipcRenderer, shell} = require('electron');
const Store = require('electron-store');
const Mousetrap = require('./extras/mousetrap.min.js');
const autoComplete = require('./extras/auto-complete');
const wsutil = require('./ws_utils');
const WalletShellSession = require('./ws_session');
const WalletShellManager = require('./ws_manager');
const config = require('./ws_config');
const Chart = require('chart.js');
const log = require('electron-log');

const wsmanager = new WalletShellManager();
const wsession = new WalletShellSession();
const settings = new Store({ name: 'Settings' });
const abook = new Store({
	name: 'AddressBook',
	encryptionKey: config.addressBookObfuscateEntries ? config.addressBookObfuscationKey : null
});

const win = remote.getCurrentWindow();
const Menu = remote.Menu;

const WS_VERSION = settings.get('version', 'unknown');
const DEFAULT_WALLET_PATH = remote.app.getPath('documents');

let WALLET_OPEN_IN_PROGRESS = false;
//let FUSION_IN_PROGRESS = false;
let TXLIST_OBJ = null;
let COMPLETION_PUBNODES;
let COMPLETION_ADDRBOOK;

/*  dom elements vars; */
// body
let body;
// main section link
let sectionButtons;
// generics
let genericBrowseButton;
let genericFormMessage;
let genericEnterableInputs;
let genericEditableInputs;
let firstTab;
// settings page
let settingsInputDaemonAddress;
let settingsInputDaemonPort;
let settingsInputServiceBin;
let settingsInputMinToTray;
let settingsInputCloseToTray;
let settingsButtonSave;
//let settingsDaemonHostFormHelp;
//let settingsDaemonPortFormHelp;
// overview page
let overviewWalletAddress;
let overviewWalletCopyButton;
let overviewWalletCloseButton;
let overviewPaymentIdGen;
let overviewIntegratedAddressGen;
// addressbook page
let addressBookInputName;
let addressBookInputWallet;
let addressBookInputPaymentId;
let addressBookInputUpdate;
let addressBookButtonSave;
// open wallet page
let walletOpenInputPath;
let walletOpenInputPassword;
let walletOpenButtonOpen;
let walletOpenButtons;
// show/export keys page
let overviewShowKeyButton;
let showkeyButtonExportKey;
let showkeyInputViewKey;
let showkeyInputSpendKey;
let showkeyInputSeed;
// send page
let sendInputAddress;
let sendInputAmount;
let sendInputPaymentId;
let sendInputFee;
let sendButtonSend;
let sendMaxAmount;
let sendOptimize;
// create wallet
let overviewButtonCreate;
let zoomQrCode;
let walletCreateInputPath;
// let walletCreateInputFilename;
let walletCreateInputPassword;
// import wallet keys
let importKeyButtonImport;
let importKeyInputPath;
// let importKeyInputFilename;
let importKeyInputPassword;
let importKeyInputViewKey;
let importKeyInputSpendKey;
let importKeyInputScanHeight;
// import wallet seed
let importSeedButtonImport;
let importSeedInputPath;
//let importSeedInputFilename;
let importSeedInputPassword;
let importSeedInputMnemonic;
let importSeedInputScanHeight;
// transaction
let txButtonRefresh;
let txButtonSortAmount;
let txButtonSortDate;
let txInputUpdated;
let txInputNotify;
let txButtonExport;
// misc
let thtml;
// let dmswitch;
let sswitch;
let kswitch;
let iswitch;
// exchange
let chartConfig;
let chartInstance;

function populateElementVars(){
	// misc
	thtml = document.documentElement;
	// dmswitch = document.getElementById('tswitch');
	sswitch = document.getElementById('sswitch');
	kswitch = document.getElementById('kswitch');
	iswitch = document.getElementById('iswitch');
	firstTab = document.querySelector('.navbar-button');
	// generics
	genericBrowseButton = document.querySelectorAll('.path-input-button:not(.d-opened)');
	genericFormMessage = document.getElementsByClassName('form-ew');
	genericEnterableInputs = document.querySelectorAll('.section input:not(.noenter)');
	genericEditableInputs = document.querySelectorAll('textarea:not([readonly]), input:not([readonly]');

	// body
	body = document.getElementsByTagName('body');

	// main section link
	sectionButtons = document.querySelectorAll('[data-section]');

	// settings input & elements
	settingsInputDaemonAddress = document.getElementById('input-settings-daemon-address');
	settingsInputDaemonPort = document.getElementById('input-settings-daemon-port');
	settingsInputServiceBin = document.getElementById('input-settings-path');
	settingsInputMinToTray = document.getElementById('checkbox-tray-minimize');
	settingsInputCloseToTray = document.getElementById('checkbox-tray-close');
	settingsButtonSave = document.getElementById('button-settings-save');
	// settingsDaemonHostFormHelp = document.getElementById('daemonHostFormHelp');
	// settingsDaemonPortFormHelp = document.getElementById('daemonPortFormHelp');

	// overview pages
	overviewWalletAddress = document.getElementById('wallet-address');
	overviewWalletCopyButton = document.getElementById('copy-wallet-address');
	overviewWalletCloseButton = document.getElementById('button-overview-closewallet');
	overviewPaymentIdGen = document.getElementById('payment-id-gen');
	overviewIntegratedAddressGen = document.getElementById('integrated-wallet-gen');

	// addressbook page
	addressBookInputName = document.getElementById('input-addressbook-name');
	addressBookInputWallet = document.getElementById('input-addressbook-wallet');
	addressBookInputPaymentId = document.getElementById('input-addressbook-paymentid');
	addressBookInputUpdate = document.getElementById('input-addressbook-update');
	addressBookButtonSave = document.getElementById('button-addressbook-save');

	// open wallet page
	walletOpenInputPath = document.getElementById('input-load-path');
	walletOpenInputPassword = document.getElementById('input-load-password');
	walletOpenButtonOpen = document.getElementById('button-load-load');
	walletOpenButtons = document.getElementById('walletOpenButtons');
	// show/export keys page
	overviewShowKeyButton = document.getElementById('button-show-reveal');
	showkeyButtonExportKey = document.getElementById('button-show-export');
	showkeyInputViewKey = document.getElementById('key-show-view');
	showkeyInputSpendKey = document.getElementById('key-show-spend');
	showkeyInputSeed = document.getElementById('seed-show');

	// send page
	sendInputAddress = document.getElementById('input-send-address');
	sendInputAmount = document.getElementById('input-send-amount');
	sendInputPaymentId = document.getElementById('input-send-payid');
	sendInputFee = document.getElementById('input-send-fee');
	sendButtonSend = document.getElementById('button-send-send');
	// maxSendFormHelp = document.getElementById('sendFormHelp');
	sendMaxAmount = document.getElementById('sendMaxAmount');
	sendOptimize = document.getElementById('button-send-optimize');
	// create wallet
	overviewButtonCreate = document.getElementById('button-create-create');
	zoomQrCode = document.getElementById('zoom-qr-code');
	walletCreateInputPath = document.getElementById('input-create-path');
	//walletCreateInputFilename = document.getElementById('input-create-name');
	walletCreateInputPassword = document.getElementById('input-create-password');
	// import wallet keys
	importKeyButtonImport = document.getElementById('button-import-import');
	importKeyInputPath = document.getElementById('input-import-path');
	//importKeyInputFilename = document.getElementById('input-import-name');
	importKeyInputPassword = document.getElementById('input-import-password');
	importKeyInputViewKey = document.getElementById('key-import-view');
	importKeyInputSpendKey = document.getElementById('key-import-spend');
	importKeyInputScanHeight = document.getElementById('key-import-height');
	// import wallet seed
	importSeedButtonImport = document.getElementById('button-import-seed-import');
	importSeedInputPath = document.getElementById('input-import-seed-path');
	//importSeedInputFilename = document.getElementById('input-import-seed-name');
	importSeedInputPassword = document.getElementById('input-import-seed-password');
	importSeedInputMnemonic = document.getElementById('key-import-seed');
	importSeedInputScanHeight = document.getElementById('key-import-seed-height');
	// tx page
	// transaction
	txButtonRefresh = document.getElementById('button-transactions-refresh');
	txButtonSortAmount = document.getElementById('txSortAmount');
	txButtonSortDate = document.getElementById('txSortTime');
	txInputUpdated = document.getElementById('transaction-updated');
	txInputNotify = document.getElementById('transaction-notify');
	txButtonExport = document.getElementById('transaction-export');
}



// crude/junk template :)
let jtfr = {
   tFind:  [
		"WalletShell",
		"https://github.com/furiousteam/BLOC-electron-wallet",
		"TurtleCoin",
		"TRTL",
		"BLOC-service"
	],
	tReplace: [
		config.appName,
		config.appGitRepo,
		config.assetName,
		config.assetTicker,
		config.walletServiceBinaryFilename
	]
};

let junkTemplate = (text) => {
	return jtfr.tFind.reduce((acc, item, i) => {
		const regex = new RegExp(item, "g");
		return acc.replace(regex, jtfr.tReplace[i]);
  }, text);
};

function initSectionTemplates(){
	const importLinks = document.querySelectorAll('link[rel="import"]');
	for (var i = 0; i < importLinks.length; i++){
		let template = importLinks[i].import.getElementsByTagName("template")[0];
		let templateString = junkTemplate(template.innerHTML);
		let templateNode = document.createRange().createContextualFragment(templateString);
		//let clone = document.importNode(templateNode, true);
		let clone = document.adoptNode(templateNode);
		//let clone = document.importNode(template.content, true);
		document.getElementById('main-div').appendChild(clone);
	}
	// once all elements in place, safe to populate dom vars
	populateElementVars();
}

// utility: dark mode
function setDarkMode(dark){
	let tmode = dark ? 'dark' : '';
	if(tmode === 'dark'){
		thtml.classList.add('dark');
		dmswitch.setAttribute('title', 'Leave dark mode');
		dmswitch.firstChild.classList.remove('fa-moon');
		dmswitch.firstChild.classList.add('fa-sun');
		settings.set('darkmode',true);
		dmswitch.firstChild.dataset.icon = 'sun';
	}else{
		thtml.classList.remove('dark');
		dmswitch.setAttribute('title', 'Swith to dark mode');
		dmswitch.firstChild.classList.remove('fa-sun');
		dmswitch.firstChild.classList.add('fa-moon');
		settings.set('darkmode', false);
		dmswitch.firstChild.dataset.icon = 'moon';
	}
}

let keybindingTpl = `<div id="section-shortcuts">
	<div class="transaction-panel">
		<div class="div-title clearfix">
			<img src="../assets/shortcuts/title.png" />
			<h2 class="title">Available Keybindings</h2>
			<div class="subtitle">BLOC wallet</div>
		</div>
		<table class="custom-table kb-table">
			<tbody>
				<tr class="odd">
					<th scope="col"><kbd>Ctrl</kbd>+<kbd>Home</kbd></th>
					<td class="fc"><img src="../assets/general/arrow-left-white.png" /></td>
					<td>Switch to <strong>overview/welcome</strong> screen</td>
				</tr>
				<tr class="transparent">
					<td colspan="2"></td>
				</tr>
				<tr class="even">
					<th scope="col"><kbd>Ctrl</kbd>+<kbd>Tab</kbd></th>
					<td><img src="../assets/general/arrow-left-white.png" /></td>
					<td>Switch to <strong>next screen</strong></td>
				</tr>
				<tr class="transparent">
					<td colspan="2"></td>
				</tr>
				<tr class="odd">
					<th scope="col"><kbd>Ctrl</kbd>+<kbd>n</kbd></th>
					<td><img src="../assets/general/arrow-left-white.png" /></td>
					<td>Switch to <strong>Create new wallet</strong> screen</td>
				</tr>
				<tr class="transparent">
					<td colspan="2"></td>
				</tr>
				<tr class="even">
					<th scope="col"><kbd>Ctrl</kbd>+<kbd>o</kbd></th>
					<td><img src="../assets/general/arrow-left-white.png" /></td>
					<td>Switch to <strong>Open a wallet</strong> screen</td>
				</tr>
				<tr class="transparent">
					<td colspan="2"></td>
				</tr>
				<tr class="odd">
					<th scope="col"><kbd>Ctrl</kbd>+<kbd>i</kbd></th>
					<td><img src="../assets/general/arrow-left-white.png" /></td>
					<td>Switch to <strong>Import wallet from private keys</strong> screen</td>
				</tr>
				<tr class="transparent">
					<td colspan="2"></td>
				</tr>
				<tr class="even">
					<th scope="col"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>i</kbd></th>
					<td><img src="../assets/general/arrow-left-white.png" /></td>
					<td>Switch to <strong>Import wallet from mnemonic seed</strong> screen</td>
				</tr>
				<tr class="transparent">
					<td colspan="2"></td>
				</tr>
				<tr class="odd">
					<th scope="col"><kbd>Ctrl</kbd>+<kbd>e</kbd></th>
					<td><img src="../assets/general/arrow-left-white.png" /></td>
					<td>Switch to <strong>Export private keys/seed</strong> screen (when wallet opened)</td>
				</tr>
				<tr class="transparent">
					<td colspan="2"></td>
				</tr>
				<tr class="even">
					<th scope="col"><kbd>Ctrl</kbd>+<kbd>t</kbd></th>
					<td><img src="../assets/general/arrow-left-white.png" /></td>
					<td>Switch to <strong>Transactions</strong> screen (when wallet opened)</td>
				</tr>
				<tr class="transparent">
					<td colspan="2"></td>
				</tr>
				<tr class="odd">
					<th scope="col"><kbd>Ctrl</kbd>+<kbd>s</kbd></th>
					<td><img src="../assets/general/arrow-left-white.png" /></td>
					<td>Switch to <strong>Send/Transfer</strong> screen (when wallet opened)</td>
				</tr>
				<tr class="transparent">
					<td colspan="2"></td>
				</tr>
				<tr class="even">
					<th scope="col"><kbd>Ctrl</kbd>+<kbd>x</kbd></th>
					<td><img src="../assets/general/arrow-left-white.png" /></td>
					<td>Close wallet</td>
				</tr>
				<tr class="transparent">
					<td colspan="2"></td>
				</tr>
				<tr class="odd">
					<th scope="col"><kbd>Ctrl</kbd>+<kbd>/</kbd></th>
					<td><img src="../assets/general/arrow-left-white.png" /></td>
					<td>Display shortcut key information (this dialog)</td>
				</tr>
				<tr class="transparent">
					<td colspan="2"></td>
				</tr>
				<tr class="even">
					<th scope="col"><kbd>Esc</kbd></th>
					<td><img src="../assets/general/arrow-left-white.png" /></td>
					<td>Close any opened dialog (like this dialog)</td>
				</tr> 
			</tbody>
		</table>
		<div class="div-panel-buttons">
			<button  data-target="#ab-dialog" type="button" class="button-blue dialog-close-default">Close</button>
		</div>
	</div>
</div>
`;

function genPaymentId(ret){
	ret = ret || false;
	
	let payId = require('crypto').randomBytes(32).toString('hex');
	if(ret) return payId;
	
	let dialogTpl = `<div class="transaction-panel">
	<h4>Generated Payment ID:</h4>
	<textarea data-cplabel="Payment ID" title="click to copy" class="ctcl default-textarea" rows="1" readonly="readonly">${payId}</textarea>
	<div class="div-panel-buttons">
		<button  data-target="#ab-dialog" type="button" class="button-gray dialog-close-default">Close</button>
	</div>
	`;
	let dialog = document.getElementById('ab-dialog');
	if(dialog.hasAttribute('open')) dialog.close();
	dialog.innerHTML = dialogTpl;
	dialog.showModal();
}

function showIntegratedAddressForm(){
	let dialog = document.getElementById('ab-dialog');
	let ownAddress = wsession.get('loadedWalletAddress');
	if(dialog.hasAttribute('open')) dialog.close();

	let iaform = `<div class="transaction-panel">
	<h4>Generate Integrated Address:</h4>
	<div class="input-wrap">
	<label>Wallet Address</label>
	<textarea id="genInputAddress" class="default-textarea" placeholder="Required, put any valid ${config.assetTicker} address..">${ownAddress}</textarea>
	</div>
	<div class="input-wrap">
	<label>Payment Id (<a id="makePaymentId" class="wallet-tool inline-tool" title="generate random payment id...">generate</a>)</label>
	<input id="genInputPaymentId" type="text" required="required" class="text-block" placeholder="Required, enter a valid payment ID, or click generate to get random ID" />
	</div>
	<div class="input-wrap">
	<textarea data-cplabel="Integrated address" placeholder="Fill the form &amp; click generate, integrated address will appear here..." rows="3" id="genOutputIntegratedAddress" class="default-textarea ctcl" readonly="readonly"></textarea>
	</div>
	<div class="input-wrap">
		<span class="form-ew form-msg text-spaced-error hidden" id="text-gia-error"></span>
	</div>
	<div class="div-panel-buttons">
		<button id="doGenIntegratedAddr" type="button" class="button-green dialog-close-default">Generate</button>
		<button  data-target="#ab-dialog" type="button" class="button-gray dialog-close-default">Close</button>
	</div>
	`;
	dialog.innerHTML = iaform;
	dialog.showModal();
}

function showKeyBindings(){
	let dialog = document.getElementById('ab-dialog');
	if(dialog.hasAttribute('open')) dialog.close();
	dialog.innerHTML = keybindingTpl;
	dialog.showModal();
}

function switchTab(){
	if(WALLET_OPEN_IN_PROGRESS){
		wsutil.showToast('Opening wallet in progress, please wait...');
		return;
	}
	let isServiceReady = wsession.get('serviceReady') || false;
	let activeTab = document.querySelector('.btn-active');
	let nextTab = activeTab.nextElementSibling || firstTab;
	let nextSection = nextTab.dataset.section.trim();
	let skippedSections = [];
	if(!isServiceReady){
		skippedSections = ['section-send', 'section-transactions'];
		if(nextSection === 'section-overview') nextSection = 'section-welcome';
	} else if (wsession.get('fusionProgress')) {
        skippedSections = ['section-send'];
    }

	while(skippedSections.indexOf(nextSection) >=0){
		nextTab = nextTab.nextElementSibling;
		nextSection = nextTab.dataset.section.trim();
	}
	changeSection(nextSection);
}

function setCssWalletOpened() {
	body[0].classList.add('wallet-opened');
}

function setCssWalletClosed() {
	body[0].classList.remove('wallet-opened');
}

function setIconSelected(btnActive) {
	// remove the selected icon from all the items
	let allButtons = document.querySelectorAll('.navbar button');
	for(var i=0; i < allButtons.length;i++){
		let img = allButtons[i].querySelector('img');
		let normal = img.getAttribute('data-normal');
		img.setAttribute('src', normal);
	}

	// add the selected icon to the current item
	if (btnActive) {
		let img = btnActive.querySelector('img');
		let selected = img.getAttribute('data-selected');
		img.setAttribute('src', selected);
	}
}

function showNews(listNews){
	listNews = listNews || settings.get('news_json', []);

	let i = 1;
	let itemNews = function(item) {
		let created = (function() {
			var d = new Date(item.created);
			var m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
			return d.getDate() + ' ' + m[d.getMonth()] + ' ' + d.getFullYear();
		})();
		item.content = item.content.replace('<br />', '|');
		let title = item.title.substring(0, 50) + (item.title.length > 50 ? '...' : '');
		let content = item.content.substring(0, 250) + (item.content.length > 250 ? '...' : '');
		content = content.replace('|', '<br />');
		let cont_start = (i === 1) || ((i - 1) % 3 == 0) ? '<div class="news-div-content">' : '';
		let cont_end = (i % 3 == 0) || (i === listNews.length) ? '</div>' : '';
		i++;
		return `${cont_start}
			<div class="box">
				<div class="title clearfix">
					<img src="../assets/news/item-icon.png" />
					${title}
				</div>
				<div class="text">${content}</div>
				<div class="bottom clearfix">
					<span class="date">${created}</span>
					<a href="${item.link}" class="external form-bt button-blue">Read more</a>
				</div>
			</div>
		${cont_end}`;
	};
	let html = '';
	for (let i = 0; i < listNews.length; i++) {
		html += itemNews(listNews[i]);
	}
	document.querySelector('#section-news .list').innerHTML = html;

	let d = document.getElementById('news-loading');
	d.classList.add('hidden');
}

function getNews(){
	try{
		const news_time = settings.get('news_timestamp', 0);
		let curr_time = new Date().getTime();

		if ((curr_time - news_time) > (1000 * 60 * 5) || document.querySelector('#section-news .list').innerHTML == '') {
			let d = document.getElementById('news-loading');
			d.classList.remove('hidden');

			require('https').get(config.newsUpdateUrl, (res) => {
				var result = '';
				res.setEncoding('utf8');

				res.on('data', (chunk) => {
					result += chunk;
				});

				res.on('end', () => {
					try{
						var newsList = JSON.parse(result);
						settings.set('news_json', newsList);
						settings.set('news_timestamp', new Date().getTime());
						showNews(newsList);
					}catch(e){
						log.debug(`Failed to get the news: ${e.message}`);
						showNews();
					}
				});
			}).on('error', (e) => {
				log.debug(`Failed to get the news: ${e.message}`);
				showNews();
			});
		}
    }catch(e){
        log.error(`Failed to get the news: ${e.code} - ${e.message}`);
		showNews();
    }
}

function showOverviewBlocPrice(listBlocPrice){
	listBlocPrice = listBlocPrice || settings.get('bloc_price_json', {});

	if (!listBlocPrice.hasOwnProperty('bloc_price_btc')) return;

	var evolutionWrapper = function(value) {
		if (value < 0) {
			return `<span class="fall">(${value}%)</span>`;
		} else if (value > 0) {
			return `<span class="rise">(${value}%)</span>`;
		} else {
			return `<span class="none">(${value}%)</span>`;
		}
	};
	let d;

	d = document.getElementById('bloc-price-btc');
	d.innerHTML = listBlocPrice.bloc_price_btc + ' BTC ' + evolutionWrapper(listBlocPrice.bloc_price_btc_evolution);
	d = document.getElementById('bloc-price-usd');
	d.innerHTML = '$ ' + listBlocPrice.bloc_price_usd + ' USD ' + evolutionWrapper(listBlocPrice.bloc_price_usd_evolution);
	d = document.getElementById('trading-volume-btc');
	d.innerHTML = listBlocPrice['24_hours_volume_btc'] + ' BTC ' + evolutionWrapper(listBlocPrice['24_hours_volume_btc_evolution']);
	d = document.getElementById('trading-volume-usd');
	d.innerHTML = '$ ' + listBlocPrice['24_hours_volume_usd'] + ' USD ' + evolutionWrapper(listBlocPrice['24_hours_volume_usd_evolution']);
	d = document.getElementById('market-cap-btc');
	d.innerHTML = listBlocPrice.market_cap_btc + ' BTC ' + evolutionWrapper(listBlocPrice.market_cap_btc_evolution);
	d = document.getElementById('market-cap-usd');
	d.innerHTML = '$ ' + listBlocPrice.market_cap_usd + ' USD ' + evolutionWrapper(listBlocPrice.market_cap_usd_evolution);

	d = document.getElementById('div-overview-markets-loading');
	d.classList.add('hidden');
}

function getBlocPrice() {
	try{
		const bloc_price_time = settings.get('bloc_price_timestamp', 0);
		let curr_time = new Date().getTime();

		if ((curr_time - bloc_price_time) > (1000 * 60 * 5) || document.getElementById('bloc-price-btc').innerHTML == '0.00000000 BTC <span class="none">(0.00%)</span>') {
			let d = document.getElementById('div-overview-markets-loading');
			d.classList.remove('hidden');

			require('https').get(config.blocPriceUpdateUrl, (res) => {
				var result = '';
				res.setEncoding('utf8');

				res.on('data', (chunk) => {
					result += chunk;
				});

				res.on('end', () => {
					try{
						var blocPrice = JSON.parse(result);
						settings.set('bloc_price_json', blocPrice);
						settings.set('bloc_price_timestamp', new Date().getTime());
						showOverviewBlocPrice(blocPrice);
					}catch(e){
						log.debug(`Failed to get the BLOC price: ${e.message}`);
						showOverviewBlocPrice();
					}
				});
			}).on('error', (e) => {
				log.debug(`Failed to get the BLOC price: ${e.message}`);
				showOverviewBlocPrice();
			});
		}
    }catch(e){
        log.error(`Failed to get the BLOC price: ${e.code} - ${e.message}`);
		showOverviewBlocPrice();
    }
}

function showExchange(listExchange) {
	listExchange = listExchange || settings.get('exchange_json', {});

	if (!listExchange.hasOwnProperty('exchanges')) return;

	// exchanges list
	let i = 1;
	let domainOnly = function(url) {
		let domain = url;
		domain = domain.replace('http://', '');
		domain = domain.replace('https://', '');
		domain = domain.split('/')[0];
		return domain;
	};
	let itemExchange = function(item) {
		let text = `Buy & sell BLOC on <upper>${item.name}</upper>`;
		let domain = domainOnly(item.link);
		let cont_start = (i === 1) || ((i - 1) % 4 == 0) ? '<div class="exchanges-div-content">' : '';
		let cont_end = (i % 4 == 0) || (i === listExchange.exchanges.length) ? '</div>' : '';
		i++;
		return `${cont_start}
			<div class="box">
				<a href="${item.link}" class="external">
					<img src="${item.image}" height="60" />
				</a>
				<div class="text">${text}</div>
				<div class="link">
					<a href="${item.link}" class="external">${domain}</a>
				</div>
			</div>
		${cont_end}`;
	};
	let html = '';
	for (let i = 0; i < listExchange.exchanges.length; i++) {
		html += itemExchange(listExchange.exchanges[i]);
	}
	document.querySelector('#div-exchanges').innerHTML = html;

	// price evolution stats
	var evolutionWrapper = function(value) {
		if (value < 0) {
			return `<span class="fall">(${value}%)</span>`;
		} else if (value > 0) {
			return `<span class="rise">(${value}%)</span>`;
		} else {
			return `<span class="none">(${value}%)</span>`;
		}
	};
	let d;

	d = document.getElementById('exchange-bloc-price-btc');
	d.innerHTML = listExchange.coingecko_stats.bloc_price_btc + ' BTC ' + evolutionWrapper(listExchange.coingecko_stats.bloc_price_btc_evolution);
	d = document.getElementById('exchange-bloc-price-usd');
	d.innerHTML = '$ ' + listExchange.coingecko_stats.bloc_price_usd + ' USD ' + evolutionWrapper(listExchange.coingecko_stats.bloc_price_usd_evolution);
	d = document.getElementById('exchange-trading-volume-btc');
	d.innerHTML = listExchange.coingecko_stats['24_hours_volume_btc'] + ' BTC ' + evolutionWrapper(listExchange.coingecko_stats['24_hours_volume_btc_evolution']);
	d = document.getElementById('exchange-trading-volume-usd');
	d.innerHTML = '$ ' + listExchange.coingecko_stats['24_hours_volume_usd'] + ' USD ' + evolutionWrapper(listExchange.coingecko_stats['24_hours_volume_usd_evolution']);
	d = document.getElementById('exchange-market-cap-btc');
	d.innerHTML = listExchange.coingecko_stats.market_cap_btc + ' BTC ' + evolutionWrapper(listExchange.coingecko_stats.market_cap_btc_evolution);
	d = document.getElementById('exchange-market-cap-usd');
	d.innerHTML = '$ ' + listExchange.coingecko_stats.market_cap_usd + ' USD ' + evolutionWrapper(listExchange.coingecko_stats.market_cap_usd_evolution);

	// price evolution chart
	// https://www.chartjs.org/samples/latest/scales/linear/step-size.html
	chartConfig = {
		type: 'line',
		data: {
			labels: [],
			datasets: []
		},
		options: {
			maintainAspectRatio: false,
			responsive: true,
			title: {
				display: false,
				text: ''
			},
			tooltips: {
				mode: 'index',
				intersect: false
			},
			hover: {
				mode: 'nearest',
				intersect: true
			},
			legend: {
				labels: {
					fontColor: wsutil.chartColors.white,
					fontSize: 14,
					fontFamily: "'Roboto Condensed', sans-serif"
				},
				position: 'bottom'
			},
			scales: {
				xAxes: [{
					display: true,
					scaleLabel: {
						display: false
					},
					ticks: {
						fontColor: wsutil.chartColors.white,
						fontSize: 12,
						fontFamily: "'Roboto Condensed', sans-serif"
					},
					gridLines: {
						color: "rgba(125, 125, 125, 0.3)",
					}
				}],
				yAxes: [{
					id: 'price-btc-y-axis',
					scaleLabel: {
						display: false
					},
					ticks: {
						display: false
					},
					gridLines: {
						color: "rgba(125, 125, 125, 0.3)",
					}
				}, {
					id: 'price-usd-y-axis',
					scaleLabel: {
						display: false
					},
					ticks: {
						display: false
					},
					gridLines: {
						display: false
					}
				}, {
					id: 'volume-btc-y-axis',
					scaleLabel: {
						display: false
					},
					ticks: {
						display: false
					},
					gridLines: {
						display: false
					}
				}, {
					id: 'volume-usd-y-axis',
					scaleLabel: {
						display: false
					},
					ticks: {
						display: false
					},
					gridLines: {
						display: false
					}
				}, {
					id: 'cap-btc-y-axis',
					scaleLabel: {
						display: false
					},
					ticks: {
						display: false
					},
					gridLines: {
						display: false
					}
				}, {
					id: 'cap-usd-y-axis',
					type: 'linear',
					position: 'right',
					scaleLabel: {
						display: false
					},
					ticks: {
						/*fontColor: wsutil.chartColors.white,
						fontSize: 12,
						fontFamily: "'Roboto Condensed', sans-serif",
						beginAtZero: true,*/
						display: false
					},
					gridLines: {
						display: false
					}
				}]
			}
		}
	};
	var ctx = document.getElementById('exchange-chart');
	if (typeof chartInstance !== 'undefined') chartInstance.destroy();
	chartInstance = new Chart(ctx.getContext('2d'), chartConfig);

	// price evolution chart buttons
	let cod = document.getElementById('chart-one-day');
	let cow = document.getElementById('chart-one-week');
	let com = document.getElementById('chart-one-month');
	let coy = document.getElementById('chart-one-year');
	function resetButtons() {
		cod.classList.remove('selected');
		cow.classList.remove('selected');
		com.classList.remove('selected');
		coy.classList.remove('selected');
	}
	if (!cod.hasAttribute("data-once")) {
		cod.setAttribute("data-once", 1);
		cod.addEventListener('click', function(){
			resetButtons();
			cod.classList.add('selected');
			updateExchangeChart();
		});
		cow.addEventListener('click', function(){
			resetButtons();
			cow.classList.add('selected');
			updateExchangeChart();
		});
		com.addEventListener('click', function(){
			resetButtons();
			com.classList.add('selected');
			updateExchangeChart();
		});
		coy.addEventListener('click', function(){
			resetButtons();
			coy.classList.add('selected');
			updateExchangeChart();
		});
	}
	updateExchangeChart();

	let m = document.getElementById('exchange-loading');
	m.classList.add('hidden');
}

function updateExchangeChart() {
	let listExchange = settings.get('exchange_json');

	// find the id of the selected button
	const buttons = document.querySelectorAll('.div-section-exchange-chart .buttons button');
	let id;
	for (let i = 0; i < buttons.length; i++) {
		if (buttons[i].classList.contains("selected")) {
			id = buttons[i].getAttribute('id');
			break;
		}
	}
	if (typeof id === 'undefined') return;

	// render the chart
	function createDataset(label, color, key1, key2, id) {
		let newDataset = {
			label: label,
			backgroundColor: color,
			borderColor: color,
			data: [],
			fill: false,
			yAxisID: id
		};
		listExchange.charts[key1][key2].forEach(function(value) {
			newDataset.data.push(value);
		});
		chartConfig.data.datasets.push(newDataset);
	}
	const sets = ['day', 'week', 'month', 'year'];
	for (let i = 0; i < sets.length; i++) {
		if (id == 'chart-one-' + sets[i]) {
			chartConfig.data.labels = listExchange.charts[sets[i]].labels;
			chartConfig.data.datasets.splice(0, chartConfig.data.datasets.length);
			createDataset('BLOC price BTC', wsutil.chartColors.red, sets[i], 'bloc_price_btc', 'price-btc-y-axis');
			createDataset('BLOC price USD', wsutil.chartColors.blue, sets[i], 'bloc_price_usd', 'price-usd-y-axis');
			createDataset('Volume 24h BTC', wsutil.chartColors.purple, sets[i], '24_hours_volume_btc', 'volume-btc-y-axis');
			createDataset('Volume 24h USD', wsutil.chartColors.green, sets[i], '24_hours_volume_usd', 'volume-usd-y-axis');
			createDataset('Market cap BTC', wsutil.chartColors.white, sets[i], 'market_cap_btc', 'cap-btc-y-axis');
			createDataset('Market cap USD', wsutil.chartColors.yellow, sets[i], 'market_cap_usd', 'cap-usd-y-axis');
			chartInstance.update();
		}
	}
}

function getExchange() {
	try{
		const exchange_time = settings.get('exchange_timestamp', 0);
		let curr_time = new Date().getTime();
		let d = document.getElementById('exchange-loading');

		if ((curr_time - exchange_time) > (1000 * 60 * 2) || ('loaded' in d.dataset === false)) {
			d.dataset.loaded = '1';
			d.classList.remove('hidden');

			require('https').get(config.exchangeUpdateUrl, (res) => {
				var result = '';
				res.setEncoding('utf8');

				res.on('data', (chunk) => {
					result += chunk;
				});

				res.on('end', () => {
					try{
						var exchangeList = JSON.parse(result);
						settings.set('exchange_json', exchangeList);
						settings.set('exchange_timestamp', new Date().getTime());
						showExchange(exchangeList);
					}catch(e){
						log.debug(`Failed to get the exchange: ${e.message}`);
						showExchange();
					}
				});
			}).on('error', (e) => {
				log.debug(`Failed to get the exchange: ${e.message}`);
				showExchange();
			});
		}
    }catch(e){
        log.error(`Failed to get the exchange: ${e.code} - ${e.message}`);
		showExchange();
    }
}

// section switcher
function changeSection(sectionId, isSettingRedir) {
	if(WALLET_OPEN_IN_PROGRESS){
		wsutil.showToast('Opening wallet in progress, please wait...');
		return;
	}

	formMessageReset();
	isSettingRedir = isSettingRedir === true ? true : false;
	let targetSection = sectionId.trim();

	// when overview is loaded, show the sidebar nav
	if(targetSection === 'section-welcome'){
		sswitch.classList.remove('hidden');
		iswitch.classList.remove('hidden');
	}

	// when settings is loaded, show the warning
	if(targetSection === 'section-settings'){
		formMessageSet('settings','warning', `If you change the address or port, you will need to restart the wallet`);
	}
	// when help is loaded, add the wiki link
	if(targetSection === 'section-help'){
		let d = document.getElementById('wiki-link');
		d.setAttribute('href', config.blocWikiUrl);
	}
	// when about is loaded, add the links and the content
	if(targetSection === 'section-about'){
		let d = document.getElementById('github-link');
		d.setAttribute('href', config.appGitRepo);

		d = document.getElementById('app-version');
		d.innerHTML = remote.app.getVersion();

		d = document.getElementById('service-version');
		d.innerHTML = config.walletServiceBinaryVersion;

		let donationAddressesList = document.querySelector('#about-donation-addresses .list');
		if (donationAddressesList.innerHTML == '') {
			let itemDonation = function(item) {
				return `<div class="item">
					Donate to "${item.name}":<br />
					<input tabindex="0" data-noclear="1" title="Click to copy" type="text" class="ctcl" value="${item.address}" readonly="readonly" />
				</div>`;
			};
			let donationOpts = {
				valueNames: [],
				item: itemDonation,
				indexAsync: true
			};
			new List('about-donation-addresses', donationOpts, config.addressBookSampleEntries);
		}
	}
	// when about is loaded, add the links
	if(targetSection === 'section-block-explorer'){
		let d = document.getElementById('bloc-explorer-link');
		d.setAttribute('href', config.blockExplorerUrl);

		d = document.getElementById('telegram-bot-explorer-link');
		d.setAttribute('href', config.blockExplorerTelegramBotUrl);
	}
	// when tools is loaded, add the links
	if(targetSection === 'section-tools'){
		let d = document.getElementById('bloc-money-link');
		d.setAttribute('href', config.blockMoneyDownloadUrl);

		d = document.getElementById('iphone-wallet-link');
		d.setAttribute('href', config.iphoneWalletUrl);

		d = document.getElementById('gui-miner-link');
		d.setAttribute('href', config.guiMinerDownloadUrl);

		d = document.getElementById('paper-wallet-link');
		d.setAttribute('href', config.paperWalletUrl);

		d = document.getElementById('bloc-wiki-link');
		d.setAttribute('href', config.blocWikiUrl);

		d = document.getElementById('web-browser-mining-link');
		d.setAttribute('href', config.browserMiningUrl);
	}
	// when news is loaded, add the links
	if(targetSection === 'section-news'){
		let d = document.getElementById('main-website-link');
		d.setAttribute('href', config.blockMoneyUrl);

		d = document.getElementById('discord-channel-link');
		d.setAttribute('href', config.discordChannelUrl);

		d = document.getElementById('telegram-channel-link');
		d.setAttribute('href', config.telegramChannelUrl);

		d = document.getElementById('bitcoin-talk-link');
		d.setAttribute('href', config.bitcoinTalkUrl);

		d = document.getElementById('github-page-link');
		d.setAttribute('href', config.githubPageUrl);

		d = document.getElementById('twitter-profile-link');
		d.setAttribute('href', config.twitterProfileUrl);

		d = document.getElementById('medium-profile-link');
		d.setAttribute('href', config.mediumProfileUrl);

		d = document.getElementById('youtube-channel-link');
		d.setAttribute('href', config.youtubeChannelUrl);

		d = document.getElementById('facebook-page-link');
		d.setAttribute('href', config.facebookPageUrl);

		d = document.getElementById('instagram-profile-link');
		d.setAttribute('href', config.instagramProfileUrl);

		getNews();

		changeSection('section-settings');
	}

	// when overview is loaded, show the sidebar nav and fetch BLOC stats
	if(targetSection === 'section-overview'){
		setCssWalletOpened();
		getBlocPrice();
	}

	// when exchange is loaded, fetch and display BLOC stats
	if(targetSection === 'section-exchange'){
		getExchange();
	}

	let untoast = false;
	if(targetSection === 'section-welcome'){
		targetSection = 'section-overview';
		untoast = true;
	}

	let isSynced = wsession.get('synchronized') || false;
	let isServiceReady = wsession.get('serviceReady') || false;
	let needServiceReady = ['section-transactions', 'section-send', 'section-overview'];
	let needServiceStopped = 'section-welcome';
	let needSynced = ['section-send'];
	if(needSynced.indexOf(targetSection) >= 0 && wsession.get('fusionProgress')){
		wsutil.showToast('Wallet optimization in progress, please wait');
		return;
	}

	let finalTarget = targetSection;
	let toastMsg = '';
	
	if(needServiceReady.indexOf(targetSection) >=0 && !isServiceReady){
		// no access to wallet, send, tx when no wallet opened
		finalTarget = 'section-welcome';
		toastMsg = "Please create/open your wallet!";
	}else if(needServiceStopped.indexOf(targetSection) >=0 && isServiceReady){
		finalTarget = 'section-overview';
	}else if(needSynced.indexOf(targetSection) >=0 && !isSynced){
		// just return early
		wsutil.showToast("Please wait until the syncing completes!");
		return;
	}else{
		if(targetSection === 'section-overview-load'){
			initNodeCompletion();
		}
		finalTarget = targetSection;
		toastMsg = '';
	}

	let section = document.getElementById(finalTarget);
	if(section.classList.contains('is-shown')){
		if(toastMsg.length && !isSettingRedir && !untoast) wsutil.showToast(toastMsg);
		return; // don't do anything if section unchanged
	}

	// navbar active section indicator, only for main section	
	const activeButton = document.querySelector(`.btn-active`);
	if(activeButton) activeButton.classList.remove('btn-active');
	setIconSelected();

	let finalButtonTarget = (finalTarget === 'section-welcome' ? 'section-overview' : finalTarget);
	let newActiveNavbarButton = document.querySelector(`.navbar button[data-section="${finalButtonTarget}"]`);
	if(newActiveNavbarButton){
		setIconSelected(newActiveNavbarButton);
		newActiveNavbarButton.classList.add('btn-active');
	}

	// toggle section
	const activeSection = document.querySelector('.is-shown');
	if(activeSection) activeSection.classList.remove('is-shown');
	section.classList.add('is-shown');
	section.dispatchEvent(new Event('click')); // make it focusable
	// show msg when needed
	if(toastMsg.length && !isSettingRedir && !untoast) wsutil.showToast(toastMsg);
	// notify section was changed
	let currentButton = document.querySelector(`button[data-section="${finalButtonTarget}"]`);
	if(currentButton){
		wsmanager.notifyUpdate({
			type: 'sectionChanged',
			data: currentButton.getAttribute('id')
		});
	}
}

// public nodes autocompletion
function initNodeCompletion(){
	if(!settings.has('pubnodes_data')) return;
	try{
		if(COMPLETION_PUBNODES) COMPLETION_PUBNODES.destroy();
	}catch(e){}

	let publicNodes = settings.has('pubnodes_custom') ? wsutil.arrShuffle(settings.get('pubnodes_data')) : [];
	let nodeChoices = settings.get('pubnodes_custom').concat(publicNodes);


	COMPLETION_PUBNODES = new autoComplete({
		selector: 'input[name="nodeAddress"]',
		minChars: 0,
		source: function(term, suggest){
			term = term.toLowerCase();
			var choices = nodeChoices;
			var matches = [];
			for (var i=0; i<choices.length; i++){
				let phost = choices[i].split(':')[0];
				if (~choices[i].toLowerCase().indexOf(term) && phost.length > term.length){
					matches.push(choices[i]);
				}
			}
			suggest(matches);
		},
		onSelect: function(e, term){
			settingsInputDaemonAddress.value = term.split(':')[0];
			settingsInputDaemonPort.value = term.split(':')[1];
			settingsInputDaemonAddress.dispatchEvent(new Event('blur'));
			return settingsButtonSave.dispatchEvent(new Event('focus'));
		}
	});
}

// initial settings value or updater
function initSettingVal(values){
	values = values || null;
	if(values){
		// save new settings
		settings.set('service_bin', values.service_bin);
		settings.set('daemon_host', values.daemon_host);
		settings.set('daemon_port', values.daemon_port);
		settings.set('tray_minimize', values.tray_minimize);
		settings.set('tray_close', values.tray_close);
	}
	settingsInputServiceBin.value = settings.get('service_bin');
	settingsInputDaemonAddress.value = settings.get('daemon_host');
	settingsInputDaemonPort.value = settings.get('daemon_port');
	settingsInputMinToTray.checked = settings.get('tray_minimize');
	settingsInputCloseToTray.checked = settings.get('tray_close');

	// if custom node, save it
	let mynode = `${settings.get('daemon_host')}:${settings.get('daemon_port')}`;
	let pnodes = settings.get('pubnodes_data');
	if(!settings.has('pubnodes_custom')) settings.set('pubnodes_custom', []);
	let cnodes = settings.get('pubnodes_custom');
	if(pnodes.indexOf(mynode) === -1 && cnodes.indexOf(mynode) === -1){
		cnodes.push(mynode);
		settings.set('pubnodes_custom', cnodes);
	}
}
// address book completions
function initAddressCompletion(){
	var nodeAddress = [];

	Object.keys(abook.get()).forEach((key) => {
		let et = abook.get(key);
		nodeAddress.push(`${et.name}###${et.address}###${(et.paymentId ? et.paymentId : '')}`);
	});

	try{
		if(COMPLETION_ADDRBOOK) COMPLETION_ADDRBOOK.destroy();
	}catch(e){
		console.log(e);
	}

	COMPLETION_ADDRBOOK = new autoComplete({
		selector: 'input[id="input-send-address"]',
		minChars: 1,
		cache: false,
		source: function(term, suggest){
			term = term.toLowerCase();
			var choices = nodeAddress;
			var matches = [];
			for (var i=0; i<choices.length; i++)
				if (~choices[i].toLowerCase().indexOf(term)) matches.push(choices[i]);
			suggest(matches);
		},
		renderItem: function(item, search){
			search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
			var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
			var spl = item.split("###");
			var wname = spl[0];
			var waddr = spl[1];
			var wpayid = spl[2];
			return `<div class="autocomplete-suggestion" data-paymentid="${wpayid}" data-val="${waddr}">${wname.replace(re, "<b>$1</b>")}<br><span class="autocomplete-wallet-addr">${waddr.replace(re, "<b>$1</b>")}<br>Payment ID: ${(wpayid ? wpayid.replace(re, "<b>$1</b>") : 'N/A')}</span></div>`;
		},
		onSelect: function(e, term, item){			   
			document.getElementById('input-send-payid').value = item.getAttribute('data-paymentid');
		}
	});
}

// generic form message reset
function formMessageReset(){
	if(!genericFormMessage.length) return;
	for(var i=0; i < genericFormMessage.length;i++){
		genericFormMessage[i].classList.add('hidden');
		wsutil.clearChild(genericFormMessage[i]);
	}
}

function formMessageSet(target, status, txt){
	// clear all msg
	formMessageReset();
	let the_target = `${target}-${status}`;
	let the_el = null;
	try{ 
		the_el = document.querySelector('.form-ew[id$="'+the_target+'"]');
	}catch(e){}
	
	if(the_el){
		the_el.classList.remove('hidden');
		wsutil.innerHTML(the_el, txt);
	}
}

// sample address book, only on first use
function insertSampleAddresses(){
	let flag = 'addressBookFirstUse';
	if(!settings.get(flag, true)) return;
	const sampleData = config.addressBookSampleEntries;
	if(sampleData && Array.isArray(sampleData)){
		sampleData.forEach((item) => {
			let ahash = wsutil.b2sSum(item.address + item.paymentId);
			let aqr = wsutil.genQrDataUrl(item.address);
			item.qrCode = aqr;
			abook.set(ahash, item);
		});
	}
	settings.set(flag, false);
	initAddressCompletion();
}
// utility: blank tx filler
function setTxFiller(show){
	show = show || false;
	let fillerRow = document.getElementById('txfiller');
	let txRow = document.getElementById('transaction-lists');

	if(!show && fillerRow){
		fillerRow.parentNode.classList.add('hidden');
		txRow.classList.remove('hidden');
	}else{
		let hasItemRow = document.querySelector('#transaction-list-table > tbody > tr.txlist-item');
		if(!hasItemRow)  {
			txRow.classList.add('hidden');
			fillerRow.parentNode.classList.remove('hidden');
		}
	}
}

// display initial page, settings page on first run, else overview page
function showInitialPage(){
	// other initiations here
	formMessageReset();
	initSettingVal(); // initial settings value
	initNodeCompletion(); // initial public node completion list
	initAddressCompletion();

	if(!settings.has('firstRun') || settings.get('firstRun') !== 0){
		changeSection('section-settings');
		settings.set('firstRun', 0);
	}else{
		changeSection('section-welcome');
	}

	let versionInfo = document.getElementById('walletShellVersion');
	if(versionInfo) versionInfo.innerHTML = WS_VERSION;
	//let tsVersionInfo = document.getElementById('blocServiceVersion');
	//if(tsVersionInfo) tsVersionInfo.innerHTML = config.walletServiceBinaryVersion;
	let wVersionInfo = document.getElementById('walletVersion');
	if(wVersionInfo) wVersionInfo.innerHTML = remote.app.getVersion();
}

// settings page handlers
function handleSettings(){
	settingsButtonSave.addEventListener('click', function(){
		formMessageReset();
		let serviceBinValue = settingsInputServiceBin.value ? settingsInputServiceBin.value.trim() : '';
		let daemonHostValue = settingsInputDaemonAddress.value ? settingsInputDaemonAddress.value.trim() :'';
		let daemonPortValue = settingsInputDaemonPort.value ? parseInt(settingsInputDaemonPort.value.trim(),10) : '';

		if(!serviceBinValue.length){
			formMessageSet('settings','error',`Settings can't be saved, please enter correct values`);
			return false;
		}

		if(!wsutil.isRegularFileAndWritable(serviceBinValue)){
			formMessageSet('settings','error',`Unable to find ${config.walletServiceBinaryFilename}, please enter the correct path`);
			return false;
		}

		// validate hostname
		if(!daemonHostValue.length || !Number.isInteger(daemonPortValue)){
			formMessageSet('settings','error',`Please enter enter a valid daemon address & port`);
			return false;
		}

		let validHost = daemonHostValue === 'localhost' ? true : false;
		if(require('net').isIP(daemonHostValue)) validHost = true;
		if(!validHost){
			let domRe = new RegExp(/([a-z])([a-z0-9]+\.)*[a-z0-9]+\.[a-z.]+/i);
			if(domRe.test(daemonHostValue)) validHost = true;
		}
		if(!validHost){
			formMessageSet('settings','error',`Invalid daemon/node address!`);
			return false;
		}

		// validate port
		if(daemonPortValue <= 0 || daemonPortValue > 65534){
			formMessageSet('settings','error',`Invalid daemon/node port number!`);
			return false;
		}

		let vals = {
			service_bin: serviceBinValue,
			daemon_host: daemonHostValue,
			daemon_port: daemonPortValue,
			tray_minimize: settingsInputMinToTray.checked,
			tray_close: settingsInputCloseToTray.checked
		};

		initSettingVal(vals);
		remote.app.checkUpdateConfig(); // re-check config format
		formMessageReset();
		initNodeCompletion();
		let goTo = wsession.get('loadedWalletAddress').length ? 'section-overview' : 'section-welcome';
		changeSection(goTo, true);
		wsutil.showToast('Settings has been updated.',8000);
	});
}

function handleAddressBook(){
	function listAddressBook(force){
		force = force || false;
		insertSampleAddresses();
		let currentLength = document.querySelectorAll('.addressbook-item:not([data-hash="fake-hash"])').length;
		let abookLength =abook.size;
		let perPage = 9;
	
		if(currentLength >= abookLength  && !force)  return;
	
		let listOpts = {
			valueNames: [
				{data: ['hash', 'nameval','walletval','paymentidval','qrcodeval']},
				'addressName','addressWallet','addressPaymentId'
			],
			indexAsync: true
		};
	
		if(abookLength > perPage){
			listOpts.page = perPage;
			listOpts.pagination = true;
		}
	
		const addressList = new List('addressbooks', listOpts);
		addressList.clear();
		Object.keys(abook.get()).forEach((key) => {
			let et = abook.get(key);
			addressList.add({
				hash: key,
				addressName: et.name,
				addressWallet: et.address,
				addressPaymentId: et.paymentId || '-',
				nameval: et.name,
				walletval: et.address,
				paymentidval: et.paymentId || '-',
				qrcodeval: et.qrCode || ''
			});
		});
	
		addressList.remove('hash', 'fake-hash');
	}

	function displayAddressBookEntry(){
		let dialog = document.getElementById('ab-dialog');
		if(dialog.hasAttribute('open')) dialog.close();
		let tpl = `
			 <div class="div-transactions-panel">
				 <h4>Address Detail</h4>
				 <div class="addressBookDetail">
					 <div class="addressBookDetail-qr">
						 <img src="${this.dataset.qrcodeval}" />
					 </div>
					 <div class="addressBookDetail-data">
						 <dl>
							 <dt>Name:</dt>
							 <dd data-cplabel="Name" class="tctcl" title="click to copy">${this.dataset.nameval}</dd>
							 <dt>Wallet Address:</dt>
							 <dd data-cplabel="Wallet address" class="tctcl" title="click to copy">${this.dataset.walletval}</dd>
							 <dt>Payment Id:</dt>
							 <dd data-cplabel="Payment ID" class="tctcl" title="click to copy">${this.dataset.paymentidval ? this.dataset.paymentidval : '-'}</dd>
						 </dl>
					 </div>
				 </div>
			 </div>
			 <div class="div-panel-buttons">
					 <button data-addressid="${this.dataset.hash}" type="button" class="form-bt button-green" id="button-addressbook-panel-edit">Edit</button>
					 <button type="button" class="form-bt button-red" id="button-addressbook-panel-delete">Delete</button>
					 <button data-addressid="${this.dataset.hash}" type="button" class="form-bt button-gray" id="button-addressbook-panel-close">Close</button>
			 </div>
		`;
	 
		wsutil.innerHTML(dialog, tpl);
		// get new dialog
		dialog = document.getElementById('ab-dialog');
		dialog.showModal();
		document.getElementById('button-addressbook-panel-close').addEventListener('click', () => {
			 let abdialog = document.getElementById('ab-dialog');
			 abdialog.close();
			 wsutil.clearChild(abdialog);
		 });
	 
		 let deleteBtn = document.getElementById('button-addressbook-panel-delete');
		 deleteBtn.addEventListener('click', () => {
			 let tardel = this.dataset.nameval;
			 let tarhash = this.dataset.hash;
			 if(!confirm(`Are you sure you want to delete ${tardel} from the address book?`)){
				 return;
			 }else{
				 abook.delete(tarhash);
				 let abdialog = document.getElementById('ab-dialog');
				 abdialog.close();
				 wsutil.clearChild(abdialog);
				 listAddressBook(true);
				 if(!document.getElementById('datoaste')){
					 iqwerty.toast.Toast("Address book entry was deleted.", {settings: {duration:1800}});
				 }
			 }
		 });
	 
		 let editBtn = document.getElementById('button-addressbook-panel-edit');
		 editBtn.addEventListener('click', ()=>{
			 let origHash = this.dataset.hash;
			 let entry = abook.get(origHash);
			 if(!entry){
				 iqwerty.toast.Toast("Invalid address book entry.", {settings: {duration:1800}});
			 }else{
				 const nameField = document.getElementById('input-addressbook-name');
				 const walletField = document.getElementById('input-addressbook-wallet');
				 const payidField = document.getElementById('input-addressbook-paymentid');
				 const updateField = document.getElementById('input-addressbook-update');
				 nameField.value = entry.name;
				 nameField.dataset.oldhash = origHash;
				 walletField.value = entry.address;
				 payidField.value = entry.paymentId;
				 updateField.value = 1;
			 }
			 changeSection('section-addressbook-add');
			 let axdialog = document.getElementById('ab-dialog');
			 axdialog.close();
			 wsutil.clearChild(axdialog);
		 });
	 }

	 function setAbPaymentIdState(addr){
		if(addr.length > 99){
			addressBookInputPaymentId.value = '';
			addressBookInputPaymentId.setAttribute('disabled', true);
		}else{
			addressBookInputPaymentId.removeAttribute('disabled');
		}
	}

	addressBookInputWallet.addEventListener('change', (event) => {
		let val = event.target.value || '';
		setAbPaymentIdState(val);
	});

	addressBookInputWallet.addEventListener('keyup', (event) => {
		let val = event.target.value || '';
		setAbPaymentIdState(val);
	});

	addressBookButtonSave.addEventListener('click', () => {
		formMessageReset();
		let nameValue = addressBookInputName.value ? addressBookInputName.value.trim() : '';
		let addressValue = addressBookInputWallet.value ? addressBookInputWallet.value.trim() : '';
		let paymentIdValue = addressBookInputPaymentId.value ? addressBookInputPaymentId.value.trim() : '';
		let isUpdate = addressBookInputUpdate.value ? addressBookInputUpdate.value : 0;

		if( !nameValue || !addressValue ){
			formMessageSet('addressbook','error',"Name and wallet address can not be left empty!");
			return;
		}

		if(!wsutil.validateAddress(addressValue)){
			formMessageSet('addressbook','error',`Invalid ${config.assetName} address`);
			return;
		}
		
		if( paymentIdValue.length){
			if( !wsutil.validatePaymentId(paymentIdValue) ){
				formMessageSet('addressbook','error',"Invalid Payment ID");
				return;
			}
		}

		if(addressValue.length > 99) paymentIdValue.value = '';

		let entryName = nameValue.trim();
		let entryAddr = addressValue.trim();
		let entryPaymentId = paymentIdValue.trim();
		let entryHash = wsutil.b2sSum(entryAddr + entryPaymentId);

		if(abook.has(entryHash) && !isUpdate){
			formMessageSet('addressbook','error',"This combination of address and payment ID already exist, please enter new address or different payment id.");
			return;
		}
   
		try{
			abook.set(entryHash, {
				name: entryName,
				address: entryAddr,
				paymentId: entryPaymentId,
				qrCode: wsutil.genQrDataUrl(entryAddr)
			});
			let oldHash = addressBookInputName.dataset.oldhash || '';
			let isNew = (oldHash.length && oldHash !== entryHash);
			
			if(isUpdate && isNew){
				abook.delete(oldHash);
			}
		}catch(e){
			formMessageSet('addressbook','error',"Address book entry can not be saved, please try again");
			return;
		}
		addressBookInputName.value = '';
		addressBookInputName.dataset.oldhash = '';
		addressBookInputWallet.value = '';
		addressBookInputPaymentId.value = '';
		addressBookInputUpdate.value = 0;
		listAddressBook(true);
		initAddressCompletion();
		formMessageReset();
		changeSection('section-addressbook');
		wsutil.showToast('Address book entry has been saved.');
	});
	// entry detail
	wsutil.liveEvent('.addressbook-item','click',displayAddressBookEntry);
	listAddressBook();
}

function handleWalletOpen(){
	if(settings.has('recentWallet')){
		walletOpenInputPath.value = settings.get('recentWallet');
	}

	function setOpenButtonsState(isInProgress){
		isInProgress = isInProgress ? 1 : 0;
		if(isInProgress){
			walletOpenButtons.classList.add('hidden');
		}else{
			walletOpenButtons.classList.remove('hidden');
		}
	}

	walletOpenButtonOpen.addEventListener('click', () => {
		formMessageReset();
		// node settings thingy
		let daemonHostValue = settingsInputDaemonAddress.value ? settingsInputDaemonAddress.value.trim() :'';
		let daemonPortValue = settingsInputDaemonPort.value ? parseInt(settingsInputDaemonPort.value.trim(),10) : '';

		// validate hostname
		if(!daemonHostValue.length || !Number.isInteger(daemonPortValue)){
			formMessageSet('load','error',`Please enter enter a valid daemon address & port`);
			return false;
		}

		let validHost = daemonHostValue === 'localhost' ? true : false;
		if(require('net').isIP(daemonHostValue)) validHost = true;
		if(!validHost){
			let domRe = new RegExp(/([a-z])([a-z0-9]+\.)*[a-z0-9]+\.[a-z.]+/i);
			if(domRe.test(daemonHostValue)) validHost = true;
		}
		if(!validHost){
			formMessageSet('load','error',`Invalid daemon/node address!`);
			return false;
		}

		// validate port
		if(daemonPortValue <= 0 || daemonPortValue > 65534){
			formMessageSet('load','error',`Invalid daemon/node port number!`);
			return false;
		}

		// validate password
		if(!walletOpenInputPassword.value){
			formMessageSet('load','error', `Please enter the password of the wallet!`);
			return;
		}

		let settingVals = {
			service_bin: settings.get('service_bin'),
			daemon_host: daemonHostValue,
			daemon_port: daemonPortValue,
			tray_minimize: settings.get('tray_minimize'),
			tray_close: settings.get('tray_close')
		};
		initSettingVal(settingVals);
		initNodeCompletion();

		// actually open wallet
		if(!walletOpenInputPath.value){
			formMessageSet('load','error', "Invalid wallet file path");
			WALLET_OPEN_IN_PROGRESS = false;
			setOpenButtonsState(0);
			return;
		}

		function onError(err){
			formMessageReset();
			formMessageSet('load','error', err);
			WALLET_OPEN_IN_PROGRESS = false;
			setOpenButtonsState(0);
			return false;
		}

		//function onSuccess(theWallet, scanHeight){
		function onSuccess(){
			walletOpenInputPath.value = settings.get('recentWallet');
			overviewWalletAddress.value = wsession.get('loadedWalletAddress');
			wsmanager.getNodeFee();
			WALLET_OPEN_IN_PROGRESS = false;
			changeSection('section-overview');
			setTimeout(()=>{
				setOpenButtonsState(0);
			},300);
		}

		function onDelay(msg){
			formMessageSet('load','warning', `${msg}<br><progress></progress>`);
		}

		let walletFile = walletOpenInputPath.value;
		let walletPass = walletOpenInputPassword.value;

		fs.access(walletFile, fs.constants.R_OK, (err) => {
			if(err){
				formMessageSet('load','error', "Invalid wallet file path");
				setOpenButtonsState(0);
				WALLET_OPEN_IN_PROGRESS = false;
				return false;
			}

			setOpenButtonsState(1);
			WALLET_OPEN_IN_PROGRESS = true;
			settings.set('recentWallet', walletFile);
			settings.set('recentWalletDir', path.dirname(walletFile));
			formMessageSet('load','warning', "Accessing wallet...<br><progress></progress>");
			wsmanager.stopService().then(() => {

				formMessageSet('load','warning', "Starting wallet service...<br><progress></progress>");
				setTimeout(() => {
					formMessageSet('load','warning', "Opening wallet, please be patient...<br><progress></progress>");
					wsmanager.startService(walletFile, walletPass, onError, onSuccess, onDelay);
				},800);
			}).catch((err) => {
				console.log(err);
				formMessageSet('load','error', "Unable to start service");
				WALLET_OPEN_IN_PROGRESS = false;
				setOpenButtonsState(0);
				return false;
			});
		});
	});
}

function handleWalletClose(){
	overviewWalletCloseButton.addEventListener('click', (event) => {
		event.preventDefault();
		if(!confirm('Are you sure want to close your wallet?')) return;

		let dialog = document.getElementById('main-dialog');
		let htmlStr = '<div class="div-save-main" style="text-align: center;padding:1rem;"><i class="fas fa-spinner fa-pulse"></i><span style="padding:0px 10px;">Saving &amp; closing your wallet...</span></div>';
		wsutil.innerHTML(dialog, htmlStr);

		dialog = document.getElementById('main-dialog');
		dialog.showModal();
		// save + SIGTERMed wallet daemon
		wsmanager.stopService().then(() => {
			setTimeout(function(){
				// clear form err msg
				formMessageReset();
				changeSection('section-overview');
				setCssWalletClosed(); // this is not in changeSection function because the section sent was 'section-overview' instead of 'section-welcome'
				// update/clear tx
				txInputUpdated.value = 1;
				txInputUpdated.dispatchEvent(new Event('change'));
				// send fake blockUpdated event
				let resetdata = {
					type: 'blockUpdated',
					data: {
						blockCount: -100,
						displayBlockCount: -100,
						knownBlockCount: -100,
						displayKnownBlockCount: -100,
						syncPercent: -100
					}
				};
				wsmanager.notifyUpdate(resetdata);
				dialog = document.getElementById('main-dialog');
				if(dialog.hasAttribute('open')) dialog.close();
				wsmanager.resetState();
				wsutil.clearChild(dialog);
				try{
					if(null !== TXLIST_OBJ){
						TXLIST_OBJ.clear();
						TXLIST_OBJ.update();
					}

					TXLIST_OBJ = null;
				}catch(e){}
				setTxFiller(true);
			}, 1200);
		}).catch((err) => {
			wsmanager.terminateService(true);
			console.log(err);
		});
	});
}

function handleWalletCreate(){
	overviewButtonCreate.addEventListener('click', () => {
		formMessageReset();
		let filePathValue = walletCreateInputPath.value ? walletCreateInputPath.value.trim() : '';
		let passwordValue =  walletCreateInputPassword.value ? walletCreateInputPassword.value.trim() : '';

		// validate path
		wsutil.validateWalletPath(filePathValue, DEFAULT_WALLET_PATH).then((finalPath)=>{
			// validate password
			if(!passwordValue.length){
				formMessageSet('create','error', `Please enter a password, creating wallet without a password will not be supported!`);
				return;
			}

			settings.set('recentWalletDir', path.dirname(finalPath));

			// user already confirm to overwrite
			if(wsutil.isRegularFileAndWritable(finalPath)){
				try{
					// for now, backup instead of delete, just to be save
					let ts = new Date().getTime();
					let backfn = `${finalPath}.bak.${ts}`;
					fs.renameSync(finalPath, backfn);
					//fs.unlinkSync(finalPath);
				}catch(err){
				   formMessageSet('create','error', `Unable to overwrite existing file, please enter new wallet file path`);
				   return;
				}
		   }

			// create
			wsmanager.createWallet(
				finalPath,
				passwordValue
			).then((walletFile) => {
				settings.set('recentWallet', walletFile);
				walletOpenInputPath.value = walletFile;
				changeSection('section-overview-load');
				wsutil.showToast('Wallet has been created, you can now open your wallet!',12000);
			}).catch((err) => {
				formMessageSet('create', 'error', err.message);
				return;
			});
		}).catch((err) => {
			formMessageSet('create','error', err.message);
			return;
		});
	});
}

function handleWalletImportKeys(){
	importKeyButtonImport.addEventListener('click', () => {
		formMessageReset();
		let filePathValue = importKeyInputPath.value ? importKeyInputPath.value.trim() : '';
		let passwordValue =  importKeyInputPassword.value ? importKeyInputPassword.value.trim() : '';
		let viewKeyValue = importKeyInputViewKey.value ? importKeyInputViewKey.value.trim() : '';
		let spendKeyValue = importKeyInputSpendKey.value ? importKeyInputSpendKey.value.trim() : '';
		let scanHeightValue = importKeyInputScanHeight.value ? parseInt(importKeyInputScanHeight.value,10) : 0;
		
		// validate path
		wsutil.validateWalletPath(filePathValue, DEFAULT_WALLET_PATH).then((finalPath)=>{
			if(!passwordValue.length){
				formMessageSet('import','error', `Please enter a password, creating wallet without a password will not be supported!`);
				return;
			}

			if(scanHeightValue < 0 || scanHeightValue.toPrecision().indexOf('.') !== -1){
				formMessageSet('import','error', 'Invalid scan height!');
				return;
			}

			// validate viewKey
			if(!viewKeyValue.length || !spendKeyValue.length){
				formMessageSet('import','error', 'View Key and Spend Key can not be left blank!');
				return;
			}
	
			if(!wsutil.validateSecretKey(viewKeyValue)){
				formMessageSet('import','error', 'Invalid view key!');
				return;
			}
			// validate spendKey
			if(!wsutil.validateSecretKey(spendKeyValue)){
				formMessageSet('import','error', 'Invalid spend key!');
				return;
			}

			settings.set('recentWalletDir', path.dirname(finalPath));

			// user already confirm to overwrite
			if(wsutil.isRegularFileAndWritable(finalPath)){
				try{
					// for now, backup instead of delete, just to be safe
					let ts = new Date().getTime();
					let backfn = `${finalPath}.bak.${ts}`;
					fs.renameSync(finalPath, backfn);
					//fs.unlinkSync(finalPath);
				}catch(err){
				formMessageSet('import','error', `Unable to overwrite existing file, please enter new wallet file path`);
				return;
				}
			}
			wsmanager.importFromKeys(
				finalPath,// walletfile
				passwordValue,
				viewKeyValue,
				spendKeyValue,
				scanHeightValue
			).then((walletFile) => {
				settings.set('recentWallet', walletFile);
				walletOpenInputPath.value = walletFile;
				changeSection('section-overview-load');
				wsutil.showToast('Wallet has been imported, you can now open your wallet!', 12000);
			}).catch((err) => {
				formMessageSet('import', 'error', err);
				return;
			});

		}).catch((err)=>{
			formMessageSet('import','error', err.message);
			return;
		});
	});
}

function handleWalletImportSeed(){
	importSeedButtonImport.addEventListener('click', () => {
		formMessageReset();

		let filePathValue = importSeedInputPath.value ? importSeedInputPath.value.trim() : '';
		let passwordValue =  importSeedInputPassword.value ? importSeedInputPassword.value.trim() : '';
		let seedValue = importSeedInputMnemonic.value ? importSeedInputMnemonic.value.trim() : '';
		let scanHeightValue = importSeedInputScanHeight.value ? parseInt(importSeedInputScanHeight.value,10) : 0;
		// validate path
		wsutil.validateWalletPath(filePathValue, DEFAULT_WALLET_PATH).then((finalPath)=>{
			// validate password
			if(!passwordValue.length){
				formMessageSet('import-seed','error', `Please enter a password, creating wallet without a password will not be supported!`);
				return;
			}

			if(scanHeightValue < 0 || scanHeightValue.toPrecision().indexOf('.') !== -1){
				formMessageSet('import-seed','error', 'Invalid scan height!');
				return;
			}

			if(!wsutil.validateMnemonic(seedValue)){
				formMessageSet('import-seed', 'error', 'Invalid mnemonic seed value!');
				return;
			}

			settings.set('recentWalletDir', path.dirname(finalPath));

			// user already confirm to overwrite
			if(wsutil.isRegularFileAndWritable(finalPath)){
				try{
					// for now, backup instead of delete, just to be save
					let ts = new Date().getTime();
					let backfn = `${finalPath}.bak.${ts}`;
					fs.renameSync(finalPath, backfn);
					//fs.unlinkSync(finalPath);
				}catch(err){
				   formMessageSet('import-seed','error', `Unable to overwrite existing file, please enter new wallet file path`);
				   return;
				}
			}

			wsmanager.importFromSeed(
				finalPath,
				passwordValue,
				seedValue,
				scanHeightValue
			).then((walletFile) => {
				settings.set('recentWallet', walletFile);
				walletOpenInputPath.value = walletFile;
				changeSection('section-overview-load');
				wsutil.showToast('Wallet has been imported, you can now open your wallet!', 12000);
			}).catch((err) => {
				formMessageSet('import-seed', 'error', err);
				return;
			});

		}).catch((err)=>{
			formMessageSet('import-seed', 'error', err.message);
			return;
		});
	});
}

function handleWalletExport(){
	overviewShowKeyButton.addEventListener('click', () => {
		formMessageReset();
		if(!overviewWalletAddress.value) return;
		wsmanager.getSecretKeys(overviewWalletAddress.value).then((keys) => {
			showkeyInputViewKey.value = keys.viewSecretKey;
			showkeyInputSpendKey.value = keys.spendSecretKey;
			showkeyInputSeed.value = keys.mnemonicSeed;
		}).catch(() => {
			formMessageSet('secret','error', "Failed to get key, please try again in a few seconds");
		});
	});

	showkeyButtonExportKey.addEventListener('click', () => {
		formMessageReset();
		let filename = remote.dialog.showSaveDialog({
			title: "Export keys to file...",
			filters: [
				{ name: 'Text files', extensions: ['txt'] }
			  ]
		});
		if(filename){
			wsmanager.getSecretKeys(overviewWalletAddress.value).then((keys) => {
				let textContent = `Wallet Address:${os.EOL}${wsession.get('loadedWalletAddress')}${os.EOL}`;
				textContent += `${os.EOL}View Secret Key:${os.EOL}${keys.viewSecretKey}${os.EOL}`;
				textContent += `${os.EOL}Spend Secret Key:${os.EOL}${keys.spendSecretKey}${os.EOL}`;
				textContent += `${os.EOL}Mnemonic Seed:${os.EOL}${keys.mnemonicSeed}${os.EOL}`;
				try{
					fs.writeFileSync(filename, textContent);
					formMessageSet('secret','success', 'Your keys have been exported, please keep the file secret!');
				}catch(err){
					formMessageSet('secret','error', "Failed to save your keys, please check that you have write permission to the file");
				}
			}).catch(() => {
				formMessageSet('secret','error', "Failed to get keys, please try again in a few seconds");
			});
		}
	});
}

function handleSendTransfer(){
	sendMaxAmount.addEventListener('click', (event) => {
		let maxsend = event.target.dataset.maxsend || 0;
		if(maxsend) sendInputAmount.value = maxsend;
	});

	sendInputFee.value = 0.0001;
	function setPaymentIdState(addr){
		if(addr.length > 99){
			sendInputPaymentId.value = '';
			sendInputPaymentId.setAttribute('disabled', true);
		}else{
			sendInputPaymentId.removeAttribute('disabled');
		}
	}
	sendInputAddress.addEventListener('change', (event) => {
		let addr = event.target.value || '';
		if(!addr.length) initAddressCompletion();
		setPaymentIdState(addr);
	});
	sendInputAddress.addEventListener('keyup', (event) => {
		let addr = event.target.value || '';
		if(!addr.length) initAddressCompletion();
		setPaymentIdState(addr);
	});


	sendButtonSend.addEventListener('click', () => {
		formMessageReset();
		function precision(a) {
			if (!isFinite(a)) return 0;
			let e = 1, p = 0;
			while (Math.round(a * e) / e !== a) { e *= 10; p++; }
			return p;
		}

		let recipientAddress = sendInputAddress.value ? sendInputAddress.value.trim() : '';
		if(!recipientAddress.length || !wsutil.validateAddress(recipientAddress)){
			formMessageSet('send','error',`Invalid ${config.assetName} address`);
			return;
		}

		if(recipientAddress === wsession.get('loadedWalletAddress')){
			formMessageSet('send','error',"Sorry, can't send to your own address");
			return;
		}

		let paymentId = sendInputPaymentId.value ? sendInputPaymentId.value.trim() : '';
		if(recipientAddress.length > 99){
			paymentId = '';
		}else if(paymentId.length){
			if(!wsutil.validatePaymentId(paymentId)){
				formMessageSet('send','error','Sorry, invalid Payment ID');
				return;
			}
		}

		let total = 0;
		let amount = sendInputAmount.value ? parseFloat(sendInputAmount.value) : 0;
		if (amount <= 0) {
			formMessageSet('send','error','Sorry, invalid amount');
			return;
		}

		if (precision(amount) > config.decimalPlaces) {
			formMessageSet('send','error',`Amount can't have more than ${config.decimalPlaces} decimal places`);
			return;
		}

		total += amount;
		total = parseFloat(total.toFixed(config.decimalPlaces));
		let txAmount = wsutil.amountForImmortal(amount); // final transfer amount

		let fee = sendInputFee.value ? parseFloat(sendInputFee.value) : 0;
		let minFee = config.minimumFee / config.decimalDivisor;
		if (precision(fee) < minFee) {
			formMessageSet('send','error',`Fee can't be less than ${wsutil.amountForMortal(minFee)}`);
			return;
		}

		if (precision(fee) > config.decimalPlaces) {
			formMessageSet('send','error',`Fee can't have more than  ${config.decimalPlaces} decimal places`);
			return;
		}

		total += fee;
		total = parseFloat(total.toFixed(config.decimalPlaces));
		let txFee = wsutil.amountForImmortal(fee);

		let nodeFee = wsession.get('nodeFee') || 0; // nodeFee value is already for mortal
		total += nodeFee;
		total = parseFloat(total.toFixed(config.decimalPlaces));
		let txTotal = wsutil.amountForMortal(total);

		const availableBalance = wsession.get('walletUnlockedBalance') || (0).toFixed(config.decimalPlaces);

		if(parseFloat(txTotal) > parseFloat(availableBalance)){
			formMessageSet(
				'send',
				'error', 
				`Sorry, you don't have enough funds to process this transfer. Transfer amount+fees: ${(txTotal)}`
			);
			return;
		}

		// todo: adjust decimal
		let tx = {
			address: recipientAddress,
			amount: txAmount,
			fee: txFee
		};

		if(paymentId.length) tx.paymentId = paymentId;
		let tpl = `
			<div class="div-transaction-panel">
				<h4>Transfer Confirmation</h4>
				<div class="transferDetail">
					<p>Please confirm that you have everything entered correctly.</p>
					<dl>
						<dt class="dt-ib">Recipient address:</dt>
						<dd class="dd-ib">${tx.address}</dd>
						<dt class="${paymentId.length ? 'dt-ib' : 'hidden'}">Payment ID:</dt>
						<dd class="${paymentId.length ? 'dd-ib' : 'hidden'}">${paymentId.length ? paymentId : 'N/A'}</dd>
						<dt class="dt-ib">Amount:</dt>
						<dd class="dd-ib">${amount} ${config.assetTicker}</dd>
						<dt class="dt-ib">Transaction Fee:</dt>
						<dd class="dd-ib">${fee} ${config.assetTicker}</dd>
						<dt class="dt-ib">Node Fee:</dt>
						<dd class="dd-ib">${(nodeFee > 0 ? nodeFee : '0.0000')} ${config.assetTicker}</dd>
						<dt class="dt-ib">Total:</dt>
						<dd class="dd-ib">${total} ${config.assetTicker}</dd>
					</dl>
				</div>
			</div>
			<div class="div-panel-buttons">
				<button data-target='#tf-dialog' type="button" class="form-bt button-gray dialog-close-default" id="button-send-ko">Cancel</button>
				<button data-target='#tf-dialog' type="button" class="form-bt button-blue" id="button-send-ok">OK, Send it!</button>
			</div>`;

		let dialog = document.getElementById('tf-dialog');
		wsutil.innerHTML(dialog, tpl);
		dialog = document.getElementById('tf-dialog');
		dialog.showModal();

		let sendBtn = dialog.querySelector('#button-send-ok');

		sendBtn.addEventListener('click', (event) => {
			let md = document.querySelector(event.target.dataset.target);
			md.close();
			formMessageSet('send', 'warning', 'Sending transaction, please wait...<br><progress></progress>');
			wsmanager.sendTransaction(tx).then((result) => {
				formMessageReset();
				let txhashUrl = `<a class="external" title="view in block explorer" href="${config.blockExplorerTransactionUrl.replace('[[TX_HASH]]', result.transactionHash)}">${result.transactionHash}</a>`;
				let okMsg = `Transaction sent!<br>Tx. hash: ${txhashUrl}.<br>Your balance may appear incorrect while transaction not fully confirmed.`;
				formMessageSet('send', 'success', okMsg);
				// check if it's new address, if so save it
				let newId = wsutil.b2sSum(recipientAddress + paymentId);
				if(!abook.has(newId)){
					let now = new Date().toISOString();
					let newName = `unnamed (${now.split('T')[0].replace(/-/g,'')}_${now.split('T')[1].split('.')[0].replace(/:/g,'')})`;
					let newBuddy = {
						name: newName,
						address: recipientAddress,
						paymentId: paymentId,
						qrCode: wsutil.genQrDataUrl(recipientAddress)
					};
					abook.set(newId,newBuddy);
				}
				sendInputAddress.value = '';
				sendInputPaymentId.value = '';
				sendInputAmount.value = '';
			}).catch((err) => {
				formMessageSet('send', 'error', `Failed to send transaction:<br><small>${err}</small>`);
			});
			wsutil.clearChild(md);
		});
	});

	sendOptimize.addEventListener('click', () => {
		if(!wsession.get('synchronized', false)){
			wsutil.showToast('Synchronization is in progress, please wait.');
			return;
		}

        if (wsession.get('fusionProgress')) {
            wsutil.showToast('Wallet optimization in progress, please wait');
            return;
        }

		if(!confirm('You are about to perform wallet optimization. This process may took a while to complete, are you sure?')) return;
		wsutil.showToast('Optimization started, your balance may appear incorrect during the process', 3000);
		//FUSION_IN_PROGRESS = true;
		let fusionProgressBar = document.getElementById('fusion-progress');
		fusionProgressBar.classList.remove('hidden');
		sendOptimize.classList.add('hidden');
        wsession.set('fusionProgress', true);

		log.debug(`Started wallet optimization`);
		wsmanager.optimizeWallet().then( (res) => {
			//FUSION_IN_PROGRESS = false;
			// do nothing, just wait
			// console.log(res);
		}).catch((err) => {
			//FUSION_IN_PROGRESS = false;
			// do nothing, just wait
			// console.log(err.message);
		});
		return; // just return, it will notify when its done.
	});
}
// ﻿b4e8jhgjhgjgh3....3704ghjghjhgj00
function handleTransactions(){
	// tx list options
	var itemF = function(item) {
		let tDate = (function() {
			var d = new Date(item.timeStr);
			var m = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
			return d.getDate() + ' ' + m[d.getMonth()] + ' ' + d.getFullYear() + ' - ' + d.getHours() + ':' + d.getMinutes() + ':' + d.getSeconds();
		})();
		let status = item.txType == 'in' ? '<span class="rcv">Received</span><img src="../assets/transactions/arrow-down-green.png" />' : '<span class="snt">Sent</span><img src="../assets/transactions/arrow-up-red.png" />';
		let hash = item.transactionHash.substring(0, 10) + '...' + item.transactionHash.slice(-10);
		return `<tr title="click for detail..." class="txlist-item">
			<td class="tx-date">
				<img src="../assets/general/arrow-left-white.png" /><span>${tDate}</span>
			</td>
			<td class="tx-ov-info">
				<span>${hash}</span>
			</td>
			<td class="txinfo">
				<p class="tx-ov-info"><span class="paymentId"></span></p>
			</td>
			<td class="txamount">
				<span class="amount"></span> ${config.assetTicker}
			</td>
			<td class="txstatus">${status}</td>
		</tr>`
	};
	let txListOpts = {
		valueNames: [
			{ data: [
				'rawPaymentId', 'rawHash', 'txType', 'rawAmount', 'rawFee',
				'fee', 'timestamp', 'blockIndex', 'extra', 'isBase', 'unlockTime'
			]},
			'amount','timeStr','paymentId','transactionHash','fee'
		],
		item: itemF,
		searchColumns: ['transactionHash','paymentId','timeStr','amount'],
		indexAsync: true
	};
	// tx detail
	function showTransaction(el){
		let tx = (el.name === "tr" ? el : el.closest('tr'));
		let txdate = new Date(tx.dataset.timestamp*1000).toUTCString();
		let txhashUrl = `<a class="external form-bt button-blue" title="view in block explorer" href="${config.blockExplorerTransactionUrl.replace('[[TX_HASH]]', tx.dataset.rawhash)}">View in block explorer</a>`;
		let txTypeBtn = tx.dataset.txtype == 'in' ? `<a class="tx-type-btn tx-type-in">Received<img src="../assets/transactions/right-blue-arrow.png" /></a>` : `<a class="tx-type-btn tx-type-out">Sent<img src="../assets/transactions/arrow-up-red.png" /></a>`;
		let dialogTpl = `
				<div class="div-transactions-panel">
					<div class="clearfix">
						<button data-target="#tx-dialog" type="button" class="form-bt button-blue dialog-close-default" id="button-transactions-panel-close">Back to transactions</button>

						<div class="div-title clearfix">
							<img src="../assets/transactions/title.png" />
							<h2 class="title">Transaction Detail</h2>
							<div class="subtitle">All the information</div>
						</div>
					</div>

					<div class="transactions-panel-table">
						<table class="custom-table" id="transactions-panel-table">
							<tbody>
								<tr>
									<th scope="col"><img src="../assets/transactions/right-blue-arrow.png" /><span class="opa50">Hash</span></th>
									<td><span class="opa50 tctcl" data-cplabel="Tx. hash">${tx.dataset.rawhash}</span></td>
								</tr>
								<tr>
									<th scope="col"><img src="../assets/transactions/right-blue-arrow.png" /><span class="opa50">Timestamp</span></th>
									<td><span class="opa50 tctcl" data-cplabel="Tx. date">${tx.dataset.timestamp} (${txdate})</span></td>
								</tr>
								<tr>
									<th scope="col"><img src="../assets/transactions/right-blue-arrow.png" /><span class="opa50">Block Index</span></th>
									<td><span class="opa50 tctcl" data-cplabel="Tx. block index">${tx.dataset.blockindex}</span></td>
								</tr>
								<tr>
									<th scope="col"><img src="../assets/transactions/right-blue-arrow.png" /><span class="opa50">Is Base?</span></th>
									<td><span class="opa50">${tx.dataset.isbase}</span></td>
								</tr>
								<tr>
									<th scope="col"><img src="../assets/transactions/right-blue-arrow.png" />Amount</th>
									<td data-cplabel="Tx. amount" class="tctcl">${tx.dataset.rawamount} ${config.assetTicker}</td>
								</tr>
								<tr>
									<th scope="col"><img src="../assets/transactions/right-blue-arrow.png" />Fee</th>
									<td  data-cplabel="Tx. fee" class="tctcl">${tx.dataset.rawfee} ${config.assetTicker}</td>
								</tr>
								<tr>
									<th scope="col"><img src="../assets/transactions/right-blue-arrow.png" />Address</th>
									<td data-cplabel="Address" class="tctcl">${wsession.get('loadedWalletAddress')}</td>
								</tr>
								<tr>
									<th scope="col"><img src="../assets/transactions/right-blue-arrow.png" /><span class="opa50">Extra</span></th>
									<td><span class="opa50 tctcl" data-cplabel="Tx. extra">${tx.dataset.extra}</span></td>
								</tr>
								<tr>
									<th scope="col"><img src="../assets/transactions/right-blue-arrow.png" /><span class="opa50">Payment Id</span></th>
									<td><span class="opa50 tctcl" data-cplabel="Payment ID">${tx.dataset.rawpaymentid}</span></td>
								</tr>
								<tr>
									<th scope="col"><img src="../assets/transactions/right-blue-arrow.png" /><span class="opa50">Unlock Time</span></th>
									<td><span class="opa50">${tx.dataset.unlocktime}</span></td>
								</tr>
							</tbody>
						</table>
						${txTypeBtn}
					</div>
					<div>${txhashUrl}</div>
				</div>
			`;

		let dialog = document.getElementById('tx-dialog');
		wsutil.innerHTML(dialog, dialogTpl);
		dialog = document.getElementById('tx-dialog');
		dialog.showModal();
	}

	function sortAmount(a, b){
		var aVal = parseFloat(a._values.amount.replace(/[^0-9.-]/g, ""));
		var bVal = parseFloat(b._values.amount.replace(/[^0-9.-]/g, ""));
		if (aVal > bVal) return 1;
		if (aVal < bVal) return -1;
		return 0;
	}

	function resetTxSortMark(){
		let sortedEl = document.querySelectorAll('#transaction-lists .asc, #transaction-lists .desc');
		Array.from(sortedEl).forEach((el)=>{
			el.classList.remove('asc');
			el.classList.remove('desc');
		});
	}

	function listTransactions(){
		if(wsession.get('txLen') <= 0){
			setTxFiller(true);
			return;
		}

		let txs = wsession.get('txNew');
		if(!txs.length) {
			if(TXLIST_OBJ === null || TXLIST_OBJ.size() <= 0) setTxFiller(true);
			return;
		}

		setTxFiller(false);
		let txsPerPage = 20;
		if(TXLIST_OBJ === null){
			if(txs.length > txsPerPage){
				txListOpts.page = txsPerPage;
				txListOpts.pagination = [{
					innerWindow: 2,
					outerWindow: 1
				}]; 
			}
			TXLIST_OBJ = new List('transaction-lists', txListOpts, txs);
			TXLIST_OBJ.sort('timestamp', {order: 'desc'});
			resetTxSortMark();
			txButtonSortDate.classList.add('desc');
			txButtonSortDate.dataset.dir = 'desc';
		}else{
			setTxFiller(false);
			TXLIST_OBJ.add(txs);
			TXLIST_OBJ.sort('timestamp', {order: 'desc'});
			resetTxSortMark();
			txButtonSortDate.classList.add('desc');
			txButtonSortDate.dataset.dir = 'desc';
		}
	}

	function exportAsCsv(mode){
		if(wsession.get('txLen') <= 0) return;

		formMessageReset();
		mode = mode || 'all';
		let recentDir = settings.get('recentWalletDir', remote.app.getPath('documents'));
		let filename = remote.dialog.showSaveDialog({
			title: "Export transactions as scv...",
			defaultPath: recentDir,
			filters: [
				{ name: 'CSV files', extensions: ['csv'] }
			  ]
		});
		if(!filename) return;

		const createCsvWriter  = require('csv-writer').createObjectCsvWriter;
		const csvWriter = createCsvWriter({
			path: filename,
			header: [
				{id: 'timeStr', title: 'Time'},
				{id: 'amount', title: 'Amount'},
				{id: 'paymentId', title: 'PaymentId'},
				{id: 'transactionHash', title: 'Transaction Hash'},
				{id: 'fee', title: 'Transaction Fee'},
				{id: 'extra', title: 'Extra Data'},
				{id: 'blockIndex', title: 'Block Height'}
			]
		});
		let rawTxList = wsession.get('txList');
		let txlist = rawTxList.map((obj) => {
			return {
				timeStr: obj.timeStr,
				amount: obj.amount,
				paymentId: obj.paymentId,
				transactionHash: obj.transactionHash,
				fee: obj.fee,
				extra: obj.extra,
				blockIndex: obj.blockIndex,
				txType: obj.txType
			};
		});

		let dialog = document.getElementById('ab-dialog');
		switch(mode){
			case 'in':
				let txin = txlist.filter( (obj) => {return obj.txType === "in";});
				if(!txin.length){
					wsutil.showToast('Transaction export failed, incoming transactions not available!');
					if(dialog.hasAttribute('open')) dialog.close();
					return;
				}

				csvWriter.writeRecords(txin).then(()=>{
					if(dialog.hasAttribute('open')) dialog.close();
					wsutil.showToast(`Transaction list exported to ${filename}`);
				}).catch((err) => {
					if(dialog.hasAttribute('open')) dialog.close();
					wsutil.showToast(`Transaction export failed, ${err.message}`);
				});
				break;
			case 'out':
				let txout = txlist.filter( (obj) => {return obj.txType === "out";});
				if(!txout.length){
					wsutil.showToast('Transaction export failed, outgoing transactions not available!');
					if(dialog.hasAttribute('open')) dialog.close();
					return;
				}

				csvWriter.writeRecords(txout).then(()=>{
					if(dialog.hasAttribute('open')) dialog.close();
					wsutil.showToast(`Transaction list exported to ${filename}`);
				}).catch((err) => {
					if(dialog.hasAttribute('open')) dialog.close();
					wsutil.showToast(`Transaction export failed, ${err.message}`);
				});
				break;
			default:
				csvWriter.writeRecords(txlist).then(()=>{
					if(dialog.hasAttribute('open')) dialog.close();
					wsutil.showToast(`Transaction list exported to ${filename}`);
				}).catch((err) => {
					if(dialog.hasAttribute('open')) dialog.close();
					wsutil.showToast(`Transaction export failed, ${err.message}`);
				});
				break;
		}
	}

	wsutil.liveEvent('button.export-txtype', 'click', (event) => {
		let txtype = event.target.dataset.txtype || 'all';
		return exportAsCsv(txtype);
	});

	txButtonExport.addEventListener('click', () => {
		let dialogTpl = `<div class="transaction-panel">
			<h4>Export Transactions to CSV:</h4>
			<div class="div-panel-buttons">
				<button data-txtype="all" type="button" class="button-blue export-txtype">All Transfers</button>
				<button data-txtype="in" type="button" class="button-blue export-txtype">Incoming Transfers</button>
				<button data-txtype="out" type="button" class="button-blue export-txtype">Outgoing Transfers</button>
				<button data-target="#ab-dialog" type="button" class="button-gray dialog-close-default">Cancel</button>
			</div>
		`;
		let dialog = document.getElementById('ab-dialog');
		if(dialog.hasAttribute('open')) dialog.close();
		dialog.innerHTML = dialogTpl;
		dialog.showModal();
	});

	// listen to tx update
	txInputUpdated.addEventListener('change', (event) => {
		let updated = parseInt(event.target.value, 10) === 1;
		if(!updated) return;
		txInputUpdated.value = 0;
		listTransactions();
	});
	// listen to tx notify
	txInputNotify.addEventListener('change', (event)=>{
		let notify = parseInt(event.target.value, 10) === 1;
		if(!notify) return;
		txInputNotify.value = 0; // reset
		changeSection('section-transactions');
	});

	// tx detail
	wsutil.liveEvent('.txlist-item', 'click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		return showTransaction(event.target);
	},document.getElementById('transaction-lists'));

	txButtonSortAmount.addEventListener('click',(event)=>{
		event.preventDefault();
		let currentDir = event.target.dataset.dir;
		let targetDir = (currentDir === 'desc' ? 'asc' : 'desc');
		event.target.dataset.dir = targetDir;
		resetTxSortMark();
		event.target.classList.add(targetDir);
		TXLIST_OBJ.sort('amount', {
			order: targetDir,
			sortFunction: sortAmount
		});
	});

	txButtonSortDate.addEventListener('click',(event)=>{
		event.preventDefault();
		let currentDir = event.target.dataset.dir;
		let targetDir = (currentDir === 'desc' ? 'asc' : 'desc');
		event.target.dataset.dir = targetDir;
		resetTxSortMark();
		event.target.classList.add(targetDir);
		TXLIST_OBJ.sort('timestamp', {
			order: targetDir
		});
	});

	txButtonRefresh.addEventListener('click', listTransactions);
}

function handleNetworkChange(){
	window.addEventListener('online', () => {
		let connectedNode = wsession.get('connectedNode');
		if(!connectedNode.length || connectedNode.startsWith('127.0.0.1')) return;
		wsmanager.networkStateUpdate(1);
	});
	window.addEventListener('offline',  () => {
		let connectedNode = wsession.get('connectedNode');
		if(!connectedNode.length || connectedNode.startsWith('127.0.0.1')) return;
		wsmanager.networkStateUpdate(0);
	});
}

// event handlers
function initHandlers(){
	initSectionTemplates();
	// let darkStart = settings.get('darkmode', false);
	// setDarkMode(darkStart);
	
	// netstatus
	handleNetworkChange();

	//external link handler
	wsutil.liveEvent('a.external', 'click', (event) => {
		event.preventDefault();
		shell.openExternal(
			event.target instanceof HTMLImageElement ? 
			event.target.parentElement.getAttribute('href') : 
			event.target.getAttribute('href')
		);
		return false;
	});

	// main section link handler
	for(var ei=0; ei < sectionButtons.length; ei++){
		let target = sectionButtons[ei].dataset.section;
		sectionButtons[ei].addEventListener('click', changeSection.bind(this, target), false);
	}

	// inputs click to copy handlers
	wsutil.liveEvent('textarea.ctcl, input.ctcl', 'click', (event) => {
		let el = event.target;
		let wv = el.value ? el.value.trim() : '';
		let cplabel = el.dataset.cplabel ? el.dataset.cplabel : '';
		let cpnotice = cplabel ? `${cplabel} copied to clipboard!` : 'Copied to clipboard';
		el.select();
		if(!wv.length) return;
		clipboard.writeText(wv);
		wsutil.showToast(cpnotice);
	});
	// non-input elements ctc handlers
	wsutil.liveEvent('.tctcl', 'click', (event) => {
		let el = event.target;
		let wv = el.textContent.trim();
		let cplabel = el.dataset.cplabel ? el.dataset.cplabel : '';
		let cpnotice = cplabel ? `${cplabel} copied to clipboard!` : 'Copied to clipboard';
		wsutil.selectText(el);
		if(!wv.length) return;
		clipboard.writeText(wv);
		wsutil.showToast(cpnotice);
	});

	// overview page address ctc
	overviewWalletCopyButton.addEventListener('click', function(){
		if(!overviewWalletAddress.value) return;
		let wv = overviewWalletAddress.value;
		let clipInfo = document.getElementById('form-help-wallet-address');
		let origInfo = clipInfo.value;
		if(wv.length >= 10){
			clipboard.writeText(wv.trim());
			clipInfo.textContent = "Address copied to clipboard!";
			clipInfo.classList.add('help-hl');
			setTimeout(function(){
				clipInfo.textContent = origInfo;
				clipInfo.classList.remove('help-hl');
			}, 1800);
		}
	});

	// overview page zoom qr-code
	zoomQrCode.addEventListener('click', function(){
		let generatedQrCode = document.getElementById('qr-gen-img').getAttribute('src');
		let dialogTpl = `<div class="transaction-panel">
			<div class="text-center">
				<h4>The QR code of your address:</h4>
				<img src="${generatedQrCode}" width="245" />
			</div>
			<div class="div-panel-buttons">
				<button data-target="#ab-dialog" type="button" class="button-gray dialog-close-default">Close</button>
			</div>
		`;
		let dialog = document.getElementById('ab-dialog');
		if(dialog.hasAttribute('open')) dialog.close();
		dialog.innerHTML = dialogTpl;
		dialog.showModal();
	});

	//genpaymentid+integAddress
	// overviewPaymentIdGen.addEventListener('click', ()=>{
		// genPaymentId(false);
	// });

	wsutil.liveEvent('#makePaymentId', 'click', () => {
		let payId = genPaymentId(true);
		let iaf = document.getElementById('genOutputIntegratedAddress');
		document.getElementById('genInputPaymentId').value = payId;
		iaf.value = '';
	});

	//overviewIntegratedAddressGen.addEventListener('click', showIntegratedAddressForm);
	
	wsutil.liveEvent('#doGenIntegratedAddr', 'click', () => {
		formMessageReset();
		let genInputAddress = document.getElementById('genInputAddress');
		let genInputPaymentId = document.getElementById('genInputPaymentId');
		let outputField = document.getElementById('genOutputIntegratedAddress');
		let addr = genInputAddress.value ? genInputAddress.value.trim() : '';
		let pid = genInputPaymentId.value ? genInputPaymentId.value.trim() : '';
		outputField.value = '';
		outputField.removeAttribute('title');
		if(!addr.length || !pid.length){
			formMessageSet('gia','error', 'Address & Payment ID is required');
			return;
		}
		if(!wsutil.validateAddress(addr)){
			formMessageSet('gia','error', `Invalid ${config.assetName} address`);
			return;
		}
		// only allow standard address
		if(addr.length > 99){
			formMessageSet('gia','error', `Only standard ${config.assetName} address are supported`);
			return;
		}
		if(!wsutil.validatePaymentId(pid)){
			formMessageSet('gia','error', 'Invalid Payment ID');
			return;
		}

		wsmanager.genIntegratedAddress(pid, addr).then((res) => {
			formMessageReset();
			outputField.value = res.integratedAddress;
			outputField.setAttribute('title', 'click to copy');
		}).catch((err) => {
			formMessageSet('gia','error', err.message);
		});
	});

	function handleBrowseButton(args){
		if(!args) return;
		let tbtn = document.getElementById(args.targetButton);
		if (tbtn.classList.contains('d-opened')) return;
		tbtn.classList.add('d-opened');

		let dialogType = args.dialogType;
		let targetName = (args.targetName ? args.targetName : 'file');
		let targetInput = args.targetInput;
		let recentDir = settings.get('recentWalletDir', remote.app.getPath('documents'));
		let dialogOpts = {
			defaultPath: recentDir
		};

		if(dialogType === 'saveFile') {
			dialogOpts.title = `Select directory to store your ${targetName}, and give it a filename.`;
			dialogOpts.buttonLabel = 'OK';
			
			remote.dialog.showSaveDialog(dialogOpts, (file) => {
				if (file) targetInput.value = file;
				tbtn.classList.remove('d-opened');
			});
		} else{
			dialogOpts.properties = [dialogType];

			remote.dialog.showOpenDialog(dialogOpts, (files) => {
				if (files) targetInput.value = files[0];
				tbtn.classList.remove('d-opened');
			});
		}
	}

	// generic browse path btn event
	for (var i = 0; i < genericBrowseButton.length; i++) {
		let targetInputId = genericBrowseButton[i].dataset.targetinput;
		let args = {
			dialogType: genericBrowseButton[i].dataset.selection,
			targetName: genericBrowseButton[i].dataset.fileobj ? genericBrowseButton[i].dataset.fileobj : '',
			targetInput: document.getElementById(targetInputId),
			targetButton: genericBrowseButton[i].id
		};
		genericBrowseButton[i].addEventListener('click', handleBrowseButton.bind(this, args));
	}

	// generic dialog closer
	wsutil.liveEvent('.dialog-close-default','click', (event) => {
		let el = event.target;
		if(el.dataset.target){
			let tel = document.querySelector(el.dataset.target);
			tel.close();
		}
	});

	var enterHandler;
	function handleFormEnter(el){
		if(enterHandler) clearTimeout(enterHandler);

		let key = this.event.key;
		enterHandler = setTimeout(()=>{
			if(key === 'Enter'){
				let section = el.closest('.section');
				let target = section.querySelector('button:not(.notabindex)');
				if(target) target.dispatchEvent(new Event('click'));
			}
		},400);
	}

	for(var oi=0;oi<genericEnterableInputs.length;oi++){
		let el = genericEnterableInputs[oi];
		el.addEventListener('keyup', handleFormEnter.bind(this, el));
	}

	// toggle view password
	let tp = document.querySelectorAll('.togpass');
	for(var xi=0; xi<tp.length; xi++){
		tp[xi].addEventListener('click', function(e){
			let targetId = e.currentTarget.dataset.pf;
			if(!targetId) return;
			let target = document.getElementById(targetId);
			if(!target) return;
			if(target.type === "password"){
				target.type = 'text';
				e.currentTarget.firstChild.dataset.icon = 'eye-slash';
			}else{
				target.type = 'password';
				e.currentTarget.firstChild.dataset.icon = 'eye';
			}
		});
	}

	// allow paste by mouse
	const pasteMenu = Menu.buildFromTemplate([
		{ label: 'Paste', role: 'paste'}
	]);

	for(var ui=0;ui<genericEditableInputs.length;ui++){
		let el = genericEditableInputs[ui];
		el.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			pasteMenu.popup(remote.getCurrentWindow());
		}, false);
	}

	// dmswitch.addEventListener('click', () => {
		// let tmode = thtml.classList.contains('dark') ? '' : 'dark';
		// setDarkMode(tmode);
	// });

	kswitch.addEventListener('click', showKeyBindings);

	sswitch.addEventListener('click', function() {
		changeSection('section-settings');
	});
	iswitch.addEventListener('click', function() {
		changeSection('section-about');
	});

	//handleNetworkChange();

	// settings handlers
	handleSettings();
	// addressbook handlers
	handleAddressBook();
	// open wallet
	handleWalletOpen();
	// close wallet
	handleWalletClose();
	// create wallet
	handleWalletCreate();
	// export keys/seed
	handleWalletExport();
	// send transfer
	handleSendTransfer();
	// import keys
	handleWalletImportKeys();
	// import seed
	handleWalletImportSeed();
	// transactions
	handleTransactions();
}

function initKeyBindings(){
	let walletOpened;
	// switch tab: ctrl+tab
	Mousetrap.bind(['ctrl+tab','command+tab'], switchTab);
	Mousetrap.bind(['ctrl+o','command+o'], () => {
		walletOpened = wsession.get('serviceReady') || false;
		if(walletOpened){
			wsutil.showToast('Please close current wallet before opening another wallet!');
			return;
		}
		return changeSection('section-overview-load');
	});
	Mousetrap.bind(['ctrl+x','command+x'], () => {
		walletOpened = wsession.get('serviceReady') || false;
		if(!walletOpened){
			wsutil.showToast('No wallet is currently opened');
			return;
		}
		overviewWalletCloseButton.dispatchEvent(new Event('click'));
	});
	// display/export private keys: ctrl+e
	Mousetrap.bind(['ctrl+e','command+e'],() => {
		walletOpened = wsession.get('serviceReady') || false;
		if(!walletOpened) return;
		return changeSection('section-overview-show');
	});
	// create new wallet: ctrl+n
	Mousetrap.bind(['ctrl+n','command+n'], ()=> {
		walletOpened = wsession.get('serviceReady') || false;
		if(walletOpened){
			wsutil.showToast('Please close current wallet before creating/importing new wallet');
			return;
		}
		return changeSection('section-overview-create');
	});
	// import from keys: ctrl+i
	Mousetrap.bind(['ctrl+i','command+i'],() => {
		walletOpened = wsession.get('serviceReady') || false;
		if(walletOpened){
			wsutil.showToast('Please close current wallet before creating/importing new wallet');
			return;
		}
		return changeSection('section-overview-import-key');
	});
	// tx page: ctrl+t
	Mousetrap.bind(['ctrl+t','command+t'],() => {
		walletOpened = wsession.get('serviceReady') || false;
		if(!walletOpened){
			wsutil.showToast('Please open your wallet to view your transactions');
			return;
		}
		return changeSection('section-transactions');
	});
	// send tx: ctrl+s
	Mousetrap.bind(['ctrl+s','command+s'],() => {
		walletOpened = wsession.get('serviceReady') || false;
		if(!walletOpened){
			wsutil.showToast('Please open your wallet to make a transfer');
			return;
		}
		return changeSection('section-send');
	});
	// import from mnemonic seed: ctrl+shift+i
	Mousetrap.bind(['ctrl+shift+i','command+shift+i'], () => {
		walletOpened = wsession.get('serviceReady') || false;
		if(walletOpened){
			wsutil.showToast('Please close current wallet before creating/importing new wallet');
			return;
		}
		return changeSection('section-overview-import-seed');
	});

	// back home
	Mousetrap.bind(['ctrl+home','command+home'], ()=>{
		let section = walletOpened ? 'section-overview' : 'section-welcome';
		return changeSection(section);
	});

	// show key binding
	Mousetrap.bind(['ctrl+/','command+/'], () => {
		let openedDialog = document.querySelector('dialog[open]');
		if(openedDialog) return openedDialog.close();
		return showKeyBindings();
	});

	Mousetrap.bind('esc', () => {
		let openedDialog = document.querySelector('dialog[open]');
		if(!openedDialog) return;
		return openedDialog.close();
	});

	// Mousetrap.bind([`ctrl+\\`,`command+\\`], ()=>{
		// setDarkMode(!document.documentElement.classList.contains('dark'));
	// });
}

// spawn event handlers
document.addEventListener('DOMContentLoaded', () => {
	// remove any leftover wallet config
	try { fs.unlinkSync(wsession.get('walletConfig')); } catch (e) { }
	initHandlers();
	showInitialPage();
	initKeyBindings();
}, false);

ipcRenderer.on('cleanup', () => {
	if(!win.isVisible()) win.show();
	if(win.isMinimized()) win.restore();

	win.focus();

	var dialog = document.getElementById('main-dialog');
	let htmlText = 'Terminating BLOC Electron Wallet...';
	if(wsession.get('loadedWalletAddress') !== ''){
		htmlText = 'Saving &amp; closing your wallet...';
	}

	let htmlStr = `<div class="div-save-main" style="text-align: center;padding:1rem;"><i class="fas fa-spinner fa-pulse"></i><span style="padding:0px 10px;">${htmlText}</span></div>`;
	dialog.innerHTML = htmlStr;
	dialog.showModal();
	wsmanager.stopSyncWorker();
	wsmanager.stopService().then(() => {
		setTimeout(function(){
			dialog.innerHTML = 'Good bye!';
			wsmanager.terminateService(true);
			try { fs.unlinkSync(wsession.get('walletConfig')); } catch (e) { }
			win.close();
		}, 1200);
	}).catch((err) => {
		wsmanager.terminateService(true);
		try { fs.unlinkSync(wsession.get('walletConfig')); } catch (e) { }
		win.close();
		console.log(err);
	});
});