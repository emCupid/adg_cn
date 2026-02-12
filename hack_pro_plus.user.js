// ==UserScript==
// @name         莫舞Pro Plus
// @version      2.9.0
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
    
    // 加载图片广告隐藏规则
    const loadImgHiddenStyles = () => {
        const stored = sessionStorage.getItem('hackplus_temp_hidden_img');
        if (stored) {
            try {
                const hiddenList = JSON.parse(stored);
                if (hiddenList.length > 0) {
                    const styles = hiddenList.map(selector => 
                        `${selector} { display: none !important; }`
                    ).join('\n');
                    
                    // 使用GM_addStyle在文档加载前注入样式
                    GM_addStyle(styles);
                }
            } catch (e) {
                // 静默处理错误
            }
        }
    };
    
    // 加载iframe广告隐藏规则
    const loadIframeHiddenStyles = () => {
        const stored = sessionStorage.getItem('hackplus_temp_hidden_iframe');
        if (stored) {
            try {
                const hiddenList = JSON.parse(stored);
                if (hiddenList.length > 0) {
                    const styles = hiddenList.map(selector => 
                        `${selector} { display: none !important; }`
                    ).join('\n');
                    
                    // 使用GM_addStyle在文档加载前注入样式
                    GM_addStyle(styles);
                }
            } catch (e) {
                // 静默处理错误
            }
        }
    };
    
    // 加载额外隐藏规则（元素选择器）
    const loadExtraHiddenStyles = () => {
        try {
            const stored = GM_getValue('hackplus_extra_hidden_selectors', '{}');
            const parsed = JSON.parse(stored);
            const domain = getMainDomain();
            
            if (parsed[domain] && Array.isArray(parsed[domain]) && parsed[domain].length > 0) {
                const styles = parsed[domain].map(selector => 
                    `${selector} { display: none !important; }`
                ).join('\n');
                
                if (styles) {
                    GM_addStyle(styles);
                }
            }
        } catch (e) {
            // 静默处理错误
        }
    };
    
    // 立即执行
    loadImgHiddenStyles();
    loadIframeHiddenStyles();
    loadExtraHiddenStyles();
})();

// 配置管理器
class ConfigManager {
    constructor(adRemover) {
        this.domain = getMainDomain();  // 使用全局函数
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
        
        // 当切换图片或iframe广告白名单时，清空对应的sessionStorage
        if (feature === 'unFuck_ADV_IMG' && this.adRemover) {
            sessionStorage.removeItem('hackplus_temp_hidden_img');
        } else if (feature === 'unFuck_ADV_IFRAME' && this.adRemover) {
            sessionStorage.removeItem('hackplus_temp_hidden_iframe');
        }
    }
    
    hasAnyWhitelist() {
        return Object.keys(this.whitelist).length > 0 && 
               Object.values(this.whitelist).some(value => value === 1);
    }
    
    // 新增方法：检查白名单中是否有特定功能
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
        this.currentHighlight = null;
        this.currentSelector = null;
        this.confirmOverlay = null;
        this.currentSelectedElement = null;
        this.temporaryHighlight = null;
        this.hiddenSelectors = new Set();
        this.wasManagerOpen = false;

        // 层级切换相关属性
        this.baseElement = null;          // 当前鼠标下最具体元素（层级链起点）
        this.parentChain = [];            // 从 baseElement 到 body 的直接子元素的父链（已过滤排除元素，索引0为最内层）
        this.chainIndex = 0;             // 当前高亮在父链中的索引
        this.currentHoveredElement = null; // 当前实际高亮的元素（跟随 chainIndex）

