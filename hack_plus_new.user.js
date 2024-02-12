// ==UserScript==
// @name         朝朝暮暮plus_new
// @version      1.28.0001
// @author       汝莫舞
// @description  一些浏览器增强功能及辅助移除广告【Ctrl+↑脚本设置】
// @homepageURL  https://github.com/emCupid/adg_cn
// @match        *://*/*
// @namespace    emCupid
// @updateURL    https://cdn.jsdelivr.net/gh/emCupid/adg_cn/hack_plus_new.user.js
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @run-at       document-start
// @require      http://code.jquery.com/jquery-3.x-git.min.js
// @exclude      *://*.taobao.com*
// @exclude      *://*.tmall.com*
// @exclude      *://*.1688.com*
// @exclude      *://*.jd.com*
// @exclude      *://*.suning.com*
// @exclude      *://*.dangdang.com*
// @exclude      *://*.mogu.com*
// @exclude      *://graph.baidu.com/*similar*
// ==/UserScript==

//功能模块定义
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
            return window['_getMainHost'] = mainHost;
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
    },
    listItem : function () {
        return GM_listValues()
    }
};
//debug GM_Value
unsafeWindow.__$get = GM_getValue;
unsafeWindow.__$set = GM_setValue;
unsafeWindow.__$delete = GM_deleteValue;
unsafeWindow.__$list = GM_listValues;

function checkbox_onClick(checkbox) {
    if (checkbox.checked) {
        hackplus_whitelist[checkbox.id] = 1;
    } else {
        delete hackplus_whitelist[checkbox.id];
    }
    localStorage.setItem("$" + getDoamin + "$", JSON.stringify(hackplus_whitelist));
}

function AddTempHide(Item) {
    var tempHideItem = Item.tagName + "[src='" + Item.src + "']";
    if(tempHide.indexOf(tempHideItem) == -1) {
        try{
            tempHide.push(tempHideItem)
        } catch(e){
            tempHide = tempHide.split(",");
            tempHide.push(tempHideItem)
        } finally {
            sessionStorage.setItem("Fuck_Hide",tempHide)
        }
    }
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
                AddTempHide(Item);
                Item.parentNode.parentNode.removeChild(Item.parentNode);
                console.log('%c[Remove AD] ✂%o', logCss, Item.src || Item);
                break;
        }
    }else if((Item.offsetWidth > 500 && Item.offsetHeight) || (Item.naturalWidth > 500 && Item.naturalHeight)){
    //console.log('%c[log offset] ✂%O',logCss,'offsetWidth:' ,Item.offsetWidth||Item.naturalWidth,'offsetHeight:',Item.offsetHeight||Item.naturalHeight ,Item.src || Item);
    }
}
var getDoamin = window._getMainHost || window.location.host,
    MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver,
    hackplus_whitelistJSON = localStorage.getItem("$" + getDoamin + "$") || "{}",
    hackplus_whitelistJSON_temp = localStorage.getItem("$" + getDoamin + "$") || "{}",
    hackplus_whitelist = JSON.parse(hackplus_whitelistJSON),
    tempHide = sessionStorage.getItem("Fuck_Hide") || ["emCupid"],
    tempCssStyle = tempHide + "{position:absolute!important;left:-5000px;width:1000px;height:100px}",
    tempCssXML = document.createProcessingInstruction("xml-stylesheet", 'type="text/css" href="data:text/css,' + encodeURIComponent(tempCssStyle) + '"'),
    iframeSRC_whitelist = [
        'm3u8',
        'MacPlayer',
        'upload',
        'player',
        'comment',
        'jiexi.php',
        '\\/soft',
        '\\/login',
        'vip\\.php\\?url=',
        '\\/vip\\/index\\.php\\?url=',
        '\\/index\\.php\\?url=https?:\\/\\/',
        'lanzou..com\\/fn\\?',
        '.china.com.cn\\/node_',
        '\\/\\/.+?\\.douyu\\.com',
        '\\/\\/v.qq.com',
        '\\/\\/tushuo.baidu.com',
        '\\/\\/zhannei.baidu.com',
        '\\/\\/widget.weibo.com'
    ],
    iframeSRC = new RegExp(iframeSRC_whitelist.join("|","i")),
    scriptWRS_blacklist = [
        'script.*src=',
        '\\/click\\/',
        'var hm ?= ?document\\.createElement',
        'cpro_id',
        'tanx-a-mm'
    ],
    scriptWRS_B = new RegExp(scriptWRS_blacklist.join("|","i")),
    scriptWRS_whitelist = [
        'm3u8',
        'MacPlayer',
        '[\\u4e00-\\u9fa5]',
        'player',
        'editor\\/',
        'map.baidu.com',
        '\\/api',
        'cityjson',
        '\\/conf',
        'qhcs.css',
        'qhcs.js',
        'data.video.iqiyi.com\\/v.mp4',
        'account\\.',
        'letvcdn.com',
        'jquery',
        'swfobject',
        'toolbar',
        'lightbox',
        'login',
        'comment',
        'all_async_search',
        'psp_jump_white_list',
        'bd_share',
        'document.write',
        'hdslide',
        'ifengimg.com',
        '\\/pc\\/js\\/down.js',
        '\\/xinwen',
        '\\/video\\/',
        '\\/vip\\/',
        '\\/data\\/da_default.js',
        'BackTop'
    ],
    scriptWRS_W = new RegExp(scriptWRS_whitelist.join("|","i")),
    push_error = function (e) {
        return function () {
            console.error("Block " + e + " push Ad(s)")
        }
    };
