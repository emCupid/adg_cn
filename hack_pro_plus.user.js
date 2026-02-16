// ==UserScript==
// @name         莫舞Pro Plus
// @version      2.9.7.1
// @author       汝莫舞
// @description  浏览器增强功能及辅助移除广告【Ctrl+↑脚本设置】
// @homepageURL  https://github.com/emCupid/adg_cn
// @match        *://*/*
// @namespace    emCupid
// @grant        unsafeWindow
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-start
// @exclude      *://*.taobao.com*
// @exclude      *://*.tmall.com*
// @exclude      *://*.1688.com*
// @exclude      *://*.jd.com*
// @exclude      *://*.suning.com*
// @exclude      *://*.dangdang.com*
// @exclude      *://*.mogu.com*
// @exclude      *://graph.baidu.com/*similar*
// ==/UserScript==

// 全局获取主域名的函数
const getMainDomain = () => {
    try {
        const key = "mh_" + Math.random().toString(36).substr(2, 9);
        const keyR = new RegExp("(^|;)\\s*" + key + "=12345");
        const expiredTime = new Date(0);
        const domain = document.domain;
        const domainList = domain.split('.');
        const urlItems = [];
        
        urlItems.unshift(domainList.pop());
        while (domainList.length) {
            urlItems.unshift(domainList.pop());
            const mainHost = urlItems.join('.');
            const cookie = key + "=12345;domain=." + mainHost;
            document.cookie = cookie;
            
            if (keyR.test(document.cookie)) {
                document.cookie = cookie + ";expires=" + expiredTime;
                return mainHost;
            }
        }
    } catch (e) {
        // 静默处理错误
    }
    
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    if (parts.length <= 2) {
        return hostname;
    }
    
    return parts.slice(-2).join('.');
};

// 在脚本启动时立即注入隐藏样式
(function injectEarlyStyles() {
    'use strict';
    
    // 检测浏览器是否支持 Constructable Stylesheets
    const supportsConstructable = (() => {
        try {
            return typeof CSSStyleSheet !== 'undefined' && 
                'replaceSync' in CSSStyleSheet.prototype;
        } catch {
            return false;
        }
    })();

    // 收集选择器的数组（去重用 Set）
    const allSelectors = new Set();

    // 同步加载当前域名的广告隐藏数据，并检查是否过期；若过期则立即删除
    const loadCurrentDomainAdData = () => {
        try {
            const stored = GM_getValue('hackplus_ad_hidden_data', '{}');
            const data = JSON.parse(stored);
            const now = Date.now();
            const ONE_DAY = 24 * 60 * 60 * 1000;
            const currentDomain = getMainDomain();

            const currentEntry = data[currentDomain];
            if (currentEntry) {
                if (now - currentEntry.timestamp <= ONE_DAY) {
                    // 未过期，加载选择器
                    if (Array.isArray(currentEntry.img) && currentEntry.img.length > 0) {
                        currentEntry.img.forEach(selector => allSelectors.add(selector));
                    }
                    if (Array.isArray(currentEntry.iframe) && currentEntry.iframe.length > 0) {
                        currentEntry.iframe.forEach(selector => allSelectors.add(selector));
                    }
                } else {
                    // 当前域名数据过期，立即删除
                    delete data[currentDomain];
                    GM_setValue('hackplus_ad_hidden_data', JSON.stringify(data));
                    // 不加载任何选择器
                }
            }
        } catch (e) {
            // 静默处理错误
        }
    };

    // 异步清理其他域名的过期数据（延迟1秒执行）
    const cleanOtherExpiredAdData = () => {
        setTimeout(() => {
            try {
                const stored = GM_getValue('hackplus_ad_hidden_data', '{}');
                const data = JSON.parse(stored);
                const now = Date.now();
                const ONE_DAY = 24 * 60 * 60 * 1000;
                const currentDomain = getMainDomain();
                let hasChanged = false;

                for (const domain in data) {
                    if (data.hasOwnProperty(domain) && domain !== currentDomain) {
                        const entry = data[domain];
                        if (now - entry.timestamp > ONE_DAY) {
                            delete data[domain];
                            hasChanged = true;
                        }
                    }
                }

                if (hasChanged) {
                    GM_setValue('hackplus_ad_hidden_data', JSON.stringify(data));
                }
            } catch (e) {
                // 静默处理错误
            }
        }, 1000); // 延迟1秒执行
    };

    // 加载额外隐藏规则（用户通过管理器添加的）
    const loadExtraHiddenStyles = () => {
        try {
            const stored = GM_getValue('hackplus_extra_hidden_selectors', '{}');
            const parsed = JSON.parse(stored);
            const domain = getMainDomain();
            
            if (parsed[domain] && Array.isArray(parsed[domain]) && parsed[domain].length > 0) {
                parsed[domain].forEach(selector => allSelectors.add(selector));
            }
        } catch (e) {
            // 静默处理错误
        }
    };
    
    // 立即执行同步加载
    loadCurrentDomainAdData();
    loadExtraHiddenStyles();

    // 如果收集到了选择器，生成统一的 CSS 规则
    if (allSelectors.size > 0) {
        const selectorList = Array.from(allSelectors).join(',');
        const css = `.hackplus-hidden-by-selector, ${selectorList} { display: none !important; position: absolute !important; transform: scale(0) !important; content-visibility: hidden !important; }`;

        if (supportsConstructable) {
            try {
                const sheet = new CSSStyleSheet();
                sheet.replaceSync(css);
                document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
            } catch (e) {
                // 如果 Constructable 失败，回退到 GM_addStyle
                GM_addStyle(css);
            }
        } else {
            GM_addStyle(css);
        }
    }

    // 仅在顶层框架中启动异步清理，避免重复执行
    if (window === window.top) {
        cleanOtherExpiredAdData();
    }
})();

// 配置管理器
class ConfigManager {
    constructor(adRemover) {
        this.domain = getMainDomain();
        this.whitelistKey = this.domain;
        this.adRemover = adRemover;
        this.loadWhitelist();
    }

    loadWhitelist() {
        const stored = GM_getValue(this.whitelistKey, '{}');
        try {
            this.whitelist = JSON.parse(stored);
        } catch {
            this.whitelist = {};
        }
    }

    saveWhitelist() {
        const hasEnabledOptions = Object.values(this.whitelist).some(value => value === 1);
        
        if (hasEnabledOptions) {
            GM_setValue(this.whitelistKey, JSON.stringify(this.whitelist));
        } else {
            GM_deleteValue(this.whitelistKey);
            this.whitelist = {};
        }
    }

    isEnabled(feature) {
        return this.whitelist[feature] !== 1;
    }

    toggleFeature(feature) {
        if (this.whitelist[feature] === 1) {
            delete this.whitelist[feature];
        } else {
            this.whitelist[feature] = 1;
        }
        this.saveWhitelist();
        
        // 当切换图片或iframe广告白名单时，清除当前域名的广告隐藏数据
        if (feature === 'unFuck_ADV_IMG' && this.adRemover) {
            this.adRemover.clearDomainAdHiddenData();
        } else if (feature === 'unFuck_ADV_IFRAME' && this.adRemover) {
            this.adRemover.clearDomainAdHiddenData();
        }
    }
    
    hasAnyWhitelist() {
        return Object.keys(this.whitelist).length > 0 && 
               Object.values(this.whitelist).some(value => value === 1);
    }
    
    hasFeature(feature) {
        return this.whitelist[feature] === 1;
    }
}

// 联盟广告自定义属性管理器
class UnionAdCustomPropertiesManager {
    constructor() {
        this.settingsKey = 'hackplus_union_ad_custom_properties';
        this.defaultSettings = {
            enabled: false,
            properties: 'baidu_union,ali_union,jd_union,pdd_union,suning_union'
        };
        this.loadSettings();
    }
    
    loadSettings() {
        const stored = GM_getValue(this.settingsKey, '{}');
        try {
            const parsed = JSON.parse(stored);
            // 确保所有字段都有值，如果没有则使用默认值
            this.settings = {
                enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : this.defaultSettings.enabled,
                properties: parsed.properties || this.defaultSettings.properties
            };
        } catch {
            this.settings = { ...this.defaultSettings };
        }
    }
    
    saveSettings() {
        GM_setValue(this.settingsKey, JSON.stringify(this.settings));
    }
    
    isEnabled() {
        return this.settings.enabled === true;
    }
    
    toggleEnabled() {
        this.settings.enabled = !this.settings.enabled;
        this.saveSettings();
    }
    
    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveSettings();
    }
    
    resetToDefaults() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
    }
    
    getSettings() {
        return this.settings;
    }
    
    // 获取解析后的属性数组
    getPropertiesArray() {
        if (!this.settings.properties || !this.settings.enabled) {
            return [];
        }
        
        // 支持中文逗号和英文逗号分割
        return this.settings.properties
            .split(/[,，]/)
            .map(prop => prop.trim())
            .filter(prop => prop.length > 0);
    }
}

// 图片自定义尺寸管理器
class ImgCustomSizeManager {
    constructor() {
        this.settingsKey = 'hackplus_custom_img_size_settings';
        this.defaultSettings = {
            enabled: false,
            minWidth: 579,
            maxWidth: 1800,
            minHeight: 40,
            maxHeight: 150
        };
        this.loadSettings();
    }
    
    loadSettings() {
        const stored = GM_getValue(this.settingsKey, '{}');
        try {
            const parsed = JSON.parse(stored);
            // 确保所有字段都有值，如果没有则使用默认值
            this.settings = {
                enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : this.defaultSettings.enabled,
                minWidth: parsed.minWidth || this.defaultSettings.minWidth,
                maxWidth: parsed.maxWidth || this.defaultSettings.maxWidth,
                minHeight: parsed.minHeight || this.defaultSettings.minHeight,
                maxHeight: parsed.maxHeight || this.defaultSettings.maxHeight
            };
        } catch {
            this.settings = { ...this.defaultSettings };
        }
    }
    
    saveSettings() {
        GM_setValue(this.settingsKey, JSON.stringify(this.settings));
    }
    
    isEnabled() {
        return this.settings.enabled === true;
    }
    
    toggleEnabled() {
        const wasEnabled = this.settings.enabled;
        this.settings.enabled = !this.settings.enabled;
        this.saveSettings();
        
        // 当开关状态变化时，清空临时隐藏数据
        if (wasEnabled !== this.settings.enabled) {
            this.clearTempHiddenData();
        }
    }
    
    updateSettings(newSettings) {
        const oldSettings = { ...this.settings };
        this.settings = { ...this.settings, ...newSettings };
        
        // 验证并修正尺寸
        this.validateAndFixSizes();
        
        // 检查尺寸是否有变化
        const hasSizeChanged = 
            this.settings.minWidth !== oldSettings.minWidth ||
            this.settings.maxWidth !== oldSettings.maxWidth ||
            this.settings.minHeight !== oldSettings.minHeight ||
            this.settings.maxHeight !== oldSettings.maxHeight;
        
        // 如果尺寸有变化，清空临时隐藏数据
        if (hasSizeChanged) {
            this.clearTempHiddenData();
        }
        
        this.saveSettings();
    }
    
    resetToDefaults() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
    }
    
    validateAndFixSizes() {
        // 确保最小值小于最大值
        if (this.settings.minWidth >= this.settings.maxWidth) {
            this.settings.minWidth = this.settings.maxWidth - 1;
        }
        if (this.settings.minHeight >= this.settings.maxHeight) {
            this.settings.minHeight = this.settings.maxHeight - 1;
        }
        
        // 确保值是整数
        this.settings.minWidth = parseInt(this.settings.minWidth) || this.defaultSettings.minWidth;
        this.settings.maxWidth = parseInt(this.settings.maxWidth) || this.defaultSettings.maxWidth;
        this.settings.minHeight = parseInt(this.settings.minHeight) || this.defaultSettings.minHeight;
        this.settings.maxHeight = parseInt(this.settings.maxHeight) || this.defaultSettings.maxHeight;
        
        // 确保最小值为正数
        this.settings.minWidth = Math.max(1, this.settings.minWidth);
        this.settings.maxWidth = Math.max(2, this.settings.maxWidth);
        this.settings.minHeight = Math.max(1, this.settings.minHeight);
        this.settings.maxHeight = Math.max(2, this.settings.maxHeight);
        
        // 确保最大值不超过3000
        this.settings.maxWidth = Math.min(3000, this.settings.maxWidth);
        this.settings.maxHeight = Math.min(3000, this.settings.maxHeight);
        
        // 确保最小值不超过1000
        this.settings.minWidth = Math.min(1000, this.settings.minWidth);
        this.settings.minHeight = Math.min(1000, this.settings.minHeight);
    }
    
    getSettings() {
        return this.settings;
    }
    
    clearTempHiddenData() {
        // 只清空sessionStorage中的图片临时隐藏数据
        sessionStorage.removeItem('hackplus_temp_hidden_img');
    }
}

// 框架自定义尺寸管理器
class IframeCustomSizeManager {
    constructor() {
        this.settingsKey = 'hackplus_custom_iframe_size_settings';
        this.defaultSettings = {
            enabled: false,
            minWidth: 600,
            maxWidth: 1500,
            minHeight: 40,
            maxHeight: 180
        };
        this.loadSettings();
    }
    
    loadSettings() {
        const stored = GM_getValue(this.settingsKey, '{}');
        try {
            const parsed = JSON.parse(stored);
            // 确保所有字段都有值，如果没有则使用默认值
            this.settings = {
                enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : this.defaultSettings.enabled,
                minWidth: parsed.minWidth || this.defaultSettings.minWidth,
                maxWidth: parsed.maxWidth || this.defaultSettings.maxWidth,
                minHeight: parsed.minHeight || this.defaultSettings.minHeight,
                maxHeight: parsed.maxHeight || this.defaultSettings.maxHeight
            };
        } catch {
            this.settings = { ...this.defaultSettings };
        }
    }
    
    saveSettings() {
        GM_setValue(this.settingsKey, JSON.stringify(this.settings));
    }
    
    isEnabled() {
        return this.settings.enabled === true;
    }
    
    toggleEnabled() {
        const wasEnabled = this.settings.enabled;
        this.settings.enabled = !this.settings.enabled;
        this.saveSettings();
        
        // 当开关状态变化时，清空临时隐藏数据
        if (wasEnabled !== this.settings.enabled) {
            this.clearTempHiddenData();
        }
    }
    
    updateSettings(newSettings) {
        const oldSettings = { ...this.settings };
        this.settings = { ...this.settings, ...newSettings };
        
        // 验证并修正尺寸
        this.validateAndFixSizes();
        
        // 检查尺寸是否有变化
        const hasSizeChanged = 
            this.settings.minWidth !== oldSettings.minWidth ||
            this.settings.maxWidth !== oldSettings.maxWidth ||
            this.settings.minHeight !== oldSettings.minHeight ||
            this.settings.maxHeight !== oldSettings.maxHeight;
        
        // 如果尺寸有变化，清空临时隐藏数据
        if (hasSizeChanged) {
            this.clearTempHiddenData();
        }
        
        this.saveSettings();
    }
    
    resetToDefaults() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings();
    }
    
    validateAndFixSizes() {
        // 确保最小值小于最大值
        if (this.settings.minWidth >= this.settings.maxWidth) {
            this.settings.minWidth = this.settings.maxWidth - 1;
        }
        if (this.settings.minHeight >= this.settings.maxHeight) {
            this.settings.minHeight = this.settings.maxHeight - 1;
        }
        
        // 确保值是整数
        this.settings.minWidth = parseInt(this.settings.minWidth) || this.defaultSettings.minWidth;
        this.settings.maxWidth = parseInt(this.settings.maxWidth) || this.defaultSettings.maxWidth;
        this.settings.minHeight = parseInt(this.settings.minHeight) || this.defaultSettings.minHeight;
        this.settings.maxHeight = parseInt(this.settings.maxHeight) || this.defaultSettings.maxHeight;
        
        // 确保最小值为正数
        this.settings.minWidth = Math.max(1, this.settings.minWidth);
        this.settings.maxWidth = Math.max(2, this.settings.maxWidth);
        this.settings.minHeight = Math.max(1, this.settings.minHeight);
        this.settings.maxHeight = Math.max(2, this.settings.maxHeight);
        
        // 确保最大值不超过3000
        this.settings.maxWidth = Math.min(3000, this.settings.maxWidth);
        this.settings.maxHeight = Math.min(3000, this.settings.maxHeight);
        
        // 确保最小值不超过1000
        this.settings.minWidth = Math.min(1000, this.settings.minWidth);
        this.settings.minHeight = Math.min(1000, this.settings.minHeight);
    }
    
    getSettings() {
        return this.settings;
    }
    
    clearTempHiddenData() {
        // 只清空sessionStorage中的iframe临时隐藏数据
        sessionStorage.removeItem('hackplus_temp_hidden_iframe');
    }
}

// 元素隐藏管理器
class ElementHider {
    constructor(config) {
        this.config = config;
        this.domain = getMainDomain();
        this.isSelectMode = false;
        this.elementSelected = false;          // 新增：是否已选中元素
        this.currentHighlight = null;
        this.currentSelector = null;
        this.confirmOverlay = null;
        this.currentSelectedElement = null;
        this.temporaryHighlight = null;
        this.hiddenSelectors = new Set();
        this.wasManagerOpen = false;

        // 鼠标悬停时使用的层级链
        this.baseElement = null;
        this.parentChain = [];
        this.chainIndex = 0;
        this.currentHoveredElement = null;

        // 选定元素后使用的固定父链（用于循环切换）
        this.selectedParentChain = [];
        this.selectedChainIndex = 0;

        // iframe 覆盖层相关
        this.iframeOverlays = [];
        this.updateOverlayPositionsBound = this.updateIframeOverlayPositions.bind(this);

        // 排除列表
        this.EXCLUDED_SELECTORS = [
            '#hackplus-float-icon',
            '#hackplus-float-icon *',
            '#hackplus-settings-panel',
            '#hackplus-settings-panel *',
            '#hackplus-element-hider-manager',
            '#hackplus-element-hider-manager *',
            '.hackplus-element-highlight',
            '.hackplus-element-tag',
            '#hackplus-confirm-overlay',
            '#hackplus-confirm-overlay *',
            '#hackplus-element-hider-style',
            '#hackplus-cursor-style',
            '.hackplus-iframe-overlay'
        ];

        // 新增：缓存元素自身最短选择器
        this._selfSelectorCache = new Map();

        this.loadHiddenSelectors();
        this.setupKeyboardShortcuts();
        this.addResponsiveStyles();
    }

