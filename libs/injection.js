//setup ipc
var ipc = require('electron').ipcRenderer;

//setup late binding for require with node.
window.node_require = require

//setup jquery
window.$ = window.jQuery = require('jquery');

//setup macKeys
MACKEYS

var interval = setInterval(function(){
	if($(".c9-toolbarbutton-glossy.runbtn").length>0){
		clearInterval(interval);
		
		//add run button
		var imageUrl = $(".c9-toolbarbutton-glossy.runbtn").find(".c9-icon").css("background-image");
		var runUrl = imageUrl.replace("stop","run");
		var stopUrl = imageUrl.replace("run","stop");
		$("head").append($(`
			<style>
				.runprgmbtn{
					position: absolute !important;
					left: 265px;
				}
				
				.runprgmbtn .c9-label{
					margin-left: 20px;
				}
				.runprgmbtn .c9-label:after{
					content: 'Run Program';
				}
				.runprgmbtn.running .c9-label:after{
					content: 'Stop Program';
				}
				
				.runprgmbtn .c9-icon{
					top: 0px !important;
					display: block !important;
					left: 5px !important;
					height: 23px;
					background-size: cover;
					background-image: ${runUrl} !important;
				}
				.runprgmbtn.running .c9-icon{
					background-image: ${stopUrl} !important;
				}
			</style>	
		`));
		
		var runButton = $("<div class='c9-toolbarbutton-glossy runprgmbtn'>"+$(".c9-toolbarbutton-glossy.runbtn").html()+"</div>");
		runButton.find(".c9-label").text("")
		runButton.mouseenter(function(){
			$(this).addClass("c9-toolbarbutton-glossyOver");
		}).mouseleave(function(){
			$(this).removeClass("c9-toolbarbutton-glossyOver");
		})
		
		$(".bartools").append(runButton)
		ipc.on("programRun",function(){
			runButton.addClass("running");
		});
		ipc.on("programStop",function(){
			runButton.removeClass("running");
		});
		runButton.click(function(){
			if(runButton.is(".running")){
				ipc.send("stopProgram");
			}else{
				ipc.send("runProgram");
			}
		});
		
		//add progres bar (http://red-team-design.com/stylish-css3-progress-bars/)
		$("head").append($(`
			<style>
				.runPrgmProgressBar{
					position: absolute;
					left: 400px;
					top: calc(50% - 1px);
					transform: translate(0,-50%);
			    	border: 1px solid rgba(0,0,0,0.3);
						
				    background-color: rgba(0,0,0,0.1);
				    height: 16px;
				    padding: 2px;
				    width: 100px;
				    border-radius: 5px;
				    box-shadow: 0 1px 5px rgba(0,0,0,0.1) inset, 0 1px 0 rgba(64,64,64,0.1);           
				}
				
				.runPrgmProgressBar span{
				    display: inline-block;
				    height: 100%;
				    border-radius: 5px;
				    transition: width .4s;    
				    
				    background-color: #1c8a00;
      
				    box-shadow: 0 4px 4px rgba(255, 255, 255, .5) inset, 0 -4px 4px rgba(255, 255, 255, .5) inset;    
				    /*animation: animate-glow 1.2s ease-out infinite;*/
				}
	
				@keyframes animate-glow {
					 0% { box-shadow: 0 5px 5px rgba(255, 255, 255, .5) inset, 0 -5px 5px rgba(255, 255, 255, .5) inset;} 
					 50% { box-shadow: 0 5px 5px rgba(255, 255, 255, .3) inset, 0 -5px 5px rgba(255, 255, 255, .3) inset;} 
					 100% { box-shadow: 0 5px 5px rgba(255, 255, 255, .5) inset, 0 -5px 5px rgba(255, 255, 255, .5) inset;}
				}
			</style>
		`));
		
		var progressBar = $(`
			<div class="runPrgmProgressBar">
			    <span style="width: 0%"></span>
			</div>
		`);
		$(".bartools").append(progressBar)
		ipc.on("set loadbar",function(event, frac){
			if(frac=="reset"){
				var span = progressBar.find("span");
				span.css("transition","width 0s");
				span.width(0);
				setTimeout(function(){
					span.css("transition","width 0.4s");
				}, 100);
			}else{
				progressBar.find("span").width(frac*100+"%");
			}
		});
		
		
		//all the save listeners
		/*
		//add save file event on document close listener and on save as
		var bodyEl = $("body")[0];
		var initializedCloseSaveWindow = false;
		var initializedSaveAsWindow = false;
		var observer = new MutationObserver(function(mutations) {
			mutations.forEach(function(mutation) {
				var els = $(".bk-window .btn-default-css3.btn-green:visible")
				for(var i=0; i<els.length; i++){
					var el = $(els[i]);
					
					var windowName = el.closest(".bk-window").find(".bk-header").clone().children().remove().end().text().replace(/\s/g,"").toLowerCase();
					if(windowName=="saveas" && !initializedSaveAsWindow){
						//save on save as
						var saveAsWindow = el.closest(".bk-window");
						$(el).click(function(){
							var dir = saveAsWindow.find(".directory input").val();
							var name = (dir!="/"?dir:"")+"/"+saveAsWindow.find(".lblFilename + div input").val();
							ipc.send("saveFile", {file:name, method:"save as"})
						});				
						initializedSaveAsWindow = true;
					}else if(windowName=="wouldyouliketosavethisfile?" && !initializedCloseSaveWindow){
						//save on close
						var closeSaveWindow = el.closest(".bk-window");
						$(el).click(function(){
							var m = closeSaveWindow.find(".vbox h3").text().match(/Save (.*)\?/)
							if(m)
								ipc.send("saveFile", {file:m[1], method:"close dialog"})
						});				
						initializedCloseSaveWindow = true;					
					}
					
					if(initializedCloseSaveWindow && initializedSaveAsWindow){
						//dispose the observer when all things have been loaded
						observer.disconnect();
					}
				}
		  	});    
		});
		observer.observe(bodyEl, {childList: true});
		
		//add save file event on 'File>save all' button
		var loadSaveAllInterval = setInterval(function(){
			var saveAllButton = $(".menu_item").filter(function(){return $(this).clone().children().remove().end().text().toLowerCase()=="save all";});
			if(saveAllButton.length>0){
				saveAllButton.click(function(){
					var tabs = $(".session_btn").filter(function(){ return $(this).attr("class").toLowerCase().indexOf("tab")!=-1});
					for(var i=0; i<tabs.length; i++){
						var path = apf.findHost(tabs[i]).tab.path;
						if(path)
							ipc.send("saveFile", {file:path, method:"save all"});
					}
				});			
				clearInterval(loadSaveAllInterval);
			}
		});
		
		//a function to save the currently focused tab
		var saveFocusedTab = function(method){
			var tab = $(".session_btn.focus").filter(function(){ return $(this).attr("class").toLowerCase().indexOf("tab")!=-1})[0];
			if(tab){
				var path = apf.findHost(tab).tab.path;
				console.log(path)
				if(path)
					ipc.send("saveFile", {file:path, method:method});
			}	
		}
		//add save file event on ctrl+s
		document.addEventListener('keydown', function(e){
			if(e.key=="s" && (e.ctrlKey || macKeys.ctrlKey)){
				saveFocusedTab("ctrl s");
			}
		}, true);

		//add save file event on 'File>save' button
		var loadSaveInterval = setInterval(function(){
			var saveButton = $(".menu_item").filter(function(){return $(this).clone().children().remove().end().text().toLowerCase()=="save";});
			if(saveButton.length>0){
				saveButton.click(function(){
					saveFocusedTab("save");
				});
				clearInterval(loadSaveInterval);
			}
		});
		
		//create the file save and save all buttons by initializing the html element
		var fileButton = $(".c9-menu-btn.c9-menu-btnBool").filter(function(){
			return $(this).clone().children().remove().end().text().toLowerCase().replace(/\s/g,"")=="file"
		});
		fileButton.mousedown();
		fileButton.mousedown();
		*/
		
	}
});