if (hackplus_whitelistJSON == "{}") {
    localStorage.removeItem("$" + getDoamin + "$")
}
//功能模块定义[end]


function Fuck_ADV(){
    [].forEach.call(document.querySelectorAll('[class*="img"][style*="background-image"],a[target] img:not([src*="avatar"]),a[style] img:not([src*="avatar"]),a[onclick] img:not([src*="avatar"]),a[href*="javascript"] img:not([src*="avatar"]),a[rel*="nofollow"] img:not([src*="avatar"]),a img[style*="display"][style*="block"],a:not([href*="' + getDoamin.split('.')[0] + '."]):not([href^="/"]) img'), function (Nodeitem) {
        Fuck_removeAD(Nodeitem, 570, 1800, 40, 160, 2);
        Fuck_removeAD(Nodeitem, 350, 400, 35, 150, 2);//手机缩放兼容
        Fuck_removeAD(Nodeitem, 40, 150, 300, 650, 2, "#08E")
    });
    [].forEach.call(document.querySelectorAll('img[data-link]'), function (Nodeitem) {
        Fuck_removeAD(Nodeitem, 579, 1800, 40, 150, 3);
    });
    [].forEach.call(document.querySelectorAll('a[target*="/?channelCode"] img,a[href*=":1"] img,a[href*=":2"] img,a[href*=":3"] img,a[href*=":4"] img,a[href*=":5"] img,a[href*=":6"] img,a[href*=":7"] img,a[href*=":8"] img,a[href*=":9"] img'), function (Nodeitem) {
        Fuck_removeAD(Nodeitem, 579, 1800, 40, 190, 3);
    });
    [].forEach.call(document.getElementsByTagName('iframe'), function (Nodeitem) {
        if (!iframeSRC.test(Nodeitem.src) && Nodeitem.getAttribute("src") && Nodeitem.offsetWidth >= 600 && Nodeitem.offsetWidth <= 1500 && Nodeitem.offsetHeight >= 40 && Nodeitem.offsetHeight <= 180) {
            Nodeitem.parentNode.removeChild(Nodeitem);
            console.log('%c[Remove ADiframe] ✂%O', 'border-left:5px solid #0B0;color:#0B0;padding:3px', Nodeitem, Nodeitem.src);
        }
    });
}