    clearDomainHiddenSelectors() {
        this.hiddenSelectors.clear();
        this.saveHiddenSelectors();  // 保存空集，删除存储中的该域名条目
    }

    // 添加响应式样式
    addResponsiveStyles() {
        const style = document.createElement('style');
        style.id = 'hackplus-element-hider-responsive';
        style.textContent = `
            @media (max-width: 768px) {
                #hackplus-element-hider-manager {
                    width: calc(100% - 40px) !important;
                    max-width: 380px !important;
                    top: 10px !important;
                    right: 10px !important;
                    left: 10px !important;
                    margin: 0 auto !important;
                    transform: none !important;
                    max-height: 85vh !important;
                }
                #hackplus-element-hider-manager .hackplus-hide-item {
                    padding: 6px !important;
                    font-size: 12px !important;
                    flex-direction: row !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    word-break: break-word !important;
                    white-space: normal !important;
                    line-height: 1.4 !important;
                }
                #hackplus-element-hider-manager .hackplus-hide-item > div:first-child {
                    width: calc(100% - 70px) !important;
                    margin-right: 8px !important;
                    margin-bottom: 0 !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: nowrap !important;
                }
                #hackplus-element-hider-manager .hackplus-hide-item button {
                    margin-top: 0 !important;
                    align-self: auto !important;
                    font-size: 11px !important;
                    padding: 4px 8px !important;
                    width: auto !important;
                    max-width: 60px !important;
                    flex-shrink: 0 !important;
                }
                #hackplus-element-hider-manager #hackplus-hide-list {
                    height: 150px !important;
                    max-height: 50vh !important;
                    padding: 8px !important;
                }
                #hackplus-element-hider-manager .hackplus-buttons-container {
                    flex-direction: row !important;
                    gap: 10px !important;
                }
                #hackplus-element-hider-manager .hackplus-hotkey-container {
                    display: none !important;
                }
                #hackplus-element-hider-manager .hackplus-action-buttons {
                    display: flex !important;
                    gap: 6px !important;
                    justify-content: flex-end !important;
                    width: 100% !important;
                }
                #hackplus-element-hider-manager .hackplus-action-buttons button {
                    flex: 1 !important;
                    min-width: 0 !important;
                    height: auto !important;
                    min-height: 32px !important;
                }

                #hackplus-confirm-overlay {
                    width: auto !important;
                    max-width: calc(100% - 20px) !important;
                    min-width: 280px !important;
                    flex-direction: row !important;
                    flex-wrap: wrap !important;
                    gap: 8px !important;
                    background: rgba(255, 255, 255, 0.98) !important;
                    padding: 12px !important;
                    border-radius: 12px !important;
                    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.2) !important;
                    border: 1px solid #1abc9c !important;
                    justify-content: center !important;
                }
                #hackplus-confirm-overlay button {
                    padding: 10px 12px !important;
                    font-size: 15px !important;
                    flex: 0 1 auto !important;
                    min-width: 70px !important;
                    max-width: 100px !important;
                    white-space: nowrap !important;
                    border-radius: 8px !important;
                    font-weight: 600 !important;
                }
                .hackplus-element-tag {
                    font-size: 11px !important;
                    padding: 2px 8px !important;
                    line-height: 1.3 !important;
                    max-height: 26px !important;
                    border-radius: 4px !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                }
            }

            @media (max-width: 480px) {
                #hackplus-element-hider-manager {
                    width: calc(100% - 50px) !important;
                    padding: 12px !important;
                    border-radius: 8px !important;
                }
                #hackplus-element-hider-manager h3 {
                    font-size: 14px !important;
                }
                #hackplus-element-hider-manager .hackplus-close-btn {
                    width: 24px !important;
                    height: 24px !important;
                    font-size: 16px !important;
                }
                #hackplus-element-hider-manager #hackplus-hide-count {
                    font-size: 12px !important;
                    margin-bottom: 10px !important;
                }
                #hackplus-element-hider-manager .hackplus-hotkey-container {
                    display: none !important;
                }
                #hackplus-element-hider-manager .hackplus-action-buttons button {
                    font-size: 11px !important;
                    padding: 5px 8px !important;
                    min-height: 30px !important;
                }
                #hackplus-element-hider-manager .hackplus-hide-item {
                    font-size: 11px !important;
                    padding: 6px 8px !important;
                    margin: 5px 0 !important;
                }
                #hackplus-element-hider-manager .hackplus-hide-item > div:first-child {
                    width: calc(100% - 60px) !important;
                }
                #hackplus-element-hider-manager .hackplus-hide-item button {
                    font-size: 11px !important;
                    padding: 4px 8px !important;
                    min-height: 26px !important;
                    max-width: 55px !important;
                }
                #hackplus-element-hider-manager #hackplus-hide-list {
                    padding: 6px !important;
                }
                #hackplus-confirm-overlay {
                    min-width: 260px !important;
                    padding: 10px !important;
                    gap: 6px !important;
                }
                #hackplus-confirm-overlay button {
                    padding: 9px 10px !important;
                    font-size: 14px !important;
                    min-width: 65px !important;
                }
            }

            @media (max-width: 360px) {
                #hackplus-element-hider-manager {
                    width: calc(100% - 50px) !important;
                    padding: 10px !important;
                }
                #hackplus-element-hider-manager h3 {
                    font-size: 13px !important;
                }
                #hackplus-element-hider-manager .hackplus-close-btn {
                    width: 24px !important;
                    height: 24px !important;
                    font-size: 16px !important;
                }
                #hackplus-element-hider-manager .hackplus-hide-item {
                    font-size: 11px !important;
                    padding: 5px 6px !important;
                    line-height: 1.5 !important;
                }
                #hackplus-element-hider-manager .hackplus-hide-item > div:first-child {
                    width: calc(100% - 55px) !important;
                }
                #hackplus-element-hider-manager .hackplus-hide-item button {
                    font-size: 10px !important;
                    padding: 3px 6px !important;
                    min-height: 24px !important;
                    max-width: 50px !important;
                }
                #hackplus-element-hider-manager #hackplus-hide-list {
                    height: 130px !important;
                    padding: 5px !important;
                }
                #hackplus-element-hider-manager .hackplus-hotkey-container {
                    display: none !important;
                }
                #hackplus-element-hider-manager .hackplus-action-buttons {
                    gap: 4px !important;
                }
                #hackplus-element-hider-manager .hackplus-action-buttons button {
                    font-size: 10px !important;
                    padding: 4px 6px !important;
                    min-height: 28px !important;
                }
                #hackplus-element-hider-manager #hackplus-hide-list p {
                    font-size: 12px !important;
                    padding: 25px 10px !important;
                }
                #hackplus-confirm-overlay {
                    min-width: 240px !important;
                    padding: 8px !important;
                    gap: 5px !important;
                }
                #hackplus-confirm-overlay button {
                    padding: 8px 8px !important;
                    font-size: 13px !important;
                    min-width: 60px !important;
                }
            }

            @media (min-width: 769px) {
                #hackplus-confirm-overlay {
                    width: auto !important;
                    min-width: 260px !important;
                    flex-direction: row !important;
                    gap: 6px !important;
                    background: rgba(255, 255, 255, 0.98) !important;
                    padding: 8px 12px !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2) !important;
                    border: 1px solid #1abc9c !important;
                    justify-content: center !important;
                }
                #hackplus-confirm-overlay button {
                    padding: 6px 12px !important;
                    font-size: 12px !important;
                    flex: 1 !important;
                    min-width: 50px !important;
                    max-width: 80px !important;
                    white-space: nowrap !important;
                    border-radius: 4px !important;
                }
            }

            @media (max-height: 500px) and (orientation: landscape) {
                #hackplus-element-hider-manager {
                    max-height: 70vh !important;
                    top: 5px !important;
                    max-width: 90% !important;
                }
                #hackplus-element-hider-manager #hackplus-hide-list {
                    height: 100px !important;
                    max-height: 40vh !important;
                }
                #hackplus-element-hider-manager .hackplus-hide-item {
                    font-size: 11px !important;
                    padding: 4px 6px !important;
                }
                #hackplus-element-hider-manager .hackplus-hotkey-container {
                    display: none !important;
                }
                #hackplus-element-hider-manager .hackplus-action-buttons button {
                    font-size: 10px !important;
                    padding: 4px 6px !important;
                }
            }
            @media (max-height: 400px) {
                #hackplus-element-hider-manager {
                    max-height: 80vh !important;
                }
                #hackplus-element-hider-manager #hackplus-hide-list {
                    height: 80px !important;
                    max-height: 30vh !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // 加载已保存的隐藏选择器
    loadHiddenSelectors() {
        try {
            const stored = GM_getValue('hackplus_extra_hidden_selectors', '{}');
            const parsed = JSON.parse(stored);
            if (parsed[this.domain] && Array.isArray(parsed[this.domain])) {
                parsed[this.domain].forEach(selector => {
                    if (selector && selector.trim()) {
                        this.hiddenSelectors.add(selector.trim());
                    }
                });
            }
            const count = this.hiddenSelectors.size;
            if (count > 0) {
                console.log('%c[hackplus_pro_plus额外隐藏] ⚙︎ ' + count + ' 个选择器', 'color: #FF4081; font-weight: bold; border-left:#FF4081 5px solid;color:#FF4081; padding:3px');
            }
        } catch (error) {
            console.error('%c[hackplus_pro_plus额外隐藏] ❌︎ 加载隐藏选择器失败', 'color: #f44336; font-weight: bold; border-left:#f44336 5px solid;color:#f44336; padding:3px');
            this.hiddenSelectors = new Set();
        }
    }

    // 保存隐藏选择器
    saveHiddenSelectors() {
        try {
            const stored = GM_getValue('hackplus_extra_hidden_selectors', '{}');
            let parsed = {};
            try {
                parsed = JSON.parse(stored);
            } catch {
                parsed = {};
            }
            const selectorsArray = Array.from(this.hiddenSelectors);
            if (selectorsArray.length > 0) {
                parsed[this.domain] = selectorsArray;
            } else {
                if (parsed.hasOwnProperty(this.domain)) {
                    delete parsed[this.domain];
                }
            }
            GM_setValue('hackplus_extra_hidden_selectors', JSON.stringify(parsed));
            
            // 应用样式，内部异常静默处理
            try {
                this.applyHiddenStyles();
            } catch (innerError) {
                // 完全静默
            }
        } catch (error) {
            console.error('%c[hackplus_pro_plus额外隐藏] ❌︎ 保存隐藏选择器失败', 'color: #f44336; font-weight: bold; border-left:#f44336 5px solid;color:#f44336; padding:3px');
        }
    }

    // 应用隐藏样式：直接操作元素，不使用 style 标签
    applyHiddenStyles() {
        // 移除之前通过脚本隐藏的所有元素的隐藏类和内联样式
        const previouslyHidden = document.querySelectorAll('.hackplus-hidden-by-selector');
        previouslyHidden.forEach(el => {
            el.classList.remove('hackplus-hidden-by-selector');
            if (el.style.display === 'none') {
                el.style.display = '';
            }
        });

        // 移除可能存在的旧 style 标签（安全清理）
        const oldStyle = document.getElementById('hackplus-element-hider-style');
        if (oldStyle) oldStyle.remove();

        // 如果没有隐藏选择器，直接更新 UI 并返回
        if (this.hiddenSelectors.size === 0) {
            this.updateHideManagerList();
            return;
        }

        // 遍历所有隐藏选择器，对每个匹配的元素应用隐藏
        this.hiddenSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    // 避免重复应用
                    if (!el.classList.contains('hackplus-hidden-by-selector')) {
                        el.style.setProperty('display', 'none', 'important');
                        el.classList.add('hackplus-hidden-by-selector');
                    }
                });
            } catch (e) {
                // 忽略无效选择器
            }
        });

        // 更新 UI 列表
        this.updateHideManagerList();
    }

    // 截断文本函数
    truncateText(text) {
        const screenWidth = window.innerWidth;
        let maxLength = 50;
        if (screenWidth <= 320) {
            maxLength = 33;
        } else if (screenWidth <= 768) {
            maxLength = 40;
        }
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 5) + '(...)';
    }

    // 更新隐藏管理器列表
    updateHideManagerList() {
        const list = document.getElementById('hackplus-hide-list');
        const countText = document.getElementById('hackplus-hide-count');
        if (!list || !countText) return;

        // 静默移除所有子节点
        while (list.firstChild) {
            try {
                list.removeChild(list.firstChild);
            } catch (e) {
                // 静默处理
            }
        }

        if (this.hiddenSelectors.size === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = '暂无隐藏元素';
            emptyMsg.style.cssText = 'color: #999; text-align: center; padding: 40px 20px; margin: 0; font-size: 12px; font-style: italic;';
            list.appendChild(emptyMsg);
            countText.textContent = '已隐藏 0 个元素';
            return;
        }

        Array.from(this.hiddenSelectors).forEach((selector) => {
            const item = document.createElement('div');
            item.className = 'hackplus-hide-item';
            Object.assign(item.style, {
                padding: '8px',
                margin: '4px 0',
                background: '#f8fafc',
                borderRadius: '6px',
                borderLeft: '4px solid #1abc9c',
                fontFamily: 'monospace',
                fontSize: '11px',
                wordBreak: 'break-all',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            });

            const textContainer = document.createElement('div');
            Object.assign(textContainer.style, {
                flex: '1',
                minWidth: '0',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: '#5d5d5d',
                marginRight: '8px'
            });

            const selectorText = document.createElement('span');
            selectorText.textContent = this.truncateText(selector, 50);
            selectorText.title = selector; // 存储完整选择器

            const removeBtn = document.createElement('button');
            removeBtn.textContent = '删除';
            Object.assign(removeBtn.style, {
                background: '#ff7043',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: '0'
            });
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
                const removedSelector = selector;
                this.hiddenSelectors.delete(removedSelector);
                this.removeInlineHidden(removedSelector);
                this.saveHiddenSelectors();
            });

            textContainer.appendChild(selectorText);
            item.appendChild(textContainer);
            item.appendChild(removeBtn);

            // 统一编辑函数
            const startEditing = () => {
                const originalSelector = selectorText.title;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = originalSelector;
                Object.assign(input.style, {
                    width: '100%',
                    padding: '2px 4px',
                    border: '1px solid #1abc9c',
                    borderRadius: '3px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    background: '#fff',
                    color: '#333',
                    outline: 'none',
                    boxSizing: 'border-box'
                });

                textContainer.replaceChildren(); 
                textContainer.appendChild(input);
                input.focus();
                input.select();

                const saveEdit = () => {
                    const newSelector = input.value.trim();
                    if (!newSelector || newSelector === originalSelector) {
                        this.updateHideManagerList();
                        return;
                    }

                    let isValid = true;
                    try {
                        document.querySelectorAll(newSelector);
                    } catch (e) {
                        isValid = false;
                    }

                    if (isValid) {
                        for (const excluded of this.EXCLUDED_SELECTORS) {
                            if (newSelector === excluded || newSelector.includes(excluded.replace(' *', ''))) {
                                isValid = false;
                                break;
                            }
                        }
                    }

                    if (isValid) {
                        this.hiddenSelectors.delete(originalSelector);
                        this.hiddenSelectors.add(newSelector);
                        this.saveHiddenSelectors();
                        this.updateHideManagerList();
                    } else {
                        alert('无效的选择器或不能隐藏脚本必需元素，请重新编辑。');
                        this.updateHideManagerList();
                    }
                };

                const cancelEdit = () => {
                    this.updateHideManagerList();
                };

                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') {
                        ke.preventDefault();
                        saveEdit();
                    } else if (ke.key === 'Escape') {
                        ke.preventDefault();
                        cancelEdit();
                    }
                });

                input.addEventListener('blur', () => {
                    if (input.isConnected) {
                        saveEdit();
                    }
                });
            };

            // 双击编辑
            item.addEventListener('dblclick', (e) => {
                if (e.target.closest('button')) return;
                e.stopPropagation();
                e.preventDefault();
                startEditing();
            });

            // 移动端长按编辑
            let longPressTimer = null;
            const touchStartHandler = (e) => {
                if (e.target.closest('button')) return;
                if (textContainer.querySelector('input')) return; // 已在编辑中
                longPressTimer = setTimeout(() => {
                    startEditing();
                }, 500);
            };
            const touchMoveHandler = () => {
                if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    longPressTimer = null;
                }
            };
            const touchEndHandler = touchMoveHandler;
            const touchCancelHandler = touchMoveHandler;

            item.addEventListener('touchstart', touchStartHandler, { passive: true });
            item.addEventListener('touchmove', touchMoveHandler);
            item.addEventListener('touchend', touchEndHandler);
            item.addEventListener('touchcancel', touchCancelHandler);

            // 阻止长按菜单，但允许输入框内的菜单
            item.addEventListener('contextmenu', (e) => {
                if (e.target.closest('input')) return;
                e.preventDefault();
            });

            list.appendChild(item);
        });

        countText.textContent = `已隐藏 ${this.hiddenSelectors.size} 个元素`;
    }

    // 移除指定选择器的内联隐藏样式和标记类
    removeInlineHidden(selector) {
        try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
                if (el.classList.contains('hackplus-hidden-by-selector')) {
                    el.classList.remove('hackplus-hidden-by-selector');
                    el.style.display = '';
                }
            });
        } catch (e) {
            // 忽略无效选择器
        }
    }

    // 显示隐藏元素管理界面
    showHideManager() {
        const existingManager = document.getElementById('hackplus-element-hider-manager');
        if (existingManager) {
            existingManager.remove();
            return;
        }
        const manager = document.createElement('div');
        manager.id = 'hackplus-element-hider-manager';
        Object.assign(manager.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'white',
            border: '2px solid #1abc9c',
            borderRadius: '12px',
            padding: '15px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.12)',
            zIndex: '2147483647',
            width: '380px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif'
        });

        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px'
        });

        // 左侧容器：标题 + 加号按钮
        const leftContainer = document.createElement('div');
        Object.assign(leftContainer.style, {
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
        });

        const title = document.createElement('h3');
        title.textContent = '隐藏元素管理器';
        Object.assign(title.style, {
            margin: '0',
            color: '#1abc9c',
            fontSize: '14px',
            fontWeight: '600',
            letterSpacing: '0.3px'
        });

        // 方形加号按钮
        const addBtn = document.createElement('button');
        addBtn.textContent = '+';
        addBtn.title = '新增隐藏元素';
        Object.assign(addBtn.style, {
            width: '22px',
            height: '22px',
            background: '#1abc9c',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
            margin: '0'
        });
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addNewEmptyItem();
        });

        leftContainer.appendChild(title);
        leftContainer.appendChild(addBtn);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        Object.assign(closeBtn.style, {
            width: '24px',
            height: '24px',
            background: '#f44336',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px',
            lineHeight: '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0',
            margin: '0'
        });
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            manager.remove();
        });

        header.appendChild(leftContainer);
        header.appendChild(closeBtn);

        const countText = document.createElement('p');
        countText.id = 'hackplus-hide-count';
        countText.textContent = '已隐藏 0 个元素';
        Object.assign(countText.style, {
            margin: '0 0 10px 0',
            color: '#666',
            fontWeight: 'bold',
            fontSize: '13px',
            textAlign: 'center'
        });

        const list = document.createElement('div');
        list.id = 'hackplus-hide-list';
        Object.assign(list.style, {
            height: '200px',
            overflowY: 'auto',
            marginBottom: '15px',
            border: '1px solid #edf2f7',
            borderRadius: '4px',
            padding: '5px',
            background: '#f8fafc'
        });

        const buttonsContainer = document.createElement('div');
        Object.assign(buttonsContainer.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        const hotkeyContainer = document.createElement('div');
        hotkeyContainer.className = 'hackplus-hotkey-container';
        Object.assign(hotkeyContainer.style, {
            color: '#4a5568',
            fontSize: '11px',
            fontFamily: 'monospace',
            flex: '1'
        });
        const hotkeyLine1 = document.createElement('div');
        hotkeyLine1.textContent = 'Ctrl+Shift+← 开始选择';
        Object.assign(hotkeyLine1.style, {
            lineHeight: '1.4'
        });
        const hotkeyLine2 = document.createElement('div');
        hotkeyLine2.textContent = 'Ctrl+Shift+→ 打开管理器';
        Object.assign(hotkeyLine2.style, {
            lineHeight: '1.4'
        });
        hotkeyContainer.appendChild(hotkeyLine1);
        hotkeyContainer.appendChild(hotkeyLine2);

        const actionButtons = document.createElement('div');
        actionButtons.className = 'hackplus-action-buttons';
        Object.assign(actionButtons.style, {
            display: 'flex',
            justifyContent: 'flex-end'
        });

        const startSelectBtn = document.createElement('button');
        startSelectBtn.textContent = '开始选择';
        Object.assign(startSelectBtn.style, {
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #1abc9c 0%, #16a085 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            marginLeft: '10px',
            boxShadow: '0 2px 4px rgba(26, 188, 156, 0.2)',
            transition: 'all 0.2s ease'
        });
        startSelectBtn.addEventListener('mouseover', () => {
            startSelectBtn.style.transform = 'translateY(-1px)';
            startSelectBtn.style.boxShadow = '0 4px 8px rgba(26, 188, 156, 0.3)';
        });
        startSelectBtn.addEventListener('mouseout', () => {
            startSelectBtn.style.transform = 'translateY(0)';
            startSelectBtn.style.boxShadow = '0 2px 4px rgba(26, 188, 156, 0.2)';
        });
        startSelectBtn.addEventListener('mousedown', () => {
            startSelectBtn.style.transform = 'translateY(0)';
        });
        startSelectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.enterSelectMode();
        });

        const clearBtn = document.createElement('button');
        clearBtn.textContent = '清空列表';
        Object.assign(clearBtn.style, {
            padding: '6px 12px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            marginLeft: '10px'
        });
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('确定要清空所有隐藏元素吗？\n确定后自动刷新。')) {
                Array.from(this.hiddenSelectors).forEach(sel => {
                    this.removeInlineHidden(sel);
                });
                this.hiddenSelectors.clear();
                this.saveHiddenSelectors();
                location.reload();
            }
        });

        actionButtons.appendChild(startSelectBtn);
        actionButtons.appendChild(clearBtn);
        buttonsContainer.appendChild(hotkeyContainer);
        buttonsContainer.appendChild(actionButtons);

        manager.appendChild(header);
        manager.appendChild(countText);
        manager.appendChild(list);
        manager.appendChild(buttonsContainer);
        document.body.appendChild(manager);
        this.updateHideManagerList();
    }

    // 新增空条目（加号按钮触发）
    addNewEmptyItem() {
        const list = document.getElementById('hackplus-hide-list');
        if (!list) return;

        // 如果列表中有空提示信息，移除它
        const emptyMsg = list.querySelector('p');
        if (emptyMsg) emptyMsg.remove();

        // 创建临时条目
        const tempItem = document.createElement('div');
        tempItem.className = 'hackplus-hide-item hackplus-temp-item';
        Object.assign(tempItem.style, {
            padding: '8px',
            margin: '4px 0',
            background: '#f8fafc',
            borderRadius: '6px',
            borderLeft: '4px solid #1abc9c',
            fontFamily: 'monospace',
            fontSize: '11px',
            wordBreak: 'break-all',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
        });

        const inputContainer = document.createElement('div');
        Object.assign(inputContainer.style, {
            flex: '1',
            minWidth: '0',
            marginRight: '8px'
        });

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '输入CSS选择器';
        Object.assign(input.style, {
            width: '100%',
            padding: '4px 6px',
            border: '1px solid #1abc9c',
            borderRadius: '3px',
            fontSize: '11px',
            fontFamily: 'monospace',
            background: '#fff',
            color: '#333',
            outline: 'none',
            boxSizing: 'border-box'
        });

        inputContainer.appendChild(input);
        tempItem.appendChild(inputContainer);

        // 插入到列表顶部
        list.insertBefore(tempItem, list.firstChild);

        input.focus();
        input.select();

        const saveNewItem = () => {
            const newSelector = input.value.trim();
            if (!newSelector) {
                tempItem.remove();
                if (list.children.length === 0) {
                    this.updateHideManagerList();
                }
                return;
            }

            let isValid = true;
            try {
                document.querySelectorAll(newSelector);
            } catch (e) {
                isValid = false;
            }

            if (isValid) {
                for (const excluded of this.EXCLUDED_SELECTORS) {
                    if (newSelector === excluded || newSelector.includes(excluded.replace(' *', ''))) {
                        isValid = false;
                        break;
                    }
                }
            }

            if (isValid) {
                this.hiddenSelectors.add(newSelector);
                this.saveHiddenSelectors();
                this.updateHideManagerList();
            } else {
                alert('无效的选择器或不能隐藏脚本必需元素，请重新输入。');
                tempItem.remove();
                if (list.children.length === 0) {
                    this.updateHideManagerList();
                }
            }
        };

        const cancelNewItem = () => {
            tempItem.remove();
            if (list.children.length === 0) {
                this.updateHideManagerList();
            }
        };

        input.addEventListener('keydown', (ke) => {
            if (ke.key === 'Enter') {
                ke.preventDefault();
                saveNewItem();
            } else if (ke.key === 'Escape') {
                ke.preventDefault();
                cancelNewItem();
            }
        });

        input.addEventListener('blur', () => {
            setTimeout(() => {
                if (input.isConnected) {
                    saveNewItem();
                }
            }, 10);
        });
    }

    // 检查元素是否应该被排除
    isElementExcluded(element) {
        if (!element || !element.tagName) return true;
        for (const selector of this.EXCLUDED_SELECTORS) {
            try {
                if (element.matches && element.matches(selector)) {
                    return true;
                }
            } catch (e) {}
        }
        let parent = element.parentElement;
        while (parent) {
            for (const selector of this.EXCLUDED_SELECTORS) {
                try {
                    if (parent.matches && parent.matches(selector)) {
                        return true;
                    }
                } catch (e) {}
            }
            parent = parent.parentElement;
        }
        return false;
    }

    // 检查元素是否可见（仅用于高亮框标签）
    isElementVisible(element) {
        if (!element || !element.tagName) return false;
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            rect.top < window.innerHeight &&
            rect.bottom > 0 &&
            rect.left < window.innerWidth &&
            rect.right > 0
        );
    }

    // 生成元素的简洁CSS签名
    getElementShortSignature(element) {
        if (!element || !element.tagName) return '';
        if (element.id) {
            return '#' + CSS.escape(element.id);
        }
        let signature = element.tagName.toLowerCase();
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/).filter(Boolean);
            if (classes.length > 0) {
                const classStr = classes.slice(0, 2).map(c => CSS.escape(c)).join('.');
                signature += '.' + classStr;
                if (classes.length > 2) signature += '…';
            }
        }
        if (element.parentElement) {
            const siblings = Array.from(element.parentElement.children)
                .filter(el => el.tagName === element.tagName);
            if (siblings.length > 1) {
                const index = siblings.indexOf(element) + 1;
                signature += `:nth-child(${index})`;
            }
        }
        return signature;
    }

    // 生成完整CSS选择器
    generateCssSelector(element) {
        if (!element || !element.tagName) return '';
        return this._buildShortestUniqueSelector(element);
    }

    // 截断字符串至指定长度，添加省略号
    truncateString(str, maxLength) {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3) + '...';
    }

    // 创建高亮覆盖层
    createHighlightOverlay(element, isConfirmed = false) {
        if (!element || element === document.documentElement || element === document.body) {
            return null;
        }
        try {
            const rect = element.getBoundingClientRect();
            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;
            
            let width = rect.width;
            let height = rect.height;
            if (width <= 0 || height <= 0) {
                width = 1;
                height = 1;
            }

            const overlay = document.createElement('div');
            overlay.className = 'hackplus-element-highlight';
            const bgColor = isConfirmed ? 'rgba(26, 91, 188, 0.5)' : 'rgba(26, 188, 156, 0.3)';
            const borderColor = isConfirmed ? 'rgba(26, 91, 188, 0.9)' : 'rgba(26, 188, 156, 0.9)';
            const shadowColor = isConfirmed ? 'rgba(26, 91, 188, 0.7)' : 'rgba(26, 188, 156, 0.7)';
            const insetShadowColor = isConfirmed ? 'rgba(26, 91, 188, 0.5)' : 'rgba(26, 188, 156, 0.4)';
            const tagBgColor = isConfirmed ? 'rgba(26, 91, 188, 0.95)' : 'rgba(26, 188, 156, 0.95)';
            
            Object.assign(overlay.style, {
                position: 'absolute',
                top: `${rect.top + scrollY}px`,
                left: `${rect.left + scrollX}px`,
                width: `${width}px`,
                height: `${height}px`,
                backgroundColor: bgColor,
                border: '3px solid ' + borderColor,
                boxShadow: `0 0 15px ${shadowColor}, inset 0 0 15px ${insetShadowColor}`,
                borderRadius: '3px',
                pointerEvents: 'none',
                zIndex: '2147483646',
                boxSizing: 'border-box'
            });

            const tag = document.createElement('div');
            tag.className = 'hackplus-element-tag';
            
            let shortSig = this.getElementShortSignature(element);
            shortSig = this.truncateString(shortSig, 27);
            
            const displayWidth = Math.round(rect.width);
            const displayHeight = Math.round(rect.height);
            tag.textContent = `${shortSig} (${displayWidth}×${displayHeight})px${isConfirmed ? ' ✓' : ''}`;

            const tagHeight = 33;
            const topPosition = rect.top - tagHeight;
            if (topPosition + scrollY < 5) {
                Object.assign(tag.style, {
                    position: 'absolute',
                    top: `${height + 5}px`,
                    left: '0',
                    background: tagBgColor,
                    color: '#000',
                    padding: '3px 8px',
                    fontSize: '12px',
                    fontFamily: 'monospace, sans-serif',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    zIndex: '2147483647',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                });
            } else {
                Object.assign(tag.style, {
                    position: 'absolute',
                    top: '-28px',
                    left: '0',
                    background: tagBgColor,
                    color: '#000',
                    padding: '3px 8px',
                    fontSize: '12px',
                    fontFamily: 'monospace, sans-serif',
                    borderRadius: '4px',
                    whiteSpace: 'nowrap',
                    zIndex: '2147483647',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                });
            }
            overlay.appendChild(tag);
            document.documentElement.appendChild(overlay);
            return overlay;
        } catch (error) {
            return null;
        }
    }

    // 移除高亮
    removeHighlight() {
        if (this.currentHighlight) {
            try {
                if (this.currentHighlight.parentNode) {
                    this.currentHighlight.parentNode.removeChild(this.currentHighlight);
                }
            } catch (error) {}
            this.currentHighlight = null;
        }
    }

    // 移除临时高亮
    removeTemporaryHighlight() {
        if (this.temporaryHighlight) {
            try {
                if (this.temporaryHighlight.parentNode) {
                    this.temporaryHighlight.parentNode.removeChild(this.temporaryHighlight);
                }
            } catch (error) {}
            this.temporaryHighlight = null;
        }
    }

    // 构建父链（鼠标悬停时使用）
    buildParentChain() {
        this.parentChain = [];
        if (!this.baseElement) return;
        let el = this.baseElement;
        while (el && el !== document.body && el !== document.documentElement) {
            if (!this.isElementExcluded(el)) {
                this.parentChain.push(el);
            }
            el = el.parentElement;
        }
        if (this.parentChain.length === 0 && this.baseElement) {
            this.parentChain.push(this.baseElement);
        }
    }

    // 为任意元素构建父链（过滤排除元素）
    buildParentChainForElement(element) {
        const chain = [];
        if (!element) return chain;
        let el = element;
        while (el && el !== document.body && el !== document.documentElement) {
            if (!this.isElementExcluded(el)) {
                chain.push(el);
            }
            el = el.parentElement;
        }
        if (chain.length === 0 && element) {
            chain.push(element);
        }
        return chain;
    }

    // 鼠标移动处理
    handleMouseMove(e) {
        if (!this.isSelectMode || this.elementSelected) return; // 已选中元素不处理
        const element = document.elementFromPoint(e.clientX, e.clientY);
        
        if (!element || this.isElementExcluded(element)) {
            this.removeTemporaryHighlight();
            this.baseElement = null;
            this.parentChain = [];
            this.chainIndex = 0;
            this.currentHoveredElement = null;
            return;
        }

        if (element !== this.baseElement) {
            this.baseElement = element;
            this.buildParentChain();
            this.chainIndex = 0;
            this.currentHoveredElement = this.parentChain[0] || this.baseElement;
        }

        this.removeTemporaryHighlight();
        const highlightEl = this.parentChain[this.chainIndex] || this.baseElement;
        this.currentHoveredElement = highlightEl;
        this.temporaryHighlight = this.createHighlightOverlay(highlightEl, false);

        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    // 点击处理：隐藏当前高亮的元素
    handleClick(e) {
        // 如果点击的是确认覆盖层或其按钮，则放行，让按钮事件正常触发
        if (e.target.closest('#hackplus-confirm-overlay')) {
            return;
        }

        // 如果点击的是 iframe 覆盖层，则放行，让覆盖层的监听器处理
        if (e.target.classList && e.target.classList.contains('hackplus-iframe-overlay')) {
            return;
        }

        // 始终阻止事件，防止页面跳转或点击生效
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (!this.isSelectMode || this.elementSelected) return;

        const clickedElement = document.elementFromPoint(e.clientX, e.clientY);
        if (!clickedElement || this.isElementExcluded(clickedElement)) {
            return;
        }

        this.removeTemporaryHighlight();
        this.currentSelectedElement = this.currentHoveredElement || this.baseElement;
        if (!this.currentSelectedElement) {
            this.exitSelectMode();
            return;
        }

        this.elementSelected = true; // 标记已选中

        // 生成固定父链并初始化索引（用于后续循环切换）
        this.selectedParentChain = this.buildParentChainForElement(this.currentSelectedElement);
        this.selectedChainIndex = 0;

        this.currentSelector = this.generateCssSelector(this.currentSelectedElement);
        this.currentHighlight = this.createHighlightOverlay(this.currentSelectedElement, true);
        this.confirmOverlay = this.createConfirmOverlay(this.currentSelectedElement, this.currentSelector);
    }

    // 全局键盘快捷键处理
    handleKeyDown(e) {
        if (e.key === 'ArrowLeft' && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            if (this.isSelectMode) {
                this.exitSelectMode();
            } else {
                this.enterSelectMode();
            }
            return;
        }
        if (e.key === 'ArrowRight' && e.ctrlKey && e.shiftKey && !e.altKey && !e.metaKey) {
            e.preventDefault();
            e.stopPropagation();
            if (!this.isSelectMode) {
                this.showHideManager();
            }
            return;
        }

        if (!this.isSelectMode) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            this.exitSelectMode();
            return;
        }

        // A 键：向外层
        if (e.key === 'a' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();

            if (this.currentSelectedElement) {
                this.switchSelectedElement('up');
                return;
            }

            if (this.parentChain.length === 0) return;
            this.chainIndex = (this.chainIndex + 1) % this.parentChain.length;
            const nextElement = this.parentChain[this.chainIndex];
            if (nextElement) {
                this.currentHoveredElement = nextElement;
                this.removeTemporaryHighlight();
                this.temporaryHighlight = this.createHighlightOverlay(nextElement, false);
            }
            return;
        }

        // Shift + A：向内层
        if (e.key === 'A' || (e.key === 'a' && e.shiftKey)) {
            e.preventDefault();
            e.stopPropagation();

            if (this.currentSelectedElement) {
                this.switchSelectedElement('down');
                return;
            }

            if (this.parentChain.length === 0) return;
            this.chainIndex = (this.chainIndex - 1 + this.parentChain.length) % this.parentChain.length;
            const nextElement = this.parentChain[this.chainIndex];
            if (nextElement) {
                this.currentHoveredElement = nextElement;
                this.removeTemporaryHighlight();
                this.temporaryHighlight = this.createHighlightOverlay(nextElement, false);
            }
            return;
        }
    }

    // 切换已选定的元素（在固定父链中循环移动）
    switchSelectedElement(direction) {
        if (!this.currentSelectedElement || this.selectedParentChain.length === 0) return;

        if (direction === 'up') {
            this.selectedChainIndex = (this.selectedChainIndex + 1) % this.selectedParentChain.length;
        } else {
            this.selectedChainIndex = (this.selectedChainIndex - 1 + this.selectedParentChain.length) % this.selectedParentChain.length;
        }

        const newElement = this.selectedParentChain[this.selectedChainIndex];
        if (!newElement || newElement === this.currentSelectedElement) return;

        this.currentSelectedElement = newElement;
        this.currentSelector = this.generateCssSelector(newElement);

        this.removeHighlight();
        this.removeConfirmOverlay();

        this.currentHighlight = this.createHighlightOverlay(newElement, true);
        this.confirmOverlay = this.createConfirmOverlay(newElement, this.currentSelector);
    }

    // 创建确认按钮覆盖层（带 < > 按钮，自适应边界，小屏幕按钮加大）
    createConfirmOverlay(element, selector) {
        this.removeConfirmOverlay();
        if (!element || element === document.documentElement || element === document.body) {
            return null;
        }
        try {
            const rect = element.getBoundingClientRect();
            const scrollX = window.scrollX || window.pageXOffset;
            const scrollY = window.scrollY || window.pageYOffset;
            const isSmallScreen = window.innerWidth <= 768;

            let overlayWidth;
            if (isSmallScreen) {
                if (window.innerWidth <= 360) overlayWidth = 240;
                else if (window.innerWidth <= 480) overlayWidth = 260;
                else overlayWidth = 300;
            } else {
                overlayWidth = 280;
            }

            const overlay = document.createElement('div');
            overlay.id = 'hackplus-confirm-overlay';

            let top, left;
            if (isSmallScreen) {
                const buttonHeight = 50;
                const spacing = 12;
                const highlighBottom = rect.top + scrollY + rect.height;
                const highlighTop = rect.top + scrollY;

                if (highlighBottom + buttonHeight + spacing > window.innerHeight + scrollY) {
                    if (highlighTop - buttonHeight - spacing > scrollY) {
                        top = highlighTop - buttonHeight - spacing;
                    } else {
                        top = Math.max(scrollY, (window.innerHeight + scrollY - buttonHeight) / 2);
                    }
                } else {
                    top = highlighBottom + spacing;
                }
                left = rect.left + scrollX + rect.width / 2 - overlayWidth / 2;
                left = Math.max(5, Math.min(left, window.innerWidth - overlayWidth - 5));
            } else {
                top = rect.top + scrollY;
                left = rect.left + scrollX + rect.width + 10;
                if (left + overlayWidth > window.innerWidth - 5) {
                    left = rect.left + scrollX - overlayWidth - 10;
                }
                if (left < 5) {
                    left = Math.max(5, (window.innerWidth - overlayWidth) / 2);
                }
                if (top + 50 > window.innerHeight + scrollY) {
                    top = window.innerHeight + scrollY - 60;
                }
                if (top < scrollY + 5) {
                    top = scrollY + 5;
                }
            }

            Object.assign(overlay.style, {
                position: 'absolute',
                top: `${top}px`,
                left: `${left}px`,
                width: `${overlayWidth}px`,
                zIndex: '2147483647',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-around',
                gap: '4px',
                boxSizing: 'border-box'
            });

            const prevBtn = document.createElement('button');
            prevBtn.textContent = '<';
            prevBtn.title = '向外层切换 (快捷键 A)';
            Object.assign(prevBtn.style, {
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: isSmallScreen ? '10px 12px' : '6px 12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: isSmallScreen ? '16px' : '13px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                flex: '1',
                minWidth: isSmallScreen ? '70px' : '50px',
                maxWidth: isSmallScreen ? '90px' : '70px',
                textAlign: 'center',
                transition: 'all 0.1s ease'
            });
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.switchSelectedElement('up');
            });

            const nextBtn = document.createElement('button');
            nextBtn.textContent = '>';
            nextBtn.title = '向内层切换 (快捷键 Shift+A)';
            Object.assign(nextBtn.style, {
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: isSmallScreen ? '10px 12px' : '6px 12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: isSmallScreen ? '16px' : '13px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                flex: '1',
                minWidth: isSmallScreen ? '70px' : '50px',
                maxWidth: isSmallScreen ? '90px' : '70px',
                textAlign: 'center',
                transition: 'all 0.1s ease'
            });
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.switchSelectedElement('down');
            });

            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '确定';
            Object.assign(confirmBtn.style, {
                background: '#1abc9c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: isSmallScreen ? '10px 14px' : '6px 12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: isSmallScreen ? '16px' : '13px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                flex: '1',
                minWidth: isSmallScreen ? '80px' : '60px',
                maxWidth: isSmallScreen ? '100px' : '80px',
                textAlign: 'center'
            });
            confirmBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (selector) {
                    this.hideElement(selector);
                    this.exitSelectMode();
                } else {
                    this.exitSelectMode();
                }
            });

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = '取消';
            Object.assign(cancelBtn.style, {
                background: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: isSmallScreen ? '10px 14px' : '6px 12px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: isSmallScreen ? '16px' : '13px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                flex: '1',
                minWidth: isSmallScreen ? '80px' : '60px',
                maxWidth: isSmallScreen ? '100px' : '80px',
                textAlign: 'center'
            });
            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.exitSelectMode();
            });

            overlay.appendChild(prevBtn);
            overlay.appendChild(nextBtn);
            overlay.appendChild(confirmBtn);
            overlay.appendChild(cancelBtn);

            document.documentElement.appendChild(overlay);
            this.confirmOverlay = overlay;
            return overlay;

        } catch (error) {
            return null;
        }
    }

    // 移除确认按钮覆盖层
    removeConfirmOverlay() {
        if (this.confirmOverlay) {
            try {
                if (this.confirmOverlay.parentNode) {
                    this.confirmOverlay.parentNode.removeChild(this.confirmOverlay);
                }
            } catch (error) {}
            this.confirmOverlay = null;
        }
    }

    // 隐藏元素（内联隐藏 + 标记类 + 持久化）
    hideElement(selector) {
        if (!selector || selector.trim() === '') {
            return;
        }
        const cleanSelector = selector.trim();
        for (const excluded of this.EXCLUDED_SELECTORS) {
            if (cleanSelector === excluded) {
                return;
            }
        }
        try {
            document.querySelectorAll(cleanSelector);
        } catch (error) {
            return;
        }

        try {
            const elements = document.querySelectorAll(cleanSelector);
            elements.forEach(el => {
                el.style.setProperty('display', 'none', 'important');
                el.classList.add('hackplus-hidden-by-selector');
            });
        } catch (e) {
            // 忽略无效选择器
        }

        this.hiddenSelectors.add(cleanSelector);
        this.saveHiddenSelectors();
    }

    // iframe 覆盖层处理
    createIframeOverlays() {
        // 移除旧覆盖层
        this.removeIframeOverlays();

        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            // 跳过已被排除的元素
            if (this.isElementExcluded(iframe)) return;

            const overlay = document.createElement('div');
            overlay.className = 'hackplus-iframe-overlay';
            overlay.style.cssText = `
                position: fixed;
                z-index: 2147483646;
                background: transparent;
                pointer-events: auto;
                cursor: crosshair;
            `;
            overlay.dataset.forIframe = Array.from(iframes).indexOf(iframe); // 简单标识

            // 绑定事件
            overlay.addEventListener('mousemove', (e) => {
                e.stopPropagation();
                this.handleIframeOverlayMove(iframe, e);
            });
            overlay.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleIframeOverlayClick(iframe, e);
            }, { capture: true });

            document.documentElement.appendChild(overlay);
            this.iframeOverlays.push({ overlay, iframe });
        });

        // 初始化位置并监听滚动/调整大小
        this.updateIframeOverlayPositions();
        window.addEventListener('scroll', this.updateOverlayPositionsBound, { passive: true });
        window.addEventListener('resize', this.updateOverlayPositionsBound, { passive: true });
    }

    updateIframeOverlayPositions() {
        this.iframeOverlays.forEach(item => {
            const { overlay, iframe } = item;
            const rect = iframe.getBoundingClientRect();
            overlay.style.top = rect.top + 'px';
            overlay.style.left = rect.left + 'px';
            overlay.style.width = rect.width + 'px';
            overlay.style.height = rect.height + 'px';
        });
    }

    removeIframeOverlays() {
        this.iframeOverlays.forEach(item => item.overlay.remove());
        this.iframeOverlays = [];
        window.removeEventListener('scroll', this.updateOverlayPositionsBound);
        window.removeEventListener('resize', this.updateOverlayPositionsBound);
    }

    handleIframeOverlayMove(iframe, e) {
        if (!this.isSelectMode || this.elementSelected) return; // 已选中元素不处理

        // 更新当前悬停元素为 iframe 本身
        if (iframe !== this.baseElement) {
            this.baseElement = iframe;
            this.buildParentChain();
            this.chainIndex = 0;
            this.currentHoveredElement = iframe;
        }

        this.removeTemporaryHighlight();
        this.temporaryHighlight = this.createHighlightOverlay(iframe, false);
    }

    handleIframeOverlayClick(iframe, e) {
        // 始终阻止事件
        e.preventDefault();
        e.stopPropagation();

        if (!this.isSelectMode || this.elementSelected) return;

        this.removeTemporaryHighlight();

        this.currentSelectedElement = iframe;
        this.selectedParentChain = this.buildParentChainForElement(iframe);
        this.selectedChainIndex = 0;
        this.currentSelector = this.generateCssSelector(iframe);
        this.currentHighlight = this.createHighlightOverlay(iframe, true);
        this.confirmOverlay = this.createConfirmOverlay(iframe, this.currentSelector);

        this.elementSelected = true; // 标记已选中
    }

    // 进入选择模式
    enterSelectMode() {
        if (this.isSelectMode) return;
        const manager = document.getElementById('hackplus-element-hider-manager');
        this.wasManagerOpen = !!manager;
        if (manager) manager.remove();
        const settingsPanel = document.getElementById('hackplus-settings-panel');
        if (settingsPanel) settingsPanel.remove();
        this.isSelectMode = true;
        this.elementSelected = false; // 重置选中标记
        this.handleMouseMoveBound = this.handleMouseMove.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        document.addEventListener('mousemove', this.handleMouseMoveBound, { capture: true, passive: false });
        document.addEventListener('click', this.handleClickBound, { capture: true, passive: false });
        const style = document.createElement('style');
        style.id = 'hackplus-cursor-style';
        style.textContent = `body * { cursor: crosshair !important; }`;
        document.head.appendChild(style);

        // 创建 iframe 覆盖层
        this.createIframeOverlays();
    }

    // 退出选择模式
    exitSelectMode() {
        if (!this.isSelectMode) return;
        this.isSelectMode = false;
        this.elementSelected = false; // 重置选中标记
        document.removeEventListener('mousemove', this.handleMouseMoveBound, { capture: true });
        document.removeEventListener('click', this.handleClickBound, { capture: true });
        const cursorStyle = document.getElementById('hackplus-cursor-style');
        if (cursorStyle) cursorStyle.remove();
        this.removeHighlight();
        this.removeTemporaryHighlight();
        this.removeConfirmOverlay();
        const existingHighlights = document.querySelectorAll('.hackplus-element-highlight');
        existingHighlights.forEach(el => {
            try { if (el.parentNode) el.parentNode.removeChild(el); } catch (error) {}
        });
        const existingTags = document.querySelectorAll('.hackplus-element-tag');
        existingTags.forEach(el => {
            try { if (el.parentNode) el.parentNode.removeChild(el); } catch (error) {}
        });
        const existingConfirm = document.getElementById('hackplus-confirm-overlay');
        if (existingConfirm && existingConfirm.parentNode) {
            existingConfirm.parentNode.removeChild(existingConfirm);
        }
        // 重置所有状态
        this.baseElement = null;
        this.parentChain = [];
        this.chainIndex = 0;
        this.currentHoveredElement = null;
        this.currentSelectedElement = null;
        this.currentSelector = null;
        this.temporaryHighlight = null;
        this.selectedParentChain = [];
        this.selectedChainIndex = 0;
        if (this.wasManagerOpen) {
            setTimeout(() => {
                this.showHideManager();
            }, 10);
        }

        // 移除 iframe 覆盖层
        this.removeIframeOverlays();
    }

    // 设置全局键盘监听
    setupKeyboardShortcuts() {
        this.handleKeyDownBound = this.handleKeyDown.bind(this);
        document.addEventListener('keydown', this.handleKeyDownBound, true);
        window.addEventListener('beforeunload', () => {
            if (this.isSelectMode) this.exitSelectMode();
            document.removeEventListener('keydown', this.handleKeyDownBound, true);
        });
    }

    // 判断类名是否为动态类（如 container__xyz 或 header_abcde）
    _isDynamicClass(className) {
        const DYNAMIC_CLASS_PATTERN = /^(.*?)(__|_)[a-zA-Z0-9]{5,}$/;
        return DYNAMIC_CLASS_PATTERN.test(className);
    }

    // 获取元素自身的最短唯一选择器（不含祖先）
    _getShortestSelfSelector(element) {
        if (!element || !element.tagName) return null;
        if (element.id) return `#${CSS.escape(element.id)}`;

        const tag = element.tagName.toLowerCase();
        const classes = element.className && typeof element.className === 'string'
            ? element.className.trim().split(/\s+/).filter(Boolean)
            : [];

        // 分离静态类和动态类
        const staticClasses = classes.filter(cls => !this._isDynamicClass(cls));
        const dynamicClasses = classes.filter(cls => this._isDynamicClass(cls));

        // 提取第一个动态类前缀，生成属性选择器
        let attrSelector = null;
        if (dynamicClasses.length > 0) {
            const dynClass = dynamicClasses[0];
            const match = dynClass.match(/^(.*?)(__|_)[a-zA-Z0-9]+$/);
            if (match) {
                const prefix = match[1] + match[2];
                attrSelector = `${tag}[class^="${CSS.escape(prefix)}"]`;
            }
        }

        // 生成静态类组合（按长度递增）
        function* generateCombinations(arr) {
            const n = arr.length;
            yield [];
            for (let k = 1; k <= n; k++) {
                const indices = Array(k).fill(0).map((_, i) => i);
                while (indices[0] <= n - k) {
                    yield indices.map(i => arr[i]);
                    let i = k - 1;
                    while (i >= 0 && indices[i] === n - k + i) i--;
                    if (i < 0) break;
                    indices[i]++;
                    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
                }
            }
        }

        const isUnique = (sel) => {
            try { return document.querySelectorAll(sel).length === 1; } catch (e) { return false; }
        };

        // 尝试属性选择器
        if (attrSelector && isUnique(attrSelector)) return attrSelector;

        // 尝试纯标签
        if (isUnique(tag)) return tag;

        // 尝试静态类组合
        const maxCombinations = 100;
        let tried = 0;
        for (const comb of generateCombinations(staticClasses)) {
            if (tried++ > maxCombinations) break;
            const classPart = comb.map(c => CSS.escape(c)).join('.');
            const sel = classPart ? `${tag}.${classPart}` : tag;
            if (isUnique(sel)) return sel;
        }

        // 准备 :nth-child
        let nthIndex = 1;
        if (element.parentElement) {
            const siblings = Array.from(element.parentElement.children)
                .filter(el => el.tagName === element.tagName);
            nthIndex = siblings.indexOf(element) + 1;
        }
        const nthPart = `:nth-child(${nthIndex})`;

        // 尝试属性选择器 + :nth-child
        if (attrSelector) {
            const attrNth = `${attrSelector}${nthPart}`;
            if (isUnique(attrNth)) return attrNth;
        }

        // 尝试纯标签 + :nth-child
        const tagNth = `${tag}${nthPart}`;
        if (isUnique(tagNth)) return tagNth;

        // 尝试静态类组合 + :nth-child
        tried = 0;
        for (const comb of generateCombinations(staticClasses)) {
            if (tried++ > maxCombinations) break;
            const classPart = comb.map(c => CSS.escape(c)).join('.');
            const sel = classPart ? `${tag}.${classPart}${nthPart}` : `${tag}${nthPart}`;
            if (isUnique(sel)) return sel;
        }

        return null; // 保底由调用者处理
    }

