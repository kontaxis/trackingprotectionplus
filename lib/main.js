"use strict";

/*
 * make sure to have extensions.sdk.console.logLevel = "all" in Firefox
 * about:config for console.log() messages to appear
 */

const { Cc, Ci } = require("chrome");
const { Class } = require("sdk/core/heritage");
const { Unknown } = require("sdk/platform/xpcom");
const windows = require('sdk/windows').browserWindows;
const { getMostRecentBrowserWindow, getXULWindow } = require("sdk/window/utils");
const timers = require("sdk/timers");

/**
 * Gets the most recent nsIDOMWindow
 */
function getMostRecentWindow() {
  var wm = Cc["@mozilla.org/appshell/window-mediator;1"]
             .getService(Ci.nsIWindowMediator);
  return wm.getMostRecentWindow("navigator:browser");
}

/**
 * nsIWebProgressListener implementation in order to get the security
 * change events emitted when tracking elements are blocked. Can be used
 * to show/update some UI.
 */
var MyProgressListener = Class({

  extends: Unknown,

  interfaces: [ 'nsIWebProgressListener'],

  trackingBlockedEventDelayTimer: 0,

  handleTrackingBlockedEvent: function(gBrowser)
  {
    /*
     * gBrowser.contentDocument.blockedTrackingNodeCount may NOT be
     * gBrowser.contentDocument.blockedTrackingNodes.length
     *
     * blockedTrackingNodes is live, blockedTrackingNodeCount is NOT
     */
    console.log('[trackingProtectionPlus] blocked Tracking Node Count: '
      + gBrowser.contentDocument.blockedTrackingNodeCount + ' in document '
      + gBrowser.contentDocument.location.href);

    /* snapshot */
    let blockedTrackingNodes = gBrowser.contentDocument.blockedTrackingNodes;
    let nodes = "";
    for (let i = 0; i < blockedTrackingNodes.length; i++) {
      if (i+1 != blockedTrackingNodes.length) {
        nodes += blockedTrackingNodes[i].tagName + ",";
      }
      else nodes += blockedTrackingNodes[i].tagName;
    }
    console.log('[trackingProtectionPlus] blocked Tracking Nodes: '
      + nodes + ' in document ' + gBrowser.contentDocument.location.href);
  },

  onSecurityChange: function(aBrowser, aProgress, aRequest, aState)
  {
    /*
     * tracking protection has cancelled this user-tracking request.
     *
     * IMPORTANT NOTICE: HTMLDocument exposes blockedTrackingNodeCount
     * and blockedTrackingNodes which count the number of requests/elements
     * blocked so far (not just the blocked elements currently present in
     * the page) as well as provide references to the blocked page elements.
     * However these variables are updated asynchronously at some point
     * _after_ the event fires. This works fine if you want to change
     * some visual indicator immediately when the events fires and analyze
     * the blocked elements at some later point (e.g. on user click on the
     * indicator). The best way right now to access those elements is to wait
     * an arbitrary amount of time or for the 'load' event, whichever happens
     * first.
     */
    if (aState &
      Ci.nsIWebProgressListener.STATE_BLOCKED_TRACKING_CONTENT) {
      /* immediately report on the blocked tracking event */
      console.log('[trackingProtectionPlus] blocked tracking in document '
        + aBrowser.contentDocument.location.href);
      /* clear existing timer to process blocked elements */
      if (this.trackingBlockedEventDelayTimer) {
        timers.clearTimeout(this.trackingBlockedEventDelayTimer);
      }
      /* schedule processing of blocked elements after an arbitrary 5 secs */
      this.trackingBlockedEventDelayTimer =
        timers.setTimeout(this.handleTrackingBlockedEvent, 5000,
        getMostRecentBrowserWindow().gBrowser);
    }
    /*
     * tracking protection has been disabled for this request
     * (will fire for every request on a white-listed page)
     */
    else if (aState &
      Ci.nsIWebProgressListener.STATE_LOADED_TRACKING_CONTENT) {
    }
  },

  onStateChange: function(aBrowser, aProgress, aRequest, aStateFlags, aStatus) {
    if (aStateFlags &
      (Ci.nsIWebProgressListener.STATE_STOP |
       Ci.nsIWebProgressListener.STATE_IS_WINDOW)) {
      /* clear existing timer to process blocked elements */
      if (this.trackingBlockedEventDelayTimer) {
        timers.clearTimeout(this.trackingBlockedEventDelayTimer);
        /* call handler now */
        this.handleTrackingBlockedEvent(getMostRecentBrowserWindow().gBrowser);
      }
    }
  },

  initialize: function(aBrowser) { aBrowser.addTabsProgressListener(this); },

  uninitialize: function(aBrowser) { aBrowser.removeTabsProgressListener(this); }

});

/*
 * Called when addon is loaded
 */
function main(options)
{
  /* handle current window */
  MyProgressListener(getMostRecentWindow().gBrowser);

  /* handle future windows opening */
  windows.on("open", function(window) {
    MyProgressListener(getMostRecentWindow().gBrowser);
  });
}

exports.main = main;
