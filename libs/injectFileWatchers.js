class fileWatcher {
	constructor(c9Path){
		if(c9Path=="") return
		
		//Cloud variables required
		this.c9Path = c9Path
		this.vfs = window.apf.getPlugin('vfs')
		this.fs = window.apf.getPlugin('fs')
		this.watcher = null
		
		//Node modules
		this.nfs = node_require('fs')
		this.pLib = node_require('path')
		this.__pathSep = node_require('process').platform=="win32" ? "\\" : "/"
		
		//Project directry path
		this.__dirname = this.pLib.join(node_require('electron').remote.app.getAppPath(),"workspaces",apf.getPlugin('c9').projectName)
		
		this.localPath = this.pLib.join(this.__dirname,c9Path.replace(/\//g,this.__pathSep))
		this.localRevision = this.pLib.join(this.__dirname,".c9","metadata","workspace",c9Path.replace(/\//g,this.__pathSep))
		
		//Add watcher to global watcher list
		if(!window.SYNC9_FILE_WATCHERS) window.SYNC9_FILE_WATCHERS = []
		window.SYNC9_FILE_WATCHERS.push(this)
		
		//Get Metadata and file content
		this.fs.readFileWithMetadata(c9Path,function(errors, content, metadata, request){
			if(!errors){
				this.readFileWithMetadataErrors=null
				this.content			=	content	
				this.request			=	request
				
				if (!(metadata==undefined||metadata==null)){
					this.metadata	=	JSON.parse(metadata)
				} else {
					this.metadata	=	null
				}
			} else {
				this.readFileWithMetadataErrors=errors
			}
		}.bind(this))
	}
	
	hasFileChanged(callback){
		this.fs.readFileWithMetadata(this.c9Path,function(errors, content, metadata, request){
			if(!errors){
				if(metadata) {
					var test = this.timestamp != JSON.parse(metadata).timestamp
					callback(null,test)
					
					//Reset
					this.timestamp = JSON.parse(metadata).timestamp
				} else {
					callback(new Error("No metadata for file: " + this.c9Path))
				}
			} else {
				callback(errors)
			}
		}.bind(this))
	}
	
	syncFile(data){
		//More efficient - Write while streaming
		var vfs = apf.getPlugin('vfs')
		var nfs = node_require('fs')
		var localFile = this.localPath
		var c9Path = this.c9Path
		console.log("Local File: \"",localFile, "\"")
		console.log("C9 File: \"",c9Path, "\"")
		nfs.unlink(localFile,function(){
			vfs.readfile(c9Path,{},function(err,meta){
				if(err) console.error(err)
				if(meta.stream){
					meta.stream.on('data',function(chunk){
						nfs.appendFileSync(localFile,chunk.data.map(function(i){return String.fromCharCode(i)}).join(""))
					});
				}
			})
		})
	}
}


//List all files
var vfs = apf.getPlugin('fs')	//switch from vfs to C9's fs
apf.getPlugin('vfs').execFile("find",{args:["."], cwd:"/home/ubuntu/workspace"},function(err,stdio){
	if(err){
		console.log(err,stdio.stderr)
	} else {
		//Get file array
		var arr = stdio.stdout.split("\n")
		
		//Loop over array and watch files if not in "./.c9/*"
		arr.forEach(function(el){
			new fileWatcher(el)
		})
	}
})

setInterval(function(){
	for(watcher of window.SYNC9_FILE_WATCHERS){
		watcher.hasFileChanged(function(error,changed){
			console.log("Checking the things!")
			if(error){
				if(!/^No metadata for file: /.test(error.message))  console.error(error)
			} else {
				if(changed) console.log("Changed file: \"" + watcher.c9Path + "\"")
			}
		})
	}
},300)


/*
//Attempt to pipe vfs stream to nfs stream failed...
var vfs = apf.getPlugin('vfs')
nfs = node_require('fs')
vfs.readfile('/bob.js',{},function(err,meta){
	if(err) console.error(err)
	if(meta.stream) meta.stream.pipe(
		nfs.createWriteStream("C:\\Users\\sancarn\\Desktop\\Programming\\JS\\sync9\\streamdata.txt")
	)
})


//Write full vfs string to disk using writeFile. Not efficient, but it works.
var vfs = apf.getPlugin('vfs')
vfs.readfile('/bob.js',{},function(err,meta){
	if(err) console.error(err)
	if(meta.stream){
		var s=""
		meta.stream.on('data',function(chunk){
			s+=chunk.data.map(function(i){return String.fromCharCode(i)}).join("")
		});
		meta.stream.on('end',function(){
			node_require('fs').writeFile(
				"C:\\Users\\sancarn\\Desktop\\Programming\\JS\\sync9\\streamdata.txt",
				s,
				function(err){
					if(err) throw err;
					console.log("File saved...")
				})
		});
	}
})

//More efficient - Write while streaming
var vfs = apf.getPlugin('vfs')
var nfs = node_require('fs')
var localFile = "C:\\Users\\sancarn\\Desktop\\Programming\\JS\\sync9\\streamdata.txt"

nfs.unlink(localFile,function(){
	vfs.readfile('/bob.js',{},function(err,meta){
		if(err) console.error(err)
		if(meta.stream){
			meta.stream.on('data',function(chunk){
				nfs.appendFileSync(localFile,chunk.data.map(function(i){return String.fromCharCode(i)}).join(""))
			});
		}
	})
})

//Attempt at writing via binary buffer:
var vfs = apf.getPlugin('vfs')
var nfs = node_require('fs')
var localFile = "C:\\Users\\sancarn\\Desktop\\Programming\\JS\\sync9\\streamdata.txt"

nfs.unlink(localFile,function(){
	vfs.readfile('/bob.js',{},function(err,meta){
		if(err) console.error(err)
		if(meta.stream){
			meta.stream.on('data',function(chunk){	//this may error because c9's buffer may not be the same as Node's buffer
				debugger;
				nfs.writeFile(localFile, chunk,  "binary",function(err) {
					if(err) console.error(err);
					console.log("The file was saved!");
				});
			});
		}
	})
})

*/