    // 递归构建包含祖先的最短唯一选择器
    _buildShortestUniqueSelector(element, cache = new Map()) {
        if (!element || element === document.documentElement || element === document.body) {
            return element.tagName.toLowerCase();
        }

        let selfSel = this._selfSelectorCache.get(element);
        if (selfSel === undefined) {
            selfSel = this._getShortestSelfSelector(element);
            this._selfSelectorCache.set(element, selfSel);
        }

        if (!selfSel) { // 保底
            const tag = element.tagName.toLowerCase();
            let nthIndex = 1;
            if (element.parentElement) {
                const siblings = Array.from(element.parentElement.children)
                    .filter(el => el.tagName === element.tagName);
                nthIndex = siblings.indexOf(element) + 1;
            }
            selfSel = `${tag}:nth-child(${nthIndex})`;
        }

        try {
            if (document.querySelectorAll(selfSel).length === 1) return selfSel;
        } catch (e) {}

        const parent = element.parentElement;
        if (!parent) return selfSel;

        const parentSel = this._buildShortestUniqueSelector(parent, cache);
        const combined = `${parentSel} > ${selfSel}`;
        try {
            if (document.querySelectorAll(combined).length === 1) return combined;
        } catch (e) {}

        if (parent.parentElement) {
            const grandParentSel = this._buildShortestUniqueSelector(parent.parentElement, cache);
            const combined2 = `${grandParentSel} > ${parentSel} > ${selfSel}`;
            try {
                if (document.querySelectorAll(combined2).length === 1) return combined2;
            } catch (e) {}
        }

        return combined;
    }
}

