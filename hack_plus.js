// ==UserScript==
// @name         朝朝暮暮plus
// @version      1.0.0
// @author       汝莫舞
// @description  一些浏览器增强功能
// @match        *://*
// @grant        none
// @grant        GM_log
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// @exclude      *://*.taobao.com*
// @exclude      *://*.tmall.com*
// @exclude      *://*.1688.com*
// @exclude      *://*.jd.com*
// @exclude      *://*.suning.com*
// @exclude      *://*.dangdang.com*
// @exclude      *://*.mogu.com*

// ==/UserScript==

//--功能模块定义[begin]--//
(function (){
    var key = ("mh_" + Math.random());
    var keyR = new RegExp(("(^|;)\\s*" + key + "=12345"));
    var expiredTime = new Date(0);
    var domain = document.domain;
    var domainList = domain.split('.');
    var urlItems = [];
    urlItems.unshift(domainList.pop());
    while (domainList.length) {
        urlItems.unshift(domainList.pop());
        var mainHost = urlItems.join('.');
        var cookie = (key + "=" + 12345 + ";domain=." + mainHost);
        document.cookie = cookie;
        if (keyR.test(document.cookie)) {
            document.cookie = (cookie + ";expires=" + expiredTime);
            return window['HackPlus_getMainHost'] = mainHost;
        }
    }
})();

var localStorage = {
    getItem : function (name, defaultValue) {
        return GM_getValue(name, defaultValue)
    },
    setItem : function (name, value) {
        return GM_setValue(name, value)
    },
    removeItem : function (name) {
        return GM_deleteValue(name)
    }
};

function Fuck_testDomain(arr) {
    var regex = new RegExp('^' + arr, 'i');
    //console.log(regex);
    return regex.test(location.href.replace(/https?:\/\//i, ''))
}

function Fuck_removeAD(Item, MinWidth, MaxWidth, MinHeight, MaxHeight, RmoveFun, Color) {
    var txtColor = Color || "#E20",
        logCss = 'border-left:' + txtColor + ' 5px solid;color:' + txtColor + ';padding:3px';
        //&& Item.offsetLeft > 0
    if ((Item.offsetWidth >= MinWidth && Item.offsetWidth <= MaxWidth && Item.offsetHeight >= MinHeight && Item.offsetHeight <= MaxHeight) || (Item.naturalWidth >= MinWidth && Item.naturalWidth <= MaxWidth && Item.naturalHeight >= MinHeight && Item.naturalHeight <= MaxHeight)) {
        //Item.src = Item.src || Item.outerHTML.match(/^<.*?>/);
        switch (RmoveFun) {
            case 1:
                Item.parentNode.removeChild(Item);
                console.log('%c[Remove AD] ✂%o', logCss, Item.src || Item);
                break;
            case 2:
                Item.parentNode.parentNode.removeChild(Item.parentNode);
                console.log('%c[Remove AD] ✂%o', logCss, Item.src || Item);
                break;
        }
    }
}
var broswer_UA = navigator.userAgent,
    getDoamin = window.HackPlus_getMainHost || window.location.host,
    getHostname = window.location.host,
    XxX_MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver;
//--功能模块定义[end]--//


function Fuck_ADV(){
    [].forEach.call(document.querySelectorAll('a[target] img:not([src*="avatar"]),a[style] img:not([src*="avatar"]),a[onclick] img:not([src*="avatar"]),a[href*="javascript"] img:not([src*="avatar"]),a[rel*="nofollow"] img:not([src*="avatar"]),a img[style*="display"][style*="block"],a:not([href*="' + getDoamin.split('.')[0] + '."]):not([href^="/"]) img'), function (Nodeitem) {
        Fuck_removeAD(Nodeitem, 580, 1800, 40, 140, 2);
        Fuck_removeAD(Nodeitem, 40, 150, 300, 650, 2, "#08E")
    });
}

(function() {
    //if ($$ALL_WLD.indexOf(getDoamin) == -1 && !$$ALL_WLD.some(Fuck_testDomain)) {
        window.XxX_observer = new XxX_MutationObserver(function () {
            Fuck_ADV()
        });
        window.Timer_FuckRAI = setTimeout(function () {
            Fuck_ADV();
            if (document.readyState == "complete") {
                setTimeout(Fuck_ADV, 1e3);
                window.XxX_observer.observe(document.body, {childList: true,subtree: true});
                clearTimeout(window.Timer_FuckRAI);
            } else {
                setTimeout(Fuck_ADV, 500);
                setTimeout(arguments.callee, 0)
            }
        }, 20);
        setTimeout(function(){
            if (window.XxX_observer && !window.XxX_observer.observe) {
                Fuck_ADV();
                window.XxX_observer.observe(document.body, {childList: true,subtree: true});
                clearTimeout(window.Timer_FuckRAI);
            }
        }, 2e4);
    //}
})();

//--Disable Html5 p2p--//
if (broswer_UA.indexOf('rv:11') == -1 && broswer_UA.indexOf('MSIE') == -1) {
    try {
        navigator.mediaDevices.getUserMedia =
        navigator.webkitGetUserMedia =
        navigator.mozGetUserMedia =
        navigator.getUserMedia =
        webkitRTCPeerConnection =
        RTCPeerConnection = undefined;
    } catch (error) {
        webkitRTCPeerConnection =
        RTCPeerConnection = undefined;
    }
}