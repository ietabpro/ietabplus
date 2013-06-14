/*
 * Copyright (c) 2005 yuoo2k <yuoo2k@gmail.com>
 *               2010 quaful <quaful@msn.com>
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 */

const gIeTabChromeStr = "chrome://coralietab/content/container.html?url=";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");

function _dump(aMessage) {
  var consoleService = Cc["@mozilla.org/consoleservice;1"].getService(Ci.nsIConsoleService);
  consoleService.logStringMessage("[IE Tab Plus]" + aMessage);
}

/**
 * Gets the DOM window associated with a particular request (if any).
 */
function getRequestWindow(/**nsIChannel*/ channel) /**nsIDOMWindow*/
{
	let callbacks = [];
	if (channel.notificationCallbacks)
		callbacks.push(channel.notificationCallbacks);
	if (channel.loadGroup && channel.loadGroup.notificationCallbacks)
		callbacks.push(channel.loadGroup.notificationCallbacks);

	for each (let callback in callbacks)
	{
		try {
			// For Gecko 1.9.1
			return callback.getInterface(Ci.nsILoadContext).associatedWindow;
		} catch(e) {}

		try {
			// For Gecko 1.9.0
			return callback.getInterface(Ci.nsIDOMWindow);
		} catch(e) {}
	}

	return null;
}