// 全局设置面板管理器
class SettingsPanelManager {
    static instance = null;
    static settingsPanel = null;
    
    static getInstance() {
        if (!SettingsPanelManager.instance) {
            SettingsPanelManager.instance = new SettingsPanelManager();
        }
        return SettingsPanelManager.instance;
    }
    
    static setSettingsPanel(panel) {
        SettingsPanelManager.settingsPanel = panel;
    }
    
    static togglePanel() {
        if (SettingsPanelManager.settingsPanel && 
            typeof SettingsPanelManager.settingsPanel.togglePanel === 'function') {
            SettingsPanelManager.settingsPanel.togglePanel();
        } else {
            console.error('设置面板不可用');
        }
    }
}

// 浮动图标管理器
class FloatIconManager {
    constructor(hackPlus) {
        this.hackPlus = hackPlus;          // 保存 HackPlus 实例引用
        this.floatIcon = null;
        this.isDragging = false;
        this.hasDragged = false;
        this.loadFloatIconSettings();
    }

    loadFloatIconSettings() {
        const settings = GM_getValue('hackplus_float_icon_settings', '{}');
        try {
            this.settings = JSON.parse(settings);
        } catch {
            this.settings = {
                enabled: false,
                position: { x: 20, y: 20 }
            };
        }
    }

    saveFloatIconSettings() {
        GM_setValue('hackplus_float_icon_settings', JSON.stringify(this.settings));
    }

    isEnabled() {
        return this.settings.enabled === true;
    }

