/* ***** BEGIN LICENSE BLOCK *****
 * Version: GPL 3.0
 *
 * The contents of this file are subject to the General Public License
 * 3.0 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.gnu.org/licenses/gpl.html
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * Author: Michel Verbraak (info@1st-setup.nl)
 * Website: http://www.1st-setup.nl/
 *
 * This interface can be used to for updates
 *
 * ***** BEGIN LICENSE BLOCK *****/

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cu = Components.utils;
var Cr = Components.results;
var components = Components;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");

function installListener(aUpdater)
{
	this._updater = aUpdater;
}

installListener.prototype = {

	prompts: Cc["@mozilla.org/embedcomp/prompt-service;1"].  
			getService(Ci.nsIPromptService),

	onNewInstall: function _onNewInstall(aInstall)
	{
		//dump("installListener: onNewInstall\n");
	},

	onDownloadStarted: function _onDownloadStarted(aInstall)
	{
		//dump("installListener: onDownloadStarted\n");
	},

	onDownloadProgress: function _onDownloadProgress(aInstall)
	{
		//dump("installListener: onDownloadProgress: "+aInstall.progress+" of "+aInstall.maxProgress+"\n");
	},

	onDownloadEnded: function _onDownloadEnded(aInstall)
	{
		//dump("installListener: onDownloadEnded\n");
	},

	onDownloadCancelled: function _onDownloadCancelled(aInstall)
	{
		//dump("installListener: onDownloadCancelled\n");
		this.stopListener(aInstall);
		this.prompts.alert(null, "Addon update canceled", "Download of addon has been canceled by user."); 
	},

	onDownloadFailed: function _onDownloadFailed(aInstall)
	{
		//dump("installListener: onDownloadFailed\n");
		this.stopListener(aInstall);
		this.prompts.alert(null, "Addon update failed", "Download of addon failed. Error: "+aInstall.error); 
	},

	onInstallStarted: function _onInstallStarted(aInstall)
	{
		//dump("installListener: onInstallStarted\n");
	},

	stopListener: function _stopListener(aInstall)
	{
		if (this._updater.installListener) {
			//dump("stopListener: Going to stop listener.\n");
			aInstall.removeListener(this._updater.installListener);
		}	
	},

	onInstallEnded: function _onInstallEnded(aInstall, aAddon)
	{
		//dump("installListener: onInstallEnded\n");
		this.stopListener(aInstall);

/*		if (this._updater.needsReboot) {
			dump("installListener: needsReboot\n");
			this.prompts.alert(null, "Addon updated", "1. Addon has been updated to version: "+aAddon.version+".\n\nThunderbird will be restarted to activate new version."); 
		}
		else {
			dump("installListener: Does not need a Reboot\n");
		}*/
		this.prompts.alert(null, "Addon updated", "Addon has been updated to version: "+aAddon.version+".\n\nThunderbird will be restarted to activate new version."); 
		var appStartup = Cc["@mozilla.org/toolkit/app-startup;1"].getService(Ci.nsIAppStartup);
		appStartup.quit(0x12);
	},

	onInstallCancelled: function _onInstallCancelled(aInstall)
	{
		//dump("installListener: onInstallCancelled\n");
		this.stopListener(aInstall);
		this.prompts.alert(null, "Addon update canceled", "Update of addon has been canceled by user."); 
	},

	onInstallFailed: function _onInstallFailed(aInstall)
	{
		//dump("installListener: onInstallFailed\n");
		this.stopListener(aInstall);
		this.prompts.alert(null, "Addon update failed", "Update of addon failed. Error: "+aInstall.error); 
	},

	onExternalInstall: function _onExternalInstall(aInstall, aExistingAddon, aNeedsRestart)
	{
		//dump("installListener: onExternalInstall\n");
	},

}

function mivUpdater() {
	this._callBack = null;
}

var EXTENSION_MAINPART = 'extensions.1st-setup.updater.';

var mivUpdateGUID = "fb9aeba0-152a-11e2-892e-0800200c9a66";

