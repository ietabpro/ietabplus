function isWindows() {
	return navigator.platform.substring(0,3) == 'Win';	// Win32, Win64
}

/**
 * IE Tab Plus no longer works on Windows 2000, Windows XP RTM and Windows XP SP1. So this function will return false
 * if the host OS's version is not Windows XP SP2 or later.
 */
function checkOSVersion() {
	var b = false;
	
	var m = /Windows NT (\d+\.\d+)/.exec(navigator.oscpu);
	if ( m ) {
		var ver = m[1];
		if ( ver >= "6.0" ) return true;		// 6.0+: Vista, Win7 or later, no problem
		if ( ver < "5.1" ) return false;		// 5.1: XP, can not work if is earlier than that
		
		// 5.1: XP, should be SP2+
		// 5.2: Windows Server 2003, should be SP1+
		var regRoot = 3;	// HKEY_LOCAL_MACHINE
		var regPath = "SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion";
		var regName = "CSDVersion";
		var servicePackStr = gIeTab.getRegistryEntry(regRoot, regPath, regName);
		if ( servicePackStr && servicePackStr.length > 3 ) {
			var i = 1;
			while ( ((servicePackStr[i] < '0') || (servicePackStr[i] > '9')) && ( i < servicePackStr.length ) ) {
				i++;
			}
    	var ServicePackLevel = parseInt(servicePackStr[i]);
    	switch (ver) {
    		case "5.1":
    			b = ServicePackLevel >= "2";
    			break;
    		case "5.2":
    			b = ServicePackLevel >= "1";
    			break;
    		default:
    			b = ServicePackLevel >= "2";		// Should not come here, but as the last resort, set a default condition
    			break;
    	}
    }
	}
	
	return b;
}

function isInPrivateBrowsingMode() {
	var pbs;
	try { pbs = Components.classes["@mozilla.org/privatebrowsing;1"].getService(Components.interfaces.nsIPrivateBrowsingService); } catch (e) {}
	var privatebrowsingwarning = pbs && pbs.privateBrowsingEnabled && gIeTab.getBoolPref("extensions.coral.ietab.privatebrowsingwarning", true);
	if ( privatebrowsingwarning ) {
		var cookieService = Components.classes["@mozilla.org/cookieService;1"].getService(Components.interfaces.nsICookieService);
		var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		var cookieManager = Components.classes["@mozilla.org/cookiemanager;1"].getService(Components.interfaces.nsICookieManager);
		try {
			var pbwFlag = cookieService.getCookieString(ioService.newURI("http://coralietab/", null, null), null);
			if (pbwFlag) {
				privatebrowsingwarning = pbwFlag.indexOf("privatebrowsingwarning=no") < 0;
				cookieManager.remove("coralietab", "privatebrowsingwarning", "/", false);
			}
		}
		catch (e) { }
	}
	
	return privatebrowsingwarning;
}

function shouldShowRetryPrompt() {
	if (gIeTab.getStrPref('coral.ietab.mode', "")=="advanced") {
		var m = /\?url=(\d+),(\S+)$/.exec(document.location.href);
		if (m) {
			var flags = parseInt(m[1]);
			var url = decodeURI(m[2]);
			if ( (flags == 0x4003) && gIeTab.startsWith(url, "http") && gIeTab.getBoolPref('coral.ietab.showprompt', true)) {
				return true;
			}
		}
	}
	return false;
}

function overlayCommandListener(event) {
	var msg;
	try { msg = JSON.parse(event.data); } catch (e) {}
	if (msg) {
		var ietab = document.getElementById("IETab");
		switch (msg.cmd) {
			case "goBack":
				ietab.goBack();
				break;
			case "goForward":
				ietab.goForward();
				break;
			case "cut":
				ietab.cut();
				break;
			case "copy":
				ietab.copy();
				break;
			case "paste":
				ietab.paste();
				break;
			case "selectAll":
				ietab.selectAll();
				break;
			case "refresh":
				ietab.refresh();
				break;
			case "stop":
				ietab.stop();
				break;
			case "saveAs":
				ietab.saveAs();
				break;
			case "print":
				ietab.print();
				break;
			case "printPreview":
				ietab.printPreview();
				break;
			case "printSetup":
				ietab.printSetup();
				break;
			case "find":
				ietab.find();
				break;
			case "viewSource":
				ietab.viewSource();
				break;
			case "focus":
				ietab.focus();
				break;
			case "displaySecurityInfo":    
				ietab.displaySecurityInfo();
				break;
			case "zoom":
				ietab.zoom(msg.zoomLevel);
				break;
			case "handOverFocus":
				ietab.handOverFocus();
				break;
			default:
				break;
		}
	}
}

/** This listener is only to repeat messages to XUL chrome */
function IETabNotifyListener(event) {
	var evt = document.createEvent("MessageEvent");
	evt.initMessageEvent("ContainerMessage", true, true, event.data, document.location.href, 0, window);
	document.dispatchEvent(evt);
}

function PluginNotFoundListener(event) {
	alert("Loading IE Tab + plugin failed. Please try restarting Firefox.");
}

function registerEventHandler() {
	window.addEventListener("OverlayCommand", overlayCommandListener, false);
	window.addEventListener("IETabNotify", IETabNotifyListener, false);
	window.addEventListener("PluginNotFound", PluginNotFoundListener, false);
	
	$(document).focus(function() {
		var ietab = document.getElementById("IETab");
		if (ietab) {
			ietab.focus();
		}
	});
}