        // 排除列表：这些元素不能被选择
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
            '#hackplus-cursor-style'
        ];

        this.loadHiddenSelectors();
        this.setupKeyboardShortcuts();
        this.addResponsiveStyles();
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
                    font-size: 12px !important;
                    padding: 6px 10px !important;
                    height: auto !important;
                    min-height: 32px !important;
                }
                #hackplus-confirm-overlay {
                    width: 140px !important;
                    flex-direction: row !important;
                    gap: 6px !important;
                    background: rgba(255, 255, 255, 0.95) !important;
                    padding: 6px !important;
                    border-radius: 8px !important;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
                    border: 1px solid #1abc9c !important;
                }
                #hackplus-confirm-overlay button {
                    padding: 6px 10px !important;
                    font-size: 12px !important;
                    flex: 1 !important;
                    min-width: 60px !important;
                    text-align: center !important;
                }
                .hackplus-element-tag {
                    font-size: 11px !important;
                    padding: 3px 8px !important;
                    max-width: 150px !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                #hackplus-element-hider-manager #hackplus-hide-list p {
                    font-size: 13px !important;
                    padding: 30px 15px !important;
                }
                #hackplus-element-hider-manager h3 {
                    font-size: 15px !important;
                }
                #hackplus-element-hider-manager #hackplus-hide-count {
                    font-size: 13px !important;
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
                    width: 130px !important;
                    padding: 5px !important;
                    gap: 4px !important;
                }
                #hackplus-confirm-overlay button {
                    padding: 5px 8px !important;
                    font-size: 11px !important;
                    min-height: 28px !important;
                    min-width: 55px !important;
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
                #hackplus-element-hider-manager .hackplus-hide-item > div:first-child span {
                    display: inline-block;
                    max-width: 100%;
                    overflow-wrap: break-word;
                    word-wrap: break-word;
                    hyphens: auto;
                }
                #hackplus-confirm-overlay {
                    width: 120px !important;
                    padding: 4px !important;
                    gap: 3px !important;
                }
                #hackplus-confirm-overlay button {
                    padding: 4px 6px !important;
                    font-size: 10px !important;
                    min-height: 26px !important;
                    min-width: 50px !important;
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
            this.applyHiddenStyles();
        } catch (error) {
            console.error('%c[hackplus_pro_plus额外隐藏] ❌︎ 保存隐藏选择器失败', 'color: #f44336; font-weight: bold; border-left:#f44336 5px solid;color:#f44336; padding:3px');
        }
    }

    // 应用隐藏样式
    applyHiddenStyles() {
        if (this.hiddenSelectors.size === 0) {
            const oldStyle = document.getElementById('hackplus-element-hider-style');
            if (oldStyle) oldStyle.remove();
            this.updateHideManagerList();
            return;
        }
        const validSelectors = Array.from(this.hiddenSelectors).filter(selector => {
            for (const excluded of this.EXCLUDED_SELECTORS) {
                if (selector === excluded || selector.includes(excluded.replace(' *', ''))) {
                    return false;
                }
            }
            return true;
        });
        if (validSelectors.length === 0) {
            const oldStyle = document.getElementById('hackplus-element-hider-style');
            if (oldStyle) oldStyle.remove();
            this.updateHideManagerList();
            return;
        }
        const selectorList = validSelectors.join(',\n  ');
        const css = `${selectorList} { display: none !important; }`;
        let styleElement = document.getElementById('hackplus-element-hider-style');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'hackplus-element-hider-style';
            styleElement.textContent = css;
            document.head.appendChild(styleElement);
        } else {
            styleElement.textContent = css;
        }
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
        while (list.firstChild) {
            list.removeChild(list.firstChild);
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
            selectorText.title = selector;
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
                this.hiddenSelectors.delete(selector);
                this.saveHiddenSelectors();
            });
            textContainer.appendChild(selectorText);
            item.appendChild(textContainer);
            item.appendChild(removeBtn);
            list.appendChild(item);
        });
        countText.textContent = `已隐藏 ${this.hiddenSelectors.size} 个元素`;
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
        const title = document.createElement('h3');
        title.textContent = '隐藏元素管理器';
        Object.assign(title.style, {
            margin: '0',
            color: '#1abc9c',
            fontSize: '14px',
            fontWeight: '600',
            letterSpacing: '0.3px'
        });
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        Object.assign(closeBtn.style, {
            width: '24px',
            height: '24px',
            background: '#1abc9c',
            color: 'rgba(255, 255, 255, 0.5)',
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
        header.appendChild(title);
        header.appendChild(closeBtn);
        const countText = document.createElement('p');
        countText.id = 'hackplus-hide-count';
        countText.textContent = '已隐藏 0 个元素';
        Object.assign(countText.style, {
            margin: '0 0 10px 0',
            color: '#666',
            fontWeight: 'bold',
            fontSize: '13px'
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

    // 检查元素是否可见（仅用于高亮框标签，不用于决定高亮目标）
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

    // 生成元素的简洁CSS签名（优先ID，否则tag+class，必要时添加:nth-child）
    getElementShortSignature(element) {
        if (!element || !element.tagName) return '';
        
        // 如果有ID，直接返回 #id
        if (element.id) {
            return '#' + CSS.escape(element.id);
        }
        
        let signature = element.tagName.toLowerCase();
        
        // 添加类名（最多取前两个类，避免过长）
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/).filter(Boolean);
            if (classes.length > 0) {
                // 最多取2个类，用点连接
                const classStr = classes.slice(0, 2).map(c => CSS.escape(c)).join('.');
                signature += '.' + classStr;
                if (classes.length > 2) signature += '…';
            }
        }
        
        // 如果同一父元素下有多个相同标签，添加 :nth-child
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

    // 生成完整CSS选择器（备用）
    generateCssSelector(element) {
        if (!element || !element.tagName) return '';
        if (element.id) {
            return `#${CSS.escape(element.id)}`;
        }
        const path = [];
        let current = element;
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let selector = current.tagName.toLowerCase();
            if (current.className && typeof current.className === 'string') {
                const classes = current.className.trim().split(/\s+/).filter(Boolean);
                if (classes.length > 0) {
                    selector += '.' + classes.map(c => CSS.escape(c)).join('.');
                }
            }
            if (current.parentElement) {
                const siblings = Array.from(current.parentElement.children)
                    .filter(el => el.tagName === current.tagName);
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-child(${index})`;
                }
            }
            path.unshift(selector);
            if (current.id || (selector.includes('.') && document.querySelectorAll(selector).length === 1)) {
                break;
            }
            current = current.parentElement;
        }
        return path.join(' > ');
    }

    // 截断字符串至指定长度，添加省略号
    truncateString(str, maxLength) {
        if (str.length <= maxLength) return str;
        return str.substring(0, maxLength - 3) + '...';
    }

    // 创建高亮覆盖层（支持宽高为0的元素，显示简洁CSS签名）
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
            // 宽高为0时显示1x1的最小高亮框
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
            
            // 生成简洁CSS签名，并截断至27字符（留3字符给尺寸和空格）
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

    // 创建确认按钮覆盖层
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
            const overlay = document.createElement('div');
            overlay.id = 'hackplus-confirm-overlay';
            let overlayWidth, buttonPadding, fontSize, minWidth;
            if (window.innerWidth <= 360) {
                overlayWidth = 120;
                buttonPadding = '4px 6px';
                fontSize = '10px';
                minWidth = '50px';
            } else if (window.innerWidth <= 480) {
                overlayWidth = 130;
                buttonPadding = '5px 8px';
                fontSize = '11px';
                minWidth = '55px';
            } else if (window.innerWidth <= 768) {
                overlayWidth = 140;
                buttonPadding = '6px 10px';
                fontSize = '12px';
                minWidth = '60px';
            } else {
                overlayWidth = 60;
                buttonPadding = '4px 8px';
                fontSize = '11px';
                minWidth = '0';
            }
            if (isSmallScreen) {
                const highlighBottom = rect.top + scrollY + rect.height;
                const highlighTop = rect.top + scrollY;
                const buttonHeight = 40;
                const spacing = 10;
                let top;
                if (highlighBottom + buttonHeight + spacing > window.innerHeight + scrollY) {
                    if (highlighTop - buttonHeight - spacing > scrollY) {
                        top = highlighTop - buttonHeight - spacing;
                    } else {
                        top = Math.max(scrollY, (window.innerHeight + scrollY - buttonHeight) / 2);
                    }
                } else {
                    top = highlighBottom + spacing;
                }
                const left = rect.left + scrollX + rect.width / 2 - overlayWidth / 2;
                Object.assign(overlay.style, {
                    position: 'absolute',
                    top: `${top}px`,
                    left: `${Math.max(5, Math.min(left, window.innerWidth - overlayWidth - 5))}px`,
                    width: `${overlayWidth}px`,
                    zIndex: '2147483647',
                    display: 'flex',
                    flexDirection: 'row',
                    gap: window.innerWidth <= 480 ? '4px' : '6px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    padding: window.innerWidth <= 480 ? '5px' : '6px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    border: '1px solid #1abc9c'
                });
            } else {
                const top = Math.max(rect.top + scrollY - 60, 10);
                Object.assign(overlay.style, {
                    position: 'absolute',
                    top: `${top}px`,
                    left: `${rect.left + scrollX + rect.width - 70}px`,
                    width: `${overlayWidth}px`,
                    zIndex: '2147483647',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px'
                });
            }
            const confirmBtn = document.createElement('button');
            confirmBtn.textContent = '确定';
            Object.assign(confirmBtn.style, {
                background: '#1abc9c',
                color: 'white',
                border: 'none',
                borderRadius: isSmallScreen ? '4px' : '3px',
                padding: buttonPadding,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: fontSize,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                flex: isSmallScreen ? '1' : '0',
                minWidth: minWidth,
                textAlign: 'center'
            });
            const elementSelector = selector;
            confirmBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
                if (elementSelector) {
                    this.hideElement(elementSelector);
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
                borderRadius: isSmallScreen ? '4px' : '3px',
                padding: buttonPadding,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: fontSize,
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                flex: isSmallScreen ? '1' : '0',
                minWidth: minWidth,
                textAlign: 'center'
            });
            cancelBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.exitSelectMode();
            });
            overlay.appendChild(confirmBtn);
            overlay.appendChild(cancelBtn);
            document.documentElement.appendChild(overlay);
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
        this.currentSelector = null;
    }

    // 隐藏元素
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
        this.hiddenSelectors.add(cleanSelector);
        this.saveHiddenSelectors();
    }

    // 构建父链（从 baseElement 到 body 的直接子元素，过滤排除元素，索引0为最内层）
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

    // 鼠标移动处理：直接高亮 elementFromPoint 返回的最具体元素
    handleMouseMove(e) {
        if (!this.isSelectMode) return;
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
        if (!this.isSelectMode) return;
        const clickedElement = document.elementFromPoint(e.clientX, e.clientY);
        if (!clickedElement || this.isElementExcluded(clickedElement)) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        document.removeEventListener('mousemove', this.handleMouseMoveBound, { capture: true });
        document.removeEventListener('click', this.handleClickBound, { capture: true });
        this.removeTemporaryHighlight();
        this.currentSelectedElement = this.currentHoveredElement || this.baseElement;
        if (!this.currentSelectedElement) {
            this.exitSelectMode();
            return;
        }
        this.currentSelector = this.generateCssSelector(this.currentSelectedElement);
        this.currentHighlight = this.createHighlightOverlay(this.currentSelectedElement, true);
        this.confirmOverlay = this.createConfirmOverlay(this.currentSelectedElement, this.currentSelector);
    }

    // 全局键盘快捷键处理
    handleKeyDown(e) {
        // 全局快捷键：左右箭头
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

        // 以下快捷键仅在选择模式下生效
        if (!this.isSelectMode) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            this.exitSelectMode();
            return;
        }

        // A 键：切换到父链的上一层（向外）
        if (e.key === 'a' && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
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

        // Shift + A：切换到父链的下一层（向内）
        if (e.key === 'A' || (e.key === 'a' && e.shiftKey)) {
            e.preventDefault();
            e.stopPropagation();
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

    // 进入选择模式
    enterSelectMode() {
        if (this.isSelectMode) return;
        const manager = document.getElementById('hackplus-element-hider-manager');
        this.wasManagerOpen = !!manager;
        if (manager) manager.remove();
        const settingsPanel = document.getElementById('hackplus-settings-panel');
        if (settingsPanel) settingsPanel.remove();
        this.isSelectMode = true;
        this.handleMouseMoveBound = this.handleMouseMove.bind(this);
        this.handleClickBound = this.handleClick.bind(this);
        document.addEventListener('mousemove', this.handleMouseMoveBound, { capture: true, passive: false });
        document.addEventListener('click', this.handleClickBound, { capture: true, passive: false });
        const style = document.createElement('style');
        style.id = 'hackplus-cursor-style';
        style.textContent = `body * { cursor: crosshair !important; }`;
        document.head.appendChild(style);
    }

    // 退出选择模式
    exitSelectMode() {
        if (!this.isSelectMode) return;
        this.isSelectMode = false;
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
        this.baseElement = null;
        this.parentChain = [];
        this.chainIndex = 0;
        this.currentHoveredElement = null;
        this.currentSelectedElement = null;
        this.currentSelector = null;
        this.temporaryHighlight = null;
        if (this.wasManagerOpen) {
            setTimeout(() => {
                this.showHideManager();
            }, 10);
        }
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

    // 初始化
    init() {
        if (document.head) {
            this.applyHiddenStyles();
        } else {
            setTimeout(() => this.init(), 10);
        }
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
    constructor() {
        this.floatIcon = null;
        this.isDragging = false;
        this.hasDragged = false;
        
        // 加载浮动图标设置
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
        this.settings.enabled = !this.settings.enabled;
        this.saveFloatIconSettings();
        
        if (this.settings.enabled) {
            this.createFloatIcon();
        } else {
            this.removeFloatIcon();
            GM_deleteValue('hackplus_float_icon_settings');
        }
    }
    
    createFloatIcon() {
        try{
            if (!this.isEnabled() || this.floatIcon || window.self !== window.top) {
                return;
            }
        } catch(e) {
            return;
        }
        
        this.floatIcon = document.createElement('div');
        this.floatIcon.id = 'hackplus-float-icon';
        
        // 使用 textContent 设置文本内容，避免 innerHTML
        this.floatIcon.textContent = '⚙';
        this.floatIcon.title = '莫舞Pro Plus设置 (点击打开设置面板)';
        
        // 设置初始位置
        const pos = this.settings.position || { x: 20, y: 20 };
        this.floatIcon.style.left = `${pos.x}px`;
        this.floatIcon.style.top = `${pos.y}px`;
        
        document.body.appendChild(this.floatIcon);
        
        // 添加样式
        this.addFloatIconStyles();
        
        // 添加事件监听
        this.setupFloatIconEvents();
    }
    
    addFloatIconStyles() {
        if (document.getElementById('hackplus-float-icon-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'hackplus-float-icon-styles';
        
        // 使用 textContent 设置样式内容
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
        
        // 点击事件
        this.floatIcon.addEventListener('click', (e) => {
            if (this.hasDragged) {
                this.hasDragged = false;
                return;
            }
            
            SettingsPanelManager.togglePanel();
        });

        // 添加移动端触摸事件
        this.floatIcon.addEventListener('touchend', (e) => {
            // 阻止默认行为，避免触发click事件
            e.preventDefault();
            
            if (this.hasDragged) {
                this.hasDragged = false;
                return;
            }
            
            SettingsPanelManager.togglePanel();
        });
        
        // 优化后的拖动功能
        this.setupDragging();
    }
    
    setupDragging() {
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;
        let dragThreshold = 5; // 增加拖动阈值，减少误判
        
        const onMouseMove = (e) => {
            if (!this.isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            // 移动超过阈值才认为是拖动
            if (Math.abs(deltaX) > dragThreshold || Math.abs(deltaY) > dragThreshold) {
                this.hasDragged = true;
            }
            
            // 只有真正拖动时才更新位置
            if (this.hasDragged) {
                let newX = initialLeft + deltaX;
                let newY = initialTop + deltaY;
                
                // 限制在窗口范围内
                newX = Math.max(5, Math.min(window.innerWidth - 45, newX));
                newY = Math.max(5, Math.min(window.innerHeight - 45, newY));
                
                // 直接设置left和top，不使用transform
                this.floatIcon.style.left = `${newX}px`;
                this.floatIcon.style.top = `${newY}px`;
            }
        };
        
        const onMouseUp = () => {
            this.isDragging = false;
            this.floatIcon.classList.remove('dragging');
            
            // 只有真正拖动时才保存位置
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
            
            // 只有真正拖动时才更新位置
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
            
            // 只有真正拖动时才保存位置
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
        
        // 鼠标事件
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
        
        // 触摸事件
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
        
        // 修复：分别存储图片和iframe广告的临时隐藏数据
        this.tempHiddenImg = new Set();
        this.tempHiddenIframe = new Set();
        
        // 不再创建style标签，因为样式已经在文档加载前通过GM_addStyle注入了
        // 只加载临时隐藏数据到内存中
        this.loadTempHidden('img');
        this.loadTempHidden('iframe');
    }

    loadTempHidden(adType) {
        const key = adType === 'img' ? 'hackplus_temp_hidden_img' : 'hackplus_temp_hidden_iframe';
        const stored = sessionStorage.getItem(key);
        if (stored) {
            try {
                const hiddenList = JSON.parse(stored);
                hiddenList.forEach(selector => {
                    if (adType === 'img') {
                        this.tempHiddenImg.add(selector);
                    } else {
                        this.tempHiddenIframe.add(selector);
                    }
                });
            } catch (e) {
                // 静默处理错误
            }
        }
    }

    addTempHidden(element, adType) {
        // 根据广告类型检查对应的白名单是否开启
        if (adType === 'img') {
            // 如果是图片广告，检查图片广告白名单
            if (!this.config.isEnabled('unFuck_ADV_IMG')) {
                return;
            }
        } else if (adType === 'iframe') {
            // 如果是iframe广告，检查iframe广告白名单
            if (!this.config.isEnabled('unFuck_ADV_IFRAME')) {
                return;
            }
        } else {
            // 未知广告类型，不处理
            return;
        }
        
        const selector = this.getElementSelector(element);
        if (!selector) {
            return;
        }
        
        const key = adType === 'img' ? 'hackplus_temp_hidden_img' : 'hackplus_temp_hidden_iframe';
        const tempHidden = adType === 'img' ? this.tempHiddenImg : this.tempHiddenIframe;
        
        if (!tempHidden.has(selector)) {
            tempHidden.add(selector);
            
            // 保存到sessionStorage
            sessionStorage.setItem(key, JSON.stringify(Array.from(tempHidden)));
            
            // 不再需要更新style标签，因为下次页面加载时会通过injectEarlyStyles注入
        }
    }

    getElementSelector(element) {
        if (element.tagName && element.src) {
            return `${element.tagName}[src="${element.src}"]`;
        }
        return null;
    }

    removeAd(element, options) {
        const {
            minWidth = 0,
            maxWidth = Infinity,
            minHeight = 0,
            maxHeight = Infinity,
            removeFunction = 1,
            color = '#E20',
            adType = 'img'  // 添加广告类型参数，默认为img
        } = options;

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
    constructor(config, floatIconManager, imgCustomSizeManager, iframeCustomSizeManager, elementHider) {
        this.config = config;
        this.floatIconManager = floatIconManager;
        this.imgCustomSizeManager = imgCustomSizeManager;
        this.iframeCustomSizeManager = iframeCustomSizeManager;
        this.elementHider = elementHider;
        
        // 新增：联盟广告自定义属性管理器
        this.unionAdCustomPropsManager = new UnionAdCustomPropertiesManager();
        
        // 注册到全局管理器
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
        const existingPanel = document.getElementById('hackplus-settings-panel');
        if (existingPanel) {
            existingPanel.remove();
            return;
        }

        this.createPanel();
    }

    createPanel() {
        const panel = createElement('div', {
            id: 'hackplus-settings-panel'
        });
        
        document.body.appendChild(panel);
        
        // 构建面板内容
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
        
        // 获取联盟广告自定义属性设置
        const unionAdCustomPropsSettings = this.unionAdCustomPropsManager.getSettings();
        
        // 创建面板头部
        const header = createElement('div', { className: 'hackplus-panel-header' });
        
        const title = createElement('h3', {}, '莫舞Pro Plus 设置');
        const closeBtn = createElement('button', {
            className: 'hackplus-close-btn',
            title: '关闭'
        }, '×');
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // 创建面板内容区域
        const content = createElement('div', { className: 'hackplus-panel-content' });
        
        // 创建设置项 - 注意：白名单中有该功能表示功能被禁用，所以开关状态应该是反的
        this.createSettingItem(content, 'unFuck_ADV_IMG', '图片广告白名单', this.config.hasFeature('unFuck_ADV_IMG'));
        this.createSettingItem(content, 'unFuck_ADV_IFRAME', '内嵌框架广告白名单', this.config.hasFeature('unFuck_ADV_IFRAME'));
        this.createSettingItem(content, 'unFuck_UNION', '联盟广告白名单', this.config.hasFeature('unFuck_UNION'));
        this.createSettingItem(content, 'Fuck_WRS', '禁用脚本write(ln)', this.config.hasFeature('Fuck_WRS'));
        this.createSettingItem(content, 'Fuck_XZ', '解除限制', this.config.hasFeature('Fuck_XZ'));
        this.createSettingItem(content, 'FloatIcon', '显示浮动图标(全局)', floatIconEnabled);
        
        // 创建额外隐藏样式行
        const extraHideContainer = createElement('div', { className: 'hackplus-setting-item' });
        
        // 创建静态文本标签
        const staticLabel = createElement('span', {
            className: 'hackplus-static-label'
        }, '额外隐藏样式');
        
        // 创建按钮容器 - 修改为平分剩余宽度
        const buttonsContainer = createElement('div', {
            className: 'hackplus-buttons-container',
            style: {
                display: 'flex',
                gap: '6px',
                marginLeft: 'auto',
                flex: '1',
                maxWidth: '200px'
            }
        });
        
        // 创建隐藏管理器按钮
        const managerBtn = createElement('button', {
            className: 'hackplus-manager-btn',
            id: 'hackplus-element-hider-manager-btn'
        }, '隐藏管理器');
        
        // 创建开始选择按钮
        const startSelectBtn = createElement('button', {
            className: 'hackplus-start-select-btn',
            id: 'hackplus-start-select-btn'
        }, '开始选择');
        
        // 设置按钮平分宽度
        Object.assign(managerBtn.style, {
            flex: '1',
            minWidth: '0'
        });
        
        Object.assign(startSelectBtn.style, {
            flex: '1',
            minWidth: '0'
        });
        
        buttonsContainer.appendChild(managerBtn);
        buttonsContainer.appendChild(startSelectBtn);
        
        extraHideContainer.appendChild(staticLabel);
        extraHideContainer.appendChild(buttonsContainer);
        content.appendChild(extraHideContainer);
        
        // 创建图片自定义尺寸部分
        this.createCustomSizeSection(content, 'img', imgCustomSizeSettings, '移除【图片】大小px（全局）');
        
        // 创建iframe自定义尺寸部分
        this.createCustomSizeSection(content, 'iframe', iframeCustomSizeSettings, '移除【框架】大小px（全局）');
        
        // 创建联盟广告自定义属性部分
        this.createUnionAdCustomPropertiesSection(content, unionAdCustomPropsSettings);
        
        // 创建面板底部
        const footer = createElement('div', { className: 'hackplus-panel-footer' });
        const applyBtn = createElement('button', { className: 'hackplus-apply-btn' }, '应用并刷新');
        footer.appendChild(applyBtn);
        
        // 组装面板
        panel.appendChild(header);
        panel.appendChild(content);
        panel.appendChild(footer);
    }
    
    createSettingItem(container, id, labelText, isChecked) {
        const item = createElement('div', { className: 'hackplus-setting-item' });
        
        const switchContainer = createElement('label', { className: 'hackplus-switch' });
        const checkbox = createElement('input', {
            type: 'checkbox',
            id: id
        });
        
        // 使用property设置checked状态
        checkbox.checked = isChecked;
        
        const slider = createElement('span', { className: 'hackplus-slider' });
        
        switchContainer.appendChild(checkbox);
        switchContainer.appendChild(slider);
        
        const label = createElement('label', {
            htmlFor: id,
            className: 'hackplus-label'
        }, labelText);
        
        item.appendChild(switchContainer);
        item.appendChild(label);
        container.appendChild(item);
    }
    
    createCustomSizeSection(container, type, settings, labelText) {
        const section = createElement('div', { className: 'hackplus-custom-size-section' });
        
        const header = createElement('div', { className: 'hackplus-custom-size-header' });
        
        const switchContainer = createElement('label', { className: 'hackplus-switch' });
        const checkbox = createElement('input', {
            type: 'checkbox',
            id: `${type.charAt(0).toUpperCase() + type.slice(1)}CustomSize`
        });
        
        // 使用property设置checked状态
        checkbox.checked = settings.enabled;
        
        const slider = createElement('span', { className: 'hackplus-slider' });
        
        switchContainer.appendChild(checkbox);
        switchContainer.appendChild(slider);
        
        const label = createElement('label', {
            htmlFor: `${type.charAt(0).toUpperCase() + type.slice(1)}CustomSize`,
            className: 'hackplus-label'
        }, labelText);
        
        const resetBtn = createElement('button', {
            className: 'hackplus-reset-btn',
            title: '重置为默认值',
            'data-type': type
        }, '↺');
        
        header.appendChild(switchContainer);
        header.appendChild(label);
        header.appendChild(resetBtn);
        
        const inputsContainer = createElement('div', { className: 'hackplus-size-inputs' });
        
        // 创建宽度行
        const widthRow = createElement('div', { className: 'hackplus-size-row' });
        
        const minWidthGroup = createElement('div', { className: 'hackplus-size-input-group' });
        const minWidthLabel = createElement('label', { htmlFor: `${type}MinWidth` }, '最小宽度:');
        const minWidthInput = createElement('input', {
            type: 'number',
            id: `${type}MinWidth`,
            value: settings.minWidth,
            min: '1',
            max: '1000'
        });
        
        minWidthGroup.appendChild(minWidthLabel);
        minWidthGroup.appendChild(minWidthInput);
        
        const maxWidthGroup = createElement('div', { className: 'hackplus-size-input-group' });
        const maxWidthLabel = createElement('label', { htmlFor: `${type}MaxWidth` }, '最大宽度:');
        const maxWidthInput = createElement('input', {
            type: 'number',
            id: `${type}MaxWidth`,
            value: settings.maxWidth,
            min: '2',
            max: '3000'
        });
        
        maxWidthGroup.appendChild(maxWidthLabel);
        maxWidthGroup.appendChild(maxWidthInput);
        
        widthRow.appendChild(minWidthGroup);
        widthRow.appendChild(maxWidthGroup);
        
        // 创建高度行
        const heightRow = createElement('div', { className: 'hackplus-size-row' });
        
        const minHeightGroup = createElement('div', { className: 'hackplus-size-input-group' });
        const minHeightLabel = createElement('label', { htmlFor: `${type}MinHeight` }, '最小高度:');
        const minHeightInput = createElement('input', {
            type: 'number',
            id: `${type}MinHeight`,
            value: settings.minHeight,
            min: '1',
            max: '1000'
        });
        
        minHeightGroup.appendChild(minHeightLabel);
        minHeightGroup.appendChild(minHeightInput);
        
        const maxHeightGroup = createElement('div', { className: 'hackplus-size-input-group' });
        const maxHeightLabel = createElement('label', { htmlFor: `${type}MaxHeight` }, '最大高度:');
        const maxHeightInput = createElement('input', {
            type: 'number',
            id: `${type}MaxHeight`,
            value: settings.maxHeight,
            min: '2',
            max: '3000'
        });
        
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
        const checkbox = createElement('input', {
            type: 'checkbox',
            id: 'UnionAdCustomProperties'
        });
        
        // 使用property设置checked状态
        checkbox.checked = settings.enabled;
        
        const slider = createElement('span', { className: 'hackplus-slider' });
        
        switchContainer.appendChild(checkbox);
        switchContainer.appendChild(slider);
        
        const label = createElement('label', {
            htmlFor: 'UnionAdCustomProperties',
            className: 'hackplus-label multiline-label'
        }, '联盟广告/禁用属性黑名单（全局）');
        
        const resetBtn = createElement('button', {
            className: 'hackplus-reset-btn',
            title: '重置为默认值',
            'data-type': 'unionad'
        }, '↺');
        
        header.appendChild(switchContainer);
        header.appendChild(label);
        header.appendChild(resetBtn);
        
        const textareaContainer = createElement('div', { className: 'hackplus-unionad-textarea-container' });
        
        const textarea = createElement('textarea', {
            id: 'UnionAdCustomPropertiesText',
            rows: '4',
            placeholder: '输入要禁用的广告属性，用逗号分隔\n例如：my_ad_property1, my_ad_property2'
        });
        
        // 设置文本内容
        textarea.value = settings.properties || '';
        
        textareaContainer.appendChild(textarea);
        
        section.appendChild(header);
        section.appendChild(textareaContainer);
        container.appendChild(section);
    }

    addPanelStyles() {
        const styles = `
            /* 通过高特异性选择器和CSS重置来保持样式独立 */
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
                max-height: 78vh; /* 原有90vh减12vh */
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
                transition: background 0.2s ease;
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
            
            /* 添加拖拽滚动样式 */
            .hackplus-panel-content.dragging {
                cursor: grabbing !important;
                user-select: none !important;
            }
            
            /* 交互元素恢复默认光标 */
            .hackplus-panel-content input,
            .hackplus-panel-content button,
            .hackplus-panel-content label,
            .hackplus-panel-content .hackplus-switch,
            .hackplus-panel-content .hackplus-slider,
            .hackplus-panel-content textarea {
                cursor: default !important;
                user-select: auto !important;
            }
            
            /* 输入框内文本允许选择 */
            .hackplus-panel-content input[type="number"],
            .hackplus-panel-content textarea {
                cursor: text !important;
                user-select: auto !important;
            }
            
            /* 标签文字允许选择 */
            .hackplus-panel-content .hackplus-label {
                user-select: none; /* 保持不能选择 */
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
            
            /* 额外隐藏静态文本样式 */
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
            
            /* 当输入框聚焦时，父容器也高亮 */
            .hackplus-custom-size-section:has(input:focus) {
                border-color: #1abc9c !important;
                box-shadow: 0 2px 4px rgba(26, 188, 156, 0.1) !important;
            }
            
            .hackplus-size-input-group input::-webkit-inner-spin-button,
            .hackplus-size-input-group input::-webkit-outer-spin-button {
                opacity: 1;
                height: 20px;
            }
            
            /* 联盟广告自定义属性文本框样式 */
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
            
            /* 额外隐藏按钮容器样式 */
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
            
            /* 优化滚动时机 - 根据内容高度调整 */
            /* 中等高度屏幕：当内容较多时才开始滚动 */
            @media (min-height: 550px) and (max-height: 700px) {
                #hackplus-settings-panel {
                    max-height: 73vh;
                }
                
                .hackplus-panel-content {
                    max-height: calc(75vh - 120px);
                    overflow-y: auto;
                }
            }
            
            /* 大高度屏幕：很少需要滚动 */
            @media (min-height: 700px) {
                #hackplus-settings-panel {
                    max-height: 68vh;
                }
                
                .hackplus-panel-content {
                    max-height: calc(70vh - 120px);
                    overflow-y: auto;
                }
            }
            
            /* 超大高度屏幕：基本不需要滚动 */
            @media (min-height: 850px) {
                #hackplus-settings-panel {
                    max-height: 63vh;
                }
                
                .hackplus-panel-content {
                    max-height: calc(65vh - 120px);
                    overflow-y: auto;
                }
            }
            
            /* 超小高度适配 */
            @media (max-height: 400px) {
                #hackplus-settings-panel {
                    max-height: 83vh; 
                }
                
                .hackplus-panel-content {
                    max-height: calc(85vh - 120px);
                    overflow-y: auto;
                }
            }
            
            /* 小屏幕适配 */
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
                
                /* 联盟广告自定义属性文本框适配小屏幕 */
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
                
                /* 按钮适配小屏幕 */
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
                
                /* 额外隐藏静态文本样式适配小屏幕 */
                .hackplus-static-label {
                    font-size: 11px;
                    min-height: 16px;
                    line-height: 1.2;
                }
            }
            
            /* 超小屏幕适配 */
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
                
                /* 联盟广告自定义属性文本框适配超小屏幕 */
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
                
                /* 按钮适配超小屏幕 */
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
                
                /* 额外隐藏静态文本样式适配超小屏幕 */
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
            panel.style.transform = 'translateY(-20px) scale(0.95)';
            setTimeout(() => {
                panel.remove();
            }, 150);
        });

        // 处理常规开关
        panel.querySelectorAll('input[type="checkbox"]:not(#ImgCustomSize):not(#IframeCustomSize):not(#UnionAdCustomProperties)').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = e.target.id;
                
                if (id === 'FloatIcon') {
                    this.floatIconManager.toggleEnabled();
                } else {
                    this.config.toggleFeature(id);
                }
            });
        });

        // 处理图片自定义尺寸开关
        const imgCustomSizeCheckbox = panel.querySelector('#ImgCustomSize');
        if (imgCustomSizeCheckbox) {
            imgCustomSizeCheckbox.addEventListener('change', (e) => {
                this.imgCustomSizeManager.toggleEnabled();
                
                // 立即保存当前输入框的值
                this.saveImgCustomSizeSettings(panel);
            });
        }

        // 处理iframe自定义尺寸开关
        const iframeCustomSizeCheckbox = panel.querySelector('#IframeCustomSize');
        if (iframeCustomSizeCheckbox) {
            iframeCustomSizeCheckbox.addEventListener('change', (e) => {
                this.iframeCustomSizeManager.toggleEnabled();
                
                // 立即保存当前输入框的值
                this.saveIframeCustomSizeSettings(panel);
            });
        }

        // 处理联盟广告自定义属性开关
        const unionAdCustomPropsCheckbox = panel.querySelector('#UnionAdCustomProperties');
        if (unionAdCustomPropsCheckbox) {
            unionAdCustomPropsCheckbox.addEventListener('change', (e) => {
                this.unionAdCustomPropsManager.toggleEnabled();
                
                // 立即保存当前文本框的值
                this.saveUnionAdCustomPropsSettings(panel);
            });
        }

        // 处理隐藏管理器按钮
        const managerButton = panel.querySelector('#hackplus-element-hider-manager-btn');
        if (managerButton && this.elementHider) {
            managerButton.addEventListener('click', () => {
                this.elementHider.showHideManager();
            });
        }

        // 处理开始选择按钮
        const startSelectButton = panel.querySelector('#hackplus-start-select-btn');
        if (startSelectButton && this.elementHider) {
            startSelectButton.addEventListener('click', () => {
                this.elementHider.enterSelectMode();
            });
        }

        // 处理重置按钮
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

        // 处理图片尺寸输入框
        const imgSizeInputs = panel.querySelectorAll('#imgMinWidth, #imgMaxWidth, #imgMinHeight, #imgMaxHeight');
        imgSizeInputs.forEach(input => {
            input.addEventListener('focus', (e) => {
                // 保存焦点时的值
                e.target.dataset.originalValue = e.target.value;
            });
            
            input.addEventListener('input', (e) => {
                // 只允许输入数字
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                
                // 在输入过程中不进行验证，允许为空
            });
            
            // 只在失去焦点时进行完整的验证和比较
            input.addEventListener('blur', (e) => {
                // 如果值为空，设置为对应类型的默认值
                if (e.target.value === '') {
                    const id = e.target.id;
                    if (id === 'imgMinWidth' || id === 'imgMinHeight') {
                        // 最小值默认设为1
                        e.target.value = 1;
                    } else if (id === 'imgMaxWidth' || id === 'imgMaxHeight') {
                        // 最大值默认设为对应管理器的默认值
                        const defaultSettings = this.imgCustomSizeManager.defaultSettings;
                        if (id === 'imgMaxWidth') {
                            e.target.value = defaultSettings.maxWidth;
                        } else {
                            e.target.value = defaultSettings.maxHeight;
                        }
                    }
                }
                
                // 进行完整的验证
                this.validateImgSizeInputs(panel);
                
                // 保存设置
                this.saveImgCustomSizeSettings(panel);
            });
        });

        // 处理iframe尺寸输入框
        const iframeSizeInputs = panel.querySelectorAll('#iframeMinWidth, #iframeMaxWidth, #iframeMinHeight, #iframeMaxHeight');
        iframeSizeInputs.forEach(input => {
            input.addEventListener('focus', (e) => {
                // 保存焦点时的值
                e.target.dataset.originalValue = e.target.value;
            });
            
            input.addEventListener('input', (e) => {
                // 只允许输入数字
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                
                // 在输入过程中不进行验证，允许为空
            });
            
            // 只在失去焦点时进行完整的验证和比较
            input.addEventListener('blur', (e) => {
                // 如果值为空，设置为对应类型的默认值
                if (e.target.value === '') {
                    const id = e.target.id;
                    if (id === 'iframeMinWidth' || id === 'iframeMinHeight') {
                        // 最小值默认设为1
                        e.target.value = 1;
                    } else if (id === 'iframeMaxWidth' || id === 'iframeMaxHeight') {
                        // 最大值默认设为对应管理器的默认值
                        const defaultSettings = this.iframeCustomSizeManager.defaultSettings;
                        if (id === 'iframeMaxWidth') {
                            e.target.value = defaultSettings.maxWidth;
                        } else {
                            e.target.value = defaultSettings.maxHeight;
                        }
                    }
                }
                
                // 进行完整的验证
                this.validateIframeSizeInputs(panel);
                
                // 保存设置
                this.saveIframeCustomSizeSettings(panel);
            });
        });

        // 处理联盟广告自定义属性文本框
        const unionAdTextarea = panel.querySelector('#UnionAdCustomPropertiesText');
        if (unionAdTextarea) {
            unionAdTextarea.addEventListener('input', (e) => {
                // 这里可以添加输入时的实时处理，比如限制长度等
                // 目前不需要特殊处理
            });
            
            unionAdTextarea.addEventListener('blur', (e) => {
                // 保存设置
                this.saveUnionAdCustomPropsSettings(panel);
            });
        }

        const applyBtn = panel.querySelector('.hackplus-apply-btn');
        applyBtn.addEventListener('click', () => {
            // 保存所有设置
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
            
            // 检查元素是否可拖动
            const isDraggableElement = (target) => {
                // 如果是交互元素，不可拖动
                if (target.tagName === 'INPUT' || 
                    target.tagName === 'BUTTON' || 
                    target.tagName === 'SELECT' ||
                    target.tagName === 'TEXTAREA') {
                    return false;
                }
                
                // 如果是开关元素或其子元素，不可拖动
                if (target.classList.contains('hackplus-switch') || 
                    target.classList.contains('hackplus-slider') ||
                    target.classList.contains('hackplus-reset-btn') ||
                    target.classList.contains('hackplus-apply-btn') ||
                    target.classList.contains('hackplus-close-btn') ||
                    target.closest('.hackplus-switch') || 
                    target.closest('.hackplus-reset-btn') ||
                    target.closest('.hackplus-apply-btn') ||
                    target.closest('.hackplus-close-btn')) {
                    return false;
                }
                
                // 标签元素也不可拖动
                if (target.classList.contains('hackplus-label') ||
                    target.closest('.hackplus-label')) {
                    return false;
                }
                
                return true;
            };
            
            // 鼠标按下事件 - 简化版
            content.addEventListener('mousedown', (e) => {
                // 检查是否是可拖动元素
                if (!isDraggableElement(e.target)) {
                    return;
                }
                
                isDragging = true;
                hasDragged = false;
                startY = e.clientY;
                startScrollTop = content.scrollTop;
                content.classList.add('dragging');
                
                // 阻止默认行为，防止文本选择
                e.preventDefault();
                e.stopPropagation();
            });
            
            // 鼠标移动事件
            const handleMouseMove = (e) => {
                if (!isDragging) return;
                
                const deltaY = e.clientY - startY;
                
                // 移动超过2像素就认为是拖拽
                if (Math.abs(deltaY) > 2) {
                    hasDragged = true;
                }
                
                // 计算新的滚动位置
                const newScrollTop = startScrollTop - deltaY;
                
                // 确保滚动位置在合理范围内
                const maxScrollTop = content.scrollHeight - content.clientHeight;
                content.scrollTop = Math.max(0, Math.min(maxScrollTop, newScrollTop));
                
                e.preventDefault();
                e.stopPropagation();
            };
            
            // 鼠标抬起事件
            const handleMouseUp = (e) => {
                if (!isDragging) return;
                
                isDragging = false;
                content.classList.remove('dragging');
                
                // 移除事件监听器
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                
                // 如果发生了拖拽，阻止后续的点击事件
                if (hasDragged) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // 延迟重置标志，防止触发点击
                    setTimeout(() => {
                        hasDragged = false;
                    }, 50);
                }
            };
            
            // 鼠标离开内容区域时取消拖动
            content.addEventListener('mouseleave', () => {
                if (isDragging) {
                    handleMouseUp(new Event('mouseup'));
                }
            });
            
            // 当鼠标按下时绑定全局事件
            content.addEventListener('mousedown', (e) => {
                if (!isDraggableElement(e.target)) return;
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });
            
            // 触摸事件支持
            content.addEventListener('touchstart', (e) => {
                if (!isDraggableElement(e.target) || e.touches.length !== 1) {
                    return;
                }
                
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
                    
                    setTimeout(() => {
                        hasDragged = false;
                    }, 50);
                }
            };
            
            content.addEventListener('touchstart', (e) => {
                if (!isDraggableElement(e.target) || e.touches.length !== 1) return;
                
                document.addEventListener('touchmove', handleTouchMove);
                document.addEventListener('touchend', handleTouchEnd);
            });
            
            // 防止文本选择
            content.addEventListener('selectstart', (e) => {
                if (isDragging) {
                    e.preventDefault();
                    return false;
                }
            });
            
            // 面板关闭时清理事件
            closeBtn.addEventListener('click', () => {
                // 清理事件监听器
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                document.removeEventListener('touchmove', handleTouchMove);
                document.removeEventListener('touchend', handleTouchEnd);
                
                panel.style.opacity = '0';
                panel.style.transform = 'translateY(-20px) scale(0.95)';
                setTimeout(() => {
                    panel.remove();
                }, 150);
            });
        }
    }
    
    resetImgCustomSizeInputs(panel) {
        const defaultSettings = this.imgCustomSizeManager.defaultSettings;
        
        const minWidthInput = panel.querySelector('#imgMinWidth');
        const maxWidthInput = panel.querySelector('#imgMaxWidth');
        const minHeightInput = panel.querySelector('#imgMinHeight');
        const maxHeightInput = panel.querySelector('#imgMaxHeight');
        
        // 重置输入框的值
        minWidthInput.value = defaultSettings.minWidth;
        maxWidthInput.value = defaultSettings.maxWidth;
        minHeightInput.value = defaultSettings.minHeight;
        maxHeightInput.value = defaultSettings.maxHeight;
        
        // 保存设置
        this.saveImgCustomSizeSettings(panel);
    }
    
    resetIframeCustomSizeInputs(panel) {
        const defaultSettings = this.iframeCustomSizeManager.defaultSettings;
        
        const minWidthInput = panel.querySelector('#iframeMinWidth');
        const maxWidthInput = panel.querySelector('#iframeMaxWidth');
        const minHeightInput = panel.querySelector('#iframeMinHeight');
        const maxHeightInput = panel.querySelector('#iframeMaxHeight');
        
        // 重置输入框的值
        minWidthInput.value = defaultSettings.minWidth;
        maxWidthInput.value = defaultSettings.maxWidth;
        minHeightInput.value = defaultSettings.minHeight;
        maxHeightInput.value = defaultSettings.maxHeight;
        
        // 保存设置
        this.saveIframeCustomSizeSettings(panel);
    }
    
    resetUnionAdCustomPropsInputs(panel) {
        const defaultSettings = this.unionAdCustomPropsManager.defaultSettings;
        
        const textarea = panel.querySelector('#UnionAdCustomPropertiesText');
        const checkbox = panel.querySelector('#UnionAdCustomProperties');
        
        // 重置文本框和开关的值
        textarea.value = defaultSettings.properties;
        checkbox.checked = defaultSettings.enabled;
        
        // 保存设置
        this.saveUnionAdCustomPropsSettings(panel);
    }
    
    validateImgSizeInputs(panel) {
        const minWidthInput = panel.querySelector('#imgMinWidth');
        const maxWidthInput = panel.querySelector('#imgMaxWidth');
        const minHeightInput = panel.querySelector('#imgMinHeight');
        const maxHeightInput = panel.querySelector('#imgMaxHeight');
        
        // 简化的验证逻辑
        let minWidth = Math.max(1, parseInt(minWidthInput.value) || 1);
        let maxWidth = Math.max(2, parseInt(maxWidthInput.value) || this.imgCustomSizeManager.defaultSettings.maxWidth);
        let minHeight = Math.max(1, parseInt(minHeightInput.value) || 1);
        let maxHeight = Math.max(2, parseInt(maxHeightInput.value) || this.imgCustomSizeManager.defaultSettings.maxHeight);
        
        // 限制范围
        minWidth = Math.min(1000, minWidth);
        maxWidth = Math.min(3000, maxWidth);
        minHeight = Math.min(1000, minHeight);
        maxHeight = Math.min(3000, maxHeight);
        
        // 确保最小值小于最大值
        if (minWidth >= maxWidth) minWidth = maxWidth - 1;
        if (minHeight >= maxHeight) minHeight = maxHeight - 1;
        
        // 更新输入框
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
        
        // 简化的验证逻辑
        let minWidth = Math.max(1, parseInt(minWidthInput.value) || 1);
        let maxWidth = Math.max(2, parseInt(maxWidthInput.value) || this.iframeCustomSizeManager.defaultSettings.maxWidth);
        let minHeight = Math.max(1, parseInt(minHeightInput.value) || 1);
        let maxHeight = Math.max(2, parseInt(maxHeightInput.value) || this.iframeCustomSizeManager.defaultSettings.maxHeight);
        
        // 限制范围
        minWidth = Math.min(1000, minWidth);
        maxWidth = Math.min(3000, maxWidth);
        minHeight = Math.min(1000, minHeight);
        maxHeight = Math.min(3000, maxHeight);
        
        // 确保最小值小于最大值
        if (minWidth >= maxWidth) minWidth = maxWidth - 1;
        if (minHeight >= maxHeight) minHeight = maxHeight - 1;
        
        // 更新输入框
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
        this.floatIconManager = new FloatIconManager();
        this.imgCustomSizeManager = new ImgCustomSizeManager();
        this.iframeCustomSizeManager = new IframeCustomSizeManager();
        
        // 先创建广告移除器，然后创建配置管理器（传递广告移除器引用）
        this.adRemover = new AdRemover(null, this.imgCustomSizeManager, this.iframeCustomSizeManager);
        this.config = new ConfigManager(this.adRemover);
        
        // 将config传递给adRemover
        this.adRemover.config = this.config;
        
        // 新增：元素隐藏管理器
        this.elementHider = new ElementHider(this.config);
        
        // 新增：联盟广告自定义属性管理器
        this.unionAdCustomPropsManager = new UnionAdCustomPropertiesManager();
        
        this.settingsPanel = new SettingsPanel(this.config, this.floatIconManager, this.imgCustomSizeManager, this.iframeCustomSizeManager, this.elementHider);
        this.restrictionRemover = new RestrictionRemover(this.config);
        this.scriptProtection = new ScriptWriteProtection(this.config);
        
        this.init();
    }

    init() {
        this.startAdRemoval();
        this.startUnionBlocking();
        this.restrictionRemover.removeRestrictions();
        this.scriptProtection.protect();
        this.floatIconManager.init();
        
        // 初始化元素隐藏管理器
        this.elementHider.init();
        
        // 注册Tampermonkey菜单
        this.registerTampermonkeyMenu();
    }
    
    // 新增：注册Tampermonkey菜单命令
    registerTampermonkeyMenu() {
        if (typeof GM_registerMenuCommand !== 'undefined') {
            // 注册"打开设置面板"菜单项
            GM_registerMenuCommand('打开莫舞Pro Plus设置', () => {
                SettingsPanelManager.togglePanel();
            });
        }
    }

    startAdRemoval() {
        this.adRemover.removeAds();
        this.adRemover.startObserver();
    }

    startUnionBlocking() {
        // 只有在联盟广告白名单未启用时才执行拦截
        if (this.config.isEnabled('unFuck_UNION')) {
            UnionAdBlocker.block();
        }
        // 白名单时不显示任何消息
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
})();