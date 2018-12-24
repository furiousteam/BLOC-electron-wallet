# BLOC Electron Wallet for Desktop

[BLOC Electron GUI Wallet](https://github.com/furiousteam/BLOC-electron-wallet) - GUI Stands for Graphical User Interface. It makes it easy for you to use BLOC with a friendly user interface. The BLOC Electron Wallet client allow you to create your wallet, store and send your [BLOC money](https://bloc.money), view your transactions and much more. BLOC Electron GUI Wallet is available for Windows, macOS and linux desktop and laptop computers.

## **Screenshot**

![BLOC Electron Wallet - Welcome screen](https://wiki.bloc.money/wallets/images/BLOC-gui-wallet/V3/welcome.png)

## Features:
This wallet contains the basic functions required to manage your BLOC assets:

* Wallet creation
  * Create new wallet
  * Import from private keys
  * Import from mnemonic seed
* Basic wallet operation
  * Open an existing wallet
  * Display wallet address & balance
  * Transactions listing/sorting/searching
  * Display transaction detail
  * Export incoming, outgoing, or all transactions to csv file.
  * Send BLOC to single recipient address, allow to set payment id and custom fee. Provides address lookup from addressbook.
* Misc
  * Provides setting to set local or public node address
  * Option to use system tray (on closing/minimizing wallet)
  * Provides list of public nodes, fetch/updated daily from turtlecoin-nodes-json repo.
  * Custom node address that is not on the list will be added/remembered for future use
  * [Keyboard shortcuts](docs/shortcut.md)

### Notes

BLOC Electron Wallet relies on `BLOC-service` to manage wallet container &amp; rpc communication.

Release installer & packaged archived includes a ready to use `BLOC-service` binary, which is unmodified copy BLOC release archive.

If you don't trust the bundled `BLOC-service` file, you can download and use the binary from official BLOC release, which is available here: https://github.com/furiousteam/BLOC/releases or compile it yourself. Then, make sure to update your `BLOC-service` path setting.

### Download &amp; Run WalletShell

#### Windows:
1. Download the latest installer here: https://github.com/turtlecoin//turtle-wallet-electron/releases
2. Run the installer (`walletshell-<version>-win-setup.exe`) and follow the installation wizard.
3. Launch WalletShell via start menu or desktop shortcut.

#### GNU/Linux (AppImage):
1. Download latest AppImage bundle here: https://github.com/turtlecoin//turtle-wallet-electron/releases
2. Make it executable, either via GUI file manager or command line, e.g. `chmod +x walletshell-<version>-linux.AppImage`
3. Run/execute the file, double click in file manager, or run via shell/command line.

See: https://docs.appimage.org/user-guide/run-appimages.html

#### macOS (TBD/Untested)
1. Download latest archive here: https://github.com/turtlecoin//turtle-wallet-electron/releases
2. Extract downloaded tar archived
3. Run the executable binary (`WalletShell.app/Contents/MacOs/WalletShell`) ??

### Build
You need to have `Node.js` and `npm` installed, go to https://nodejs.org and find out how to get it installed on your platform.

Once you have Node+npm installed:
```
# first, download BLOC-service binary for each platform
# from TurtleCoin official repo
# https://github.com/turtlecoin/turtlecoin/releases
# extract the BLOC-service executable somewhere

# clone the repo
$ git clone https://github.com/furiousteam/BLOC-electron-wallet
$ cd turtle-wallet-electron

# install dependencies
$ npm install

# create build+dist directory
$ mkdir -p ./build && mkdir -p ./dist

# copy/symlink icons from assets, required for packaging
$ cp ./src/assets/icon.* ./build/

# build GNU/Linux package
$ mkdir -p ./bin/lin
$ cp /path/to/linux-version-of/BLOC-service ./bin/lin/
$ npm run dist-lin

# build Windows package
$ mkdir -p ./bin/win
$ cp /path/to/win-version-of/BLOC-service.exe ./bin/win/
$ npm run dist-win

# build OSX package
$ mkdir -p ./bin/osx
$ cp /path/to/osx-version-of/BLOC-service ./bin/osx/
$ npm run dist-mac
```

Resulting packages or installer can be found inside `dist/` directory.

### Porting for other coin
Please see [this guide](docs/porting.md) if you want to adapt WalletShell to be use for your own TurtleCoin fork.