    toggleEnabled() {
        const wasEnabled = this.settings.enabled;
        this.settings.enabled = !this.settings.enabled;
        this.saveFloatIconSettings();

        if (this.settings.enabled) {
            this.createFloatIcon();
        } else {
            this.removeFloatIcon();
            GM_deleteValue('hackplus_float_icon_settings');
        }

        // 更新 Tampermonkey 菜单文本
        if (this.hackPlus) {
            this.hackPlus.updateMenus();
        }

        // 如果设置面板已打开，同步更新其中的复选框状态
        const settingsPanel = document.getElementById('hackplus-settings-panel');
        if (settingsPanel) {
            const checkbox = settingsPanel.querySelector('#FloatIcon');
            if (checkbox) {
                checkbox.checked = this.settings.enabled;
            }
        }
    }

    createFloatIcon() {
        try {
            if (!this.isEnabled() || this.floatIcon || window.self !== window.top) {
                return;
            }
        } catch(e) {
            return;
        }

        this.floatIcon = document.createElement('div');
        this.floatIcon.id = 'hackplus-float-icon';
        this.floatIcon.textContent = '⚙';
        this.floatIcon.title = '莫舞Pro Plus设置 (点击打开设置面板)';

        const pos = this.settings.position || { x: 20, y: 20 };
        this.floatIcon.style.left = `${pos.x}px`;
        this.floatIcon.style.top = `${pos.y}px`;

        document.body.appendChild(this.floatIcon);
        this.addFloatIconStyles();
        this.setupFloatIconEvents();
    }

    addFloatIconStyles() {
        if (document.getElementById('hackplus-float-icon-styles')) {
            return;
        }
        const style = document.createElement('style');
        style.id = 'hackplus-float-icon-styles';
        style.textContent = `
            #hackplus-float-icon {
                position: fixed;
                z-index: 2147483647;
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(26, 188, 156, 0.4);
                user-select: none;
                touch-action: none;
                border: 2px solid rgba(255, 255, 255, 0.3);
                transition: all 0.2s ease;
            }
            #hackplus-float-icon:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 16px rgba(26, 188, 156, 0.6);
            }
            #hackplus-float-icon:active {
                transform: scale(0.95);
            }
            #hackplus-float-icon.dragging {
                cursor: grabbing;
                opacity: 0.9;
                transition: none;
            }
        `;
        document.head.appendChild(style);
    }

    setupFloatIconEvents() {
        if (!this.floatIcon) return;

        this.floatIcon.addEventListener('click', (e) => {
            if (this.hasDragged) {
                this.hasDragged = false;
                return;
            }
            SettingsPanelManager.togglePanel();
        });

        this.floatIcon.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (this.hasDragged) {
                this.hasDragged = false;
                return;
            }
            SettingsPanelManager.togglePanel();
        });

        this.setupDragging();
    }

    setupDragging() {
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;
        let dragThreshold = 5;

        const onMouseMove = (e) => {
            if (!this.isDragging) return;
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            if (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold) {
                this.hasDragged = true;
            }
            if (this.hasDragged) {
                let newX = initialLeft + deltaX;
                let newY = initialTop + deltaY;
                newX = Math.max(5, Math.min(window.innerWidth - 45, newX));
                newY = Math.max(5, Math.min(window.innerHeight - 45, newY));
                this.floatIcon.style.left = `${newX}px`;
                this.floatIcon.style.top = `${newY}px`;
            }
        };

        const onMouseUp = () => {
            this.isDragging = false;
            this.floatIcon.classList.remove('dragging');
            if (this.hasDragged) {
                const rect = this.floatIcon.getBoundingClientRect();
                this.settings.position = {
                    x: rect.left,
                    y: rect.top
                };
                this.saveFloatIconSettings();
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        const onTouchMove = (e) => {
            if (!this.isDragging) return;
            const touch = e.touches[0];
            const deltaX = touch.clientX - startX;
            const deltaY = touch.clientY - startY;
            if (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold) {
                this.hasDragged = true;
            }
            if (this.hasDragged) {
                let newX = initialLeft + deltaX;
                let newY = initialTop + deltaY;
                newX = Math.max(5, Math.min(window.innerWidth - 45, newX));
                newY = Math.max(5, Math.min(window.innerHeight - 45, newY));
                this.floatIcon.style.left = `${newX}px`;
                this.floatIcon.style.top = `${newY}px`;
            }
        };

        const onTouchEnd = () => {
            this.isDragging = false;
            this.floatIcon.classList.remove('dragging');
            if (this.hasDragged) {
                const rect = this.floatIcon.getBoundingClientRect();
                this.settings.position = {
                    x: rect.left,
                    y: rect.top
                };
                this.saveFloatIconSettings();
            }
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };

        this.floatIcon.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            this.isDragging = true;
            this.hasDragged = false;
            this.floatIcon.classList.add('dragging');
            const rect = this.floatIcon.getBoundingClientRect();
            startX = e.clientX;
            startY = e.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        this.floatIcon.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 1) return;
            e.preventDefault();
            this.isDragging = true;
            this.hasDragged = false;
            this.floatIcon.classList.add('dragging');
            const touch = e.touches[0];
            const rect = this.floatIcon.getBoundingClientRect();
            startX = touch.clientX;
            startY = touch.clientY;
            initialLeft = rect.left;
            initialTop = rect.top;
            document.addEventListener('touchmove', onTouchMove);
            document.addEventListener('touchend', onTouchEnd);
        });
    }

    removeFloatIcon() {
        if (this.floatIcon) {
            this.floatIcon.remove();
            this.floatIcon = null;
        }
    }

    init() {
        if (this.isEnabled()) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(() => this.createFloatIcon(), 100);
                });
            } else {
                setTimeout(() => this.createFloatIcon(), 100);
            }
        }
    }
}

// 广告移除器
class AdRemover {
    constructor(config, imgCustomSizeManager, iframeCustomSizeManager) {
        this.config = config;
        this.imgCustomSizeManager = imgCustomSizeManager;
        this.iframeCustomSizeManager = iframeCustomSizeManager;
        this.observer = null;
        
        this.tempHiddenImg = new Set();
        this.tempHiddenIframe = new Set();
        
        this.loadAdHiddenData();
    }

    // 从 GM 存储加载当前域名的广告隐藏数据
    loadAdHiddenData() {
        try {
            const domain = getMainDomain();
            const stored = GM_getValue('hackplus_ad_hidden_data', '{}');
            const data = JSON.parse(stored);
            const entry = data[domain];
            if (entry) {
                if (Array.isArray(entry.img)) {
                    entry.img.forEach(sel => this.tempHiddenImg.add(sel));
                }
                if (Array.isArray(entry.iframe)) {
                    entry.iframe.forEach(sel => this.tempHiddenIframe.add(sel));
                }
                // 不需要检查时间戳，因为 injectEarlyStyles 已负责过期清理
            }
        } catch (e) {
            // 静默处理
        }
    }

    // 保存当前域名的广告隐藏数据到 GM 存储
    saveAdHiddenData() {
        try {
            const domain = getMainDomain();
            const stored = GM_getValue('hackplus_ad_hidden_data', '{}');
            const data = JSON.parse(stored);
            data[domain] = {
                img: Array.from(this.tempHiddenImg),
                iframe: Array.from(this.tempHiddenIframe),
                timestamp: Date.now()
            };
            GM_setValue('hackplus_ad_hidden_data', JSON.stringify(data));
        } catch (e) {
            // 静默处理
        }
    }

    // 清除当前域名的广告隐藏数据（用于白名单切换）
    clearDomainAdHiddenData() {
        try {
            const domain = getMainDomain();
            const stored = GM_getValue('hackplus_ad_hidden_data', '{}');
            const data = JSON.parse(stored);
            if (data.hasOwnProperty(domain)) {
                delete data[domain];
                GM_setValue('hackplus_ad_hidden_data', JSON.stringify(data));
            }
        } catch (e) {
            // 静默处理
        }
        this.tempHiddenImg.clear();
        this.tempHiddenIframe.clear();
    }

    addTempHidden(element, adType) {
        // 根据广告类型检查对应的白名单是否开启
        if (adType === 'img') {
            if (!this.config.isEnabled('unFuck_ADV_IMG')) return;
        } else if (adType === 'iframe') {
            if (!this.config.isEnabled('unFuck_ADV_IFRAME')) return;
        } else {
            return;
        }
        
        const selector = this.getElementSelector(element);
        if (!selector) return;
        
        const tempHidden = adType === 'img' ? this.tempHiddenImg : this.tempHiddenIframe;
        
        if (!tempHidden.has(selector)) {
            tempHidden.add(selector);
            this.saveAdHiddenData(); // 保存并更新时间戳
        }
    }

    getElementSelector(element) {
        if (element.tagName && element.src) {
            return `${element.tagName}[src="${element.src}"]`;
        }
        return null;
    }

    removeAd(element, options) {
        // 如果元素当前 display 为 none，则视为已隐藏，跳过处理
        if (window.getComputedStyle(element).display === 'none') {
            return;
        }

        const {
            minWidth = 0,
            maxWidth = Infinity,
            minHeight = 0,
            maxHeight = Infinity,
            removeFunction = 1,
            color = '#E20',
            adType = 'img'
        } = options;

        //如果元素已被标记隐藏，则跳过
        //const selector = this.getElementSelector(element);
        //if (selector) {
        //    if (adType === 'img' && this.tempHiddenImg.has(selector)) {
        //        return;
        //    }
        //    if (adType === 'iframe' && this.tempHiddenIframe.has(selector)) {
        //        return;
        //    }
        //}
        
        const width = element.offsetWidth || element.naturalWidth || 0;
        const height = element.offsetHeight || element.naturalHeight || 0;

        if (width >= minWidth && width <= maxWidth && 
            height >= minHeight && height <= maxHeight) {
            
            const logCss = `border-left:${color} 5px solid;color:${color};padding:3px`;
            
            switch(removeFunction) {
                case 1:
                    element.remove();
                    console.log('%c[移除广告] ✂', logCss, element.src || element);
                    break;
                case 2:
                    this.addTempHidden(element, adType);
                    element.parentNode?.remove();
                    console.log('%c[移除广告] ✂', logCss, element.src || element);
                    break;
                case 3:
                    this.addTempHidden(element, adType);
                    element.remove();
                    console.log('%c[移除广告] ✂', logCss, element.src || element);
                    break;
            }
        }
    }

    removeImgAds() {
        if (!this.config.isEnabled('unFuck_ADV_IMG')) {
            return;
        }

        // 获取默认尺寸
        const defaultFirstMinWidth = 579, defaultFirstMaxWidth = 1800, defaultFirstMinHeight = 40, defaultFirstMaxHeight = 150;
        const defaultSecondMinWidth = 40, defaultSecondMaxWidth = 150, defaultSecondMinHeight = 300, defaultSecondMaxHeight = 650;
        
        // 定义两个条件的尺寸变量
        let firstMinWidth = defaultFirstMinWidth;
        let firstMaxWidth = defaultFirstMaxWidth;
        let firstMinHeight = defaultFirstMinHeight;
        let firstMaxHeight = defaultFirstMaxHeight;
        
        let secondMinWidth = defaultSecondMinWidth;
        let secondMaxWidth = defaultSecondMaxWidth;
        let secondMinHeight = defaultSecondMinHeight;
        let secondMaxHeight = defaultSecondMaxHeight;
        
        // 如果图片自定义尺寸开关打开
        if (this.imgCustomSizeManager && this.imgCustomSizeManager.isEnabled()) {
            const customSize = this.imgCustomSizeManager.getSettings();
            const customMinWidth = customSize.minWidth;
            const customMaxWidth = customSize.maxWidth;
            const customMinHeight = customSize.minHeight;
            const customMaxHeight = customSize.maxHeight;
            
            // 计算自定义尺寸的宽高比（宽度/高度）
            const customAspectRatio = (customMaxWidth / customMaxHeight);
            const isHorizontal = customAspectRatio >= 1; // 宽度>=高度认为是横的
            
            if (isHorizontal) {
                // 横的：替换第一个条件
                firstMinWidth = customMinWidth;
                firstMaxWidth = customMaxWidth;
                firstMinHeight = customMinHeight;
                firstMaxHeight = customMaxHeight;
            } else {
                // 竖的：替换第二个条件
                secondMinWidth = customMinWidth;
                secondMaxWidth = customMaxWidth;
                secondMinHeight = customMinHeight;
                secondMaxHeight = customMaxHeight;
            }
        }
        
        document.querySelectorAll(
            'a[target] img:not([src*="avatar"]), ' +
            'a[style] img:not([src*="avatar"]), ' +
            'a[onclick] img:not([src*="avatar"]), ' +
            'a[href*="javascript"] img:not([src*="avatar"]), ' +
            'a[rel*="nofollow"] img:not([src*="avatar"]), ' +
            'a img[style*="display"][style*="block"], ' +
            'a:not([href*="' + this.config.domain.split('.')[0] + '."]):not([href^="/"]) img'
        ).forEach(img => {
            // 第一个条件（横幅）
            this.removeAd(img, { 
                minWidth: firstMinWidth, 
                maxWidth: firstMaxWidth, 
                minHeight: firstMinHeight, 
                maxHeight: firstMaxHeight, 
                removeFunction: 2,
                adType: 'img'
            });
            
            // 第二个条件（竖幅）
            this.removeAd(img, { 
                minWidth: secondMinWidth, 
                maxWidth: secondMaxWidth, 
                minHeight: secondMinHeight, 
                maxHeight: secondMaxHeight, 
                removeFunction: 2, 
                color: '#08E',
                adType: 'img'
            });
        });

        // 其他广告移除条件 - 使用第一个条件的尺寸
        document.querySelectorAll('img[data-link]').forEach(img => {
            this.removeAd(img, { 
                minWidth: firstMinWidth, 
                maxWidth: firstMaxWidth, 
                minHeight: firstMinHeight, 
                maxHeight: firstMaxHeight, 
                removeFunction: 3,
                adType: 'img'
            });
        });

        document.querySelectorAll('a[target*="/?channelCode"] img, a[href*=":"] img').forEach(img => {
            this.removeAd(img, { 
                minWidth: firstMinWidth, 
                maxWidth: firstMaxWidth, 
                minHeight: firstMinHeight, 
                maxHeight: firstMaxHeight, 
                removeFunction: 3,
                adType: 'img'
            });
        });
    }

    removeIframeAds() {
        if (!this.config.isEnabled('unFuck_ADV_IFRAME')) {
            return;
        }

        // 获取自定义尺寸或使用默认尺寸
        let minWidth = 600, maxWidth = 1500, minHeight = 40, maxHeight = 180;
        
        // 如果框架自定义尺寸开关打开
        if (this.iframeCustomSizeManager && this.iframeCustomSizeManager.isEnabled()) {
            const customSize = this.iframeCustomSizeManager.getSettings();
            minWidth = customSize.minWidth;
            maxWidth = customSize.maxWidth;
            minHeight = customSize.minHeight;
            maxHeight = customSize.maxHeight;
        }

        document.querySelectorAll('iframe').forEach(iframe => {
            const iframeSrcWhitelist = [
                'upload',
                'player',
                'comment',
                'jiexi.php',
                '\/soft',
                '\/login',
                'vip\.php\?url=',
                '\/vip\/index\.php\?url=',
                '\/index\.php\?url=https?:\/\/',
                'lanzou..com\/fn\?',
                '.china.com.cn\/node_',
                '\/\/.+.douyu.com',
                '\/\/v.qq.com',
                '\/\/tushuo.baidu.com',
                '\/\/zhannei.baidu.com',
                '\/\/widget.weibo.com'
            ];
            
            const whitelistRegex = new RegExp(iframeSrcWhitelist.join('|'), 'i');
            
            if (!whitelistRegex.test(iframe.src) && iframe.src && 
                iframe.offsetWidth >= minWidth && iframe.offsetWidth <= maxWidth && 
                iframe.offsetHeight >= minHeight && iframe.offsetHeight <= maxHeight) {
                this.removeAd(iframe, { 
                    removeFunction: 1,
                    adType: 'iframe',
                    color: '#0B0'
                });
            }
        });
    }

    removeAds() {
        this.removeImgAds();
        this.removeIframeAds();
    }

    startObserver() {
        if (this.observer) {
            return;
        }

        this.observer = new MutationObserver(() => {
            this.removeAds();
        });

        const startObserving = () => {
            if (document.body) {
                this.observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                return true;
            }
            return false;
        };

        if (!startObserving()) {
            const checkInterval = setInterval(() => {
                if (startObserving()) {
                    clearInterval(checkInterval);
                }
            }, 50);

            setTimeout(() => {
                clearInterval(checkInterval);
            }, 15000);
        }
    }
}

// 联盟广告屏蔽器
class UnionAdBlocker {
    static isBlocking = false;
    static hasLogged = false;
    
