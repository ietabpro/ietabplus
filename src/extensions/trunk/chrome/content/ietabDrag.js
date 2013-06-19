// Status bar drag and drop functionality based off of example code from
// http://kb.mozillazine.org/Dev_:_Extensions_:_Example_Code_:_Adding_Drag_and_Drop_to_Statusbarpanel
//

const ietab_statObserver = {
	
	flavourName: "ie_tab/statusbarpanel",
	statusbarPanelId: "ietab-status-deck",
	statusbarId: "status-bar",
	
  init: function () {
    var statusbarPanel = document.getElementById(ietab_statObserver.statusbarPanelId);
    var insertbefore = statusbarPanel.getAttribute("insertbefore");
    var insertafter = statusbarPanel.getAttribute("insertafter");

    // if insertbefore or insertafter attributes are set obey the settings and
    // place our statusbar panel before or after the specified panel
    if (insertbefore) {
      document.getElementById(ietab_statObserver.statusbarId).
               insertBefore(statusbarPanel,
                            document.getElementById(statusbarPanel.getAttribute("insertbefore")));
    }
    else if (insertafter) {
      var prev = document.getElementById(statusbarPanel.getAttribute("insertafter"));
      if (prev) prev = prev.nextSibling;
      if (prev)
        document.getElementById(ietab_statObserver.statusbarId).insertBefore(statusbarPanel, prev);
      else
        document.getElementById(ietab_statObserver.statusbarId).appendChild(statusbarPanel);
    }
  },

  getSupportedFlavours: function () {
    var flavours = new FlavourSet();
    flavours.appendFlavour(ietab_statObserver.flavourName);
    return flavours;
  },

  // when user begins to drag, make sure every statusbarpanel has an id and
  // set up the event handlers for the drag and drop
  //
  onDragStart: function (evt,transferData,action) {
    var elme = evt.target;
    while(elme.id != ietab_statObserver.statusbarPanelId) {
      elme =elme.parentNode;
    }
    var txt=elme.getAttribute("id");
    transferData.data=new TransferData();
    transferData.data.addDataForFlavour(ietab_statObserver.flavourName,txt);
    var status = document.getElementById(ietab_statObserver.statusbarPanelId);
    var statusbar = document.getElementById(ietab_statObserver.statusbarId);
    statusbar.setAttribute("ietabdrag", true);
    var child = statusbar.firstChild;
    var x = 0;
    while (child) {
      if (child != status) {
        // make sure every panel has an id and make that id persistent.  For some reason
        // the persist attribute isn't sticking.  I'm not sure why but this could cause problems.
        if (!child.id) {
          var newId = "statusbarpanel-noID"+x;
          while (document.getElementById(newId)) newId += "x"+x;
          child.id = newId;
          child.setAttribute("persist", new String("id" + (child.persist ? " "+child.persist : "")) );
          x++;
        }
        child.addEventListener("dragover", function(event) { nsDragAndDrop.dragOver(event,ietab_statObserver); }, false);
        child.addEventListener("dragdrop", function(event) { nsDragAndDrop.drop(event,ietab_statObserver); }, false);
      }
      child = child.nextSibling;
    }
    // this will restore status bar to previous state if user does not drop on status bar
    window.addEventListener("dragexit", function(event) { nsDragAndDrop.dragExit(event,ietab_statObserver); }, true);
  },


  // clean up when release mouse without dropping on statusbar
  //
  onDragExit: function(evt, session) {
    var elm = session.sourceNode;
    while(elm.parentNode.nodeName.toLowerCase() != "statusbar") {
      elm = elm.parentNode;
    }
    if (elm == document.getElementById(ietab_statObserver.statusbarPanelId)) this.scheduleCleanup();
  },

  // highlite the spot where the drop will occur
  //
  onDragOver: function (evt,flavour,session) {
    var elm = evt.target;
    while(elm.parentNode.nodeName.toLowerCase() != "statusbar") {
      elm = elm.parentNode;
    }

    // remove indicator from previous and next siblings
    var prev = (elm.previousSibling != session.sourceNode) ? elm.previousSibling : elm.previousSibling.previousSibling;
    var next = (elm.nextSibling!= session.sourceNode) ? elm.nextSibling : elm.nextSibling.nextSibling;
    if (prev) prev.removeAttribute("ietabdrag");
    if (next) next.removeAttribute("ietabdrag");

    // this will display a little line where the drop will occur
    var midPointCoord = elm.boxObject.x + (elm.boxObject.width/2);      // the offset + midpoint
    midPointCoord += !elm.previousSibling ? (elm.boxObject.width/4) :   // + additional quarter-coverage for left-most panel
                     (!elm.nextSibling ? (-elm.boxObject.width/4) : 0); // - less quarter-coverage for right-most panel
    if (evt.clientX < midPointCoord)
      elm.setAttribute("ietabdrag", "left");
    else
      elm.setAttribute("ietabdrag", "right");
  },

  // move the icon to the dropped location and save the location for future sessions
  //
  onDrop: function (evt,dropdata,session) {
    if (dropdata.data!="") {

      var droppedPanel = document.getElementById(dropdata.data);
      var parent = droppedPanel.parentNode;
      var prev = evt.target;
      while (prev.nodeName.toLowerCase() != "statusbarpanel") {
        prev = prev.parentNode;
      }

      // this allows user to drop before or after the object under the mouse pointer depending on
      // where the actual drop occurs.
      var midPointCoord = prev.boxObject.x + (prev.boxObject.width/2); // the offset + midpoint
      midPointCoord += !prev.previousSibling ? (prev.boxObject.width/4) : // + additional quarter-coverage for left-most panel
                       (!prev.nextSibling ? (-prev.boxObject.width/4) : 0); // - less quarter-coverage for right-most panel
      if (evt.clientX < midPointCoord)
        prev = prev.previousSibling;
      var next = (!prev) ? parent.firstChild : (prev.nextSibling != droppedPanel) ?
                                                prev.nextSibling : prev.nextSibling.nextSibling;

      // store the insertbefore or insertafter attribute.  Our overlay is set up so
      // that both these attributes will persist between browser sessions.
      if (prev) {
        droppedPanel.removeAttribute("insertbefore");
        droppedPanel.setAttribute("insertafter",""+prev.getAttribute("id"));
      }
      else if (next) {
        droppedPanel.removeAttribute("insertafter");
        droppedPanel.setAttribute("insertbefore",""+next.getAttribute("id"));
      }

      // do the actual move
      parent.removeChild(droppedPanel);
      if (next)
        parent.insertBefore(droppedPanel,next);
      else
        parent.appendChild(droppedPanel);

      this.cleanUp();
    }
  },

  // calling cleanUp directly fires immediately so use this to get around that
  //
  scheduleCleanup: function(evt) {
    clearTimeout(window.ietabDragCleanup);
    window.ietabDragCleanup = setTimeout(function() {
        ietab_statObserver.cleanUp()
    } ,700);
  },

  // restore the statusbar to its normal state
  //
  cleanUp: function() {
    clearTimeout(window.ietabDragCleanup);

    var statusbar = document.getElementById(ietab_statObserver.statusbarId);
    var statusbarPanel = document.getElementById(ietab_statObserver.statusbarPanelId);
    statusbar.removeAttribute("ietabdrag");

    // remove the event handlers
    var child = statusbar.firstChild;
    var x = 0;
    while (child) {
      if (child != statusbarPanel) {
        child.removeAttribute("ietabdrag");
        child.removeEventListener("dragover", function(event) { nsDragAndDrop.dragOver(event,ietab_statObserver); }, false);
        child.removeEventListener("dragdrop", function(event) { nsDragAndDrop.drop(event,ietab_statObserver); }, false);
      }
      child = child.nextSibling;
    }
    window.removeEventListener("dragexit", function(event) { nsDragAndDrop.dragExit(event,ietab_statObserver); }, true);
  },

  destory: function() {
    window.removeEventListener('load', ietab_statObserver.init, false);
    window.removeEventListener('load', ietab_statObserver.destory, false);
  }
};

// its go time
window.addEventListener('load', ietab_statObserver.init, false);
window.addEventListener('unload', ietab_statObserver.destory, false);
