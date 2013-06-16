/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is IETab. Modified In Coral IE Tab.
 *
 * The Initial Developer of the Original Code is yuoo2k <yuoo2k@gmail.com>.
 * Modified by quaful <quaful@msn.com>.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006-2008
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */
 
IeTab.prototype.QueryInterface = function(aIID) {
   if (aIID.equals(Components.interfaces.nsIIeTab) || aIID.equals(Components.interfaces.nsISupports))
      return gIeTab;
   throw Components.results.NS_NOINTERFACE;
}

IeTab.prototype.getIeTabURL = function(url, flags) {
	if (gIeTab.startsWith(url, gIeTab.containerUrl)) return url;
	if (/^file:\/\/.*/.test(url)) try { url = decodeURI(url).replace(/\|/g,":"); }catch(e){}
	flags = ( typeof(flags) != 'undefined' ? flags : 0x4003 );	// 0x4000 means manual switching, 0x0003(0x0001|0x0002) means sync cookies and user-agent
	
	// Remove user and password in url format: http://user:pass@site.com
	if (url.indexOf('@')>0) {
		const ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
	  var uri = ios.newURI(url, null, null);
	  uri.userPass = "";
	  url = uri.spec;
	}
	     
	return gIeTab.containerUrl + flags + ',' + encodeURI(url);
}

IeTab.prototype.getIeTabTrimURL = function(url) {
   if (url && url.length>0) {
      url = url.replace(/^\s+/g,"").replace(/\s+$/g,"");
      if (/^file:\/\/.*/.test(url)) url = url.replace(/\|/g,":");
      if (url.substr(0, gIeTab.containerUrl.length) == gIeTab.containerUrl) {
      	var flag_pos = url.indexOf(',', gIeTab.containerUrl.length);
      	if (flag_pos>0)
         url = decodeURI(url.substring(flag_pos+1));
        else
         url = decodeURI(url.substring(gIeTab.containerUrl.length+1));
         
        if (/^ietab:/.test(url)) {
        	url = "about:blank";
        }
        else if (!/^[\w]+:/.test(url)) {
        	url = "http://"+url;
        }
      }
   }
   return url;
}

IeTab.prototype.getIeTabElmt = function(aTab) {
   var aBrowser = (aTab ? aTab.linkedBrowser : gBrowser);
   if (aBrowser && aBrowser.currentURI && gIeTab.startsWith(aBrowser.currentURI.spec, gIeTab.containerUrl)) {
      if (aBrowser.contentDocument && aBrowser.contentDocument.getElementById('IETab')){
         var obj = aBrowser.contentDocument.getElementById('IETab');
         return (obj.wrappedJSObject ? obj.wrappedJSObject : obj);		// Ref: Safely accessing content DOM from chrome
      }
   }
   return null;
}

IeTab.prototype.getIeTabElmtURL = function(aTab) {
   var aBrowser = (aTab ? aTab.linkedBrowser : gBrowser);
   var url = gIeTab.getIeTabTrimURL(aBrowser.currentURI.spec);
   var ietab = gIeTab.getIeTabElmt(aTab);
   if (ietab && ietab.url && ietab.url != "") {
      url = (/^file:\/\/.*/.test(url) ? encodeURI(gIeTab.convertToUTF8(ietab.url)) : ietab.url);
   }
   return url;
}

IeTab.prototype.isIeForceable = function(url) {
   return(url && (url.length>0) &&
             ((url=="about:blank") ||
              gIeTab.startsWith(url, 'http://') ||
              gIeTab.startsWith(url, 'https://') ||
              gIeTab.startsWith(url, 'file://') ||
              gIeTab.startsWith(url, 'ftp://')
             )
         );
}

IeTab.prototype.isIeEngine = function() {
   return gIeTab.getIeTabElmt();
}

IeTab.prototype.switchTabEngine = function(aTab, isOpenNewTab, flags) {
	if (aTab && aTab.localName == "tab") {
		var url = gIeTab.getIeTabElmtURL(aTab);
		var ietab = gIeTab.getIeTabElmt(aTab);
		if (ietab) {
			// Now it is IE engine, call me means users want to switch to Firefox engine.
			// We have to tell iewatch component that this is manual switching, do not switch back to IE engine
			if (aTab.linkedBrowser) {
				var node = aTab.linkedBrowser.QueryInterface(Components.interfaces.nsIDOMNode);
				if (node) node.setAttribute(gIeTab.browserAttr, true);		// Leave a mark for iewatch component
			}
		}
		else {
			url = gIeTab.getIeTabURL(url, flags);
		}
      gBrowser.mIeTabSwitchURL = url;
      if (isOpenNewTab) {
         var newTab = gBrowser.addTab(url);
         var focustab = gIeTab.getBoolPref("extensions.coral.ietab.focustab", true);
         if (focustab) gBrowser.selectedTab = newTab;
      } else {
      	if (aTab.linkedBrowser) aTab.linkedBrowser.loadURI(url);
      }
      gBrowser.mIeTabSwitchURL = null;
   }
}

IeTab.prototype.switchEngine = function(isOpenNewTab, flags) {
   gIeTab.switchTabEngine(gBrowser.mCurrentTab, isOpenNewTab, flags);
}

IeTab.prototype.openPrefDialog = function(url) {
   if (!url) url = gIeTab.getIeTabElmtURL();
   var icon = document.getElementById('ietab-status');
   window.openDialog('chrome://coralietab/content/ietabSetting.xul', "ietabPrefDialog",
      'chrome,centerscreen', gIeTab.getUrlDomain(url), icon);
}

IeTab.prototype.openFilterEditor = function() {
	var url = gIeTab.getIeTabElmtURL();
	var icon = document.getElementById('ietab-status');
	window.openDialog('chrome://coralietab/content/ietabSetting.xul', "ietabPrefDialog",
      'chrome,centerscreen', gIeTab.getUrlDomain(url), icon, 1);
}