    static block() {
        'use strict';
        
        // 防止重复执行
        if (UnionAdBlocker.isBlocking) {
            return;
        }
        
        UnionAdBlocker.isBlocking = true;
        
        // 获取自定义属性管理器
        let customProperties = [];
        try {
            const customPropsManager = new UnionAdCustomPropertiesManager();
            customProperties = customPropsManager.getPropertiesArray();
        } catch (e) {
            // 静默处理错误
        }
        
        // 扩展的广告属性黑名单
        let AD_PROPERTIES = [
            '_SF_', '_global_', '_ssp', 'ssp_global', 'AD', 'Ad', 'ad',
            'ads', 'advertisement', '___baidu_union_', '___baidu_union_ds_',
            '__delivery_global_', '___delivery___global___counter___',
            'cproArray', 'cpro_baiduid', 'cpro_baidu_cpr', 'arrBaiduAds',
            'slotbydup', 'bdCproConfig', '_qha_data', 'sinaads', 'sogou_un',
            'pbjs', 'googletag', 'google_ad', 'baidu_union_packer',
            'baidu_union_rule', '_bd_union_config', 'baidu_union',
            'tencentAds', 'aliUnion', 'jdUnion', 'adfox', 'adsystem',
            'admanager', 'adtag', 'adunit', 'adrequest', 'prebid', 'apntag',
            'smartadserver', 'amznads', 'amazon_ads', '_ad_', '_ads_',
            '_union_', 'BaiduUnion', 'SogouUnion', 'TencentUnion',
            'AlibabaUnion', 'JingdongUnion', 'doubleclick', 'admob',
            'adcolony', 'vungle', 'unityads', 'chartboost', 'mopub',
            'flurry', 'applovin',
            
            // 从网易163.com文件分析出的关键广告属性
            'ntesAd', 'adiframe', 'ntm', 'NTESAntAnalysis', 'wljd_arr',
            'ntes_ad', 'neteaseAd', 'ad12_src', 'ad1200', 'baiduad',
            'cmIframe_js_ad', 'cmbaidu_js_ad',
            
            // 新增的广告属性
            'adunion', 'AdUnion', 'ad_union', 'ad_union_', 'union_ad', 'unionad', 'UnionAd',
            'ali_union', 'jd_union', 'pinduoduo_union', 'pdd_union',
            'suning_union', 'suningUnion', 'vip_union', 'vipUnion',
            '__tbUnion', '__jdUnion', '__aliUnion', '__pddUnion', '__suningUnion',
            
            // 常见广告脚本属性
            'adsbygoogle', 'amazon_ads_iframe', 'taboola', 'outbrain',
            'revcontent', 'mgid', 'adthrive', 'mediavine', 'ezoic',
            'monetag', 'propellerads', 'adsterra', 'popads', 'adblade',
            'contentad', 'infolinks', 'chitika', 'bidvertiser', 'adengage'
        ];
        
        // 合并自定义属性
        if (customProperties.length > 0) {
            AD_PROPERTIES = [...AD_PROPERTIES, ...customProperties];
        }
        
        // 创建深度广告拦截器
        function createDeepAdBlocker() {
            const handler = {
                get: () => createDeepAdBlocker(),
                set: () => false,
                apply: () => undefined,
                construct: () => ({}),
                has: () => false,
                deleteProperty: () => false,
                defineProperty: () => false,
                getOwnPropertyDescriptor: () => undefined,
                ownKeys: () => [],
                preventExtensions: () => true,
                isExtensible: () => false
            };
            
            return new Proxy(() => {}, handler);
        }
        
        // 强力拦截全局广告属性
        function interceptGlobalProperties() {
            AD_PROPERTIES.forEach(prop => {
                try {
                    // 检查属性是否已经存在
                    const exists = prop in unsafeWindow;
                    
                    Object.defineProperty(unsafeWindow, prop, {
                        get: () => createDeepAdBlocker(),
                        set: () => false,
                        configurable: false,
                        enumerable: false,
                        writable: false
                    });
                    
                    // 如果属性已经存在，尝试覆盖它
                    if (exists) {
                        unsafeWindow[prop] = createDeepAdBlocker();
                    }
                } catch (e) {
                    try {
                        let value = createDeepAdBlocker();
                        Object.defineProperty(unsafeWindow, prop, {
                            get: () => value,
                            set: () => false,
                            configurable: false,
                            enumerable: true
                        });
                    } catch (e2) {
                        // 静默处理错误
                    }
                }
            });
            
            // 拦截动态创建的广告属性
            const originalDefineProperty = Object.defineProperty;
            Object.defineProperty = function(obj, prop, descriptor) {
                if (obj === unsafeWindow || obj === window) {
                    const propStr = String(prop);
                    if (AD_PROPERTIES.some(adProp => propStr.includes(adProp) || propStr.toLowerCase().includes('ad'))) {
                        return false;
                    }
                }
                return originalDefineProperty.call(this, obj, prop, descriptor);
            };
        }
        
        // 初始化拦截
        function init() {
            interceptGlobalProperties();
            
            // 监听后续的全局属性设置
            const originalSet = (obj, prop, value) => {
                const propStr = String(prop);
                if ((obj === unsafeWindow || obj === window) && 
                    AD_PROPERTIES.some(adProp => propStr.includes(adProp) || propStr.toLowerCase().includes('ad'))) {
                    return false;
                }
                obj[prop] = value;
                return true;
            };
            
            // 覆盖window和unsafeWindow的赋值操作
            try{
                unsafeWindow.__proto__ = new Proxy(unsafeWindow.__proto__, {
                    set: originalSet
                });
            } catch(e) {
                //静默处理错误
            }
        }
        
        // 在页面加载的不同阶段重新应用拦截
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(init, 0);
            });
            
            window.addEventListener('load', () => {
                setTimeout(init, 100);
            });
        }
        
        // 立即执行
        init();
    }
}

// 限制解除器
class RestrictionRemover {
    constructor(config) {
        this.config = config;
    }

    removeRestrictions() {
        if (!this.config.whitelist['Fuck_XZ']) {
            return;
        }

        const events = ['contextmenu', 'selectstart', 'copy'];
        
        events.forEach(event => {
            window.addEventListener(event, (e) => {
                e.stopPropagation();
            }, true);
            
            window[`on${event}`] = null;
            document[`on${event}`] = null;
        });

        GM_addStyle(`
            * {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
            }
            ::selection {
                color: #fff !important;
                background: #3390FF !important;
            }
        `);

        window.getSelection = () => ({});
        document.getSelection = () => ({});
    }
}

// 脚本写入防护
class ScriptWriteProtection {
    constructor(config) {
        this.config = config;
    }

    protect() {
        if (!this.config.isEnabled('Fuck_WRS')) {
            return;
        }

        const blacklist = [
            'script.*src=',
            '\/click\/',
            'var hm ?= ?document\.createElement',
            'cpro_id',
            'tanx-a-mm'
        ];

        const whitelist = [
            '[\u4e00-\u9fa5]',
            'player',
            'editor\/',
            'map.baidu.com',
            '\/api',
            'cityjson',
            '\/conf',
            'qhcs.css',
            'qhcs.js',
            'data.video.iqiyi.com\/v.mp4',
            'account\.',
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
            '\/pc\/js\/down.js',
            '\/xinwen',
            '\/video\/',
            '\/vip\/',
            '\/data\/da_default.js',
            'BackTop'
        ];

        const blacklistRegex = new RegExp(blacklist.join('|'), 'i');
        const whitelistRegex = new RegExp(whitelist.join('|'), 'i');

        const originalWrite = document.write;
        const originalWriteln = document.writeln;

        document.write = function(str) {
            if (!blacklistRegex.test(str) || whitelistRegex.test(str)) {
                originalWrite.call(this, str);
            } else {
                console.log('%c[阻止脚本写入] ✂', 'border-left:5px solid #A0B;color:#A0B;padding:3px', str);
            }
        };

        document.writeln = function(str) {
            if (!blacklistRegex.test(str) || whitelistRegex.test(str)) {
                originalWriteln.call(this, str);
            } else {
                console.log('%c[阻止脚本写入] ✂', 'border-left:5px solid #A0B;color:#A0B;padding:3px', str);
            }
        };
    }
}

