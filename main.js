//imports
const {app, BrowserWindow} = require('electron');
const path = require('path');
const url = require('url');

//initialize win
let win
function createWindow(){
    //create browser window
    win = new BrowserWindow({
        width:625,
        height:860,
        icon:__dirname+'/img/ram.jpg',
        webPreferences: {
            nodeIntegration: true
        }
    });
    // load index.html
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file',
        slashes: true
    }));

    win.on('closed', () => {
        win = null;
    });
}

// run create window function
app.on('ready', createWindow);

//quit when all windows are closed
app.on('window-all-closed', () =>{
    if(process.platform !== 'darwin'){
        app.quit();
    }

});