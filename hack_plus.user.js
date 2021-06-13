// ==UserScript==
// @name         朝朝暮暮plus
// @version      1.9.0613
// @author       汝莫舞
// @description  一些浏览器增强功能及辅助移除广告，Ctrl+↑脚本设置。
// @match        *://*/*
// @namespace    emCupid
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @run-at       document-start
// @exclude      *://*.taobao.com*
// @exclude      *://*.tmall.com*
// @exclude      *://*.1688.com*
// @exclude      *://*.jd.com*
// @exclude      *://*.suning.com*
// @exclude      *://*.dangdang.com*
// @exclude      *://*.mogu.com*
// @exclude      *//graph.baidu.com/*similar*
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
            return window['_getMainHost'] = mainHost;
        }
    }
})();

//var localStorage = {
//    getItem : function (name, defaultValue) {
//        return GM_getValue(name, defaultValue)
//    },
//    setItem : function (name, value) {
//        return GM_setValue(name, value)
//    },
//    removeItem : function (name) {
//        return GM_deleteValue(name)
//    },
//    listItem : function () {
//        return GM_listValues()
//    }
//};
//debug GM_Value
unsafeWindow._GM_getValue = GM_getValue;
unsafeWindow._GM_setValue = GM_setValue;
unsafeWindow._GM_deleteValue = GM_deleteValue;
unsafeWindow._GM_listValues = GM_listValues;

