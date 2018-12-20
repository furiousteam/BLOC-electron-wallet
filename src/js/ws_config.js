var config = {};

// self explanatory, your application name, descriptions, etc
config.appName = 'BLOC-Electron-Wallet';
config.appDescription = 'BLOC GUI Wallet';
config.appSlogan = 'in BLOC we trust';
config.appId = 'money.bloc.bloc-electron-wallet';
config.appGitRepo = 'https://github.com/furiousteam/BLOC-electron-wallet';

// default port number for your daemon (e.g. TurtleCoind)
config.daemonDefaultRpcPort = 2086;

// wallet file created by this app will have this extension
config.walletFileDefaultExt = 'money';

// change this to match your wallet service executable filename
config.walletServiceBinaryFilename = 'BLOC-service';

// version on the bundled service (BLOC-service)
config.walletServiceBinaryVersion = "v3.0.1";

// default port number for your wallet service (e.g. BLOC-service)
config.walletServiceRpcPort = 8070;

// block explorer url, the [[TX_HASH] will be substituted w/ actual transaction hash
config.blockExplorerUrl = 'https://testnet.bloc-explorer.com/block/[[TX_HASH]]';

// default remote node to connect to, set this to a known reliable node for 'just works' user experience
config.remoteNodeDefaultHost = '206.189.120.52';

// remote node list update url, set to null if you don't have one
config.remoteNodeListUpdateUrl = 'https://raw.githubusercontent.com/turtlecoin/turtlecoin-nodes-json/master/turtlecoin-nodes.json';

// fallback remote node list, in case fetching update failed, fill this with known to works remote nodes
config.remoteNodeListFallback = [
	'nodes.hashvault.pro:2086'
];

// your currency name
config.assetName = 'BLOC';
// your currency ticker
config.assetTicker =  'BLOC';
// your currency address prefix, for address validation
config.addressPrefix =  'TbLoc';
// standard wallet address length, for address validation
config.addressLength = 99;
// intergrated wallet address length, for address validation
config.integratedAddressLength = 187;

// minimum fee for sending transaction
config.minimumFee = 1;
// minimum amount for sending transaction
config.mininumSend = 1;
// default mixin/anonimity for transaction
config.defaultMixin = 0;
// to convert from atomic unit
config.decimalDivisor = 10000;
// to represent human readable value
config.decimalPlaces = 4;

// obfuscate address book entries, set to false if you want to save it in plain json file.
// not for security because the encryption key is attached here
config.addressBookObfuscateEntries = true;
// key use to obfuscate address book contents
config.addressBookObfuscationKey = '79009fb00ca1b7130832a42de45142cf6c4b7f333fe6fba5';
// initial/sample entries to fill new address book
config.addressBookSampleEntries = [
	{
		name: 'labaylabay',
		address: 'TRTLv1A26ngXApin33p1JsSE9Yf6REj97Xruz15D4JtSg1wuqYTmsPj5Geu2kHtBzD8TCsfd5dbdYRsrhNXMGyvtJ61AoYqLXVS',
		paymentId: 'DF794857BC4587ECEC911AF6A6AB02513FEA524EC5B98DA8702FAC92195A94B2', 
	}
];

module.exports = config;