mivUpdater.prototype = {

	// methods from nsISupport

	_refCount: 0,

	//nsrefcnt AddRef();
	AddRef: function _AddRef()
	{
		this._refCount++;
		return this._refCount;
	},

	/* void QueryInterface(
	  in nsIIDRef uuid,
	  [iid_is(uuid),retval] out nsQIResult result
	);	 */
	QueryInterface: XPCOMUtils.generateQI([Ci.mivUpdater,
			Ci.nsIClassInfo,
			Ci.nsISupports]),

	//nsrefcnt Release();
	Release: function _Release()
	{
		this._refCount--;
		return this._refCount;
	},

	// methods from nsIClassInfo

	// nsISupports getHelperForLanguage(in PRUint32 language);
	getHelperForLanguage: function _getHelperForLanguage(language) {
		return null;
	},

	// void getInterfaces(out PRUint32 count, [array, size_is(count), retval] out nsIIDPtr array);
	getInterfaces: function _getInterfaces(count) 
	{
		var ifaces = [Ci.mivUpdater,
			Ci.nsIClassInfo,
			Ci.nsISupports];
		count.value = ifaces.length;
		return ifaces;
	},

	// Attributes from nsIClassInfo

	classDescription: "Extensions update checker.",
	classID: components.ID("{"+mivUpdateGUID+"}"),
	contractID: "@1st-setup.nl/checkers/updater;1",
	flags: Ci.nsIClassInfo.THREADSAFE,
	implementationLanguage: Ci.nsIProgrammingLanguage.JAVASCRIPT,

	// External methods

	// Internal methods.

	_needsReboot: false,

	get needsReboot()
	{
		//dump(" -- needsReboot:"+this._needsReboot+"\n");
		return this._needsReboot;
	},

	get installListener()
	{
		return this._installListener;
	},

	// boolean checkForUpdate(in AUTF8String aExtension, in jsval aCallBack);
	checkForUpdate: function _checkForUpdate(aExtensionID, aCallBack)
	{
		this._callBack = aCallBack;
		this._extensionID = aExtensionID;

		Cu.import("resource://gre/modules/AddonManager.jsm");
		var self = this;
		AddonManager.getAddonByID(aExtensionID, function(aAddon) { self.addonByIDCallback(aAddon);});
	},

	getUUID: function _getUUID() {
	    var uuidGen = Cc["@mozilla.org/uuid-generator;1"]
	                  .getService(Ci.nsIUUIDGenerator);
	    // generate uuids without braces
	    return uuidGen.generateUUID().toString().replace(/[{}]/g, '');
	},

	addonByIDCallback: function _addonByIDCallback(aAddon)
	{
		if (aAddon) {
			this._addon = aAddon;
			this._updateURL = this.safeGetCharPref(null, EXTENSION_MAINPART+this._extensionID, "http://www.1st-setup.nl/extensioncheckforupdate.php", true); 

			this.xmlReq = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();

			var tmp = this;
			this.xmlReq.addEventListener("error", function(evt) { tmp.onUpdateDetailsError(evt); }, false);
			this.xmlReq.addEventListener("load", function(evt) { tmp.onUpdateDetailsLoad(evt, tmp.xmlReq); }, false);

			var appInfo = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo);

			var xulRuntime = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime);

			var id = this.safeGetCharPref(null, EXTENSION_MAINPART+"id", this.getUUID(), true);
			var localeService = Cc["@mozilla.org/intl/nslocaleservice;1"].getService(Ci.nsILocaleService); 

			this._updateURL += "?extensionsID="+encodeURIComponent(this._extensionID);
			this._updateURL += "&extensionsVersion="+encodeURIComponent(aAddon.version);
			this._updateURL += "&appID="+encodeURIComponent(appInfo.ID);
			this._updateURL += "&appVersion="+encodeURIComponent(appInfo.version);
			this._updateURL += "&appName="+encodeURIComponent(appInfo.name);
			this._updateURL += "&platformVersion="+encodeURIComponent(appInfo.platformVersion);
			this._updateURL += "&OS="+encodeURIComponent(xulRuntime.OS);
			this._updateURL += "&XPCOMABI="+encodeURIComponent(xulRuntime.XPCOMABI);
			this._updateURL += "&id="+encodeURIComponent(id);
			this._updateURL += "&locale="+encodeURIComponent(localeService.getLocaleComponentForUserAgent());

			this.xmlReq.open("GET", this._updateURL, true);

			this.xmlReq.setRequestHeader("User-Agent", "1st-setup.nl/extensionupdatercheck");
			this.xmlReq.send();
		}
		else {
			if (this._callBack) {
				this._callBack({addon: null, extensionID: this._extensionID, versionChanged: 0, error: Ci.mivUpdater.ERR_ADDON_NOT_FOUND_BY_ID});
			}
		}
	},

	onUpdateDetailsError: function _onUpdateDetailsError(evt)
	{
		this._callBack({addon: this._addon, extensionID: this._extensionID, versionChanged: 0, error: Ci.mivUpdater.ERR_GETTING_REMOTE_UPDATE_DETAILS});
	},

	onUpdateDetailsLoad: function _onUpdateDetailsLoad(evt, xmlReq)
	{
		if (xmlReq.readyState != 4) {
			this._callBack({addon: null, extensionID: this._extensionID, versionChanged: 0, error: Ci.mivUpdater.ERR_WRONG_READYSTATE});
		}

		var updateDetails = xmlReq.responseText.split("\n"); 
		
		if (this._callBack) {
			if (updateDetails[0] == '1') {
				var versionChecker = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);

				var tmpMsg = "";
				if (updateDetails.length > 4) {
					var counter = 4;
					while (counter < updateDetails.length) {
						tmpMsg = tmpMsg + updateDetails[counter]+"\n";
						counter++;
					}
				}

				this._callBack({updater: this, addon: this._addon, extensionID: this._extensionID, versionChanged: versionChecker.compare(updateDetails[1], this._addon.version), error: 0, updateDetails: {newVersion: updateDetails[1], updateURL: updateDetails[2], infoURL:updateDetails[3], msg: tmpMsg}});
			}
			else {
				this._callBack({addon: this._addon, extensionID: this._extensionID, versionChanged: 0, error: Ci.mivUpdater.ERR_GETTING_REMOTE_UPDATE_DETAILS});
			}
		}
	},

	installNewVersion: function _installNewVersion(aDetails, aNeedsReboot)
	{
		this._needsReboot = aNeedsReboot;
		//dump("installNewVersion: needsReboot:"+this.needsReboot+"\n");
		AddonManager.getInstallForURL(aDetails.updateDetails.updateURL, this.installCallBack, "application/x-xpinstall", null, null, null, aDetails.updateDetails.newVersion, null);
	},

	installCallBack: function _installCallBack(aInstall)
	{
		this._installListener = new installListener(this);
		aInstall.addListener(this._installListener);
		aInstall.install();
	},

	getBranch: function _getBranche(aName)
	{
		var lBranche = "";
		var lName = "";
		var lastIndexOf = aName.lastIndexOf(".");
		if (lastIndexOf > -1) {
			lBranche = aName.substr(0,lastIndexOf+1);
			lName = aName.substr(lastIndexOf+1); 
		}
		else {
			lName = aName;
		}

		return { branch: Cc["@mozilla.org/preferences-service;1"]
		                    .getService(Ci.nsIPrefService)
				    .getBranch(lBranche),
			   name: lName };
	},

	safeGetCharPref: function _safeGetCharPref(aBranch, aName, aDefaultValue, aCreateWhenNotAvailable)
	{
		if (!aBranch) {
			var realBranche = this.getBranch(aName);
			if (!realBranche.branch) {
				return aDefaultValue;
			}
			var aBranch = realBranche.branch;
			var aName = realBranche.name;
		}
	
		if (!aCreateWhenNotAvailable) { var aCreateWhenNotAvailable = false; }

		try {
			return aBranch.getCharPref(aName);
		}
		catch(err) {
			if (aCreateWhenNotAvailable) { 
				try {
					aBranch.setCharPref(aName, aDefaultValue); 
				}
				catch(er) {
					aBranch.deleteBranch(aName);
					aBranch.setCharPref(aName, aDefaultValue); 
				}
			}
			return aDefaultValue;
		}
	},


}

function NSGetFactory(cid) {

	try {
		if (!NSGetFactory.mivUpdater) {
			// Load main script from lightning that we need.
			NSGetFactory.mivUpdater = XPCOMUtils.generateNSGetFactory([mivUpdater]);
			
	}

	} catch(e) {
		Components.utils.reportError(e);
		dump(e);
		throw e;
	}

	return NSGetFactory.mivUpdater(cid);
} 