function checkbox_onClick(checkbox) {
    if (checkbox.checked) {
        hackplus_whitelist[checkbox.id] = 1;
    } else {
        delete hackplus_whitelist[checkbox.id];
    }
    localStorage.setItem("$" + getDoamin + "$", JSON.stringify(hackplus_whitelist));
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
var getDoamin = window._getMainHost || window.location.host,
    MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver,
    hackplus_whitelistJSON = localStorage.getItem("$" + getDoamin + "$") || "{}",
    hackplus_whitelist = JSON.parse(hackplus_whitelistJSON),
    iframeSRC_whitelist = [
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
    scriptWRS_W = new RegExp(scriptWRS_whitelist.join("|","i"));
if (hackplus_whitelistJSON == "{}") {
    localStorage.removeItem("$" + getDoamin + "$")
}
//--功能模块定义[end]--//


function Fuck_ADV(){
    [].forEach.call(document.querySelectorAll('a[target] img:not([src*="avatar"]),a[style] img:not([src*="avatar"]),a[onclick] img:not([src*="avatar"]),a[href*="javascript"] img:not([src*="avatar"]),a[rel*="nofollow"] img:not([src*="avatar"]),a img[style*="display"][style*="block"],a:not([href*="' + getDoamin.split('.')[0] + '."]):not([href^="/"]) img'), function (Nodeitem) {
        Fuck_removeAD(Nodeitem, 580, 1800, 40, 140, 2);
        Fuck_removeAD(Nodeitem, 40, 150, 300, 650, 2, "#08E")
    });
    [].forEach.call(document.getElementsByTagName('iframe'), function (Nodeitem) {
        if (!iframeSRC.test(Nodeitem.src) && Nodeitem.getAttribute("src") && Nodeitem.offsetWidth >= 600 && Nodeitem.offsetWidth <= 1500 && Nodeitem.offsetHeight >= 40 && Nodeitem.offsetHeight <= 180) {
            //if (Nodeitem.parentNode.children.length <= 2) {
            //    Nodeitem.parentNode.parentNode.removeChild(Nodeitem.parentNode);
            //}
            Nodeitem.parentNode.removeChild(Nodeitem);
            console.log('%c[Remove ADiframe] ✂%O', 'border-left:5px solid #0B0;color:#0B0;padding:3px', Nodeitem, Nodeitem.src);
        }
    });
}

function Fuck_WRS() {
    document.Rwrite = document.write;
    document.write = function (str) {
        if (!scriptWRS_B.test(str) || scriptWRS_W.test(str)) {
            document.Rwrite(str);
        } else {
            console.log('%c[Block Script Write] ✂', 'border-left:5px solid #A0B;color:#A0B;padding:3px', str);
        }
    };
    document.Rwriteln = document.writeln;
    document.writeln = function (str) {
        if (!scriptWRS_B.test(str) || scriptWRS_W.test(str)) {
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

//执行
(function() {
    if (hackplus_whitelist["unFuck_ADV"] != 1){
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
                setTimeout(arguments.callee, 0)
            }
        }, 20);
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
    };
    if (hackplus_whitelist["Fuck_WRS"] == 1) {
        Fuck_WRS()
    }
})();

//设置
(function () {
    var OxConfigStyle =  document.createElement("style");
    OxConfigStyle.innerHTML = '.OxOOOOOA{display:block;margin:20px 50px}.OxOOOOOA .OxOOOOOA-slider{position:relative;display:inline-block;height:8px;width:32px;background:#d5d5d5;border-radius:8px;cursor:pointer;-webkit-transition:all .2s ease;transition:all .2s ease}.OxOOOOOA .OxOOOOOA-slider:after{position:absolute;left:-8px;top:-8px;display:block;width:24px;height:24px;border-radius:50%;background:#eee;box-shadow:0 2px 2px rgba(0,0,0,.2);content:" ";-webkit-transition:all .2s ease;transition:all .2s ease}.OxOOOOOA .OxOOOOOA-input{display:none}.OxOOOOOA .OxOOOOOA-input~.OxOOOOOA-label{margin-left:8px;display:inline;font-weight:normal}.OxOOOOOA .OxOOOOOA-input:checked~.OxOOOOOA-slider:after{left:16px}.OxOOOOOA .OxOOOOOA-input:disabled~.OxOOOOOA-slider{background:#e2e2e2;cursor:default}.OxOOOOOA .OxOOOOOA-input:disabled~.OxOOOOOA-slider:after{background:#d5d5d5}.OxOOOOOA.OxOOOOOB .OxOOOOOA-input:checked:not(:disabled)~.OxOOOOOA-slider{background:#28e1bd}.OxOOOOOA.OxOOOOOB .OxOOOOOA-input:checked:not(:disabled)~.OxOOOOOA-slider:after{background:#1abc9c}#OxOOOOOO{border:2px solid #1abc9c;border-left-width:10px;box-shadow:2px 2px 5px rgba(26,188,156,.4);width:340px;padding-left:40px;position:fixed;top:calc(50% - 77px);left:calc(50% - 170px);z-index:240088290;background:#FFF url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADwAAACNCAMAAADctOmQAAAAM1BMVEX///8avJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwr6QpGAAAAEXRSTlMATUhEPzo1MCsnIh0YEw4KBdDNbrgAAARxSURBVHgB7ZnplrQoDEATFjFChPd/2u+0TexYxKbGnn3m/rS8LCEgUADxG+CkrBEP/JIbnOA3QIc8alJ9X94DvkLvytnhSGpvyTuapEPmL9LnYz4BgObQhuAKGU9XvKNO5YYdv3IDgFoSdpapvI2NrFGqnsn9xQyaXvk2k90ZWo2XdscvPp95nZ5mbCDjB3E2zipZFFX/PJEdXBHpSc2SdWEi94AVM5siAH8DwCJ1KCRlN5iQrUSO5xiElHe4x+MB64rDmZ5HOCNxA5NitLAtMvgo+LRZTUiIrsAL1MvDC5FKgyvBG2XmFZSs8MvGoGhwC28p4khcSwVFoSUejE2rAQ0cdDihJjGMQxcyRTcuvS0Zi+cgx+NV3tbolLx7HPG7KUNlSkEtvQ4tXH1ttgqeyM2jTVCDiRYygUzyZysXS/3M+YZCoMLMhSJ2vJkkOtW34cMIdenPyiCHNe+TpVfNU1XhQgwneuld4Uq8rp5xzRUM7KW3SLxlHlhMV09VKn9QzbeutOvjnaJTg9Tea/ZBHtIoVR2wZAfM3LCoCC/WUJEMlWT+SGgqSRYjSXaAqlwXo1P2ZUsSKB/pGXR6SjmLDPS+ye80mxi1l8ugKO4c3xbQJp6dcs36DCLrkBgRIRVaRTrbDbu3XXsf8vq4reM4NjVhI7wQL8Nbk267S1WeW1kgw6siwZTiB4l43FSR4a4woY+F20DRyElQprYEQFGXmSu2+V3e4cdUvqfCBMJ7aHY0msj4Df8aOcbklMyffC2gjlh4GaoqU2ScD196ZLDhBdF+aU/WLwqONy+0HPBCrO+qdXU4kOqN6ovubNQKk8NOgk7Vqo6TrtRTOxYd7HQ1DaqgelKgI68P6gZX1Ko29PGqxgyv9CKbNTA6wxIzZ9LwIS8MFtkr2Zu57db6eDEQnsn8Df/YxWDCj+QouL6lOfDvycMx44D+Mjk9kXFXZ/MAkOM9edgOuNzO3ejyfm5Xhy/k9+XhxQBTWZFQ4/a5rCn+9aA6lxVM8YNlq08XAxu1VaS/XsZvuJP/lyPM+ZFMH+SHsvBc1hvp+kwW/jJZgvgXHBOEnWnkHbnlBU3ekDeH+FROiI9lwudykzZHM2BM9zCUXkqDB5B8D5/L9BM5wSOkzzCj75dZB0ei7RIVfgWEolIwbO2t1JdKA15wBEKayYQDYdfnQJv7wt0OQk7+Vt7QxF0Cx0wDskeyiDAnoRAWIn3zXmBGxQ7V11Nl6H+XbqBpzA06m4qPkLu996s2z9DhdDTMp6qvLrV72tt57x6b/CsjrJNLU7U1TYcbXuOpKzb+4HOq9+vN8eWIjNom1/64qKvgXawgiaCuqFnPvi7r+Ry72uS+svS3lKxqDl0mPQT17AB1uSpZ9bnLq5rZq16d+pafiJKSY3+x4AeOoQaV8V0qsJqfmD4GvT7FphanBvsoS6y9muo6Y/ev3PCjDOzOq6E0TPJ+uvFN2qBl+T3CARl/Q2Unk2ExZGjRy9ypFIa7jCYHhbaYB7EKisbwm/kFWdw9qasmoxkAAAAASUVORK5CYII=) no-repeat;text-align:left;color:#666;font-size:16px}';
    var OxConfig= document.createElement("div");
    OxConfig.id = "OxOOOOOO";
    OxConfig.innerHTML = '<div class="OxOOOOOA OxOOOOOB"><input id="unFuck_ADV" class="OxOOOOOA-input" type="checkbox" /><label for="unFuck_ADV" class="OxOOOOOA-slider"></label><label for="unFuck_ADV" class="OxOOOOOA-label"> banner广告白名单</label></div><div class="OxOOOOOA OxOOOOOB"><input id="Fuck_WRS" class="OxOOOOOA-input" type="checkbox" /><label for="Fuck_WRS" class="OxOOOOOA-slider"></label><label for="Fuck_WRS" class="OxOOOOOA-label"> 禁用脚本write(ln)</label></div><div class="OxOOOOOA OxOOOOOB"><input id="Fuck_XZ" class="OxOOOOOA-input" type="checkbox" /><label for="Fuck_XZ" class="OxOOOOOA-slider"></label><label for="Fuck_XZ" class="OxOOOOOA-label"> 解除限制</label></div>';
    document.addEventListener("keydown", function (event) {
        var e = event || window.event || arguments.callee.caller.arguments[0];
        if (e.keyCode == 38 && e.ctrlKey) {
            var OxConfigDIV = document.getElementById("OxOOOOOO");
            if (!OxConfigDIV) {
                    document.body.appendChild(OxConfig);
                    OxConfig.appendChild(OxConfigStyle);
                    if (hackplus_whitelist["unFuck_ADV"] == 1){document.getElementById("unFuck_ADV").setAttribute("checked", "checked")}
                    if (hackplus_whitelist["Fuck_WRS"] == 1){document.getElementById("Fuck_WRS").setAttribute("checked", "checked")}
                    if (hackplus_whitelist["Fuck_XZ"] == 1){document.getElementById("Fuck_XZ").setAttribute("checked", "checked")}
                    [].forEach.call(document.querySelectorAll("#OxOOOOOO input"), function (checkbox){
                        checkbox.onclick = function(){checkbox_onClick(checkbox)};
                    });
			}else if (OxConfigDIV) {
                    document.body.removeChild(OxConfigDIV);
            }
        }
    })
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
})()