function Fuck_UNION(){
    unsafeWindow._SF_ = [];
    unsafeWindow._SF_._global_ = [];
    unsafeWindow._SF_._global_._ssp = [];
    Object.freeze(unsafeWindow._SF_);
    Object.freeze(unsafeWindow._SF_._global_);
    Object.freeze(unsafeWindow._SF_._global_._ssp);
    unsafeWindow._ssp_global = [];
    Object.freeze(unsafeWindow._ssp_global);
    unsafeWindow.AD = {};
    Object.freeze(unsafeWindow.AD);
    unsafeWindow.Ad = {};
    Object.freeze(unsafeWindow.Ad);
    unsafeWindow.ad = {};
    Object.freeze(unsafeWindow.ad);
    unsafeWindow.___baidu_union_ = {}
    Object.freeze(unsafeWindow.___baidu_union_)
    unsafeWindow.___baidu_union_ds_ = {};
    Object.freeze(unsafeWindow.___baidu_union_ds_);
    unsafeWindow.__delivery_global_ = {};
    Object.freeze(unsafeWindow.__delivery_global_)
    unsafeWindow.___delivery___global___counter___ = {};
    Object.freeze(unsafeWindow.___delivery___global___counter___);
    unsafeWindow.cproArray = {};
    unsafeWindow.cproArray.push = push_error("Baidu");
    Object.freeze(cproArray);
    unsafeWindow.arrBaiduAds = {};
    unsafeWindow.arrBaiduAds.push = push_error("Baidu");
    Object.freeze(arrBaiduAds);
    unsafeWindow.slotbydup = {};
    unsafeWindow.slotbydup.push = push_error("Baidu SSP");
    unsafeWindow._qha_data = {};
    Object.freeze(unsafeWindow._qha_data);
    unsafeWindow.sinaads = {};
    unsafeWindow.sinaads.push = push_error("Sina");
    Object.freeze(unsafeWindow.sinaads);
    unsafeWindow.sogou_un = {};
    Object.freeze(unsafeWindow.sogou_un)
}

function Fuck_WRS() {
    document.Rwrite = document.write;
    document.write = function (str) {
        if (scriptWRS_W.test(str)) {
            document.Rwrite(str);
        } else {
            console.log('%c[Block Script Write] ✂', 'border-left:5px solid #A0B;color:#A0B;padding:3px', str);
        }
    };
    document.Rwriteln = document.writeln;
    document.writeln = function (str) {
        if (scriptWRS_W.test(str)) {
            document.Rwriteln(str);
        } else {
            console.log('%c[Block Script Writeln] ✂', 'border-left:5px solid #A0B;color:#A0B;padding:3px', str);
        }
    };
}

function Fuck_XZ(event) {
    onevent = "on" + event;
    if (window.addEventListener) {
        window.addEventListener(event, function (e) {
            for (var n = e.originalTarget; n; n = n.parentNode) {
                n[onevent] = null;
            }
        }, true)
    }
    window[onevent] = null;
    document[onevent] = null;
    if (document.body) {
        document.body[onevent] = null;
    }
    window.addEventListener(event, function (event) {
        event.stopPropagation();
    }, true);
    document.addEventListener(event, function (event) {
        event.stopPropagation();
    }, true)
}

function Fuck_switchAttr(selector,source,target) {
    [].forEach.call(document.querySelectorAll(selector),function(el){
        el.setAttribute(target, el.getAttribute(source));
        el.removeAttribute(source)
    })
}

//执行
(function() {
    function NoRedirect(){
         document.querySelectorAll('a[id^="issue_"]').forEach(function (_this) {_this.target = '_blank';});
         document.querySelectorAll('a[href*="AnonymousRedirect"]').forEach(function (_this) {
             _this.target = '_blank';
             var _href = _this.href;
             _href = decodeURIComponent(_href.replace('https://adguardteam.github.io/AnonymousRedirect/redirect.html?url=',''));
             _this.href = _href;
               })}
    if (window.location.host == 'github.com'){
        const observer = new MutationObserver(function () {NoRedirect()});
        observer.observe(document, { childList: true, subtree: true });
      }
    if (hackplus_whitelist["unFuck_UNION"] != 1 && window.location.host != "baike.baidu.com") {
        Fuck_UNION()
    }
    if (hackplus_whitelist["unFuck_ADV"] != 1) {
        if (tempHide[0] != "emCupid") {
            document.insertBefore(tempCssXML, document.documentElement)
        };
        window.observer = new MutationObserver(function () {
            Fuck_ADV()
        });
        window.Timer_FuckRAI = setTimeout(function () {
            Fuck_ADV();
            if (document.readyState == "complete") {
                setTimeout(Fuck_ADV, 1e3);
                window.observer.observe(document.body, {childList: true,subtree: true});
                clearTimeout(window.Timer_FuckRAI);
            } else {
                setTimeout(Fuck_ADV, 500);
                setTimeout(arguments.callee, 50)
            }
        }, 50);
        setTimeout(function(){
            if (window.observer && !window.observer.observe) {
                Fuck_ADV();
                window.observer.observe(document.body, {childList: true,subtree: true});
                clearTimeout(window.Timer_FuckRAI);
            }
        }, 2e4);
    }
    if (hackplus_whitelist["Fuck_XZ"] == 1) {
        document.addEventListener("readystatechange", function () {
            Fuck_XZ("contextmenu");
            Fuck_XZ("selectstart");
            Fuck_XZ("copy");
            window.getSelection = function(){return};
            document.getSelection = function(){return};
        });
        var selectStyle = "html,body,div,* {-webkit-user-select:text!important;-moz-user-select:text!important;-ms-user-select:text!important;user-select:text!important;-khtml-user-select:text!important} ::selection {color:#fff; background:#3390FF!important}"
        var xmlStyle = document.createProcessingInstruction("xml-stylesheet", 'type="text/css" href="data:text/css,' + encodeURIComponent(selectStyle) + '"');
        document.insertBefore(xmlStyle, document.documentElement);//document.documentElement = 前，null = 后
    };
    if (hackplus_whitelist["Fuck_WRS"] !== 1) {
        Fuck_WRS()
    }
})();

