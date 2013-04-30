var IeTabExtApp = {

   HKEY_CLASSES_ROOT: 0,
   HKEY_CURRENT_CONFIG: 1,
   HKEY_CURRENT_USER: 2,
   HKEY_LOCAL_MACHINE: 3,
   HKEY_USERS: 4,

   getIExploreExePath: function() {
      var regRoot = this.HKEY_LOCAL_MACHINE;
      var regPath = "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\IEXPLORE.EXE";
      var regName = "";
      return gIeTab.getRegistryEntry(regRoot, regPath, regName);
   },

   removeArrayNullElements: function(a) {
      var result = [];
      while(a.length) {
         var elmt = a.shift();
         if (elmt) result.push(elmt);
      }
      return result;
   },

   runApp: function(filename, parameter) {
      if ((!filename) || (filename == "")) filename = this.getIExploreExePath();
      var nsILocalFile = Components.classes["@mozilla.org/file/local;1"].getService(Components.interfaces.nsILocalFile);
      nsILocalFile.initWithPath(filename);
      if (nsILocalFile.exists()) {
         var paramArray = parameter ? parameter.split(/\s*\"([^\"]*)\"\s*|\s+/) : [];
         paramArray = this.removeArrayNullElements(paramArray);
         var nsIProcess = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
         nsIProcess.init(nsILocalFile);
         nsIProcess.run(false, paramArray, paramArray.length);
         return true;
      }
      return false;
   }
};
