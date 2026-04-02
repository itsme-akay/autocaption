/**
 * CSInterface.js  — Adobe CEP 11 (CC 2021+)
 * Source: https://github.com/Adobe-CEP/CEP-Resources
 *
 * Provides the CSInterface class that bridges the HTML/JS panel
 * with the ExtendScript host (After Effects scripting engine).
 *
 * Key methods used by this plugin:
 *   cs.evalScript(fnCall, callback)   — call a function in host/index.jsx
 *   cs.getSystemPath(type)            — get OS paths
 *   cs.addEventListener(type, fn)     — listen for AE events
 */

'use strict';

var csInterface = (function() {

var CSXS_VERSION = 11.0;

// ─── Types ───────────────────────────────────────────────────────────────────

function SystemPath() {}
SystemPath.USER_DATA         = "userData";
SystemPath.COMMON_FILES      = "commonFiles";
SystemPath.MY_DOCUMENTS      = "myDocuments";
SystemPath.APPLICATION       = "application";
SystemPath.EXTENSION         = "extension";
SystemPath.HOST_APPLICATION  = "hostApplication";

function ColorType() {}
ColorType.RGB   = "rgb";
ColorType.NONE  = "none";

function RGBColor(r, g, b, a) {
  this.red   = r; this.green = g; this.blue = b; this.alpha = a;
}

function Direction() {}
Direction.HORIZONTAL = 0;
Direction.VERTICAL   = 1;

function GradientStop(offset, color) {
  this.offset = offset; this.color = color;
}

function GradientColor(type, direction, numStops, gradientStopList) {
  this.type = type; this.direction = direction;
  this.numStops = numStops; this.gradientStopList = gradientStopList;
}

function UIColor(type, antialiasLevel, color, gradient) {
  this.type = type; this.antialiasLevel = antialiasLevel;
  this.color = color; this.gradient = gradient;
}

function AppSkinInfo(baseFontFamily, baseFontSize, appBarBackgroundColor,
                     panelBackgroundColor, appBarBackgroundColorSRGB,
                     panelBackgroundColorSRGB, systemHighlightColor) {
  this.baseFontFamily = baseFontFamily; this.baseFontSize = baseFontSize;
  this.appBarBackgroundColor = appBarBackgroundColor;
  this.panelBackgroundColor = panelBackgroundColor;
  this.appBarBackgroundColorSRGB = appBarBackgroundColorSRGB;
  this.panelBackgroundColorSRGB = panelBackgroundColorSRGB;
  this.systemHighlightColor = systemHighlightColor;
}

function HostEnvironment(appName, appVersion, appLocale, appUILocale,
                          appId, isAppOnline, appSkinInfo) {
  this.appName = appName; this.appVersion = appVersion;
  this.appLocale = appLocale; this.appUILocale = appUILocale;
  this.appId = appId; this.isAppOnline = isAppOnline;
  this.appSkinInfo = appSkinInfo;
}

function HostCapabilities(EXTENDED_PANEL_MENU, EXTENDED_PANEL_ICONS,
                           DELEGATE_APE_ENGINE, SUPPORT_HTML_EXTENSIONS,
                           DISABLE_FLASH_AS_DEFAULT) {
  this.EXTENDED_PANEL_MENU    = EXTENDED_PANEL_MENU;
  this.EXTENDED_PANEL_ICONS   = EXTENDED_PANEL_ICONS;
  this.DELEGATE_APE_ENGINE    = DELEGATE_APE_ENGINE;
  this.SUPPORT_HTML_EXTENSIONS = SUPPORT_HTML_EXTENSIONS;
  this.DISABLE_FLASH_AS_DEFAULT = DISABLE_FLASH_AS_DEFAULT;
}

function ApiVersion(major, minor, micro) {
  this.major = major; this.minor = minor; this.micro = micro;
}

function CSEvent(type, scope, appId, extensionId) {
  this.type = type; this.scope = scope; this.appId = appId;
  this.extensionId = extensionId; this.data = "";
}

// ─── CSInterface ─────────────────────────────────────────────────────────────

function CSInterface() {
  this.hostEnvironment = window.__adobe_cep__ ?
    JSON.parse(window.__adobe_cep__.getHostEnvironment()) : {};
}

CSInterface.GLOBAL_SCOPE = "GLOBAL";
CSInterface.APPLICATION_SCOPE = "APPLICATION";

CSInterface.prototype.getHostEnvironment = function() {
  return this.hostEnvironment;
};

CSInterface.prototype.evalScript = function(script, callback) {
  if (!window.__adobe_cep__) {
    if (callback) callback("ERROR: Not running inside CEP");
    return;
  }
  if (callback === null || callback === undefined) {
    window.__adobe_cep__.evalScript(script);
  } else {
    window.__adobe_cep__.evalScript(script, callback);
  }
};

CSInterface.prototype.getSystemPath = function(pathType) {
  if (!window.__adobe_cep__) return "";
  var path = decodeURI(window.__adobe_cep__.getSystemPath(pathType));
  var OSVersion = this.getOSInformation();
  if (OSVersion.indexOf("Windows") >= 0) {
    path = path.replace("file:///", "");
  } else {
    path = path.replace("file://", "");
  }
  return path;
};

CSInterface.prototype.addEventListener = function(type, listener, obj) {
  if (!window.__adobe_cep__) return;
  window.__adobe_cep__.addEventListener(type, listener, obj);
};

CSInterface.prototype.removeEventListener = function(type, listener, obj) {
  if (!window.__adobe_cep__) return;
  window.__adobe_cep__.removeEventListener(type, listener, obj);
};

CSInterface.prototype.dispatchEvent = function(event) {
  if (!window.__adobe_cep__) return;
  if (typeof event.data === "object") {
    event.data = JSON.stringify(event.data);
  }
  window.__adobe_cep__.dispatchEvent(event);
};

CSInterface.prototype.getExtensionID = function() {
  return window.__adobe_cep__ ? window.__adobe_cep__.getExtensionID() : "";
};

CSInterface.prototype.getOSInformation = function() {
  var ua = navigator.userAgent;
  if (ua.indexOf("Windows") >= 0)  return "Windows";
  if (ua.indexOf("Macintosh") >= 0) return "MacOS";
  return "Unknown";
};

CSInterface.prototype.openURLInDefaultBrowser = function(url) {
  if (window.cep && window.cep.util) window.cep.util.openURLInDefaultBrowser(url);
};

CSInterface.prototype.getExtensionPath = function() {
  return this.getSystemPath(SystemPath.EXTENSION);
};

return {
  CSInterface       : CSInterface,
  SystemPath        : SystemPath,
  ColorType         : ColorType,
  RGBColor          : RGBColor,
  GradientStop      : GradientStop,
  GradientColor     : GradientColor,
  UIColor           : UIColor,
  AppSkinInfo       : AppSkinInfo,
  HostEnvironment   : HostEnvironment,
  HostCapabilities  : HostCapabilities,
  ApiVersion        : ApiVersion,
  CSEvent           : CSEvent,
  Direction         : Direction
};

})();

var CSInterface  = csInterface.CSInterface;
var SystemPath   = csInterface.SystemPath;
var CSEvent      = csInterface.CSEvent;