//设置
(function () {
    var OxConfigStyle =  document.createElement("style");
    OxConfigStyle.innerHTML = '.OxOOOOOA{display:block;margin:20px 50px}.OxOOOOOA .OxOOOOOA-slider{position:relative;display:inline-block;height:8px;width:32px;background:#d5d5d5;border-radius:8px;cursor:pointer;-webkit-transition:all .2s ease;transition:all .2s ease}.OxOOOOOA .OxOOOOOA-slider:after{position:absolute;left:-8px;top:-8px;display:block;width:24px;height:24px;border-radius:50%;background:#eee;box-shadow:0 2px 2px rgba(0,0,0,.2);content:" ";-webkit-transition:all .2s ease;transition:all .2s ease}.OxOOOOOA .OxOOOOOA-input{display:none}.OxOOOOOA .OxOOOOOA-input~.OxOOOOOA-label{margin-left:8px;display:inline;font-weight:normal}.OxOOOOOA .OxOOOOOA-input:checked~.OxOOOOOA-slider:after{left:16px}.OxOOOOOA .OxOOOOOA-input:disabled~.OxOOOOOA-slider{background:#e2e2e2;cursor:default}.OxOOOOOA .OxOOOOOA-input:disabled~.OxOOOOOA-slider:after{background:#d5d5d5}.OxOOOOOA.OxOOOOOB .OxOOOOOA-input:checked:not(:disabled)~.OxOOOOOA-slider{background:#28e1bd}.OxOOOOOA.OxOOOOOB .OxOOOOOA-input:checked:not(:disabled)~.OxOOOOOA-slider:after{background:#1abc9c}#OxOOOOOO{border:2px solid #1abc9c;border-left-width:10px;box-shadow:2px 2px 5px rgba(26,188,156,.4);width:340px;padding-left:40px;position:fixed;top:calc(50% - 107px);left:calc(50% - 170px);z-index:240088290;background:#FFF url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAACNCAMAAADctOmQAAAAM1BMVEX///8avJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwr6QpGAAAAEXRSTlMATUhEPzo1MCsnIh0YEw4KBdDNbrgAAARxSURBVHgB7ZnplrQoDEATFjFChPd/2u+0TexYxKbGnn3m/rS8LCEgUADxG+CkrBEP/JIbnOA3QIc8alJ9X94DvkLvytnhSGpvyTuapEPmL9LnYz4BgObQhuAKGU9XvKNO5YYdv3IDgFoSdpapvI2NrFGqnsn9xQyaXvk2k90ZWo2XdscvPp95nZ5mbCDjB3E2zipZFFX/PJEdXBHpSc2SdWEi94AVM5siAH8DwCJ1KCRlN5iQrUSO5xiElHe4x+MB64rDmZ5HOCNxA5NitLAtMvgo+LRZTUiIrsAL1MvDC5FKgyvBG2XmFZSs8MvGoGhwC28p4khcSwVFoSUejE2rAQ0cdDihJjGMQxcyRTcuvS0Zi+cgx+NV3tbolLx7HPG7KUNlSkEtvQ4tXH1ttgqeyM2jTVCDiRYygUzyZysXS/3M+YZCoMLMhSJ2vJkkOtW34cMIdenPyiCHNe+TpVfNU1XhQgwneuld4Uq8rp5xzRUM7KW3SLxlHlhMV09VKn9QzbeutOvjnaJTg9Tea/ZBHtIoVR2wZAfM3LCoCC/WUJEMlWT+SGgqSRYjSXaAqlwXo1P2ZUsSKB/pGXR6SjmLDPS+ye80mxi1l8ugKO4c3xbQJp6dcs36DCLrkBgRIRVaRTrbDbu3XXsf8vq4reM4NjVhI7wQL8Nbk267S1WeW1kgw6siwZTiB4l43FSR4a4woY+F20DRyElQprYEQFGXmSu2+V3e4cdUvqfCBMJ7aHY0msj4Df8aOcbklMyffC2gjlh4GaoqU2ScD196ZLDhBdF+aU/WLwqONy+0HPBCrO+qdXU4kOqN6ovubNQKk8NOgk7Vqo6TrtRTOxYd7HQ1DaqgelKgI68P6gZX1Ko29PGqxgyv9CKbNTA6wxIzZ9LwIS8MFtkr2Zu57db6eDEQnsn8Df/YxWDCj+QouL6lOfDvycMx44D+Mjk9kXFXZ/MAkOM9edgOuNzO3ejyfm5Xhy/k9+XhxQBTWZFQ4/a5rCn+9aA6lxVM8YNlq08XAxu1VaS/XsZvuJP/lyPM+ZFMH+SHsvBc1hvp+kwW/jJZgvgXHBOEnWnkHbnlBU3ekDeH+FROiI9lwudykzZHM2BM9zCUXkqDB5B8D5/L9BM5wSOkzzCj75dZB0ei7RIVfgWEolIwbO2t1JdKA15wBEKayYQDYdfnQJv7wt0OQk7+Vt7QxF0Cx0wDskeyiDAnoRAWIn3zXmBGxQ7V11Nl6H+XbqBpzA06m4qPkLu996s2z9DhdDTMp6qvLrV72tt57x6b/CsjrJNLU7U1TYcbXuOpKzb+4HOq9+vN8eWIjNom1/64qKvgXawgiaCuqFnPvi7r+Ry72uS+svS3lKxqDl0mPQT17AB1uSpZ9bnLq5rZq16d+pafiJKSY3+x4AeOoQaV8V0qsJqfmD4GvT7FphanBvsoS6y9muo6Y/ev3PCjDOzOq6E0TPJ+uvFN2qBl+T3CARl/Q2Unk2ExZGjRy9ypFIa7jCYHhbaYB7EKisbwm/kFWdw9qasmoxkAAAAASUVORK5CYII=) repeat-y;text-align:left;color:#666;font-size:16px;border-radius:10px}.OxCloseBtn{width:20px;height:20px;fill:#1abc9c;stroke:#1abc9c;cursor:pointer;float:right;margin:10px;transition:0.5s} .OxCloseBtn:hover{fill:#F50000;stroke:#F50000;transform:rotate(180deg)}';
    var OxConfig= document.createElement("div");
    OxConfig.id = "OxOOOOOO";
    OxConfig.innerHTML = '<div class="OxCloseBtn"><svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 32 32"><g><path d="M0.014,1.778L1.79,0.001l30.196,30.221l-1.778,1.777L0.014,1.778z"/><path d="M1.79,31.999l-1.776-1.777L30.208,0.001l1.778,1.777L1.79,31.999z"/></g></svg></div><div class="OxOOOOOA OxOOOOOB"><input id="unFuck_ADV" class="OxOOOOOA-input" type="checkbox" /><label for="unFuck_ADV" class="OxOOOOOA-slider"></label><label for="unFuck_ADV" class="OxOOOOOA-label"> banner广告白名单</label></div><div class="OxOOOOOA OxOOOOOB"><input id="unFuck_UNION" class="OxOOOOOA-input" type="checkbox" /><label for="unFuck_UNION" class="OxOOOOOA-slider"></label><label for="unFuck_UNION" class="OxOOOOOA-label"> 联盟广告白名单</label></div><div class="OxOOOOOA OxOOOOOB"><input id="Fuck_WRS" class="OxOOOOOA-input" type="checkbox" /><label for="Fuck_WRS" class="OxOOOOOA-slider"></label><label for="Fuck_WRS" class="OxOOOOOA-label"> 禁用脚本write(ln)白名单</label></div><div class="OxOOOOOA OxOOOOOB"><input id="Fuck_XZ" class="OxOOOOOA-input" type="checkbox" /><label for="Fuck_XZ" class="OxOOOOOA-slider"></label><label for="Fuck_XZ" class="OxOOOOOA-label"> 解除限制</label></div><div class="OxOOOOOA OxOOOOOB"><input id="Fuck_removeHref" class="OxOOOOOA-input tmp-active" type="checkbox" /><label for="Fuck_removeHref" class="OxOOOOOA-slider"></label><label for="Fuck_removeHref" class="OxOOOOOA-label"> 临时去除A链接</label></div>';
    var setting = function(){
            var OxConfigDIV = document.getElementById("OxOOOOOO");
            if (!OxConfigDIV) {
                    document.body.appendChild(OxConfig);
                    OxConfig.appendChild(OxConfigStyle);
                    if (window.screen.height > window.screen.width){OxConfig.style.left= parseInt((window.screen.width-OxConfig.offsetWidth)/2) + "px"}
                    if (hackplus_whitelist["unFuck_ADV"] == 1){document.getElementById("unFuck_ADV").setAttribute("checked", "checked")}
                    if (hackplus_whitelist["unFuck_UNION"] == 1){document.getElementById("unFuck_UNION").setAttribute("checked", "checked")}
                    if (hackplus_whitelist["Fuck_WRS"] == 1){document.getElementById("Fuck_WRS").setAttribute("checked", "checked")}
                    if (hackplus_whitelist["Fuck_XZ"] == 1){document.getElementById("Fuck_XZ").setAttribute("checked", "checked")}
                    [].forEach.call(document.querySelectorAll("#OxOOOOOO input:not(.tmp-active)"), function (checkbox){
                        checkbox.onclick = function(){checkbox_onClick(checkbox)};
                    });
                    var OxCloseBtn = document.querySelector(".OxCloseBtn");
                    OxCloseBtn.onclick = function(){
                        if(JSON.stringify(hackplus_whitelist) != hackplus_whitelistJSON_temp) {
                            var c_msg = "设置已改变，尚未生效，是否刷新页面？";
                            if (confirm(c_msg)==true) location.reload()
                        }
                        document.body.removeChild(OxConfig);
                    };
                    document.querySelector('#Fuck_removeHref').onclick = function(){
                        if(this.checked) {
                            Fuck_switchAttr('a[href]','href','x-href')
                        } else {
                            Fuck_switchAttr('a[x-href]','x-href','href');
                        }
                        setTimeout(function(){
                            document.body.removeChild(document.getElementById("OxOOOOOO"))
                        },500)
                    }
			}else if (OxConfigDIV) {
                    document.body.removeChild(OxConfigDIV);
            }
     }
    document.addEventListener("keydown", function (event) {
        var e = event || window.event || arguments.callee.caller.arguments[0];
        if (e.keyCode == 38 && e.ctrlKey) {
         setting();
        }
    })
    var floatWindowcss = "#hack-plus-container {\n  z-index: 999999 !important;\n  text-align: left !important; }\n  @media print {\n    #hack-plus-container {\n      display: none; } }\n\n#hack-plus-container * {\n  font-size: 13px !important;\n  color: black !important;\n  float: none !important;\n  line-height: 13px !important;\n  width: auto; }\n\n#hack-plus-main-head {\n  position: relative !important;\n  top: 0 !important;\n  left: 0 !important; }\n\n#hack-plus-span-info {\n  position: absolute !important;\n  right: 1px !important;\n  top: 0 !important;\n  font-size: 11px !important;\n  line-height: 11px !important;\n  background: none !important;\n  font-style: italic !important;\n  color: #5a5a5a !important;\n  text-shadow: white 0px 1px 1px !important; }\n\n#hack-plus-main select {\n  background: white;\n  height: auto; }\n\n#hack-plus-container input {\n  vertical-align: middle !important;\n  display: inline-block !important;\n  outline: none !important;\n  padding: 0px !important;\n  margin: 0 !important;\n  margin-right: 3px !important;\n  background: white;\n  border: 1px solid gray;\n  cursor: pointer !important;\n  height: auto; }\n\n#hack-plus-container input[type='number'] {\n  width: 6ch !important;\n  text-align: left !important;\n  margin: 0 3px !important; }\n\n#hack-plus-container input[type='number']:hover::-webkit-inner-spin-button {\n  height: 60px; }\n\n#hack-plus-container input[type='checkbox'] {\n  position: static !important; }\n\n#hack-plus-container input[type='button'] {\n  width: auto !important;\n  height: auto !important; }\n\n#hack-plus-container li {\n  list-style: none !important;\n  margin: 3px 0 !important;\n  border: none !important;\n  float: none !important; }\n\n#hack-plus-container fieldset {\n  border: 2px groove #ccc !important;\n  -moz-border-radius: 3px !important;\n  border-radius: 3px !important;\n  padding: 4px 9px 6px 9px !important;\n  margin: 2px !important;\n  display: block !important;\n  width: auto !important;\n  height: auto !important; }\n\n#hack-plus-container legend {\n  line-height: 20px !important;\n  margin-bottom: 0px !important; }\n\n#hack-plus-container fieldset > ul {\n  padding: 0 !important;\n  margin: 0 !important; }\n\n#hack-plus-container ul#hack-plus-a_useiframe-extend {\n  padding-left: 40px !important; }\n\n#hack-plus-rect {\n  position: relative !important;\n  top: 0 !important;\n  left: 0 !important;\n  float: right !important;\n  height: 10px !important;\n  width: 10px !important;\n  padding: 0 !important;\n  margin: 0 !important;\n  -moz-border-radius: 3px !important;\n  border-radius: 3px !important;\n  border: 1px solid white !important;\n  -webkit-box-shadow: inset 0 5px 0 rgba(255, 255, 255, 0.3), 0 0 3px rgba(0, 0, 0, 0.8) !important;\n  -moz-box-shadow: inset 0 5px 0 rgba(255, 255, 255, 0.3), 0 0 3px rgba(0, 0, 0, 0.8) !important;\n  box-shadow: inset 0 5px 0 rgba(255, 255, 255, 0.3), 0 0 3px rgba(0, 0, 0, 0.8) !important;\n  opacity: 0.8 !important; }\n\n#hack-plus-dot,\n#hack-plus-cur-mode {\n  position: absolute !important;\n  z-index: 9999 !important;\n  width: 5px !important;\n  height: 5px !important;\n  padding: 0 !important;\n  -moz-border-radius: 3px !important;\n  border-radius: 3px !important;\n  border: 1px solid white !important;\n  opacity: 1 !important;\n  -webkit-box-shadow: inset 0 -2px 1px rgba(0, 0, 0, 0.3), inset 0 2px 1px rgba(255, 255, 255, 0.3), 0px 1px 2px rgba(0, 0, 0, 0.9) !important;\n  -moz-box-shadow: inset 0 -2px 1px rgba(0, 0, 0, 0.3), inset 0 2px 1px rgba(255, 255, 255, 0.3), 0px 1px 2px rgba(0, 0, 0, 0.9) !important;\n  box-shadow: inset 0 -2px 1px rgba(0, 0, 0, 0.3), inset 0 2px 1px rgba(255, 255, 255, 0.3), 0px 1px 2px rgba(0, 0, 0, 0.9) !important; }\n\n#hack-plus-dot {\n  right: -3px !important;\n  top: -3px !important; }\n\n#hack-plus-cur-mode {\n  left: -3px !important;\n  top: -3px !important;\n  width: 6px !important;\n  height: 6px !important; }\n\n#hack-plus-content {\n  padding: 0 !important;\n  margin: 5px 5px 0 0 !important;\n  -moz-border-radius: 3px !important;\n  border-radius: 3px !important;\n  border: 1px solid #a0a0a0 !important;\n  -webkit-box-shadow: -2px 2px 5px rgba(0, 0, 0, 0.3) !important;\n  -moz-box-shadow: -2px 2px 5px rgba(0, 0, 0, 0.3) !important;\n  box-shadow: -2px 2px 5px rgba(0, 0, 0, 0.3) !important; }\n\n#hack-plus-main {\n  padding: 5px !important;\n  border: 1px solid white !important;\n  -moz-border-radius: 3px !important;\n  border-radius: 3px !important;\n  background-color: #f2f2f7 !important;\n  background: -moz-linear-gradient(top, #fcfcfc, #f2f2f7 100%) !important;\n  background: -webkit-gradient(linear, 0 0, 0 100%, from(#fcfcfc), to(#f2f2f7)) !important; }\n\n#hack-plus-foot {\n  position: relative !important;\n  left: 0 !important;\n  right: 0 !important;\n  top: 2px !important;\n  padding-left: 2px;\n  min-height: 20px !important; }\n\n#hack-plus-container .hack-plus-spanbutton {\n  padding: 2px 3px !important;\n  border: 1px solid #ccc !important;\n  -moz-border-radius: 3px !important;\n  border-radius: 3px !important;\n  cursor: pointer !important;\n  background-color: #f9f9f9 !important;\n  -webkit-box-shadow: inset 0 10px 5px white !important;\n  -moz-box-shadow: inset 0 10px 5px white !important;\n  box-shadow: inset 0 10px 5px white !important;\n  display: inline-block; }\n\n#hack-plus-container #hack-plus-savebutton {\n  position: absolute !important;\n  right: 2px !important; }\n\n#hack-plus-container label {\n  cursor: pointer;\n  user-select: none;\n  display: inline; }\n";
	  var floatWindowdiv='<div id="hack-plus-container" style="position: fixed; top: 45px; right: 25px;cursor: pointer"><div id="hack-plus-rect" style="background-color: rgb(85, 100, 175);" title="hack_plus设置"></div></div>'
    function addStyle(aCss, aId, doc) {
	    doc = doc || document;
	    var head = doc.getElementsByTagName('head');
      if (!head) { head = doc.documentElement;} else {head = head[0];}
      var style = doc.createElement('style');
      if (aId) {style.setAttribute('id', aId);}
      style.setAttribute('type', 'text/css');
	    style.textContent = aCss;
	    if (head) { return head.appendChild(style);} else {return null;}
	    }
    function floatWindow() {
	    addStyle(floatWindowcss);
	    var div = document.createElement('div');
	    div.id = 'hack-plus-container';
	    div.innerHTML = floatWindowdiv;
	    document.body.appendChild(div);
      div.onclick = setting;
	    }
	   if (window.screen.height > window.screen.width) { 
	          $(document).ready(function(){
	            if(top.location == self.location){floatWindow();}
	           });
	        }
    
})();

