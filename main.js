var electron = require('electron')
var app = electron.app
var BrowserWindow = electron.BrowserWindow

var pLib = require('path')
var url = require('url')

//IPC and FileInjection
var ipc = require('electron').ipcMain;
var fs = require('fs')

//Tar.gz -- Downloading C9 version files.
var request = require('request')
var targz   = require('tar.gz')
var unzip	  = require('unzip-stream')

var macKeys;
var injection;
var injectionFileWatchers;
fs.readFile(pLib.join('libs','macKeys.js'), 'utf8', function(err, data) {
	if (err) throw err;
	macKeys = data
});
fs.readFile(pLib.join('libs','injection.js'), 'utf8', function(err, data) {
	if (err) throw err;
	injection = data.replace("MACKEYS", macKeys);
});
fs.readFile(pLib.join('libs','injectFileWatchers.js'),'utf8', function(err,data){
	if (err) throw err;
	injectionFileWatchers = data
})


if(!fs.existsSync(pLib.join(__dirname,"workspaces"))){
	fs.mkdir(pLib.join(__dirname,"workspaces"),function(){})
}

var sync9 = {}
var c9Window;
app.on('ready', function(){
	c9Window = new BrowserWindow({
		title: "C9",
		frame: true,
		resizable: true,
		transparent:false,
		hasShadow: true,
		thickFrame:true,
		width: 900,//1400,
		icon: pLib.join(__dirname, 'C9.png')
	})
	
	// and load the index.html of the app.
	c9Window.loadURL("http://c9.io/login")
	//c9Window.maximize()
	c9Window.setMenu(null)
	
	// Emitted when the window is closed.
	c9Window.on('closed', function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		c9Window = null;
		app.quit();
	});
	c9Window.webContents.openDevTools();
	c9Window.webContents.on('new-window', function(event, url){
		event.preventDefault();
		c9Window.loadURL(url);
		console.log("Loading: " + url)
		//add url check here
		c9Window.webContents.on('dom-ready', function (e){
			c9Window.webContents.executeJavaScript(injection);
			
			//Get Title
			sync9.projTitle = c9Window.getTitle() 
			sync9.projTitle = sync9.projTitle.substr(0,sync9.projTitle.length - " - Cloud9".length)
			
			//Get LocalDir
			sync9.local_dir = pLib.join(__dirname, 'Workspaces', sync9.projTitle)
		});
	});
	c9Window.webContents.on('did-fail-load',function(event,errCode,errDescription,validatedURL,isMainFrame){
		console.log("Couldn't load url due to error " + errCode + ": " + errDescription)
		c9Window.webContents.session.clearStorageData()
		c9Window.loadURL(validatedURL);
	})
	c9Window.webContents.on('did-get-redirect-request', function(event,oldUrl,newUrl, isMainFrame,httpResponseCode,requestMethod,referrer,headers){
		console.log("redirecting...")
	})
	c9Window.webContents.on('did-navigate', function(){
		console.log("did navigate")
	})
	
	var webRequest = c9Window.webContents.session.webRequest
	var filter = {
		urls: []
	}
	
	webRequest.onBeforeSendHeaders(filter, function(details,callback){
		if(/https:\/\/vfs-.*?c9.io\/vfs\//.test(details.url)){
			var _url = /https:\/\/vfs-.*?c9.io\/vfs\/.+?\/.+?\//.exec(details.url)
			if(_url!=null){
				sync9.url = _url[0];
				if(sync9.onCapturedInitURL && !sync9.hasCapturedInitURL){
					sync9.hasCapturedInitURL = true
					sync9.onCapturedInitURL()
				}
					
			}
		}
		callback({cancel: false, requestHeaders: details.requestHeaders})
	})
});

ipc.on("runProgram",function(){
	c9Window.webContents.send("programRun");
	c9Window.webContents.send("set loadbar", 1);
})
ipc.on("stopProgram",function(){
	c9Window.webContents.send("programStop");
	c9Window.webContents.send("set loadbar", "reset");
});
ipc.on("saveFile",function(event, arg){
	var filePath = arg.file;
	console.log(filePath+" "+arg.method)
});