IeTab.prototype.loadInExtApp = function(url) {
   if (/^file:\/\/.*/.test(url)) try { url = decodeURI(url).substring(8).replace(/\//g, "\\"); }catch(e){}
   url = gIeTab.convertToASCII(url);
   var param = gIeTab.getStrPref("extensions.coral.ietab.extAppParam", "%1").replace(/%1/g, url);
   var path = gIeTab.getStrPref("extensions.coral.ietab.extAppPath", "");
   return IeTabExtApp.runApp(path, param);
}

IeTab.prototype.viewPageInExtApp = function(aTab) {
   return gIeTab.loadInExtApp(gIeTab.getIeTabElmtURL(aTab));
}

IeTab.prototype.viewLinkInExtApp = function() {
   return gIeTab.loadInExtApp(gIeTab.getContextLinkURL());
}

IeTab.prototype.clickButton = function(e) {
	if (e.button == 0) {
		if (e.ctrlKey) {
			var ctrlExtApp = gIeTab.getBoolPref("extensions.coral.ietab.ctrlclick", true);
			if (ctrlExtApp ) gIeTab.viewPageInExtApp();
			return;
		}
		gIeTab.switchEngine(e.ctrlKey || gIeTab.getBoolPref("extensions.coral.ietab.alwaysNewTab", false));
	}
	if (e.button == 1) gIeTab.switchEngine(true);
	if (e.button == 2) {
		document.getElementById("menu_context").openPopup(e.target, "before_start", 0, 0, true, false);
	}
	e.preventDefault();
}

IeTab.prototype.getContextLinkURL = function() {
   return (gContextMenu ? gContextMenu.link.toString() : null);
}

IeTab.prototype.loadIeTab = function(url, flags) {
   gBrowser.loadURI(gIeTab.getIeTabURL(url, flags));
}

IeTab.prototype.addIeTab = function(url, flags) {
   var newTab = gBrowser.addTab(gIeTab.getIeTabURL(url, flags));
   var focustab = gIeTab.getBoolPref("extensions.coral.ietab.focustab", true);
   if (focustab) {
      gBrowser.selectedTab = newTab;
      if (gURLBar && (url == 'about:blank'))
         window.setTimeout(function(){ gURLBar.focus(); }, 0);
   }
}

IeTab.prototype.ietabContextMenuPopup = function(e) {
	if (e.originalTarget != document.getElementById("contentAreaContextMenu")) return;
	if (!gContextMenu) return;

	var hide4Page = gContextMenu.isTextSelected || gContextMenu.onLink || gContextMenu.onImage || gContextMenu.onTextInput;
	var hide4Link = (!gContextMenu.onLink) || (!gIeTab.isIeForceable(gIeTab.getContextLinkURL())); //if link is javascript

	var internal = gIeTab.getBoolPref("extensions.coral.ietab.pagelink", true);
	var external = gIeTab.getBoolPref("extensions.coral.ietab.pagelink.extapp", true);
	var showicon = gIeTab.getBoolPref("extensions.coral.ietab.icon.pagelink", false);

	var menuitem = null;
	
	//click on page
	menuitem = document.getElementById("ietab-viewpage");
	menuitem.hidden = hide4Page || !internal;
	menuitem = document.getElementById("ietab-viewpage-sep");
	menuitem.hidden = hide4Page || (!internal && !external);
	
	var item_disabled = (gIeTab.getStrPref("extensions.coral.ietab.mode","")!="advanced") || !gIeTab.getBoolPref("extensions.coral.ietab.cookieSync");
	
	var popupmenu = null;
	var menu_source = null;
	var menu_dest = null;
	
	popupmenu = document.getElementById('ietab-viewpage-menu');
	if (popupmenu.hasChildNodes()) {
		menuitem = document.getElementById('context_switchEngine');
		if ( menuitem ) menuitem.setAttribute("class", (showicon ? document.getElementById('menu_switchEngine').getAttribute("iconic") : ""));
		menuitem = document.getElementById('context_ietab-viewpage-extapp');
		if ( menuitem ) menuitem.setAttribute("class", (showicon ? document.getElementById('ietab-viewpage-extapp').getAttribute("iconic") : ""));
	}
	else {
		menu_source = document.getElementById('menu_switchEngine');
		if ( menu_source ) {
			menu_dest = document.createElement("menuitem");
			menu_dest.setAttribute("id", "context_switchEngine");
			menu_dest.setAttribute("label", menu_source.getAttribute("label"));
			menu_dest.setAttribute("class", (showicon ? menu_source.getAttribute("iconic") : ""));
			menu_dest.setAttribute("accesskey", menu_source.getAttribute("accesskey"));
			menu_dest.setAttribute("oncommand", menu_source.getAttribute("oncommand"));
			popupmenu.appendChild(menu_dest);
		}
		
		menu_source = document.getElementById('menu_switchEngine_NoCookie');
		if ( menu_source ) {
			menu_dest = document.createElement("menuitem");
			menu_dest.setAttribute("id", "context_switchEngine_NoCookie");
			menu_dest.setAttribute("label", menu_source.getAttribute("label"));
			menu_dest.setAttribute("accesskey", menu_source.getAttribute("accesskey"));
			menu_dest.setAttribute("oncommand", menu_source.getAttribute("oncommand"));
			menu_dest.setAttribute("disabled", item_disabled );
			popupmenu.appendChild(menu_dest);
		}
		
		menu_source = document.getElementById('menu_switchEngine_SafeMode');
		if ( menu_source ) {
			menu_dest = document.createElement("menuitem");
			menu_dest.setAttribute("id", "context_switchEngine_SafeMode");
			menu_dest.setAttribute("label", menu_source.getAttribute("label"));
			menu_dest.setAttribute("accesskey", menu_source.getAttribute("accesskey"));
			menu_dest.setAttribute("oncommand", menu_source.getAttribute("oncommand"));
			menu_dest.setAttribute("disabled", item_disabled );
			popupmenu.appendChild(menu_dest);
		}
		
		menu_source = document.getElementById('ietab-viewpage-extapp');
		if ( menu_source ) {
			menu_dest = document.createElement("menuitem");
			menu_dest.setAttribute("id", "context_ietab-viewpage-extapp");
			// menu_dest.setAttribute("label", menu_source.getAttribute("label"));
			menu_dest.setAttribute("class", (showicon ? menu_source.getAttribute("iconic") : ""));
			menu_dest.setAttribute("accesskey", menu_source.getAttribute("accesskey"));
			menu_dest.setAttribute("oncommand", menu_source.getAttribute("oncommand"));
			popupmenu.appendChild(menu_dest);
		}
	}

	//click on link
	menuitem = document.getElementById("ietab-viewlink");
	menuitem.hidden = hide4Link || !internal;
   
	popupmenu = document.getElementById('ietab-viewlink-menu');
	if (popupmenu.hasChildNodes()) {
		menuitem = document.getElementById('link_switchEngine');
		if ( menuitem ) menuitem.setAttribute("class", (showicon ? document.getElementById('menu_switchEngine').getAttribute("iconic") : ""));
		
		menuitem = document.getElementById('link_ietab-viewpage-extapp');
		if ( menuitem ) menuitem.setAttribute("class", (showicon ? document.getElementById('ietab-viewpage-extapp').getAttribute("iconic") : ""));
	}
	else {
		menu_source = document.getElementById('menu_switchEngine');
		if ( menu_source ) {
			menu_dest = document.createElement("menuitem");
			menu_dest.setAttribute("id", 'link_switchEngine');
			menu_dest.setAttribute("label", menu_source.getAttribute("label"));
			menu_dest.setAttribute("class", (showicon ? menu_source.getAttribute("iconic") : ""));
			menu_dest.setAttribute("accesskey", menu_source.getAttribute("accesskey"));
			menu_dest.addEventListener("command", function() {
			    gIeTab.viewLink(event, 0x0003);
			}, false);
			popupmenu.appendChild(menu_dest);
		}
		
		menu_source = document.getElementById('menu_switchEngine_NoCookie');
		if ( menu_source ) {
			menu_dest = document.createElement("menuitem");
			menu_dest.setAttribute("label", menu_source.getAttribute("label"));
			menu_dest.setAttribute("accesskey", menu_source.getAttribute("accesskey"));
			menu_dest.addEventListener("command", function() {
			    gIeTab.viewLink(event, 0x4000);
			}, false);
			menu_dest.setAttribute("disabled", item_disabled );
			popupmenu.appendChild(menu_dest);
		}
		
		menu_source = document.getElementById('menu_switchEngine_SafeMode');
		if ( menu_source ) {
			menu_dest = document.createElement("menuitem");
			menu_dest.setAttribute("label", menu_source.getAttribute("label"));
			menu_dest.setAttribute("accesskey", menu_source.getAttribute("accesskey"));
			menu_dest.addEventListener("command", function() {
			    gIeTab.viewLink(event, 0x4001);
			}, false);
			menu_dest.setAttribute("disabled", item_disabled );
			popupmenu.appendChild(menu_dest);
		}
		
		menu_source = document.getElementById('ietab-viewpage-extapp');
		if ( menu_source ) {
			menu_dest = document.createElement("menuitem");
			menu_dest.setAttribute("id", 'link_ietab-viewpage-extapp');
			// menu_dest.setAttribute("label", menu_source.getAttribute("label"));
			menu_dest.setAttribute("class", (showicon ? menu_source.getAttribute("iconic") : ""));
			menu_dest.setAttribute("accesskey", menu_source.getAttribute("accesskey"));
			menu_dest.addEventListener("command", function() {
			    gIeTab.viewLinkInExtApp();
			}, false);
			popupmenu.appendChild(menu_dest);
		}
	}
	
	gIeTab.updateContextMenu();
}

IeTab.prototype.getHandledURL = function(url, isModeIE) {
	url = gIeTab.trim(url);
	if (isModeIE) return gIeTab.getIeTabURL(url);
	if ( gIeTab.isIeEngine() &&
		(!gIeTab.startsWith(url, "about:")) && 
		(!gIeTab.startsWith(url, "view-source:"))
		) {
			if ( gIeTab.isValidURL(url) || gIeTab.isValidDomainName(url) ) {
				var isBlank = (gIeTab.getIeTabTrimURL(gBrowser.currentURI.spec)=="about:blank");
				var handleUrlBar = gIeTab.getBoolPref("extensions.coral.ietab.handleUrlBar", false);
				var isSimilar = (gIeTab.getUrlDomain(gIeTab.getIeTabElmtURL()) == gIeTab.getUrlDomain(url));
				if (isBlank || handleUrlBar || isSimilar) return gIeTab.getIeTabURL(url);
			}
		}
	
	return url;
}

IeTab.prototype.updateUrlBar = function() {
   if (!gURLBar || !gIeTab.isIeEngine()) return;
   if (gBrowser.userTypedValue) {
      if (gURLBar.selectionEnd != gURLBar.selectionStart)
         window.setTimeout(function(){ gURLBar.focus(); }, 0);
   } else {
      var url = gIeTab.getIeTabElmtURL();
      if (url == "about:blank") url = "";
      if (gURLBar.value != url) gURLBar.value = url;
   }
}

IeTab.prototype.updateToolButton = function() {
   var btn = document.getElementById("ietab-button");
   if (btn) {
      btn.setAttribute("engine", (gIeTab.isIeEngine()?"ie":"fx"));
   }
}

IeTab.prototype.updateStatusIcon = function() {
   var img = document.getElementById("ietab-status-image");
   if (img) {
      img.setAttribute("engine", (gIeTab.isIeEngine()?"ie":"fx"));

      var show = gIeTab.getBoolPref("extensions.coral.ietab.statusbar", true);
      var icon = document.getElementById('ietab-status');
      if (icon && show) {
         icon.removeAttribute("hidden");
      }else{
         icon.setAttribute("hidden", true);
      }
   }
}

IeTab.prototype.updateObjectDisabledStatus = function(objId, isEnabled) {
   var obj = ( typeof(objId)=="object" ? objId : document.getElementById(objId) );
   if (obj) {
      var d = obj.hasAttribute("disabled");
      if (d == isEnabled) {
         if (d) obj.removeAttribute("disabled");
         else obj.setAttribute("disabled", true);
      }
   }
}

IeTab.prototype.updateBackForwardButtons = function() {
   try {
      var ietab = gIeTab.getIeTabElmt();
      var canBack = (ietab ? ietab.canBack : false) || gBrowser.webNavigation.canGoBack;
      var canForward = (ietab ? ietab.canForward : false) || gBrowser.webNavigation.canGoForward;
      gIeTab.updateObjectDisabledStatus("Browser:Back", canBack);
      gIeTab.updateObjectDisabledStatus("Browser:Forward", canForward);
   }catch(e){}
}

IeTab.prototype.updateStopReloadButtons = function() {
   try {
      var ietab = gIeTab.getIeTabElmt();
      var isBlank = (gBrowser.currentURI.spec == "about:blank");
      var isLoading = gBrowser.mIsBusy;
      gIeTab.updateObjectDisabledStatus("Browser:Reload", ietab ? ietab.canRefresh : !isBlank);
      gIeTab.updateObjectDisabledStatus("Browser:Stop", ietab ? ietab.canStop : isLoading);
   }catch(e){}
}

IeTab.prototype.updateGoMenuItems = function(e) {
   var goPopup = document.getElementById("goPopup");
   if (!goPopup || (e.originalTarget != goPopup)) return;
   try {
      var ietab = gIeTab.getIeTabElmt();
      var canBack = (ietab ? ietab.canBack : false) || gBrowser.webNavigation.canGoBack;
      var canForward = (ietab ? ietab.canForward : false) || gBrowser.webNavigation.canGoForward;
      var goBack = goPopup.getElementsByAttribute("key","goBackKb");
      if (goBack) gIeTab.updateObjectDisabledStatus(goBack[0], canBack);
      var goForward = goPopup.getElementsByAttribute("key","goForwardKb");
      if (goForward) gIeTab.updateObjectDisabledStatus(goForward[0], canForward);
   }catch(e){}
}

IeTab.prototype.updateEditMenuItems = function(e) {
   if (e.originalTarget != document.getElementById("menu_EditPopup")) return;
   var ietab = gIeTab.getIeTabElmt();
   if (ietab) {
      gIeTab.updateObjectDisabledStatus("cmd_cut", ietab.canCut);
      gIeTab.updateObjectDisabledStatus("cmd_copy", ietab.canCopy);
      gIeTab.updateObjectDisabledStatus("cmd_paste", ietab.canPaste);
   }
}

IeTab.prototype.updateToolsMenuItem = function(e) {
   if (e.originalTarget != document.getElementById("menu_ToolsPopup")) return;
   var menuitem = document.getElementById("ietab-toolsmenu");
   if (menuitem) {
      var showitem = gIeTab.getBoolPref("extensions.coral.ietab.toolsmenu", true);
      var showicon = gIeTab.getBoolPref("extensions.coral.ietab.toolsmenu.icon", false);
      menuitem.hidden = !showitem;
      menuitem.setAttribute("class", (showicon?menuitem.getAttribute("iconic"):""));
   }
}

IeTab.prototype.updateSecureLockIcon = function() {
	var ietab = gIeTab.getIeTabElmt();
	if (ietab) {
		var securityButton = document.getElementById("security-button");
		if (securityButton) {
      var url = ietab.url;
      const wpl = Components.interfaces.nsIWebProgressListener;
      var state = (gIeTab.startsWith(url, "https://") ? wpl.STATE_IS_SECURE | wpl.STATE_SECURE_HIGH : wpl.STATE_IS_INSECURE);
      window.XULBrowserWindow.onSecurityChange(null, null, state);
      securityButton.setAttribute("label", gIeTab.getUrlHost(ietab.url));
    }
	}
}

IeTab.prototype.updateInterface = function() {
   gIeTab.updateStatusIcon();
   gIeTab.updateToolButton();
   gIeTab.updateBackForwardButtons();
   gIeTab.updateStopReloadButtons();
   gIeTab.updateSecureLockIcon();
   gIeTab.updateUrlBar();
}

IeTab.prototype.updateAll = function() {
   if (gIeTab.updating) return;
   try {
      gIeTab.updating = true;
      gIeTab.updateInterface();
   } finally {
      delete gIeTab.updating;
   }
}

IeTab.prototype.updateProgressStatus = function() {
   var mTabs = gBrowser.mTabContainer.childNodes;
   for(var i = 0 ; i < mTabs.length ; i++) {
      if (mTabs[i].localName == "tab") {
         var ietab = gIeTab.getIeTabElmt(mTabs[i]);
         if (ietab) {
            var aCurTotalProgress = ietab.progress;
            if (aCurTotalProgress != mTabs[i].mProgress) {
               const ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
               const wpl = Components.interfaces.nsIWebProgressListener;
               var aMaxTotalProgress = (aCurTotalProgress == -1 ? -1 : 100);
               var aTabListener = gBrowser.mTabListeners[mTabs[i]._tPos];
               var aWebProgress = mTabs[i].linkedBrowser.webProgress;
               var aRequest = ios.newChannelFromURI(mTabs[i].linkedBrowser.currentURI);
               var aStateFlags = (aCurTotalProgress == -1 ? wpl.STATE_STOP : wpl.STATE_START) | wpl.STATE_IS_NETWORK;
               aTabListener.onStateChange(aWebProgress, aRequest, aStateFlags, 0);
               aTabListener.onProgressChange(aWebProgress, aRequest, 0, 0, aCurTotalProgress, aMaxTotalProgress);
               mTabs[i].mProgress = aCurTotalProgress;
            }
         }
      }
   }
}

IeTab.prototype.onProgressChange = function(progress) {
   if (progress==0) gBrowser.userTypedValue = null;
   gIeTab.updateProgressStatus();
   gIeTab.updateAll();
}

IeTab.prototype.onSecurityChange = function(security) {
   gIeTab.updateSecureLockIcon();
}

IeTab.prototype.goDoCommand = function(cmd) {
	var b = false;
	try {
		if (gBrowser.currentURI && gIeTab.startsWith(gBrowser.currentURI.spec, gIeTab.containerUrl)) {
			var doc = gBrowser.contentDocument;
			if (doc) {
				var ietab = doc.getElementById('IETab');
				if (ietab.wrappedJSObject) ietab = ietab.wrappedJSObject;
				if (ietab && "createEvent" in doc) {
					var msg = {};
					msg.cmd = cmd;
					switch (cmd) {
						case "goBack":
							if (!ietab.canBack) throw 0;
							break;
						case "goForward":
							if (!ietab.canForward) throw 0;
							break;
						case "cmd_cut":
							msg.cmd = "cut";
							break;
						case "cmd_copy":
							msg.cmd = "copy";
							break;
						case "cmd_paste":
							msg.cmd = "paste";
							break;
						case "cmd_selectAll":
							msg.cmd = "selectAll";
							break;
						case "navigate":
						case "navigate2":
						case "refresh":
						case "stop":
						case "saveAs":
						case "print":
						case "printPreview":
						case "printSetup":
						case "cut":
						case "copy":
						case "paste":
						case "selectAll":
						case "find":
						case "viewSource":
						case "focus":
						case "displaySecurityInfo":
						case "handOverFocus":
							msg.cmd = cmd;
							break;
						case "zoom":
							var fullZoom = gIeTab.getBoolPref("browser.zoom.full", false);
							var docViewer = gBrowser.selectedBrowser.markupDocumentViewer;
							msg.cmd = cmd;
							msg.zoomLevel = fullZoom ? docViewer.fullZoom : docViewer.textZoom;
							break;
						default:
							throw 0;
      		}

					var evt = doc.createEvent("MessageEvent");
					evt.initMessageEvent("OverlayCommand", true, false, JSON.stringify(msg), gBrowser.currentURI.spec, 0, window);
					doc.dispatchEvent(evt);
					
					b = true;
				}
			}
		}
	}
	catch(e) {}
	
	if(b) gIeTab.updateAll();
	
	return b;
}

IeTab.prototype.addBookmarkMenuitem = function(e) {
	var popupMenu = e.originalTarget;
	if  (popupMenu.id != "placesContext") return;
	
	var miInt = document.getElementById("ietab-bookmark");
	var miExt = document.getElementById("ietab-bookmark-extapp");
	
	var bmNode  = document.popupNode.node;
	// document.popupNode is deprecated in Gecko 2.0. Use the menupopup property triggerNode instead. 
	if  (!bmNode) bmNode = popupMenu.triggerNode;
	
	var isBookmark  = bmNode && PlacesUtils.nodeIsBookmark(bmNode);
	var isShowIcon  = gIeTab.getBoolPref("extensions.coral.ietab.icon.bookmark", false);
	
	miInt.hidden  = !isBookmark || !gIeTab.getBoolPref("extensions.coral.ietab.bookmark", true);
	miExt.hidden  = !isBookmark || !gIeTab.getBoolPref("extensions.coral.ietab.bookmark.extapp", true);
	if  (!miInt.hidden) {
	    miInt.addEventListener("command", function() {
	        gIeTab.addIeTab(bmNode.uri);
	    }, false);
		miInt.setAttribute("class", (isShowIcon?miInt.getAttribute("iconic"):""));
	}
	if  (!miExt.hidden) {
	    miExt.addEventListener("command", function() {
	        gIeTab.loadInExtApp(bmNode.uri);
	    }, false);
		miExt.setAttribute("class", (isShowIcon?miExt.getAttribute("iconic"):""));
	}
	
	gIeTab.updateContextMenu();
}

IeTab.prototype.closeIeTab = function() {
   var mTabs = gBrowser.mTabContainer.childNodes;
   for(var i = mTabs.length-1 ; i>=0 ; i--) {
      if (mTabs[i].localName == "tab") {
         var ietab = gIeTab.getIeTabElmt(mTabs[i]);
         if (ietab && (ietab.canClose)) {
             window.setTimeout(
                 function() {
                     gIeTab.closeTab()
                 }, 500, i);
         	break;
        }
      }
   }
}

IeTab.prototype.closeTab = function(i) {
	var mTabs = gBrowser.mTabContainer.childNodes;
	gBrowser.removeTab(mTabs[i]);
}

IeTab.prototype.getContextTab = function() {
   return  (gBrowser && gBrowser.mContextTab && (gBrowser.mContextTab.localName == "tab") ? gBrowser.mContextTab : null);
}

IeTab.prototype.viewLink = function(e, flags) {
	if (!gContextMenu) return;
	var url = gIeTab.getContextLinkURL();
	gIeTab.addIeTab(url, flags);
}

IeTab.prototype.viewPage = function(e, flags) {
   var aTab = null;
   switch (e.originalTarget.id) {
   case "ietab-viewpage":
   case "menu_switchEngine":
   case "menu_switchEngine_NoCookie":
   case "menu_switchEngine_SafeMode":
   case "context_switchEngine":
   case "context_switchEngine_NoCookie":
   case "context_switchEngine_SafeMode":
      aTab = gBrowser.mCurrentTab;
      break;
   case "ietab-tabbar-switch":
      aTab = gIeTab.getContextTab();
      break;
   }
   if (!aTab) return;
   
   gIeTab.switchTabEngine(aTab, gIeTab.getBoolPref("extensions.coral.ietab.alwaysNewTab", false), flags);
}

IeTab.prototype.updateTabbarMenu = function(e) {
   if (e.originalTarget != gBrowser.mStrip.firstChild.nextSibling) return;

   var aTab = gIeTab.getContextTab();
   var hide = (aTab == null);

   var internal = gIeTab.getBoolPref("extensions.coral.ietab.tabsmenu", true);
   var external = gIeTab.getBoolPref("extensions.coral.ietab.tabsmenu.extapp", true);
   var showicon = gIeTab.getBoolPref("extensions.coral.ietab.icon.tabsmenu", false);

   var menuitem = null;

   //switch
   menuitem = document.getElementById("ietab-tabbar-switch");
   menuitem.hidden = hide || !internal;
   menuitem.setAttribute("class", (showicon?menuitem.getAttribute("iconic"):""));

   //extapp
   menuitem = document.getElementById("ietab-tabbar-extapp");
   menuitem.hidden = hide || !external;
   menuitem.setAttribute("class", (showicon?menuitem.getAttribute("iconic"):""));

   //sep
   menuitem = document.getElementById("ietab-tabbar-sep");
   menuitem.hidden = hide || (!internal && !external);

   if (aTab) {
      var ietab = gIeTab.getIeTabElmt(aTab);
      document.getElementById("ietab-tabbar-switch").setAttribute("engine", (ietab ? "ie" : "fx"));
   }
   
   gIeTab.updateContextMenu();
}

IeTab.prototype.statusbarContextMenuPopup = function() {
	var b = (gIeTab.getIeTabElmt() != null) || (gIeTab.getStrPref("extensions.coral.ietab.mode","")!="advanced") || !gIeTab.getBoolPref("extensions.coral.ietab.cookieSync");
	var showicon = gIeTab.getBoolPref("extensions.coral.ietab.icon.pagelink", false);	
	var menuitem = null;
	menuitem = document.getElementById("menu_switchEngine_NoCookie");
	if ( menuitem ) {
		menuitem.setAttribute("class", (showicon ? menuitem.getAttribute("iconic") : ""));
		menuitem.setAttribute("disabled", b);
	}
	menuitem = document.getElementById("menu_switchEngine_SafeMode");
	if ( menuitem ) {
		menuitem.setAttribute("class", (showicon ? menuitem.getAttribute("iconic") : ""));
		menuitem.setAttribute("disabled", b);
	}
	
	gIeTab.updateContextMenu();
}

IeTab.prototype.createTabbarMenu = function() {
   var tabbarMenu = gBrowser.mStrip.firstChild.nextSibling;
   var menuitems = tabbarMenu.childNodes;
   var separator = null;
   for(var i=0, c=0 ; i < menuitems.length-1 ; i++) {
      if (menuitems[i].localName=="menuseparator")
         if (++c==2) { separator=menuitems[i]; break; }
   }
   tabbarMenu.insertBefore(document.getElementById("ietab-tabbar-sep"), separator);
   tabbarMenu.insertBefore(document.getElementById("ietab-tabbar-switch"), separator);
   tabbarMenu.insertBefore(document.getElementById("ietab-tabbar-extapp"), separator);
}

IeTab.prototype.updateContextMenu = function() {
	var extAppName = gIeTab.getExtAppName(gIeTab.getStrPref("extensions.coral.ietab.extAppPath", ""));
	if ( extAppName != "" ) {
		var txt = gIeTab.GetLocalizedString("popup_viewpage_extapp");
		if ( txt && ( txt != "" ) ) {
			var menuitem = document.getElementById('ietab-viewpage-extapp');
			if (menuitem) menuitem.setAttribute("label", txt.replace("%s", extAppName));
			menuitem = document.getElementById('context_ietab-viewpage-extapp');
			if (menuitem) menuitem.setAttribute("label", txt.replace("%s", extAppName));
		}
		
		txt = gIeTab.GetLocalizedString("popup_viewlink_extapp");
		if ( txt && ( txt != "" ) ) {
			var menuitem = document.getElementById('ietab-viewpage-extapp');
			if (menuitem) menuitem.setAttribute("label", txt.replace("%s", extAppName));
			menuitem = document.getElementById('link_ietab-viewpage-extapp');
			if (menuitem) menuitem.setAttribute("label", txt.replace("%s", extAppName));
		}
		
		txt = gIeTab.GetLocalizedString("popup_bookmark_extapp");
		if ( txt && ( txt != "" ) ) {
			var menuitem = document.getElementById("ietab-bookmark-extapp");
			if ( menuitem ) menuitem.setAttribute("label", txt.replace("%s", extAppName));
		}
		
		txt = gIeTab.GetLocalizedString("popup_tabbar_extapp");
		if ( txt && ( txt != "" ) ) {
			var menuitem = document.getElementById("ietab-tabbar-extapp");
			if ( menuitem) menuitem.setAttribute("label", txt.replace("%s", extAppName));
		}
	}
}

IeTab.prototype.focusIeTab = function() {
   gIeTab.goDoCommand("focus");
}

IeTab.prototype.onTabSelected = function(e) {
	switch (e.originalTarget.localName) {
		case "tabs":	// FF 2.x ~ FF 3.x will receive messages from both tabs and tabpanels, but handling messages in tabpanels has no effect
		case "tabpanels":	// FF 4.0 will only receive from tabpanels
			gIeTab.updateAll();
			window.setTimeout(
                function() {
                    gIeTab.focusIeTab()
                }, 0);
		break;
	}
}

IeTab.prototype.assignJSObject = function(aDoc) {
   if (aDoc instanceof HTMLDocument) {
      var aBrowser = getBrowser().getBrowserForDocument(aDoc);
      if (aBrowser && aBrowser.currentURI && gIeTab.startsWith(aBrowser.currentURI.spec, gIeTab.containerUrl)) {
         if (aDoc && aDoc.getElementById('IETab')) {
            var ietab = aDoc.getElementById('IETab');
            if (ietab.wrappedJSObject) ietab = ietab.wrappedJSObject;
            ietab.requestTarget = gIeTab;
            ietab.tabId = aBrowser.parentNode.id;
         }
      }
   }
}

IeTab.prototype.onPageShowOrLoad = function(e) {
   // window.setTimeout(gIeTab.assignJSObject, 0, e.target);
   gIeTab.updateAll();
}

IeTab.prototype.onResize = function(e) {
	gIeTab.goDoCommand("zoom");
}

IeTab.prototype.getCurrentIeTabURI = function(aBrowser) {
   try {
      var docShell = aBrowser.boxObject.QueryInterface(Components.interfaces.nsIBrowserBoxObject).docShell;
      var wNav = docShell.QueryInterface(Components.interfaces.nsIWebNavigation);
      if (wNav.currentURI && gIeTab.startsWith(wNav.currentURI.spec, gIeTab.containerUrl)) {
         var ietab = wNav.document.getElementById("IETab");
         if (ietab) {
            if (ietab.wrappedJSObject) ietab = ietab.wrappedJSObject;
            var url = ietab.url;
            if (url) {
               const ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
               return ios.newURI(gIeTab.containerUrl + ietab.flags + ',' + encodeURI(url), null, null);
            }
         }
      }
   } catch(e) {}
   return null;
}

IeTab.prototype.hookBrowserGetter = function(aBrowser) {
   if (aBrowser.localName != "browser") aBrowser = aBrowser.getElementsByTagNameNS(kXULNS, "browser")[0];
   // hook aBrowser.currentURI
   gIeTab.hookProp(aBrowser, "currentURI", function() {
      var uri = gIeTab.getCurrentIeTabURI(this);
      if (uri) return uri;
   });
   // hook aBrowser.sessionHistory
   gIeTab.hookProp(aBrowser, "sessionHistory", function() {
      var history = this.webNavigation.sessionHistory;
      var uri = gIeTab.getCurrentIeTabURI(this);
      if (uri) {
         var entry = history.getEntryAtIndex(history.index, false);
         if (entry.URI.spec != uri.spec) {
            entry.QueryInterface(Components.interfaces.nsISHEntry).setURI(uri);
            if (this.parentNode.__SS_data) delete this.parentNode.__SS_data;
         }
      }
   });
}

IeTab.prototype.hookURLBarSetter = function(aURLBar) {
	if (!aURLBar) aURLBar = document.getElementById("urlbar");
	if (!aURLBar) return;
	aURLBar.onclick = function(e) {
		var ietab = gIeTab.getIeTabElmt();
		if (ietab) {
			gIeTab.goDoCommand("handOverFocus");
		}
	}
	gIeTab.hookProp(aURLBar, "value", null, function() {
		this.isModeIE = arguments[0] && (arguments[0].substr(0, gIeTab.containerUrl.length) == gIeTab.containerUrl);
		if (this.isModeIE) {
			arguments[0] = gIeTab.getIeTabTrimURL(arguments[0]);
			// if (arguments[0] == "about:blank") arguments[0] = "";
		}
	});
}

IeTab.prototype.checkFilter = function(aBrowser, aRequest, aLocation) {
	if (aBrowser.getAttribute(gIeTab.browserAttr)) {
		aBrowser.removeAttribute(gIeTab.browserAttr);
	}
}

IeTab.prototype.checkAdblock = function(contentType, url, node) {
	const kAdblockPlusCID_v1_2 = "@mozilla.org/adblockplus;1";
	const kAdblockPlusCID_v1_3 = "@adblockplus.org/abp/policy;1";
	var contentPolicy = null;
	if ( kAdblockPlusCID_v1_2 in Components.classes ) {
		contentPolicy = Components.classes[kAdblockPlusCID_v1_2].getService(Components.interfaces.nsIContentPolicy);
	}
	else {
		if ( kAdblockPlusCID_v1_3 in Components.classes ) {
			contentPolicy = Components.classes[kAdblockPlusCID_v1_3].getService(Components.interfaces.nsIContentPolicy);
		}
	}
	
	if (contentPolicy) {
		const ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
		var contentLocation = ios.newURI(url, null, null);
		return contentPolicy.shouldLoad(contentType, contentLocation, null, node, null, null);
	}
	else {
		return true;
	}
}

IeTab.prototype.hookCodeAll = function() {
   //hook properties
   gIeTab.hookBrowserGetter(gBrowser.mTabContainer.firstChild.linkedBrowser);
   gIeTab.hookURLBarSetter(gURLBar);

   //hook functions
   gIeTab.hookCode("gFindBar._onBrowserKeypress", "this._useTypeAheadFind &&", "$& !gIeTab.isIeEngine() &&");
   gIeTab.hookCode("PlacesCommandHook.bookmarkPage", "aBrowser.currentURI", "makeURI(gIeTab.getIeTabTrimURL($&.spec))");
   gIeTab.hookCode("PlacesStarButton.updateState", /(gBrowser|getBrowser\(\))\.currentURI/, "makeURI(gIeTab.getIeTabTrimURL($&.spec))");
   gIeTab.hookCode("gBrowser.addTab", "return t;", "gIeTab.hookBrowserGetter(t.linkedBrowser); $&");
   gIeTab.hookCode("nsBrowserAccess.prototype.openURI", " loadflags = isExternal ?", " loadflags = false ?");
   gIeTab.hookCode("gBrowser.setTabTitle", "if (browser.currentURI.spec) {", "$& if (browser.currentURI.spec.indexOf(gIeTab.containerUrl) == 0) return;");
   gIeTab.hookCode("URLBarSetURI", "getWebNavigation()", "getBrowser()");
   gIeTab.hookCode("getShortcutOrURI", /return (\S+);/g, "return gIeTab.getHandledURL($1);");
   if (gURLBar.handleCommand) gIeTab.hookCode("gURLBar.handleCommand", "this.value = url;", "url = gIeTab.getHandledURL(url); $&"); //fx3.1
   else gIeTab.hookCode("BrowserLoadURL", "url = gURLBar.value;", "url = gIeTab.getHandledURL(gURLBar.value);"); //fx3.0
   gIeTab.hookCode('gBrowser.mTabProgressListener', "function (aWebProgress, aRequest, aLocation) {", "$& gIeTab.checkFilter(this.mBrowser, aRequest, aLocation);");
   for(var i=0 ; i<gBrowser.mTabListeners.length ; i++)
      gIeTab.hookCode("gBrowser.mTabListeners["+i+"].onLocationChange", /{/, "$& gIeTab.checkFilter(this.mBrowser, aRequest, aLocation);");

   //hook Interface Commands
   gIeTab.hookCode("BrowserBack", /{/, "$& if(gIeTab.goDoCommand('goBack')) return;");
   gIeTab.hookCode("BrowserForward", /{/, "$& if(gIeTab.goDoCommand('goForward')) return;");
   gIeTab.hookCode("BrowserStop", /{/, "$& if(gIeTab.goDoCommand('stop')) return;");
   gIeTab.hookCode("BrowserReload", /{/, "$& if(gIeTab.goDoCommand('refresh')) return;");
   gIeTab.hookCode("BrowserReloadSkipCache", /{/, "$& if(gIeTab.goDoCommand('refresh')) return;");

   gIeTab.hookCode("saveDocument", /{/, "$& if(gIeTab.goDoCommand('saveAs')) return;");
   gIeTab.hookCode("BrowserViewSourceOfDocument", /{/, "$& if(gIeTab.goDoCommand('viewSource')) return;");
   gIeTab.hookCode("MailIntegration.sendMessage", /{/, "$& var ietab = gIeTab.getIeTabElmt(); if(ietab){ arguments[0]=ietab.url; arguments[1]=ietab.title; }");

   gIeTab.hookCode("PrintUtils.print", /{/, "$& if(gIeTab.goDoCommand('print')) return;");
   gIeTab.hookCode("PrintUtils.showPageSetup", /{/, "$& if(gIeTab.goDoCommand('printSetup')) return;");
   gIeTab.hookCode("PrintUtils.printPreview", /{/, "$& if(gIeTab.goDoCommand('printPreview')) return;");

   gIeTab.hookCode("goDoCommand", /{/, "$& if(gIeTab.goDoCommand(arguments[0])) return;");

   gIeTab.hookAttr("cmd_find", "oncommand", "if(gIeTab.goDoCommand('find')) return;");
   gIeTab.hookAttr("cmd_findAgain", "oncommand", "if(gIeTab.goDoCommand('find')) return;");
   gIeTab.hookAttr("cmd_findPrevious", "oncommand", "if(gIeTab.goDoCommand('find')) return;");

   gIeTab.hookCode("displaySecurityInfo", /{/, "$& if(gIeTab.goDoCommand('displaySecurityInfo')) return;");
}

IeTab.prototype.addEventAll = function() {
   gIeTab.addEventListener(window, "DOMContentLoaded", gIeTab.onPageShowOrLoad);
   gIeTab.addEventListener(window, "pageshow", gIeTab.onPageShowOrLoad);
   gIeTab.addEventListener(window, "resize", gIeTab.onResize);

   gIeTab.addEventListener(gBrowser.mStrip.firstChild.nextSibling, "popupshowing", gIeTab.updateTabbarMenu);
   gIeTab.addEventListener("appcontent", "select", gIeTab.onTabSelected);

   gIeTab.addEventListener("goPopup", "popupshowing", gIeTab.updateGoMenuItems);
   gIeTab.addEventListener("placesContext", "popupshowing", gIeTab.addBookmarkMenuitem);
   gIeTab.addEventListener("menu_EditPopup", "popupshowing", gIeTab.updateEditMenuItems);
   gIeTab.addEventListener("menu_ToolsPopup", "popupshowing", gIeTab.updateToolsMenuItem);
   gIeTab.addEventListener("contentAreaContextMenu", "popupshowing", gIeTab.ietabContextMenuPopup);
   
   gIeTab.addEventListener(window, "ContainerMessage", gIeTab.onContainerMessage);
   
   // Bug #23666
   if (gIeTab.isVersionOlderThan("4.0b6")) gIeTab.addEventListener(gBrowser.tabContainer, "TabOpen", gIeTab.onNewTab);
}

// Bug #23666
// 正常情况下，IContentPolicy::shouldLoad 首先被调用，然后才会有 TabOpen 的消息
// 但是如果是从桌面打开一个链接进入到 Firefox，那么是先有 TabOpen 消息，然后才有 shouldLoad
// 所以下面注册的 EventListener 只对 #23666 的情形有效，不影响原来的逻辑
IeTab.prototype.onNewTab = function(e) {
	var aTab = e.originalTarget;
	var browser = aTab.linkedBrowser;
	if (browser) {
		var _window = browser.contentWindow;
		if (_window) {
			_window.addEventListener("IeTabWatchCommand", function(e) {
				var wnd = e.originalTarget;
				var url = e.data;
				if (gIeTab.isValidURL(url)) {
					wnd.location.href = e.data;
				}
			}, false);
		}
	}
}

IeTab.prototype.removeEventAll = function() {
   gIeTab.removeEventListener(window, "DOMContentLoaded", gIeTab.onPageShowOrLoad);
   gIeTab.removeEventListener(window, "pageshow", gIeTab.onPageShowOrLoad);
   gIeTab.removeEventListener(window, "resize", gIeTab.onResize);

   gIeTab.removeEventListener(gBrowser.mStrip.firstChild.nextSibling, "popupshowing", gIeTab.updateTabbarMenu);
   gIeTab.removeEventListener("appcontent", "select", gIeTab.onTabSelected);

   gIeTab.removeEventListener("goPopup", "popupshowing", gIeTab.updateGoMenuItems);
   gIeTab.removeEventListener("placesContext", "popupshowing", gIeTab.addBookmarkMenuitem);
   gIeTab.removeEventListener("menu_EditPopup", "popupshowing", gIeTab.updateEditMenuItems);
   gIeTab.removeEventListener("menu_ToolsPopup", "popupshowing", gIeTab.updateToolsMenuItem);
   gIeTab.removeEventListener("contentAreaContextMenu", "popupshowing", gIeTab.ietabContextMenuPopup);

   gIeTab.removeEventListener(window, "load", gIeTab.init);
   gIeTab.removeEventListener(window, "unload", gIeTab.destroy);
   
   gIeTab.removeEventListener(gBrowser.tabContainer, "TabOpen", gIeTab.onNewTab);
}

IeTab.prototype.init = function() {
    gIeTab.migratePrefs();
	gIeTab.hookCodeAll();
	gIeTab.addEventAll();
	gIeTab.createTabbarMenu();
	gIeTab.updateContextMenu();
	
	if (gIeTab.getStrPref("extensions.coral.ietab.mode","").length == 0) {
		gIeTab.installToolbarButton();
		gIeTab.openPrefDialog();
	}
	
	gIeTab.checkWhatsNew();
}

IeTab.prototype.migratePrefs = function() {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefBranch);

    var oldBranchName = "coral.ietab.";
    var newBranchName = "extensions.coral.ietab.";

    var oldBranch = prefs.getBranch(oldBranchName);
    var children = oldBranch.getChildList("", {});

    if(children.length == 0) {
        return;
    }

    for (var i = 0; i < children.length; i++) {
        var prefName = children[i];

        if(!oldBranch.prefHasUserValue(prefName)) {
            continue;
        }

        var prefType = oldBranch.getPrefType(prefName);
        var oldPrefName = oldBranchName + prefName;
        var newPrefName = newBranchName + prefName;

        if(prefType == prefs.PREF_STRING) {
            this.setStrPref(newPrefName, this.getStrPref(oldPrefName));
        }
        else if(prefType == prefs.PREF_INT) {
            this.setIntPref(newPrefName, this.getIntPref(oldPrefName));
        }
        else if(prefType == prefs.PREF_BOOL) {
            this.setBoolPref(newPrefName, this.getBoolPref(oldPrefName));
        }
    }

    oldBranch.deleteBranch("");
}

IeTab.prototype.destroy = function() {
   gIeTab.removeEventAll();
   delete gIeTab;
}

IeTab.prototype.checkWhatsNew = function() {
	const kExtensionManagerCID = "@mozilla.org/extensions/manager;1";
	if (kExtensionManagerCID in Components.classes) {
		var extmgr = Components.classes[kExtensionManagerCID].getService(Components.interfaces.nsIExtensionManager);
		if (extmgr) {
			var ietab = extmgr.getItemForID("coralietab@mozdev.org");
			if (ietab) {
				var oldver = gIeTab.getStrPref("extensions.coral.ietab.version", "");
				if (ietab.version > oldver) {
					gIeTab.setStrPref("extensions.coral.ietab.version", ietab.version);
					window.setTimeout(
                        function() {
                            gIeTab.browse();
                        }, 1000, "http://coralietab.mozdev.org/whatsnew.php?cli=o&v="+ietab.version);
				}
			}
		}
	}
	else {
		Components.utils.import("resource://gre/modules/AddonManager.jsm");
		AddonManager.getAddonByID("coralietab@mozdev.org", function(aAddon) {
			var oldver = gIeTab.getStrPref("extensions.coral.ietab.version", "");
			if (aAddon.version > oldver) {
				gIeTab.setStrPref("extensions.coral.ietab.version", aAddon.version);
				window.setTimeout(
                    function() {
                        gIeTab.browse()
                    }, 1000, "http://coralietab.mozdev.org/whatsnew.php?cli=o&v="+aAddon.version);
			}
		});  
	}
}

IeTab.prototype.browse = function(url, feature) {
	var windowMediator = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
	if (windowMediator ) {
		var w = windowMediator.getMostRecentWindow('navigator:browser');
    	if ( w && !w.closed ) {
      		var browser = w.getBrowser();
      		var b = (browser.selectedTab = browser.addTab()).linkedBrowser;
          	b.stop();
          	b.webNavigation.loadURI(url, Components.interfaces.nsIWebNavigation.FLAGS_NONE, null, null, null);
    	} else {
      		window.open(url, "_blank", features || null)
    	}
	}
}

IeTab.prototype.onContainerMessage = function(event)
{
	var msg;
	try { msg = JSON.parse(event.data); } catch (e) {}
	if (msg) {
		switch(msg.message)
		{
		case "newTab":
			{
				if (gIeTab.isValidURL(msg.url))
				{
					gIeTab.addIeTab(msg.url, msg.flags);
				}
				
				break;
			}
		case "openNewWindow":
			{
				var url = msg.url;
				if (gIeTab.isValidURL(msg.url)) {
					url = gIeTab.getIeTabURL(url, 0);
					var name = msg.name;
					var features = msg.features;
					// 直接用 window.open 打开的窗口会被盖在后面，没办法，只好先把它弄成 topmost 窗口，然后再取消 topmost
					if (features && features.length > 0) {
						features = features.replace(/\s/g, '').replace(/\bstatus=(false|no|0),/, '').replace(/\blocation=(false|no|0),/, '') + ",status=1,location=1,alwaysRaised=1";
						var childwin = window.open(url, name, features);
						if (childwin) {
							// 取消 topmost
							try {
								var chrome = childwin.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
											.getInterface(Components.interfaces.nsIWebNavigation)
											.QueryInterface(Components.interfaces.nsIDocShellTreeItem)
											.treeOwner
											.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
											.getInterface(Components.interfaces.nsIXULWindow);
								if (chrome) {
									window.setTimeout( function() { chrome.zLevel = Components.interfaces.nsIXULWindow.normalZ; }, 2000);
								}
							}
							catch(e) {}
						}
					}
					else {
						window.open(url, name);
					}
				}
				break;
			}
		case "onProgressChange":
			{
				gIeTab.onProgressChange(msg.progress);
				break;
			}
		case "onSecurityChange":
			{
				gIeTab.onSecurityChange(msg.security);
				break;
			}
		case "closeIeTab":
			{
				gIeTab.closeIeTab();
				break;
			}
		case "notifyAdBlock":
			{
				var url = msg.url;
				if (gIeTab.isValidURL(url))
				{
					var contentType = msg.contentType;
					var blocked = msg.block;
					var ietab = gBrowser.contentDocument.getElementById('adblock');
					if ( gIeTab.checkAdblock(contentType, url, ietab) == blocked )
					{
						// gIeTab.mlog("Adblock: " + url);
					}
				}
				
				break;
			}
		}
	}
}

IeTab.prototype.installToolbarButton = function() {
	var tb = document.getElementById("ietab-button");
	if (tb && tb.parentNode.localName != "toolbarpalette")
			return;
	var toolbar = this.getDefaultToolbar();
	if (!toolbar || typeof toolbar.insertItem != "function")
		return;
	
	var insertBefore = (this.toolbarInsertBefore ? this.toolbarInsertBefore() : null);
	if (insertBefore && insertBefore.parentNode != toolbar)
		insertBefore = null;

	toolbar.insertItem("ietab-button", insertBefore, null, false);

	toolbar.setAttribute("currentset", toolbar.currentSet);
	document.persist(toolbar.id, "currentset");
	
	if (this.unhideToolbar && this.unhideToolbar())
	{
		toolbar.setAttribute("collapsed", "false");
		document.persist(toolbar.id, "collapsed");
		
		gIeTab.setBoolPref("extensions.coral.ietab.statusbar", false);
		this.updateStatusIcon();
	}
}

IeTab.prototype.getDefaultToolbar = function() {
	return document.getElementById('addon-bar') || document.getElementById('nav-bar');
}

IeTab.prototype.unhideToolbar = function() {
	return document.getElementById('addon-bar');
}

var gIeTab = new IeTab();

gIeTab.addEventListener(window, "load", gIeTab.init);
gIeTab.addEventListener(window, "unload", gIeTab.destroy);
gIeTab.browserAttr = "ietabManualSwitch";
gIeTab.containerUrl = "chrome://coralietab/content/container.html?url=";