(function () {
    var XgetSelection = window.getSelection;
    var Fuck_Tooltip = document.createElement('div');
    Fuck_Tooltip.id = 'Fuck_Tooltip';
    Fuck_Tooltip.style.display = 'none';
    // 鼠标事件：防止选中的文本消失
    document.addEventListener('mousedown', function (e) {
        if (e.target == Fuck_Tooltip || (e.target.parentNode && e.target.parentNode == Fuck_Tooltip) || (e.target.parentNode.parentNode && e.target.parentNode.parentNode == Fuck_Tooltip)) { // 点击了图标
            e.preventDefault();
        }
    });
    // 选中变化事件
    document.addEventListener("selectionchange", function () {
        if (!XgetSelection().toString().trim()) {
            Fuck_Tooltip.style.display = 'none';
        }
    });
    // 鼠标事件：防止选中的文本消失；显示、隐藏图标
    document.addEventListener('mouseup', function (e) {
        if (e.target == Fuck_Tooltip || (e.target.parentNode && e.target.parentNode == Fuck_Tooltip) || (e.target.parentNode.parentNode && e.target.parentNode.parentNode == Fuck_Tooltip)) { // 点击了图标
            e.preventDefault();
            return;
        }
        var text = XgetSelection().toString().trim();
        if (text && Fuck_Tooltip.style.display == 'none' && e.ctrlKey) {
            Fuck_Tooltip.style.top = e.pageY + 12 + 'px';
            Fuck_Tooltip.style.left = e.pageX + 'px';
            if(!document.querySelector('#Fuck_Tooltip')){
                // 添加图标到 DOM
                document.documentElement.appendChild(Fuck_Tooltip);
            }
            Fuck_Tooltip.style.display = 'block';
            try {
                if ($$customSurl && $$customStext) {
                    var customSearch = '<a href="' + $$customSurl.replace("%s",  encodeURIComponent(text) ) + '" target="blank">' + $$customStext.trim() + '</a> | ';
                } else {
                    var customSearch = '';
                }
            } catch (e) {
                var customSearch = '';
            }
            Fuck_Tooltip.innerHTML = customSearch + '<a href="https://www.baidu.com/s?wd=site%3A' + getDoamin + '%20' + encodeURIComponent(text) + '" target="_blank">本站百度</a> | <a href="https://z1.m1907.cn/?jx=' + encodeURIComponent(text) + '" target="_blank">影片搜索</a><style>#Fuck_Tooltip{padding:8px;background:rgba(3, 3 , 7, 0.7);color:#FFF;border-radius:3px;box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);font-size:13px;text-align:center;line-height:13px;position:absolute;z-index:10203040}#Fuck_Tooltip a{color:#fadfa3;text-decoration:none}</style>';
        } else if (!text) {
            Fuck_Tooltip.style.display = 'none';
        }
    })
})();