// 辅助函数：安全地创建元素
const createElement = (tag, attributes = {}, textContent = '') => {
    const element = document.createElement(tag);
    
    // 设置属性
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'htmlFor') {
            element.htmlFor = value;
        } else if (key === 'checked') {
            // 特殊处理checked属性，使用property而不是attribute
            element.checked = value;
        } else if (key.startsWith('data-')) {
            element.setAttribute(key, value);
        } else if (key === 'style' && typeof value === 'object') {
            Object.assign(element.style, value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // 设置文本内容
    if (textContent) {
        element.textContent = textContent;
    }
    
    return element;
};

// 辅助函数：安全地添加样式
const addStyles = (styles, id = '') => {
    if (document.getElementById(id)) {
        return;
    }
    
    const style = document.createElement('style');
    if (id) {
        style.id = id;
    }
    style.textContent = styles;
    document.head.appendChild(style);
};

// 设置面板
class SettingsPanel {
    constructor(config, floatIconManager, imgCustomSizeManager, iframeCustomSizeManager, elementHider, hackPlus) {
        this.config = config;
        this.floatIconManager = floatIconManager;
        this.imgCustomSizeManager = imgCustomSizeManager;
        this.iframeCustomSizeManager = iframeCustomSizeManager;
        this.elementHider = elementHider;
        this.hackPlus = hackPlus;               // 保存 HackPlus 实例引用

        this.unionAdCustomPropsManager = new UnionAdCustomPropertiesManager();
        SettingsPanelManager.setSettingsPanel(this);
        this.setupKeyboardShortcut();
    }

    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' && e.ctrlKey) {
                e.preventDefault();
                this.togglePanel();
            }
        });
    }

    togglePanel() {
        // 简单检测是否添加了全局的额外选择器，如果执行要作也没有办法
        const isHtmlHidden = window.getComputedStyle(document.documentElement).display === 'none';
        const isBodyHidden = document.body && window.getComputedStyle(document.body).display === 'none';
        const hasUniversalSelector = this.elementHider.hiddenSelectors.has('*');
        
        if (isHtmlHidden || isBodyHidden || hasUniversalSelector) {
            const confirmReset = confirm('设置面板无法显示，检测到整个网页被隐藏\n可能是添加了"html"、"body"、"*"等通用选择器\n尝试清空当前域名的额外隐藏规则恢复？');
            if (confirmReset) {
                this.elementHider.clearDomainHiddenSelectors();
                location.reload(); 
            }
            return; // 不打开设置面板
        }

        const existingPanel = document.getElementById('hackplus-settings-panel');
        if (existingPanel) {
            existingPanel.remove();
        } else {
            this.createPanel();
        }
    }

    createPanel() {
        const panel = createElement('div', { id: 'hackplus-settings-panel' });
        document.body.appendChild(panel);
        this.buildPanelContent(panel);
        this.addPanelStyles();
        this.setupPanelEvents(panel);
    }

    buildPanelContent(panel) {
        const floatIconSettings = GM_getValue('hackplus_float_icon_settings', '{}');
        let floatIconEnabled = false;
        try {
            const settings = JSON.parse(floatIconSettings);
            floatIconEnabled = settings.enabled === true;
        } catch (e) {
            floatIconEnabled = false;
        }

        const imgCustomSizeSettings = this.imgCustomSizeManager.getSettings();
        const iframeCustomSizeSettings = this.iframeCustomSizeManager.getSettings();
        const unionAdCustomPropsSettings = this.unionAdCustomPropsManager.getSettings();

        const header = createElement('div', { className: 'hackplus-panel-header' });
        const title = createElement('h3', {}, '莫舞Pro Plus 设置');
        const closeBtn = createElement('button', { className: 'hackplus-close-btn', title: '关闭' }, '×');
        header.appendChild(title);
        header.appendChild(closeBtn);

        const content = createElement('div', { className: 'hackplus-panel-content' });

        this.createSettingItem(content, 'unFuck_ADV_IMG', '图片广告白名单', this.config.hasFeature('unFuck_ADV_IMG'));
        this.createSettingItem(content, 'unFuck_ADV_IFRAME', '内嵌框架广告白名单', this.config.hasFeature('unFuck_ADV_IFRAME'));
        this.createSettingItem(content, 'unFuck_UNION', '联盟广告白名单', this.config.hasFeature('unFuck_UNION'));
        this.createSettingItem(content, 'Fuck_WRS', '禁用脚本write(ln)', this.config.hasFeature('Fuck_WRS'));
        this.createSettingItem(content, 'Fuck_XZ', '解除限制', this.config.hasFeature('Fuck_XZ'));
        this.createSettingItem(content, 'FloatIcon', '显示浮动图标(全局)', floatIconEnabled);

        // 额外隐藏样式行
        const extraHideContainer = createElement('div', { className: 'hackplus-setting-item' });
        const staticLabel = createElement('span', { className: 'hackplus-static-label' }, '额外隐藏样式');
        const buttonsContainer = createElement('div', {
            className: 'hackplus-buttons-container',
            style: { display: 'flex', gap: '6px', marginLeft: 'auto', flex: '1', maxWidth: '200px' }
        });
        const managerBtn = createElement('button', { className: 'hackplus-manager-btn', id: 'hackplus-element-hider-manager-btn' }, '隐藏管理器');
        const startSelectBtn = createElement('button', { className: 'hackplus-start-select-btn', id: 'hackplus-start-select-btn' }, '开始选择');
        Object.assign(managerBtn.style, { flex: '1', minWidth: '0' });
        Object.assign(startSelectBtn.style, { flex: '1', minWidth: '0' });
        buttonsContainer.appendChild(managerBtn);
        buttonsContainer.appendChild(startSelectBtn);
        extraHideContainer.appendChild(staticLabel);
        extraHideContainer.appendChild(buttonsContainer);
        content.appendChild(extraHideContainer);

        this.createCustomSizeSection(content, 'img', imgCustomSizeSettings, '移除【图片】大小px（全局）');
        this.createCustomSizeSection(content, 'iframe', iframeCustomSizeSettings, '移除【框架】大小px（全局）');
        this.createUnionAdCustomPropertiesSection(content, unionAdCustomPropsSettings);

        const footer = createElement('div', { className: 'hackplus-panel-footer' });
        const applyBtn = createElement('button', { className: 'hackplus-apply-btn' }, '应用并刷新');
        footer.appendChild(applyBtn);

        panel.appendChild(header);
        panel.appendChild(content);
        panel.appendChild(footer);
    }

    createSettingItem(container, id, labelText, isChecked) {
        const item = createElement('div', { className: 'hackplus-setting-item' });
        const switchContainer = createElement('label', { className: 'hackplus-switch' });
        const checkbox = createElement('input', { type: 'checkbox', id: id });
        checkbox.checked = isChecked;
        const slider = createElement('span', { className: 'hackplus-slider' });
        switchContainer.appendChild(checkbox);
        switchContainer.appendChild(slider);
        const label = createElement('label', { htmlFor: id, className: 'hackplus-label' }, labelText);
        item.appendChild(switchContainer);
        item.appendChild(label);
        container.appendChild(item);
    }

    createCustomSizeSection(container, type, settings, labelText) {
        const section = createElement('div', { className: 'hackplus-custom-size-section' });
        const header = createElement('div', { className: 'hackplus-custom-size-header' });
        const switchContainer = createElement('label', { className: 'hackplus-switch' });
        const checkbox = createElement('input', { type: 'checkbox', id: `${type.charAt(0).toUpperCase() + type.slice(1)}CustomSize` });
        checkbox.checked = settings.enabled;
        const slider = createElement('span', { className: 'hackplus-slider' });
        switchContainer.appendChild(checkbox);
        switchContainer.appendChild(slider);
        const label = createElement('label', { htmlFor: `${type.charAt(0).toUpperCase() + type.slice(1)}CustomSize`, className: 'hackplus-label' }, labelText);
        const resetBtn = createElement('button', { className: 'hackplus-reset-btn', title: '重置为默认值', 'data-type': type }, '↺');
        header.appendChild(switchContainer);
        header.appendChild(label);
        header.appendChild(resetBtn);

        const inputsContainer = createElement('div', { className: 'hackplus-size-inputs' });
        const widthRow = createElement('div', { className: 'hackplus-size-row' });
        const minWidthGroup = createElement('div', { className: 'hackplus-size-input-group' });
        const minWidthLabel = createElement('label', { htmlFor: `${type}MinWidth` }, '最小宽度:');
        const minWidthInput = createElement('input', { type: 'number', id: `${type}MinWidth`, value: settings.minWidth, min: '1', max: '1000' });
        minWidthGroup.appendChild(minWidthLabel);
        minWidthGroup.appendChild(minWidthInput);
        const maxWidthGroup = createElement('div', { className: 'hackplus-size-input-group' });
        const maxWidthLabel = createElement('label', { htmlFor: `${type}MaxWidth` }, '最大宽度:');
        const maxWidthInput = createElement('input', { type: 'number', id: `${type}MaxWidth`, value: settings.maxWidth, min: '2', max: '3000' });
        maxWidthGroup.appendChild(maxWidthLabel);
        maxWidthGroup.appendChild(maxWidthInput);
        widthRow.appendChild(minWidthGroup);
        widthRow.appendChild(maxWidthGroup);

        const heightRow = createElement('div', { className: 'hackplus-size-row' });
        const minHeightGroup = createElement('div', { className: 'hackplus-size-input-group' });
        const minHeightLabel = createElement('label', { htmlFor: `${type}MinHeight` }, '最小高度:');
        const minHeightInput = createElement('input', { type: 'number', id: `${type}MinHeight`, value: settings.minHeight, min: '1', max: '1000' });
        minHeightGroup.appendChild(minHeightLabel);
        minHeightGroup.appendChild(minHeightInput);
        const maxHeightGroup = createElement('div', { className: 'hackplus-size-input-group' });
        const maxHeightLabel = createElement('label', { htmlFor: `${type}MaxHeight` }, '最大高度:');
        const maxHeightInput = createElement('input', { type: 'number', id: `${type}MaxHeight`, value: settings.maxHeight, min: '2', max: '3000' });
        maxHeightGroup.appendChild(maxHeightLabel);
        maxHeightGroup.appendChild(maxHeightInput);
        heightRow.appendChild(minHeightGroup);
        heightRow.appendChild(maxHeightGroup);

        inputsContainer.appendChild(widthRow);
        inputsContainer.appendChild(heightRow);
        section.appendChild(header);
        section.appendChild(inputsContainer);
        container.appendChild(section);
    }

    createUnionAdCustomPropertiesSection(container, settings) {
        const section = createElement('div', { className: 'hackplus-custom-size-section' });
        const header = createElement('div', { className: 'hackplus-custom-size-header' });
        const switchContainer = createElement('label', { className: 'hackplus-switch' });
        const checkbox = createElement('input', { type: 'checkbox', id: 'UnionAdCustomProperties' });
        checkbox.checked = settings.enabled;
        const slider = createElement('span', { className: 'hackplus-slider' });
        switchContainer.appendChild(checkbox);
        switchContainer.appendChild(slider);
        const label = createElement('label', { htmlFor: 'UnionAdCustomProperties', className: 'hackplus-label multiline-label' }, '联盟广告/禁用属性黑名单（全局）');
        const resetBtn = createElement('button', { className: 'hackplus-reset-btn', title: '重置为默认值', 'data-type': 'unionad' }, '↺');
        header.appendChild(switchContainer);
        header.appendChild(label);
        header.appendChild(resetBtn);

        const textareaContainer = createElement('div', { className: 'hackplus-unionad-textarea-container' });
        const textarea = createElement('textarea', { id: 'UnionAdCustomPropertiesText', rows: '4', placeholder: '输入要禁用的广告属性，用逗号分隔\n例如：my_ad_property1, my_ad_property2' });
        textarea.value = settings.properties || '';
        textareaContainer.appendChild(textarea);
        section.appendChild(header);
        section.appendChild(textareaContainer);
        container.appendChild(section);
    }

    addPanelStyles() {
        const styles = `
            #hackplus-settings-panel {
                all: initial;
                box-sizing: border-box;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
                position: fixed !important;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                width: 100%;
                max-width: 340px;
                background: #FFF;
                border-radius: 12px;
                box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
                z-index: 2147483646;
                overflow: hidden;
                border: 1px solid #1abc9c;
                display: flex;
                flex-direction: column;
                max-height: 78vh;
                margin: auto;
            }
            #hackplus-settings-panel * {
                box-sizing: border-box;
                font-family: inherit;
            }
            .hackplus-panel-header {
                background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%);
                color: white;
                padding: 10px 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-shrink: 0;
            }
            .hackplus-panel-header h3 {
                margin: 0;
                font-size: 14px;
                font-weight: 600;
                letter-spacing: 0.3px;
                color: white;
            }
            .hackplus-close-btn {
                background: rgba(255, 255, 255, 0.15);
                border: none;
                color: white;
                font-size: 16px;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                padding: 0;
                margin: 0;
            }
            .hackplus-close-btn:hover {
                background: rgba(255, 255, 255, 0.25);
            }
            .hackplus-panel-content {
                padding: 10px 16px;
                background: #f8fafc;
                flex: 1;
                min-height: 0;
                overflow-y: auto;
                max-height: calc(80vh - 120px); 
                cursor: grab;
                user-select: none;
            }
            .hackplus-panel-content.dragging {
                cursor: grabbing !important;
                user-select: none !important;
            }
            .hackplus-panel-content input,
            .hackplus-panel-content button,
            .hackplus-panel-content label,
            .hackplus-panel-content .hackplus-switch,
            .hackplus-panel-content .hackplus-slider,
            .hackplus-panel-content textarea {
                cursor: default !important;
                user-select: auto !important;
            }
            .hackplus-panel-content input[type="number"],
            .hackplus-panel-content textarea {
                cursor: text !important;
                user-select: auto !important;
            }
            .hackplus-panel-content .hackplus-label {
                user-select: none;
            }
            .hackplus-setting-item {
                display: flex;
                align-items: center;
                min-height: 36px;
                margin-bottom: 6px;
                padding: 6px 10px;
                background: white;
                border-radius: 6px;
                border: 1px solid #edf2f7;
                transition: all 0.2s ease;
            }
            .hackplus-setting-item:hover {
                border-color: #1abc9c;
                box-shadow: 0 2px 4px rgba(26, 188, 156, 0.1);
            }
            .hackplus-setting-item:last-child {
                margin-bottom: 0;
            }
            .hackplus-switch {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 36px;
                height: 18px;
                margin-right: 10px;
                flex-shrink: 0;
            }
            .hackplus-switch input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            .hackplus-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #e2e8f0;
                transition: .3s;
                border-radius: 18px;
            }
            .hackplus-slider:before {
                position: absolute;
                content: "";
                height: 14px;
                width: 14px;
                left: 2px;
                top: 2px;
                background-color: white;
                transition: .3s cubic-bezier(0.4, 0, 0.2, 1);
                border-radius: 50%;
                box-shadow: 0 2px 2px rgba(0, 0, 0, 0.1);
            }
            input:checked + .hackplus-slider {
                background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%);
            }
            input:checked + .hackplus-slider:before {
                transform: translateX(18px);
            }
            .hackplus-label {
                font-size: 12px;
                color: #4a5568;
                font-weight: 500;
                line-height: 1.3;
                user-select: none;
                flex: 1;
                display: flex;
                align-items: center;
                min-height: 18px;
                padding: 1px 0;
            }
            .hackplus-label.multiline-label {
                white-space: pre-line;
            }
            .hackplus-static-label {
                font-size: 12px;
                color: #1abc9c;
                font-weight: 500;
                line-height: 1.3;
                user-select: none;
                display: flex;
                align-items: center;
                min-height: 18px;
                padding: 1px 0;
                margin-right: 10px;
                flex-shrink: 0;
            }
            .hackplus-custom-size-section {
                margin-top: 8px; 
                padding: 0;
                background: white;
                border-radius: 6px;
                border: 1px solid #edf2f7;
                transition: all 0.2s ease;
            }
            .hackplus-custom-size-section:hover {
                border-color: #1abc9c;
                box-shadow: 0 2px 4px rgba(26, 188, 156, 0.1);
            }
            .hackplus-custom-size-header {
                display: flex;
                align-items: center;
                min-height: 36px;
                padding: 6px 10px;
                background: white;
                border-radius: 6px 6px 0 0;
            }
            .hackplus-reset-btn {
                background: transparent;
                border: 1px solid #cbd5e0;
                color: #718096;
                font-size: 12px;
                width: 24px;
                height: 24px;
                border-radius: 4px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                padding: 0;
                margin: 0 0 0 8px;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            .hackplus-reset-btn:hover {
                background: #f7fafc;
                border-color: #a0aec0;
                color: #4a5568;
            }
            .hackplus-reset-btn:active {
                background: #edf2f7;
            }
            .hackplus-size-inputs {
                margin-top: 0;
                padding: 8px 10px 8px 10px;
                border-top: 1px solid #edf2f7;
                background: #f8fafc;
                border-radius: 0 0 6px 6px;
            }
            .hackplus-size-row {
                display: flex;
                margin-bottom: 6px;
            }
            .hackplus-size-row:last-child {
                margin-bottom: 0;
            }
            .hackplus-size-input-group {
                display: flex;
                align-items: center;
                flex: 1;
                margin-right: 6px;
            }
            .hackplus-size-input-group:last-child {
                margin-right: 0;
            }
            .hackplus-size-input-group label {
                font-size: 11px;
                color: #4a5568;
                width: 60px;
                flex-shrink: 0;
                display: flex;
                align-items: center;
                min-height: 20px;
            }
            .hackplus-size-input-group input {
                flex: 1;
                padding: 4px 6px;
                border: 1px solid #e2e8f0;
                border-radius: 4px;
                font-size: 11px;
                transition: border-color 0.2s ease;
                background: white;
                color:black;
                cursor: text;
            }
            .hackplus-size-input-group input:focus {
                outline: none;
                border-color: #1abc9c;
            }
            .hackplus-custom-size-section:has(input:focus) {
                border-color: #1abc9c !important;
                box-shadow: 0 2px 4px rgba(26, 188, 156, 0.1) !important;
            }
            .hackplus-size-input-group input::-webkit-inner-spin-button,
            .hackplus-size-input-group input::-webkit-outer-spin-button {
                opacity: 1;
                height: 20px;
            }
            .hackplus-unionad-textarea-container {
                margin-top: 0;
                padding: 8px 10px 8px 10px;
                border-top: 1px solid #edf2f7;
                background: #f8fafc;
                border-radius: 0 0 6px 6px;
            }
            .hackplus-unionad-textarea-container textarea {
                width: 100%;
                padding: 8px 10px;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                font-size: 11px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                line-height: 1.4;
                resize: vertical;
                min-height: 80px;
                max-height: 200px;
                background: white;
                color: #2d3748;
                transition: border-color 0.2s ease, box-shadow 0.2s ease;
            }
            .hackplus-unionad-textarea-container textarea:focus {
                outline: none;
                border-color: #1abc9c;
                box-shadow: 0 0 0 2px rgba(26, 188, 156, 0.1);
            }
            .hackplus-unionad-textarea-container textarea::placeholder {
                color: #a0aec0;
                font-size: 10px;
                line-height: 1.3;
            }
            .hackplus-panel-footer {
                padding: 10px 16px;
                background: #f8fafc;
                border-top: 1px solid #edf2f7;
                text-align: center;
                flex-shrink: 0;
            }
            .hackplus-apply-btn {
                background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%);
                color: white;
                border: none;
                padding: 6px 20px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s ease;
                letter-spacing: 0.2px;
                box-shadow: 0 2px 4px rgba(26, 188, 156, 0.2);
                display: inline-block;
                width: auto;
                min-width: 140px;
                text-align: center;
            }
            .hackplus-apply-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(26, 188, 156, 0.3);
            }
            .hackplus-apply-btn:active {
                transform: translateY(0);
            }
            @keyframes hackplus-panel-fade-in {
                from {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            #hackplus-settings-panel {
                animation: hackplus-panel-fade-in 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .hackplus-buttons-container {
                display: flex;
                gap: 6px;
                margin-left: auto;
                flex: 1;
                max-width: 200px;
            }
            .hackplus-manager-btn,
            .hackplus-start-select-btn {
                background: linear-gradient(135deg, #1abc9c 0%, #16a085 100%);
                color: white;
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                font-size: 11px;
                font-weight: 500;
                cursor: pointer;
                white-space: nowrap;
                flex-shrink: 0;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                flex: 1;
                min-width: 0;
            }
            .hackplus-manager-btn:hover,
            .hackplus-start-select-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(26, 188, 156, 0.3);
            }
            .hackplus-manager-btn:active,
            .hackplus-start-select-btn:active {
                transform: translateY(0);
            }
            @media (min-height: 550px) and (max-height: 700px) {
                #hackplus-settings-panel {
                    max-height: 73vh;
                }
                .hackplus-panel-content {
                    max-height: calc(75vh - 120px);
                    overflow-y: auto;
                }
            }
            @media (min-height: 700px) {
                #hackplus-settings-panel {
                    max-height: 68vh;
                }
                .hackplus-panel-content {
                    max-height: calc(70vh - 120px);
                    overflow-y: auto;
                }
            }
            @media (min-height: 850px) {
                #hackplus-settings-panel {
                    max-height: 63vh;
                }
                .hackplus-panel-content {
                    max-height: calc(65vh - 120px);
                    overflow-y: auto;
                }
            }
            @media (max-height: 400px) {
                #hackplus-settings-panel {
                    max-height: 83vh; 
                }
                .hackplus-panel-content {
                    max-height: calc(85vh - 120px);
                    overflow-y: auto;
                }
            }
            @media (max-width: 480px) {
                #hackplus-settings-panel {
                    max-width: calc(100% - 20px);
                    border-radius: 8px;
                    max-height: 78vh;
                }
                .hackplus-panel-header {
                    padding: 8px 12px;
                }
                .hackplus-panel-header h3 {
                    font-size: 13px;
                }
                .hackplus-panel-content {
                    padding: 8px 12px;
                    max-height: calc(80vh - 100px); 
                }
                .hackplus-setting-item {
                    min-height: 34px;
                    padding: 5px 8px;
                    margin-bottom: 5px;
                }
                .hackplus-label {
                    font-size: 11px;
                    min-height: 16px;
                    line-height: 1.2;
                }
                .hackplus-switch {
                    width: 34px;
                    height: 16px;
                }
                .hackplus-slider:before {
                    height: 12px;
                    width: 12px;
                }
                input:checked + .hackplus-slider:before {
                    transform: translateX(16px);
                }
                .hackplus-close-btn {
                    width: 22px;
                    height: 22px;
                    font-size: 14px;
                }
                .hackplus-custom-size-section {
                    padding: 0;
                    margin-top: 6px;
                }
                .hackplus-custom-size-header {
                    padding: 5px 8px;
                    min-height: 34px;
                }
                .hackplus-reset-btn {
                    width: 22px;
                    height: 22px;
                    font-size: 11px;
                }
                .hackplus-size-inputs {
                    padding: 6px 8px 6px 8px;
                }
                .hackplus-size-row {
                    margin-bottom: 5px;
                }
                .hackplus-size-input-group {
                    margin-right: 5px;
                }
                .hackplus-size-input-group label {
                    font-size: 10px;
                    width: 50px;
                }
                .hackplus-size-input-group input {
                    font-size: 10px;
                    padding: 3px 5px;
                }
                .hackplus-unionad-textarea-container {
                    padding: 6px 8px 6px 8px;
                }
                .hackplus-unionad-textarea-container textarea {
                    font-size: 10px;
                    padding: 6px 8px;
                    min-height: 70px;
                }
                .hackplus-unionad-textarea-container textarea::placeholder {
                    font-size: 9px;
                }
                .hackplus-panel-footer {
                    padding: 8px 12px;
                }
                .hackplus-apply-btn {
                    font-size: 11px;
                    padding: 5px 16px;
                    min-width: 120px;
                }
                .hackplus-buttons-container {
                    gap: 4px;
                    max-width: 180px;
                }
                .hackplus-manager-btn,
                .hackplus-start-select-btn {
                    font-size: 10px;
                    padding: 3px 6px;
                    height: 22px;
                }
                .hackplus-static-label {
                    font-size: 11px;
                    min-height: 16px;
                    line-height: 1.2;
                }
            }
            @media (max-width: 320px) {
                #hackplus-settings-panel {
                    max-width: calc(100% - 10px);
                    border-radius: 6px;
                    max-height: 78vh;
                }
                .hackplus-panel-header {
                    padding: 6px 10px;
                }
                .hackplus-panel-header h3 {
                    font-size: 12px;
                }
                .hackplus-panel-content {
                    padding: 6px 10px;
                    max-height: calc(80vh - 90px);
                }
                .hackplus-setting-item {
                    min-height: 32px;
                    padding: 4px 6px;
                    margin-bottom: 4px;
                }
                .hackplus-label {
                    font-size: 10px;
                    min-height: 14px;
                    line-height: 1.1;
                }
                .hackplus-switch {
                    width: 30px;
                    height: 14px;
                    margin-right: 8px;
                }
                .hackplus-slider:before {
                    height: 10px;
                    width: 10px;
                }
                input:checked + .hackplus-slider:before {
                    transform: translateX(14px);
                }
                .hackplus-close-btn {
                    width: 20px;
                    height: 20px;
                    font-size: 12px;
                }
                .hackplus-custom-size-section {
                    padding: 0;
                    margin-top: 5px;
                }
                .hackplus-custom-size-header {
                    padding: 4px 6px;
                    min-height: 32px;
                }
                .hackplus-reset-btn {
                    width: 20px;
                    height: 20px;
                    font-size: 10px;
                }
                .hackplus-size-inputs {
                    padding: 5px 6px 5px 6px;
                }
                .hackplus-size-row {
                    margin-bottom: 4px;
                }
                .hackplus-size-input-group {
                    margin-right: 4px;
                }
                .hackplus-size-input-group label {
                    font-size: 9px;
                    width: 45px;
                }
                .hackplus-size-input-group input {
                    font-size: 9px;
                    padding: 2px 4px;
                }
                .hackplus-unionad-textarea-container {
                    padding: 5px 6px 5px 6px;
                }
                .hackplus-unionad-textarea-container textarea {
                    font-size: 9px;
                    padding: 5px 6px;
                    min-height: 60px;
                }
                .hackplus-unionad-textarea-container textarea::placeholder {
                    font-size: 8px;
                }
                .hackplus-panel-footer {
                    padding: 6px 10px;
                }
                .hackplus-apply-btn {
                    font-size: 10px;
                    padding: 4px 12px;
                    min-width: 100px;
                }
                .hackplus-buttons-container {
                    gap: 3px;
                    max-width: 160px;
                }
                .hackplus-manager-btn,
                .hackplus-start-select-btn {
                    font-size: 9px;
                    padding: 2px 4px;
                    height: 20px;
                }
                .hackplus-static-label {
                    font-size: 10px;
                    min-height: 14px;
                    line-height: 1.1;
                }
            }
            .hackplus-panel-content::-webkit-scrollbar {
                width: 10px; 
            }
            .hackplus-panel-content::-webkit-scrollbar-track {
                background: transparent;
            }
            .hackplus-panel-content::-webkit-scrollbar-thumb {
                background: #cbd5e0;
                border-radius: 5px;
            }
            .hackplus-panel-content::-webkit-scrollbar-thumb:hover {
                background: #a0aec0;
            }
        `;
        addStyles(styles, 'hackplus-panel-styles');
    }

    setupPanelEvents(panel) {
        const closeBtn = panel.querySelector('.hackplus-close-btn');
        closeBtn.addEventListener('click', () => {
            panel.style.opacity = '0';
            setTimeout(() => {
                panel.remove();
                // 更新菜单文本（面板已关闭）
                if (this.hackPlus) {
                    this.hackPlus.updateMenus();
                }
            }, 150);
        });

        panel.querySelectorAll('input[type="checkbox"]:not(#ImgCustomSize):not(#IframeCustomSize):not(#UnionAdCustomProperties)').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = e.target.id;
                if (id === 'FloatIcon') {
                    this.floatIconManager.toggleEnabled(); // 内部已调用 updateMenus
                } else {
                    this.config.toggleFeature(id);
                }
            });
        });

        const imgCustomSizeCheckbox = panel.querySelector('#ImgCustomSize');
        if (imgCustomSizeCheckbox) {
            imgCustomSizeCheckbox.addEventListener('change', (e) => {
                this.imgCustomSizeManager.toggleEnabled();
                this.saveImgCustomSizeSettings(panel);
            });
        }

        const iframeCustomSizeCheckbox = panel.querySelector('#IframeCustomSize');
        if (iframeCustomSizeCheckbox) {
            iframeCustomSizeCheckbox.addEventListener('change', (e) => {
                this.iframeCustomSizeManager.toggleEnabled();
                this.saveIframeCustomSizeSettings(panel);
            });
        }

        const unionAdCustomPropsCheckbox = panel.querySelector('#UnionAdCustomProperties');
        if (unionAdCustomPropsCheckbox) {
            unionAdCustomPropsCheckbox.addEventListener('change', (e) => {
                this.unionAdCustomPropsManager.toggleEnabled();
                this.saveUnionAdCustomPropsSettings(panel);
            });
        }

        const managerButton = panel.querySelector('#hackplus-element-hider-manager-btn');
        if (managerButton && this.elementHider) {
            managerButton.addEventListener('click', () => {
                this.elementHider.showHideManager();
            });
        }

        const startSelectButton = panel.querySelector('#hackplus-start-select-btn');
        if (startSelectButton && this.elementHider) {
            startSelectButton.addEventListener('click', () => {
                this.elementHider.enterSelectMode();
            });
        }

        const resetBtns = panel.querySelectorAll('.hackplus-reset-btn');
        resetBtns.forEach(resetBtn => {
            resetBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const type = e.target.getAttribute('data-type');
                if (type === 'img') {
                    this.resetImgCustomSizeInputs(panel);
                } else if (type === 'iframe') {
                    this.resetIframeCustomSizeInputs(panel);
                } else if (type === 'unionad') {
                    this.resetUnionAdCustomPropsInputs(panel);
                }
            });
        });

        const imgSizeInputs = panel.querySelectorAll('#imgMinWidth, #imgMaxWidth, #imgMinHeight, #imgMaxHeight');
        imgSizeInputs.forEach(input => {
            input.addEventListener('focus', (e) => {
                e.target.dataset.originalValue = e.target.value;
            });
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
            input.addEventListener('blur', (e) => {
                if (e.target.value === '') {
                    const id = e.target.id;
                    if (id === 'imgMinWidth' || id === 'imgMinHeight') {
                        e.target.value = 1;
                    } else if (id === 'imgMaxWidth' || id === 'imgMaxHeight') {
                        const defaultSettings = this.imgCustomSizeManager.defaultSettings;
                        if (id === 'imgMaxWidth') {
                            e.target.value = defaultSettings.maxWidth;
                        } else {
                            e.target.value = defaultSettings.maxHeight;
                        }
                    }
                }
                this.validateImgSizeInputs(panel);
                this.saveImgCustomSizeSettings(panel);
            });
        });

        const iframeSizeInputs = panel.querySelectorAll('#iframeMinWidth, #iframeMaxWidth, #iframeMinHeight, #iframeMaxHeight');
        iframeSizeInputs.forEach(input => {
            input.addEventListener('focus', (e) => {
                e.target.dataset.originalValue = e.target.value;
            });
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
            });
            input.addEventListener('blur', (e) => {
                if (e.target.value === '') {
                    const id = e.target.id;
                    if (id === 'iframeMinWidth' || id === 'iframeMinHeight') {
                        e.target.value = 1;
                    } else if (id === 'iframeMaxWidth' || id === 'iframeMaxHeight') {
                        const defaultSettings = this.iframeCustomSizeManager.defaultSettings;
                        if (id === 'iframeMaxWidth') {
                            e.target.value = defaultSettings.maxWidth;
                        } else {
                            e.target.value = defaultSettings.maxHeight;
                        }
                    }
                }
                this.validateIframeSizeInputs(panel);
                this.saveIframeCustomSizeSettings(panel);
            });
        });

        const unionAdTextarea = panel.querySelector('#UnionAdCustomPropertiesText');
        if (unionAdTextarea) {
            unionAdTextarea.addEventListener('input', (e) => {});
            unionAdTextarea.addEventListener('blur', (e) => {
                this.saveUnionAdCustomPropsSettings(panel);
            });
        }

        const applyBtn = panel.querySelector('.hackplus-apply-btn');
        applyBtn.addEventListener('click', () => {
            this.saveImgCustomSizeSettings(panel);
            this.saveIframeCustomSizeSettings(panel);
            this.saveUnionAdCustomPropsSettings(panel);
            location.reload();
        });

        const content = panel.querySelector('.hackplus-panel-content');
        if (content) {
            let isDragging = false;
            let startY = 0;
            let startScrollTop = 0;
            let hasDragged = false;

            const isDraggableElement = (target) => {
                if (target.tagName === 'INPUT' || target.tagName === 'BUTTON' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
                    return false;
                }
                if (target.classList.contains('hackplus-switch') || target.classList.contains('hackplus-slider') ||
                    target.classList.contains('hackplus-reset-btn') || target.classList.contains('hackplus-apply-btn') ||
                    target.classList.contains('hackplus-close-btn') || target.closest('.hackplus-switch') ||
                    target.closest('.hackplus-reset-btn') || target.closest('.hackplus-apply-btn') ||
                    target.closest('.hackplus-close-btn')) {
                    return false;
                }
                if (target.classList.contains('hackplus-label') || target.closest('.hackplus-label')) {
                    return false;
                }
                return true;
            };

            content.addEventListener('mousedown', (e) => {
                if (!isDraggableElement(e.target)) return;
                isDragging = true;
                hasDragged = false;
                startY = e.clientY;
                startScrollTop = content.scrollTop;
                content.classList.add('dragging');
                e.preventDefault();
                e.stopPropagation();
            });

            const handleMouseMove = (e) => {
                if (!isDragging) return;
                const deltaY = e.clientY - startY;
                if (Math.abs(deltaY) > 2) {
                    hasDragged = true;
                }
                const newScrollTop = startScrollTop - deltaY;
                const maxScrollTop = content.scrollHeight - content.clientHeight;
                content.scrollTop = Math.max(0, Math.min(maxScrollTop, newScrollTop));
                e.preventDefault();
                e.stopPropagation();
            };

            const handleMouseUp = (e) => {
                if (!isDragging) return;
                isDragging = false;
                content.classList.remove('dragging');
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                if (hasDragged) {
                    e.preventDefault();
                    e.stopPropagation();
                    setTimeout(() => { hasDragged = false; }, 50);
                }
            };

            content.addEventListener('mouseleave', () => {
                if (isDragging) {
                    handleMouseUp(new Event('mouseup'));
                }
            });

            content.addEventListener('mousedown', (e) => {
                if (!isDraggableElement(e.target)) return;
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });

            content.addEventListener('touchstart', (e) => {
                if (!isDraggableElement(e.target) || e.touches.length !== 1) return;
                isDragging = true;
                hasDragged = false;
                startY = e.touches[0].clientY;
                startScrollTop = content.scrollTop;
                content.classList.add('dragging');
                e.preventDefault();
                e.stopPropagation();
            });

            const handleTouchMove = (e) => {
                if (!isDragging || e.touches.length !== 1) return;
                const deltaY = e.touches[0].clientY - startY;
                if (Math.abs(deltaY) > 2) {
                    hasDragged = true;
                }
                const newScrollTop = startScrollTop - deltaY;
                const maxScrollTop = content.scrollHeight - content.clientHeight;
                content.scrollTop = Math.max(0, Math.min(maxScrollTop, newScrollTop));
                e.preventDefault();
                e.stopPropagation();
            };

            const handleTouchEnd = (e) => {
                if (!isDragging) return;
                isDragging = false;
                content.classList.remove('dragging');
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
                if (hasDragged) {
                    e.preventDefault();
                    e.stopPropagation();
                    setTimeout(() => { hasDragged = false; }, 50);
                }
            };

            content.addEventListener('touchstart', (e) => {
                if (!isDraggableElement(e.target) || e.touches.length !== 1) return;
                document.addEventListener('touchmove', handleTouchMove);
                document.addEventListener('touchend', handleTouchEnd);
            });

            content.addEventListener('selectstart', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    return false;
                }
            });
        }
    }

    resetImgCustomSizeInputs(panel) {
        const defaultSettings = this.imgCustomSizeManager.defaultSettings;
        const minWidthInput = panel.querySelector('#imgMinWidth');
        const maxWidthInput = panel.querySelector('#imgMaxWidth');
        const minHeightInput = panel.querySelector('#imgMinHeight');
        const maxHeightInput = panel.querySelector('#imgMaxHeight');
        minWidthInput.value = defaultSettings.minWidth;
        maxWidthInput.value = defaultSettings.maxWidth;
        minHeightInput.value = defaultSettings.minHeight;
        maxHeightInput.value = defaultSettings.maxHeight;
        this.saveImgCustomSizeSettings(panel);
    }

    resetIframeCustomSizeInputs(panel) {
        const defaultSettings = this.iframeCustomSizeManager.defaultSettings;
        const minWidthInput = panel.querySelector('#iframeMinWidth');
        const maxWidthInput = panel.querySelector('#iframeMaxWidth');
        const minHeightInput = panel.querySelector('#iframeMinHeight');
        const maxHeightInput = panel.querySelector('#iframeMaxHeight');
        minWidthInput.value = defaultSettings.minWidth;
        maxWidthInput.value = defaultSettings.maxWidth;
        minHeightInput.value = defaultSettings.minHeight;
        maxHeightInput.value = defaultSettings.maxHeight;
        this.saveIframeCustomSizeSettings(panel);
    }

    resetUnionAdCustomPropsInputs(panel) {
        const defaultSettings = this.unionAdCustomPropsManager.defaultSettings;
        const textarea = panel.querySelector('#UnionAdCustomPropertiesText');
        const checkbox = panel.querySelector('#UnionAdCustomProperties');
        textarea.value = defaultSettings.properties;
        checkbox.checked = defaultSettings.enabled;
        this.saveUnionAdCustomPropsSettings(panel);
    }

    validateImgSizeInputs(panel) {
        const minWidthInput = panel.querySelector('#imgMinWidth');
        const maxWidthInput = panel.querySelector('#imgMaxWidth');
        const minHeightInput = panel.querySelector('#imgMinHeight');
        const maxHeightInput = panel.querySelector('#imgMaxHeight');
        let minWidth = Math.max(1, parseInt(minWidthInput.value) || 1);
        let maxWidth = Math.max(2, parseInt(maxWidthInput.value) || this.imgCustomSizeManager.defaultSettings.maxWidth);
        let minHeight = Math.max(1, parseInt(minHeightInput.value) || 1);
        let maxHeight = Math.max(2, parseInt(maxHeightInput.value) || this.imgCustomSizeManager.defaultSettings.maxHeight);
        minWidth = Math.min(1000, minWidth);
        maxWidth = Math.min(3000, maxWidth);
        minHeight = Math.min(1000, minHeight);
        maxHeight = Math.min(3000, maxHeight);
        if (minWidth >= maxWidth) minWidth = maxWidth - 1;
        if (minHeight >= maxHeight) minHeight = maxHeight - 1;
        minWidthInput.value = minWidth;
        maxWidthInput.value = maxWidth;
        minHeightInput.value = minHeight;
        maxHeightInput.value = maxHeight;
    }

    validateIframeSizeInputs(panel) {
        const minWidthInput = panel.querySelector('#iframeMinWidth');
        const maxWidthInput = panel.querySelector('#iframeMaxWidth');
        const minHeightInput = panel.querySelector('#iframeMinHeight');
        const maxHeightInput = panel.querySelector('#iframeMaxHeight');
        let minWidth = Math.max(1, parseInt(minWidthInput.value) || 1);
        let maxWidth = Math.max(2, parseInt(maxWidthInput.value) || this.iframeCustomSizeManager.defaultSettings.maxWidth);
        let minHeight = Math.max(1, parseInt(minHeightInput.value) || 1);
        let maxHeight = Math.max(2, parseInt(maxHeightInput.value) || this.iframeCustomSizeManager.defaultSettings.maxHeight);
        minWidth = Math.min(1000, minWidth);
        maxWidth = Math.min(3000, maxWidth);
        minHeight = Math.min(1000, minHeight);
        maxHeight = Math.min(3000, maxHeight);
        if (minWidth >= maxWidth) minWidth = maxWidth - 1;
        if (minHeight >= maxHeight) minHeight = maxHeight - 1;
        minWidthInput.value = minWidth;
        maxWidthInput.value = maxWidth;
        minHeightInput.value = minHeight;
        maxHeightInput.value = maxHeight;
    }

    saveImgCustomSizeSettings(panel) {
        const minWidthInput = panel.querySelector('#imgMinWidth');
        const maxWidthInput = panel.querySelector('#imgMaxWidth');
        const minHeightInput = panel.querySelector('#imgMinHeight');
        const maxHeightInput = panel.querySelector('#imgMaxHeight');
        const imgCustomSizeCheckbox = panel.querySelector('#ImgCustomSize');
        const settings = {
            enabled: imgCustomSizeCheckbox.checked,
            minWidth: parseInt(minWidthInput.value) || this.imgCustomSizeManager.defaultSettings.minWidth,
            maxWidth: parseInt(maxWidthInput.value) || this.imgCustomSizeManager.defaultSettings.maxWidth,
            minHeight: parseInt(minHeightInput.value) || this.imgCustomSizeManager.defaultSettings.minHeight,
            maxHeight: parseInt(maxHeightInput.value) || this.imgCustomSizeManager.defaultSettings.maxHeight
        };
        this.imgCustomSizeManager.updateSettings(settings);
    }

    saveIframeCustomSizeSettings(panel) {
        const minWidthInput = panel.querySelector('#iframeMinWidth');
        const maxWidthInput = panel.querySelector('#iframeMaxWidth');
        const minHeightInput = panel.querySelector('#iframeMinHeight');
        const maxHeightInput = panel.querySelector('#iframeMaxHeight');
        const iframeCustomSizeCheckbox = panel.querySelector('#IframeCustomSize');
        const settings = {
            enabled: iframeCustomSizeCheckbox.checked,
            minWidth: parseInt(minWidthInput.value) || this.iframeCustomSizeManager.defaultSettings.minWidth,
            maxWidth: parseInt(maxWidthInput.value) || this.iframeCustomSizeManager.defaultSettings.maxWidth,
            minHeight: parseInt(minHeightInput.value) || this.iframeCustomSizeManager.defaultSettings.minHeight,
            maxHeight: parseInt(maxHeightInput.value) || this.iframeCustomSizeManager.defaultSettings.maxHeight
        };
        this.iframeCustomSizeManager.updateSettings(settings);
    }

    saveUnionAdCustomPropsSettings(panel) {
        const textarea = panel.querySelector('#UnionAdCustomPropertiesText');
        const checkbox = panel.querySelector('#UnionAdCustomProperties');
        const settings = {
            enabled: checkbox.checked,
            properties: textarea.value || this.unionAdCustomPropsManager.defaultSettings.properties
        };
        this.unionAdCustomPropsManager.updateSettings(settings);
    }
}

