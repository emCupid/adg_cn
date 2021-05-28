// ==UserScript==
// @name         朝朝暮暮plus
// @version      1.4.0528
// @author       汝莫舞
// @description  一些浏览器增强功能及辅助移除广告，Ctrl+↑脚本设置。
// @match        *://*/*
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

function Fuck_testDomain(arr) {
    var regex = new RegExp('^' + arr, 'i');
    return regex.test(location.href.replace(/https?:\/\//i, ''))
}

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
var browser_UA = navigator.userAgent,
    getDoamin = window.HackPlus_getMainHost || window.location.host,
    getHostname = window.location.host,
    iframeSRC = /(upload|player|comment|\/\/tushuo.baidu.com|\/\/zhannei.baidu.com\/|frame-vip.min.html|jiexi.php|\/\/widget.weibo.com|.china.com.cn\/node_|lanzou..com\/fn\?|\/soft|\/login|vip\.php\?url=|\/vip\/index\.php\?url=|\/index\.php\?url=https?:\/\/)/i,
    MutationObserver = window.MutationObserver || window.WebKitMutationObserver || window.MozMutationObserver,
    hackplus_whitelistJSON = localStorage.getItem("$" + getDoamin + "$") || "{}",
    hackplus_whitelist = JSON.parse(hackplus_whitelistJSON);
if (hackplus_whitelistJSON == "{}") {
    localStorage.removeItem("$" + getDoamin + "$")
}
//--功能模块定义[end]--//


function Fuck_ADV(){
    if (hackplus_whitelist["unFuck_ADV"] != 1){
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
}

(function() {
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
})();

//设置
(function () {
    var OxConfigStyle =  document.createElement("style");
    OxConfigStyle.innerHTML = '.OxOOOOOA{display:block;margin:20px 50px}.OxOOOOOA .OxOOOOOA-slider{position:relative;display:inline-block;height:8px;width:32px;background:#d5d5d5;border-radius:8px;cursor:pointer;-webkit-transition:all .2s ease;transition:all .2s ease}.OxOOOOOA .OxOOOOOA-slider:after{position:absolute;left:-8px;top:-8px;display:block;width:24px;height:24px;border-radius:50%;background:#eee;box-shadow:0 2px 2px rgba(0,0,0,.2);content:" ";-webkit-transition:all .2s ease;transition:all .2s ease}.OxOOOOOA .OxOOOOOA-input{display:none}.OxOOOOOA .OxOOOOOA-input~.OxOOOOOA-label{margin-left:8px;display:inline;font-weight:normal}.OxOOOOOA .OxOOOOOA-input:checked~.OxOOOOOA-slider:after{left:16px}.OxOOOOOA .OxOOOOOA-input:disabled~.OxOOOOOA-slider{background:#e2e2e2;cursor:default}.OxOOOOOA .OxOOOOOA-input:disabled~.OxOOOOOA-slider:after{background:#d5d5d5}.OxOOOOOA.OxOOOOOB .OxOOOOOA-input:checked:not(:disabled)~.OxOOOOOA-slider{background:#28e1bd}.OxOOOOOA.OxOOOOOB .OxOOOOOA-input:checked:not(:disabled)~.OxOOOOOA-slider:after{background:#1abc9c}#OxOOOOOO{border:2px solid #1abc9c;border-left-width:10px;box-shadow:2px 2px 5px rgba(26,188,156,.4);width:340px;padding-left:40px;position:fixed;top:calc(50% - 77px);left:calc(50% - 170px);z-index:240088290;background:#FFF url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADMAAACOCAMAAACrK8CzAAAAMFBMVEX///8avJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJwavJxLN1vGAAAAEHRSTlMATUhDPjgzLikkHxoVDwoFHziqSwAAAw9JREFUeAHcmImO5CgMQHkmQEhI+P+/XaEq1psWO/bcM/10oMR6FXO3O/xwjiP8HywY7y+oYRDuImzV4yTgCEMWBls3nQtII96FF8l0dqCNeGUyHpUZC0qCGAYC1NCAYjnAPtrznVWB6HDqaDNwaNjjdIDudDbY3m9LcOa2v7ouc7wiZMu5mcQZPSwn7NM5deittdMzoLNS5LKcwZEgneFNCw5njYQ/nK1e/u2rwbhfX+0wtPOrHUDK6XWumlDt6Oq00TZAW6WfKPnolqM7LDNJXme8n2m6nRctf6VzH1nA7/SjRAZ+RxmrYjqKOprQm39XX631fsxHa/obG6hwBxdTyKag6OT7QVzCXWsNkzPYLMf63pNATPX2OneCSekupwko2+VwLuGBdNvZAMrZx97LAMnc2wcg7ZFns5wMtGcOxXIibOHDpWg5QF3eXU/a9zqRkb9SIFpOec5IFyiW04AcnsNoOSGD3DpdQgkLrpSSPvVt649gDza9h5+D7lM/DfguhwV/uGP/VC8A2x2+6vMVQE6Po5wM6lc4fedF6t45rcJEmstpkUE821CphqOntdRxKiaAZDk7A/Ktj745jU3HT8Dap4DUR3QjGOiVo4vCclILvxMWGME/2HGhf6+1z+HI3GsHiE/RYjJBGs2C1VmV79BHuzunoIvGLqcTKpMUHo6klMvS0WJ53q7K/VL21TFRIpKPtUG6g5f+MrYWXOgBK4ffOCKD2t2buCU9LT2Odr35D4vKoKjhcF5KSUnWe9v4/E910gLLWfE5HYPLKNmUVcm2d99HvlyytZGDgl2yXRsfWJds6xxQpwFyfSzZJpGVU9Ylm9aA7Bp+lmjr5wxcy6ne9V8NH8ovgRyWTtXbSB0NLu+j/b/ODtFyXveROhGylVtlwnw8HmNwLs5peTgFUrDGOlR1Bodcz5H/yEuavD8czLVj0IvfUfpZ85cu9X9qs2MCAAAABkH9W5uAb/Mlguj+S4T+JUb/EqJ/idG/xOhfYvQvMfqXGP1LjP4lRv8So3+J0b/E6F9i9C8xLgtXAB/soa3+xwAAAABJRU5ErkJggg==) no-repeat;text-align:left;color:#666;font-size:16px}';
    var OxConfig= document.createElement("div");
    OxConfig.id = "OxOOOOOO";
    OxConfig.innerHTML = '<div class="OxOOOOOA OxOOOOOB"><input id="unFuck_ADV" class="OxOOOOOA-input" type="checkbox" /><label for="unFuck_ADV" class="OxOOOOOA-slider"></label><label for="unFuck_ADV" class="OxOOOOOA-label"> banner广告白名单</label></div><div class="OxOOOOOA OxOOOOOB"><input id="Fuck_WRS" class="OxOOOOOA-input" type="checkbox" disabled /><label for="Fuck_WRS" class="OxOOOOOA-slider"></label><label for="Fuck_WRS" class="OxOOOOOA-label"> 禁用脚本write</label></div><div class="OxOOOOOA OxOOOOOB"><input id="Fuck_XZ" class="OxOOOOOA-input" type="checkbox" disabled /><label for="Fuck_XZ" class="OxOOOOOA-slider"></label><label for="Fuck_XZ" class="OxOOOOOA-label"> 解除限制</label></div>';
    document.addEventListener("keydown", function (event) {
        var e = event || window.event || arguments.callee.caller.arguments[0];
        if (e.keyCode == 38 && e.ctrlKey) {
            var OxConfigDIV = document.getElementById("OxOOOOOO");
            if (!OxConfigDIV) {
                    document.body.appendChild(OxConfig);
                    OxConfig.appendChild(OxConfigStyle);
                    if (hackplus_whitelist["unFuck_ADV"] == 1){
                        document.getElementById("unFuck_ADV").setAttribute("checked", "checked")
                    }
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
        if (e.target == Fuck_Tooltip || (e.target.parentNode && e.target.parentNode == Fuck_Tooltip) || (e.target.parentNode.parentNode && e.target.parentNode.parentNode == Fuck_Tooltip)) { // 点击了翻译图标
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
        if (e.target == Fuck_Tooltip || (e.target.parentNode && e.target.parentNode == Fuck_Tooltip) || (e.target.parentNode.parentNode && e.target.parentNode.parentNode == Fuck_Tooltip)) { // 点击了翻译图标
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