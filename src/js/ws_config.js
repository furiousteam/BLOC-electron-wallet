var config = {};

// self explanatory, your application name, descriptions, etc
config.appName = 'BLOC-Electron-Wallet';
config.appDescription = 'BLOC GUI Wallet';
config.appSlogan = 'in BLOC we trust';
config.appId = 'money.bloc.bloc-electron-wallet';
config.appGitRepo = 'https://github.com/furiousteam/BLOC-electron-wallet';

// default port number for your daemon (e.g. BLOCd)
config.daemonDefaultRpcPort = 2086;

// wallet file created by this app will have this extension
config.walletFileDefaultExt = 'money';

// change this to match your wallet service executable filename
config.walletServiceBinaryFilename = 'BLOC-service';

// version on the bundled service (BLOC-service)
config.walletServiceBinaryVersion = "3.5.1.3";

// default port number for your wallet service (e.g. BLOC-service)
config.walletServiceRpcPort = 8070;

// block explorer url, the [[TX_HASH] will be substituted w/ actual transaction hash
config.blockExplorerTransactionUrl = 'https://bloc-explorer.com/transaction/[[TX_HASH]]';

// default remote node to connect to, set this to a known reliable node for 'just works' user experience
config.remoteNodeDefaultHost = 'bloc.cool';

// remote node list update url, set to null if you don't have one
config.remoteNodeListUpdateUrl = 'https://raw.githubusercontent.com/furiousteam/BLOC-nodes-json/master/BLOC-nodes.json';

// fallback remote node list, in case fetching update failed, fill this with known to works remote nodes
config.remoteNodeListFallback = [
	'bloc.cool:2086'
];

// your currency name
config.assetName = 'BLOC.MONEY';
// your currency ticker
config.assetTicker =  'BLOC';
// your currency address prefix, for address validation
config.addressPrefix =  'abLoc';
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
		name: 'FuriousTeam',
		address: 'abLoc7qZYJd7cWysPQRivNNMQMFgkXNPgiQXN1i2twdUWvwr2XMbxsAbwdL3eJjCMSgs8oWyGx7pHCX8jWHrKi8Meap3gc5TujM',
		paymentId: 'DF794857BC4587ECEC911AF6A6AB02513FEA524EC5B98DA8702FAC92195A94B2',
	}
];

// bloc.money url
config.blockMoneyUrl = 'https://bloc.money/';

// bloc.money download url
config.blockMoneyDownloadUrl = 'https://bloc.money/download';

// GUI-miner download url
config.guiMinerDownloadUrl = 'https://github.com/furiousteam/BLOC-GUI-Miner/releases';

// Paperwallet url
config.paperWalletUrl = 'https://paperwallet.bloc.money';

// iPhone download url
config.iphoneWalletUrl = 'https://itunes.apple.com/us/app/bloc-wallet-by-furiousteam-ltd/id1437924269?mt=8';

// BLOC wiki url
config.blocWikiUrl = 'https://wiki.bloc.money/';

// Browser mining url
config.browserMiningUrl = 'https://bloc-mining.com/';

// Block explorer url
config.blockExplorerUrl = 'https://bloc-explorer.com/';

// Discord channel url
config.discordChannelUrl = 'https://discord.gg/5Buudya';

// Telegram channel url
config.telegramChannelUrl = 'https://t.me/bloc_money';

// Bitcoin-talk url
config.bitcoinTalkUrl = 'https://bitcointalk.org/index.php?topic=4108831.0';

// Github page url
config.githubPageUrl = 'https://github.com/furiousteam';

// Twitter profile url
config.twitterProfileUrl = 'https://twitter.com/bloc_money';

// Reddit forum url
config.redditProfileUrl = 'https://www.reddit.com/r/BLOC_MONEY/';

// Medium profile url
config.mediumProfileUrl = 'https://medium.com/@bloc.money';

// Youtube channel url
config.youtubeChannelUrl = 'https://www.youtube.com/channel/UCdvnEPWhqGtZUEx3EFBrXvA';

// Facebook page url
config.facebookPageUrl = 'https://www.facebook.com/Blocmoney-383098922176113';

// Instagram profile url
config.instagramProfileUrl = 'https://www.instagram.com/bloc.money';

// Block explorer telegram bot url
config.blockExplorerTelegramBotUrl = 'https://t.me/bloc_explorer_bot';

// API news update url
config.newsUpdateUrl = 'https://bloc.money/wallet-api/latest-medium-news?limit=6';
// API videos update url
config.videosUpdateUrl = 'https://bloc.money/wallet-api/youtube-channel-videos?limit=6';
// API ecosystem update url
config.ecosystemUpdateUrl = 'https://bloc.money/wallet-api/list-ecosystem';
// BLOC price update url for overview
config.blocPriceUpdateUrl = 'https://bloc.money/wallet-api/coingecko-general-stats';
// BLOC exchange url
config.exchangeUpdateUrl = 'https://bloc.money/wallet-api/exchanges-stats';
// "Miner - Your stats" url
config.minerYourStatsUrl = 'https://bloc.money/wallet-api/miner-your-stats?wallet=';
// "Miner - Network stats" url
config.minerNetworkStatsUrl = 'https://bloc.money/wallet-api/miner-network-stats';
// "Miner - Pool stats" url
config.minerPoolStatsUrl = 'https://bloc.money/wallet-api/miner-pool-stats';

module.exports = config;