// 主应用类
class HackPlus {
    constructor() {
        // 先创建需要引用 this 的实例，传入 this
        this.floatIconManager = new FloatIconManager(this);
        this.imgCustomSizeManager = new ImgCustomSizeManager();
        this.iframeCustomSizeManager = new IframeCustomSizeManager();

        this.adRemover = new AdRemover(null, this.imgCustomSizeManager, this.iframeCustomSizeManager);
        this.config = new ConfigManager(this.adRemover);
        this.adRemover.config = this.config;

        this.elementHider = new ElementHider(this.config);
        this.unionAdCustomPropsManager = new UnionAdCustomPropertiesManager();

        // 创建设置面板时传入 this
        this.settingsPanel = new SettingsPanel(
            this.config,
            this.floatIconManager,
            this.imgCustomSizeManager,
            this.iframeCustomSizeManager,
            this.elementHider,
            this  // 传入 HackPlus 实例
        );

        this.restrictionRemover = new RestrictionRemover(this.config);
        this.scriptProtection = new ScriptWriteProtection(this.config);

        // 菜单 ID 存储
        this.settingsMenuId = null;
        this.floatIconMenuId = null;
        this.clearMenuId = null;

        this.init();
    }

    init() {
        this.startAdRemoval();
        this.startUnionBlocking();
        this.restrictionRemover.removeRestrictions();
        this.scriptProtection.protect();
        this.floatIconManager.init();
        //暂时不需要ElementHider的初始化  this.elementHider.init();
        this.registerTampermonkeyMenu();

        const elementHider = this.elementHider;
        Object.defineProperty(unsafeWindow, 'hackplus_clear_dhs', {
            get: function() {
                if (elementHider) {
                    if (confirm('确定要清空当前域名的额外隐藏规则吗？页面将刷新。')) {
                        elementHider.clearDomainHiddenSelectors();
                        location.reload();
                    }
                }
                return '已执行 hackplus_clear_dhs';
            },
            configurable: true
        });
    }

    // 更新菜单（供外部调用）
    updateMenus() {
        this.registerTampermonkeyMenu();
    }

    // 注册 Tampermonkey 菜单（带动态状态图标）
    registerTampermonkeyMenu() {
        if (typeof GM_registerMenuCommand === 'undefined') return;

        // 取消所有已注册的菜单
        if (this.settingsMenuId !== null) {
            try { GM_unregisterMenuCommand(this.settingsMenuId); } catch (e) {}
            this.settingsMenuId = null;
        }
        if (this.floatIconMenuId !== null) {
            try { GM_unregisterMenuCommand(this.floatIconMenuId); } catch (e) {}
            this.floatIconMenuId = null;
        }
        if (this.clearMenuId !== null) {
            try { GM_unregisterMenuCommand(this.clearMenuId); } catch (e) {}
            this.clearMenuId = null;
        }

        const settingsPanelOpen = !!document.getElementById('hackplus-settings-panel');
        const floatIconEnabled = this.floatIconManager.isEnabled();

        // 设置面板菜单（带动态状态）
        const settingsText = (settingsPanelOpen ? '✔️' : '❌') + '莫舞Pro Plus设置';
        this.settingsMenuId = GM_registerMenuCommand(settingsText, () => {
            SettingsPanelManager.togglePanel();
        });

        // 浮动图标菜单（带动态状态）
        const floatIconText = (floatIconEnabled ? '✔️' : '❌') + '显示浮动图标';
        this.floatIconMenuId = GM_registerMenuCommand(floatIconText, () => {
            this.floatIconManager.toggleEnabled();
        });

        // 清空额外隐藏菜单（固定文本，无状态）
        this.clearMenuId = GM_registerMenuCommand('⚠️清空当前额外隐藏', () => {
            if (confirm('确定要清空当前域名的额外隐藏规则吗？页面将刷新。')) {
                this.elementHider.clearDomainHiddenSelectors();
                location.reload();
            }
        });
    }

    startAdRemoval() {
        this.adRemover.removeAds();
        this.adRemover.startObserver();
    }

    startUnionBlocking() {
        if (this.config.isEnabled('unFuck_UNION')) {
            UnionAdBlocker.block();
        }
    }
}

// 启动应用
(function() {
    'use strict';
    
    // 在文档加载前立即初始化联盟广告拦截
    // 先创建一个临时配置来检查是否启用了联盟广告拦截
    const tempDomain = getMainDomain();
    const tempWhitelistKey = tempDomain;
    const stored = GM_getValue(tempWhitelistKey, '{}');
    let tempWhitelist = {};
    
    try {
        tempWhitelist = JSON.parse(stored);
    } catch {
        tempWhitelist = {};
    }
    
    // 检查是否启用了联盟广告拦截（白名单中没有unFuck_UNION或值为1表示禁用）
    const isUnionBlockingEnabled = tempWhitelist['unFuck_UNION'] !== 1;
    
    if (isUnionBlockingEnabled) {
        // 立即执行联盟广告拦截，不等待DOMContentLoaded
        setTimeout(() => {
            UnionAdBlocker.block();
        }, 0);
        console.log('%c[hackplus_pro_plus联盟广告屏蔽] ⚙︎ 加载成功', 'color: #1abc9c; font-weight: bold; border-left:#1abc9c 5px solid;color:#1abc9c; padding:3px');

    }
    // 白名单时不显示任何消息
    
    // 继续正常的应用初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            new HackPlus();
        });
    } else {
        new HackPlus();
    }

    // 暴露调试函数：清空所有广告隐藏数据
    unsafeWindow.hackplus_clear_ad_hidden_data = function() {
        try {
            GM_setValue('hackplus_ad_hidden_data', '{}');
            console.log('广告隐藏数据已清空');
        } catch (e) {
            console.error('清空失败', e);
        }
    };
})();