// ==UserScript==
// @name         去联盟广告
// @version      1.0.0
// @author       汝莫舞
// @description  简单阻止一些联盟广告的加载
// @match        *://*
// @grant        none
// @run-at       document-start
// @exclude      *://baike.baidu.com/*
// ==/UserScript==

var push_error = function (e) {
    return function () {
        console.error("Block " + e + " push Ad(s)")
    }
};
window._SF_ = [];
window._SF_._global_ = [];
window._SF_._global_._ssp = [];
Object.freeze(window._SF_);
Object.freeze(window._SF_._global_);
Object.freeze(window._SF_._global_._ssp);
window._ssp_global = [];
Object.freeze(window._ssp_global);
window.AD = {};
Object.freeze(window.AD);
window.Ad = {};
Object.freeze(window.Ad);
window.ad = {};
Object.freeze(window.ad);
window.___baidu_union_ = {}
Object.freeze(window.___baidu_union_)
window.___baidu_union_ds_ = {};
Object.freeze(window.___baidu_union_ds_);
window.__delivery_global_ = {};
Object.freeze(window.__delivery_global_)
window.___delivery___global___counter___ = {};
Object.freeze(window.___delivery___global___counter___);
window.cproArray = {};
window.cproArray.push = push_error("Baidu");
Object.freeze(cproArray);
window.arrBaiduAds = {};
window.arrBaiduAds.push = push_error("Baidu");
Object.freeze(arrBaiduAds);
window.slotbydup = {};
window.slotbydup.push = push_error("Baidu SSP");
window._qha_data = {};
Object.freeze(window._qha_data);
window.sinaads = {};
window.sinaads.push = push_error("Sina");
Object.freeze(window.sinaads);
window.sogou_un = {};
Object.freeze(window.sogou_un)