////////////////////////////////////////////////////////////////////////////////
//                                   INITIATION                               //
////////////////////////////////////////////////////////////////////////////////


sync9.onCapturedInitURL = function(){
	var counter = 0
	var CloudList, C9TimeStampObject, LocalTimeStampObject;
	
	//Inject file watchers to window
	sync9.injectFileWatchers()
	
	sync9.getCloudFileListNoMetadata(function(data){
		//Do stuff with    CloudFileList
		/* Example:
		  [
		    "./ExportLinksAll.rb",
		    "./shit.js",
		    "./README.md",
		    "./mary.js",
		    ...
		]
		 */
		counter++
		CloudList = data
		console.log("Part 1 done")
		download()
	})
	sync9.getC9TimeStampObject(function(data){
		//Do stuff with    TImeStampObject
		/* Example:
		 {
		    "workspace/shit.js": 1499301374886,
		    "workspace/php.ini": 1499556389301,
		    "workspace/.sync9/.ignore": 1499641439145,
		    ...
    	 }
		 */
		counter++
		C9TimeStampObject = data
		console.log("Part 2 done")
		download()
	})
	sync9.getLocalTimeStampObject(function(data){
		//Do stuff with    TImeStampObject
		/*Example:
		 {
		    "C:\\Users\\sancarn\\workspace\\LaunchMenu\\c9 sync\\workspaces\\sync9-testing\\.c9\\metadata\\workspace\\Bob.js": 1500409735177,
		    "C:\\Users\\sancarn\\workspace\\LaunchMenu\\c9 sync\\workspaces\\sync9-testing\\.c9\\metadata\\workspace\\php.ini": 1499556389301,
		    "C:\\Users\\sancarn\\workspace\\LaunchMenu\\c9 sync\\workspaces\\sync9-testing\\.c9\\metadata\\workspace\\jk.js": 1499462096893,
		    "C:\\Users\\sancarn\\workspace\\LaunchMenu\\c9 sync\\workspaces\\sync9-testing\\.c9\\metadata\\workspace\\shit.js": 1499301374886,
		    ...
    	 }
    */
		counter++
		LocalTimeStampObject = data
		console.log("Part 3 done")
		download()
	})
	
	function download(){
		if(counter==3){
			console.log("Executing last part")
			
			console.log(JSON.stringify(CloudList,null,4))
			console.log(JSON.stringify(C9TimeStampObject,null,4))
			console.log(JSON.stringify(LocalTimeStampObject,null,4))
			
			//if LocalTimeStampObject is empty...
			if(Object.keys(LocalTimeStampObject).length===0 && LocalTimeStampObject.constructor === Object){
				//No files on local, therefore download whole project to disk
				var read = request.get(sync9.url + "workspace/?download=ws_version.zip")
				read.pipe(unzip.Extract({path:sync9.projDir})).on('close',function(){
					//Use setTimeout for safety.
					setTimeout(function(){
						fs.rename(pLib.join(sync9.projDir,"workspace"),pLib.join(__dirname,"5700c92d-9db2-455b-83bd-53f0aaabf84d"),function(e){
							if(e) console.log(e)
							fs.rmdir(sync9.projDir,function(e){
								if(e) console.log(e)
								fs.rename(pLib.join(__dirname,"5700c92d-9db2-455b-83bd-53f0aaabf84d"),sync9.projDir,function(e){
									if(e) console.log(e)
									console.log("Local computer is now in sync with Cloud server.")
								})
							})
						})		
					},250)
					
				})
			} else {
				//Manage C9 files...
				for(path in C9TimeStampObject){
					var path1 = c9ToLocalRevisionPath(path)
					manageFiles(c9ToLocalPath(path),path,LocalTimeStampObject[path1],C9TimeStampObject[path])
				}
				
				downloadSingleFolder("workspace/.c9", pLib.join(sync9.projDir,".c9"), function(){
					console.log("Downloaded new versions folder.")
				})
			}
		}
	}
	
	function c9ToLocalPath(c9Path){
		if(process.platform=="win32"){
			var sep="\\"
		} else {
			var sep = "/"
		}
		c9Path = c9Path.replace(/^workspace\//i,"")	//Trim front "workspace/"
		return sync9.projDir + sep + c9Path.replace(/\//g,sep)
	}
	
	function c9ToLocalRevisionPath(c9Path){
		if(process.platform=="win32"){
			var sep="\\"
		} else {
			var sep = "/"
		}
		return pLib.join(sync9.projDir,".c9","metadata") + sep + c9Path.replace(/\//g,sep)
	}
}

//getCloudFileListNoMetadata(callback==>(ArrayNoMetadata))
sync9.getCloudFileListNoMetadata = function(callback){
	sync9.getCloudFileList(function(data){
		if(data.err!=null){
			throw new Error(data.err)
		} else {
			var out = data.out
			getIgnore(function(data){
				callback(filterList(out,data))
			})
		}
	})
	
	function getIgnore(callback){
		require('https').get(sync9.url + "workspace/.sync9/.ignore?isFile=1",function(result){
			var rawData = "";
			result.on('data',(chunk)=> {rawData+=chunk;})
			result.on('end',function(){
				callback(rawData.split("\n"))
			})
		}).on('error',function(err){
			callback(null,err.message)
		})
	}
	
	function filterList(arr,arrBlackList){
		return arr.filter(function(e){return _testForBlackList(e,arrBlackList)})
		function _testForBlackList(testString,blackList){
		    var ret = true
		    blackList.forEach(function(e){
		        if(RegExp(e).test(testString)) ret = false
		    })
		    return ret
		}
	}
}

//Argument: callback  Type:function
//callback params <== {err:...,out:...}
sync9.getCloudFileList = function(callback){
	var _ipc = require('electron').ipcMain;
	_ipc.once("getFileList",function(event,ret){
		if(ret.err!=null) {
			console.log({err:ret.err,out:null})
		} else {
			callback({err:null,out:ret.data.split("\n")})	
		}
	})
	c9Window.webContents.executeJavaScript(`
		(function(){
			var vfs = apf.getPlugin('vfs')
			vfs.execFile("find",{args:["."], cwd:"/home/ubuntu/workspace"},function(err,stdio){
				if(err){
					//console.log(err,stdio.stderr)
					ipc.send("getFileList", {err:{base:err,stderr:stdio.stderr}, data:null})
				} else {
					//console.log(stdio.stdout)
					ipc.send("getFileList", {err:null, data:stdio.stdout})
				}
			})
		})()
	`)
}

sync9.getC9TimeStampObject = function(callback){
	var read = request.get(sync9.url + "workspace/.c9/metadata/workspace/?download=ws_version.zip")
	var i=0;
	var c9TimeStampObject = {}
	read.pipe(unzip.Parse())
		.on('entry', function(entry){
			if(entry.type == "File"){
				streamToString(entry,function(data,entry){
					if(data != null){
						this.FINISH_CONST++
						data = JSON.parse(data)
						c9TimeStampObject[entry.path] = data.timestamp
					} else {
						console.log("Error occurred while streaming file")
					}
				})
				entry.autodrain()
			}
		})
		.on('finish',function(){
				onFinish(function(){
					callback(c9TimeStampObject)
				})
			})
		
	function onFinish(callback){
		if(this.FINISH_CONST == 0){
			callback()
		} else {
			this.FINISH_CONST = 0
			setTimeout(function(){onFinish(callback)},100)
		}
	}
	
	function streamToString(stream, cb) {
	  var chunks = [];
	  stream.on('data', (chunk) => {
	    chunks.push(chunk.toString());
	  });
	  stream.on('end', () => {
	    cb(chunks.join(''),stream);
	  });
	}
}

sync9.getLocalTimeStampObject=function(callback){
	sync9.projDir = pLib.join(__dirname,"workspaces",sync9.projTitle)
	var revisionDir = pLib.join(sync9.projDir,".c9","metadata","workspace")
	var projExists = fs.existsSync(sync9.projDir)
	var revisionExists = fs.existsSync(revisionDir)
	if(projExists && revisionExists){
		//==> create timestamp object
		getTimeStampObject(revisionDir,function(err,list){
			if(err) throw new Error(err)
			callback(list)
		})
	} else {
		if(!projExists){
			fs.mkdir(sync9.projDir,function(){
				callback({})
			})
		} else {
			callback({})
		}
	}

	function getTimeStampObject(dir,done){
		var fs = require('fs');
		var path = require('path');
		var walk = function(dir, done) {
		  var results = {}
		  fs.readdir(dir, function(err, list) {
		    if (err) return done(err);
		    var pending = list.length;
		    if (!pending) return done(null, results);
		    list.forEach(function(file) {
		      file = path.resolve(dir, file);
		      fs.stat(file, function(err, stat) {
		        if (stat && stat.isDirectory()) {
		          walk(file, function(err, res) {
		            results = Object.assign(results,res);
		            if (!--pending) done(null, results);
		          });
		        } else {
		        	try {
		        		var ts = JSON.parse(fs.readFileSync(file)).timestamp
		        		results[file]=ts
		        	} catch(e){
		        		results[file]=null
		        	}
		          if (!--pending) done(null, results);
		        }
		      });
		    });
		  });
		};
		walk(dir,done)
	}
}

// https://vfs-gce-eu-98-3.c9.io/vfs/4857598/9cc8CrsPbpZ2tl6F/workspace/.c9&download
// in var _____ <-- "https://vfs-gce-eu-98-3.c9.io/vfs/4857598/9cc8CrsPbpZ2tl6F/"
// c9.tar.gz


function cloudFileExists(file,callback){	//callback(err,data)
	request(sync9.url + file + "?isFile=1",function(err,response,body){
		if(err){
			callback(err)
		} else {
			if(response.statusCode != 200) {
				//Error 404 - File not found. Check if the file exists on local, if so, delete it.
				if(response.statusCode == 404){
					callback(undefined,false,body)
				} else {
					callback(new Error("An unknown error occurred while downloading file: \"" + c9FilePath + "\""))
				}
			} else {
				callback(undefined,true,body)
			}
		}
	})
}

function manageFiles(localPath,cloudPath,localTime,cloudTime){
	var fs = require('fs')
	if(localTime==undefined){
		//I have had instances where the file does not exist on the cloud side...
		cloudFileExists(cloudPath,function(err,status,data){
			if(status){
				console.log("File doesn't exist. Download starting: " + cloudPath)
				downloadSingleFile(cloudPath,localPath,data)	
			}
		})
	} else if(localTime<=cloudTime){
		cloudFileExists(cloudPath,function(err,status,data){
			if(err) throw err;
			if(status){ //file exists
				if(localTime!=cloudTime){ //file needs updating
					console.info("Overwriting local file with updated file: " + cloudPath)
					downloadSingleFile(cloudPath,localPath,data)
				} else { //file up to date
					console.info("Local file is up to date: " + cloudPath)
				}
			} else { // cloud file does not exist. delete local
				console.info("File no longer exists on cloud. Deleting: " + cloudPath)
				fs.unlink(localPath,function(){})
			}
		})
	}
}

function downloadSingleFile(c9FilePath,localFilePath,data){
	var fs = require('fs')
	var pLib = require('path')
	
	console.log(`downloadSingleFile ${c9FilePath} ${localFilePath}`)
	
	//Trim "workspace/" off of c9FilePath
	c9FilePath = c9FilePath.replace(/^workspace\//gi,"") 
	
	//Check if directories of file exist, in reverse order. Push to array.
	mkdirs=[]
	var checkPath = pLib.join(localFilePath,"..")
	var bCheckPath = fs.existsSync(checkPath)
	while(!bCheckPath){
		mkdirs.push(checkPath)
		var checkPath = pLib.join(checkPath,"..")
		var bCheckPath = fs.existsSync(checkPath)
	}
	
	//These calls have to be synchronous because the order in which the directories are made is important.
	for(var i=0;i<mkdirs.length;i++){
		fs.mkdirSync(mkdirs[mkdirs.length-i])
	}
	
	if(data){
		fs.writeFile(localFilePath,data,function(err){
			if(err) throw err;
			console.log("The file \"" + c9FilePath + "\" has been saved")
		})
	} else { //get the data
		//Asynchronous call to download file.
		request(sync9.url + "workspace/" + c9FilePath + "?isFile=1",function(err,response,body){
			if(response.statusCode != 200) {
				throw new Error("Error in downloading file: \"" + c9FilePath + "\"")
			} else {
				fs.writeFile(localFilePath,body,function(err){
					if(err) throw err;
					console.log("The file \"" + c9FilePath + "\" has been saved")
				})
			}
		})		
	}
}

function downloadSingleFolder(cloudPath, localPath, callback){
	var fs = require('fs-extra')
	var pLib = require('path')
	//if folder already exists delete it
	if(fs.existsSync(localPath)){
		fs.removeSync(localPath);
	}
	
	//download file
	var read = request.get(sync9.url + cloudPath + "/?download=ws_version.zip")
	read.pipe(unzip.Extract({path:pLib.join(localPath,"..")})).on('close',function(){
		console.log("Folder downloaded: " + cloudPath)
		callback()
	})
}


sync9.injectFileWatchers = function(){
	c9Window.webContents.executeJavaScript(injectionFileWatchers);
}




/*
 * THINGS THAT NEED CHANGING:
 * - downloadSingleFile() --> Download ONLY if returned response is not an error.
 * - downloadSingleFile() --> Download file not revisionFile  -- this is already taken care of!
 * - validPaths should be found from CloudList NOT CloudTimeStampObject
 */


// 1. compare local and c9 timestamp objects
// 2. where c9 timestamp > local timestamp:
//		a. download c9 file and replace local file
// 3. where c9 timestamp = local timestamp:
//    do nothing
// 4. where c9 timestamp exists but local file doesn't
//		a. download c9 file
// 5. update all timestamps (download .c9 as zip and replace existing .c9 folder)
// ==> ????
// ==> Profit!






/*
 * I have a feeling that this code may not be general.
 * 
 * New vision:
 * - Scan through local or online files and generate this structure:
 *      {Cloud:<Boolean>, PathRaw:<OriginalPath>, CloudPath:____, LocalPath:____, Timestamp:____, CloudRevision:_____, LocalRevision:____}
 * - CloudPath will have to be generated for local files.
 * - LocalPath will have to be generated for cloud foles.
 * 2 arrays created:
 * - LocalFiles=[...]
 * - CloudFiles=[...]
 * 
 * Arrays of these objects will be created in the first stage.
 * In the 2nd stage the records of these arrays will be matched and the outcome of the file determined.
 * 
 * Loop through local files:
 *  if(CloudFiles.findByCloudPath(LocalFile.CloudPath)==null) LocalFile.deleteFile()
 * 
 * Loop through cloud files:
 *  localFile=LocalFiles.findByCloudPath(cloudFile.CloudPath)
 *  if(localFile==null){
 *  	cloudFile.download()
 *  } else {
 *  	if(localFile.timestamp<cloudFile.timestamp){
 *  		localFile.delete(function(){cloudFile.download()})
 *  	}
 * 		if(localFile.timestamp>cloudFile.timestamp){
 *  		//throw error
 *  	}
 *  	if(localFile.timestamp==cloudFile.timestamp){
 *  		//Ackknowledge
 *  	}
 *  }
 * 
 * THINGS TO REMEMBER:
 * - .c9 files do not have a timestamp!
 */