// IeTabWatcher object
var IeTabWatcher = {
   isIeTabURL: function(url) {
      if (!url) return false;
      return (url.substr(0, gIeTabChromeStr.length) == gIeTabChromeStr);
   },
   
   getIeTabURL: function(url, flags) {
      if (this.isIeTabURL(url)) return url;
      if (/^file:\/\/.*/.test(url)) try { url = "file:///" + decodeURI(url).substring(8).replace(/\//g, "\\"); }catch(e){}
      return gIeTabChromeStr + flags + "," + encodeURI(url);
   },

   getBoolPref: function(prefName, defval) {
      var result = defval;
      var prefservice = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
      var prefs = prefservice.getBranch("");
      if (prefs.getPrefType(prefName) == prefs.PREF_BOOL) {
          try { result = prefs.getBoolPref(prefName); }catch(e){}
      }
      return(result);
   },

   getStrPref: function(prefName, defval) {
      var result = defval;
      var prefservice = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
      var prefs = prefservice.getBranch("");
      if (prefs.getPrefType(prefName) == prefs.PREF_STRING) {
          try { result = prefs.getComplexValue(prefName, Ci.nsISupportsString).data; }catch(e){}
      }
      return(result);
   },

   setStrPref: function(prefName, value) {
      var prefservice = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
      var prefs = prefservice.getBranch("");
      var sString = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
      sString.data = value;
      try { prefs.setComplexValue(prefName, Ci.nsISupportsString, sString); } catch(e){}
   },

   isFilterEnabled: function() {
      return (this.getBoolPref("extensions.coral.ietab.filter", true));
   },

   getPrefRuleList: function() {
	var s = this.getStrPref("extensions.coral.ietab.rulelist", null);
	if(s) {
		return JSON.parse(s);
	}
	else {
		return null;
	}
   },

   setPrefFilterList: function(list) {
      this.setStrPref("extensions.coral.ietab.filterlist", list.join(" "));
   },

   isMatchURL: function(url, pattern) {
      if ((!pattern) || (pattern.length==0)) return false;
      var retest = /^\/(.*)\/$/.exec(pattern);
      if (retest) {
         pattern = retest[1];
      } else {
         pattern = pattern.replace(/\\/g, "/");
         var m = pattern.match(/^(.+:\/\/+[^\/]+\/)?(.*)/);
         m[1] = (m[1] ? m[1].replace(/\./g, "\\.").replace(/\?/g, "[^\\/]?").replace(/\*/g, "[^\\/]*") : "");
         m[2] = (m[2] ? m[2].replace(/\./g, "\\.").replace(/\+/g, "\\+").replace(/\?/g, "\\?").replace(/\*/g, ".*") : "");
         pattern = m[1] + m[2];
         pattern = "^" + pattern.replace(/\/$/, "\/.*") + "$";
      }
      var reg = new RegExp(pattern.toLowerCase());
      return (reg.test(url.toLowerCase()));
   },

	// Return value < 0 means bypass, other value is action flags
	checkUrlAction: function(url) {
		var aList = this.getPrefRuleList();
		for (var i=0; i<aList.length; i++) {
			var pos = aList[i].indexOf(',');
			if (pos > 0) {
				var flags = parseInt(aList[i].substr(0,pos));
				var rule = aList[i].substr(pos+1);
				
				var enabled = ((flags & 0x8000) == 0);			// The highest bit == 1 means disabled
				if (enabled && this.isMatchURL(url, rule)) return flags;
			}
		}
		
		return -1;
   },

   getTopWinBrowser: function() {
      try {
         var winMgr = Cc['@mozilla.org/appshell/window-mediator;1'].getService();
         var topWin = winMgr.QueryInterface(Ci.nsIWindowMediator).getMostRecentWindow("navigator:browser");
         var mBrowser = topWin.document.getElementById("content");
         return mBrowser;
      } catch(e) {}
      return null;
   },
   
  isFirefox: function() {
		const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
		var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
		return (appInfo.ID == FIREFOX_ID);
  },
  
  isVersionOlderThan: function(v) {
		var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);
		var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
		return (versionChecker.compare(appInfo.version, v) >= 0);
  },
}

const ietabplus = {
	classDescription: "IE Tab Plus Component",
  classID: Components.ID('{3fdaa104-5988-4050-94fc-c711d568fe64}'),
  contractID: "@mozilla.org/ietabwatch;1",
	_xpcom_factory: {
		createInstance: function(outer, iid)
		{
			if (outer) throw Cr.NS_ERROR_NO_AGGREGATION;

			return ietabplus.QueryInterface(iid);
		}
	},
	_xpcom_categories: [{category: "content-policy"}, {category: "net-channel-event-sinks"}],

	QueryInterface: function(iid)
	{
		// Note: do not use |this| in this method! It is being used in the
		// content policy component as well.
		
		if (iid.equals(Ci.nsIContentPolicy) || iid.equals(Ci.nsIChannelEventSink))
			return IeTabWatchFactoryClass;

		throw Cr.NS_ERROR_NO_INTERFACE;
	},
}

// ContentPolicy class
var IeTabWatchFactoryClass = {
  checkFilter: function(url) {
    if (IeTabWatcher.isIeTabURL(url)) return -1;
    if (!IeTabWatcher.isFilterEnabled()) return -1;
    return IeTabWatcher.checkUrlAction(url);
  },
  
	// nsIContentPolicy interface implementation
	shouldLoad: function(contentType, contentLocation, requestOrigin, requestingNode, mimeTypeGuess, extra) {
		if (contentType == Ci.nsIContentPolicy.TYPE_DOCUMENT) {
			var node = requestingNode ? requestingNode.QueryInterface(Ci.nsIDOMNode) : null;
			if (node && (!node.getAttribute("ietabManualSwitch"))) {
				var url = contentLocation.spec;
				var r = this.checkFilter(url);
				if (r>=0) {
					// 从 Firefox 3.6 开始，如果当前加载的是 file:// 协议，用 contentLocation.spec 重定向到 chrome:// 协议时，会出现错误：
					// No chrome package registered for chrome:///content/container.html?url=0,file:///<url>
					// 所以只好用下面的办法绕过去
					if (contentLocation.schemeIs("file")) {
						requestingNode.contentWindow.location.href = IeTabWatcher.getIeTabURL(url, r);
						// 返回 REJECT_SERVER 取消掉这次请求，否则如果是 MHT 之类的文件，Firefox 会弹出保存文件的对话框
						return Ci.nsIContentPolicy.REJECT_SERVER;
					}
					else {
						var filterUrl = IeTabWatcher.getIeTabURL(url, r);
						contentLocation.spec = filterUrl;
						if ( IeTabWatcher.isFirefox() && IeTabWatcher.isVersionOlderThan("4.0b6") ) {
							// Bug #23666：如果已经打开 Firefox 了，在 Windows 中双击一个需要转换到 IE 的 URL 的快捷方式，那么 Firefox 会首先打开一个新标签页，然后才调用到 shouldLoad，这个时候给 contentLocation.spec 赋值没有效果
							// 解决办法：发一个消息到新标签页，通知需要切换页面
							var _window = requestingNode.contentWindow;
							if (_window) {
								var evt = _window.document.createEvent("MessageEvent");
								evt.initMessageEvent("IeTabWatchCommand", true, true, filterUrl, url, 0, _window);
								_window.dispatchEvent(evt);
							}
						}
					}
				}
			}
		}
		
		return Ci.nsIContentPolicy.ACCEPT;
	},
	
  // this is now for urls that directly load media, and meta-refreshes (before activation)
  shouldProcess: function(contentType, contentLocation, requestOrigin, requestingNode, mimeType, extra) {
    return (Ci.nsIContentPolicy.ACCEPT);
  },
  
  // Old (Gecko 1.9.x) version
	onChannelRedirect: function(oldChannel, newChannel, flags)
	{
		try {
			let oldLocation = null;
			let newLocation = null;
			try {
				oldLocation = oldChannel.originalURI.spec;
				newLocation = newChannel.URI.spec;
			}
			catch(e2) {}

			if (!oldLocation || !newLocation || oldLocation == newLocation)
				return;
				
			let context = getRequestWindow(newChannel);
			if (context) {
				if (context.location.href.substring(0, 7)!="chrome:") {
					var r = this.checkFilter(newLocation);
					if ( r >= 0 ) {
						context.location.href = IeTabWatcher.getIeTabURL(newLocation, r);
						throw Cr.NS_BASE_STREAM_WOULD_BLOCK;
					}
				}
			}
		}
		catch (e if (e != Cr.NS_BASE_STREAM_WOULD_BLOCK))
		{
			// We shouldn't throw exceptions here - this will prevent the redirect.
			_dump("Unexpected error in ietabplus.onChannelRedirect: " + e + "\n");
		}
	},

	// New (Gecko 2.0) version
	asyncOnChannelRedirect: function(oldChannel, newChannel, flags, callback)
	{
		this.onChannelRedirect(oldChannel, newChannel, flags);

		// If onChannelRedirect didn't throw an exception indicate success
		callback.onRedirectVerifyCallback(Cr.NS_OK);
	},

  get wrappedJSObject() {
    return this;
  },
  
  QueryInterface : ietabplus.QueryInterface
}

function IeTabWatchComponent() {}
IeTabWatchComponent.prototype = ietabplus;

if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([IeTabWatchComponent]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule([IeTabWatchComponent]);
