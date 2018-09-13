"use strict";

ChromeUtils.import("resource://gre/modules/Services.jsm");

import logger from "./logger";
import WindowWatcher from "./WindowWatcher";

export class NewTabObserver {

  constructor() {
    this.onTabChangeRef = this.onTabChange.bind(this);
  }

  async init(monitor, tabManager) {

    this.monitor = monitor;
    this.tabManager = tabManager;

    // run once now on the most recent window.
    // const win = this.getMostRecentWindow();
    await this.startWatchingWindows();

  }

  async startWatchingWindows() {
    // load content into existing windows and listen for new windows to load content in
    WindowWatcher.start(this.loadIntoWindow.bind(this), this.unloadFromWindow.bind(this), this.onWindowError.bind(this));
  }

  loadIntoWindow(win) {
    // Add listeners to all open windows to know when to update pageAction
    this.addWindowEventListeners(win);
    // Add listeners to all new windows to know when to update pageAction.
    // Depending on which event happens (ex: onOpenWindow, onLocationChange),
    // it will call that listener method that exists on "this"
    Services.wm.addListener(this);
  }

  unloadFromWindow(win) {
    this.removeWindowEventListeners(win);
    Services.wm.removeListener(this);
    // handle the case where the window closed, but intro or pageAction panel
    // is still open.
    this.handleWindowClosing(win);
  }

  onWindowError(msg) {
    console.debug(msg);
  }

  /**
   * Three cases of user looking at diff page:
   *   - switched windows (onOpenWindow)
   *   - loading new pages in the same tab (on page load in frame script)
   *   - switching tabs but not switching windows (tabSelect)
   * Each one needs its own separate handler, because each one is detected by its
   * own separate event.
   *
   * @param {ChromeWindow} win NEEDS_DOC
   * @returns {void}
   */
  addWindowEventListeners(win) {
    if (win && win.gBrowser) {
      win.gBrowser.addTabsProgressListener(this);
      win.gBrowser.tabContainer.addEventListener(
        "TabSelect",
        this.onTabChangeRef,
      );
    }
  }

  removeWindowEventListeners(win) {
    if (win && win.gBrowser) {
      win.gBrowser.removeTabsProgressListener(this);
      win.gBrowser.tabContainer.removeEventListener(
        "TabSelect",
        this.onTabChangeRef,
      );
    }
  }

  handleWindowClosing(win) {
    console.log("handleWindowClosing - win:", win);
  }

  /**
   * This method is called when opening a new tab among many other times.
   * This is a listener for the addTabsProgressListener
   * Not appropriate for modifying the page itself because the page hasn't
   * finished loading yet. More info: https://tinyurl.com/lpzfbpj
   *
   * @param  {Object} browser  NEEDS_DOC
   * @param  {Object} progress NEEDS_DOC
   * @param  {Object} request  NEEDS_DOC
   * @param  {Object} uri      NEEDS_DOC
   * @param  {number} flags    NEEDS_DOC
   * @returns {void}
   */
  async onLocationChange(browser, progress, request, uri, flags) {
    console.log("onLocationChange - browser, progress, request, uri, flags:", browser, progress, request, uri, flags);
    // ensure the location change event is occuring in the top frame (not an iframe for example)
    if (!progress.isTopLevel) {
      console.log("onLocationChange - bailing since we are not in the top frame");
    }

    // Setup a tab-specific monitor
    const tabId = 1; // TODO: Actually get the correct tab id from the arguments to this event listener
    const tabBase = this.tabManager.get(tabId);
    await this.monitor.enableMonitoringForTab(tabBase);
    logger.debug(
      `Started tab monitoring for tab with id ${tabId}`,
      this.monitor,
    );
  }

  onTabChange(evt) {
    console.log("onTabChange - evt:", evt);
  }

  handleEmbeddedBrowserLoad(evt) {
    console.log("handleEmbeddedBrowserLoad", evt);
  }

  async uninit() {
    // Remove all listeners from existing windows and stop listening for new windows
    WindowWatcher.stop();
  }

}
