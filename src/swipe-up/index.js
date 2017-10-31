import BrowserUiState from 'browser-ui-state'
import DebugWidget from './debug/debug-widget'
import DebugWidgetTrigger from './debug/debug-widget-trigger'
import EventThrottle from './utils/event-throttle'
import $, {addRunTimeStyles} from './utils/dom'
import SwipeUpCss from './css/swipe-up.css'
import AnimationsCss from './css/animations.css'
import DebugWidgetCss from './css/debug-widget.css'
import {swipeUpHand, touchHand} from './animations'

//Private scope
const localStorageDisableKey = 'SwipeUp._disabled'
const expandBodyHeightTo = '110vh'

//win is a shortcut for window
let _win = new WeakMap(), _options = new WeakMap(), _swipeUpOverlay = new WeakMap(), _debugWidget = new WeakMap()

const defaultOptions = {
    initialOrientation: null, //Some user-agents (QQ both EN & CN, UC EN before 11.4.6) doesn't support screen.orientation API,
                              //but their initial orientation can be determined at web page parse/execute time by comparing
                              //window.innerWidth and height. And if it will be supplied to Swipe Up / Browser UI State -
                              //they will do a better job in determining orientation and state, especially in context of
                              //on-screen keyboard and split-screen mode
    addImportantToBodyHeight: false, //Some Web apps use importants like: body {height:100% !important},
                                     //so this is to allow them to override above by adding important rule as well
    fixateRootElementsOnInit: false, //To apply position:fixed for all Body's direct children, so that body doesn't move
    scrollWindowToTopOnShow: false, //TODO this param may be incompatible if to add scroll and touchmove handlers
    useHtml5FullScreenWhenPossible: true, //fixateRootElementsOnInit has no sense for user-agents capable of HTML5 Fullscreen API
    excludedUserAgents: null, //Ability to black-list user agents via RegExp on which Swipe Up will not work (e.g. Tablets)
    useTextInsteadOfImages: false, //To display below texts instead of animations
    swipeUpText: 'Swipe up to continue in full-screen mode',
    html5FullScreenText: 'Touch to continue in full-screen mode',
    customCSS: '', //Ability to brand/customize Swipe Up at run-time
    customCSSCleanSlate: false, //customCSS is applied standalone instead of adding to/after SwipeUpCss and AnimationsCss
}

let showOrHide = (self) => {
    let disabledInDebugging = (_win.get(self).localStorage.getItem(localStorageDisableKey) === 'true')
    let win = _win.get(self), options = _options.get(self), swipeUpOverlay = _swipeUpOverlay.get(self)

    if (!disabledInDebugging && self.isEnabled && self.browserUiState.state === 'COLLAPSED') {
        $(swipeUpOverlay).show()
        options.scrollWindowToTopOnShow ? win.scrollTo(0, 0) : null
    } else if (swipeUpOverlay.style.display !== 'none') {
        $(swipeUpOverlay).hide()
    }
}

//TODO findout when and why CP got position:absolute override for #app
let fixateRootElementsIfNeeded = (self) => {
    if (_options.get(self).fixateRootElementsOnInit) {
        Array.from(_win.get(self).document.body.children).forEach((el) => el.style.position = 'fixed')
    }
}

//TODO fix Safari sometimes not showing swipe up even though debug widget get resize event
export default class SwipeUp {
    constructor(opts, windowObj = window) {
        if (!windowObj.document.body) {
            throw new Error('Swipe Up should be instantiated on window load when DOM is ready')
        }
        _win.set(this, windowObj)
        _options.set(this, Object.assign(defaultOptions, opts))
        let win = _win.get(this)
        let options = _options.get(this)

        //expose browser-ui-state and fscreen as part of swipe-up API
        this.browserUiState = new BrowserUiState(options.initialOrientation, win)
        this.fscreen = this.browserUiState.fscreen


        //Proceed to init DOM if not forbidden by excludedUserAgents option
        if (!this.isUserAgentExcluded) {
            let customCSS = options.customCSS
            let customCSSCleanSlate = options.customCSSCleanSlate
            let cssToApply = customCSSCleanSlate ? customCSS : SwipeUpCss + AnimationsCss + customCSS

            addRunTimeStyles(cssToApply + DebugWidgetCss, win)

            let useHtml5FullScreen = options.useHtml5FullScreenWhenPossible && this.fscreen.fullscreenEnabled
            if (!useHtml5FullScreen) {
                fixateRootElementsIfNeeded(this)

                //Required for Safari portrait
                options.addImportantToBodyHeight ?
                    win.document.body.style.setProperty('height', expandBodyHeightTo, 'important') :
                    win.document.body.style.setProperty('height', expandBodyHeightTo)
            }

            let useTextInsteadOfImages = options.useTextInsteadOfImages
            let html5FullScreenText = options.html5FullScreenText
            let swipeUpText = options.swipeUpText

            _swipeUpOverlay.set(this, win.document.createElement('div'))
            let swipeUpOverlay = _swipeUpOverlay.get(this)
            swipeUpOverlay.className = 'swipeUpOverlay'
            swipeUpOverlay.innerHTML =
                `<div class='fixedFlexBox'>
                    <div class='content'>
                        ${(useHtml5FullScreen ?
                            (useTextInsteadOfImages ? html5FullScreenText : touchHand)
                            :
                            (useTextInsteadOfImages ? swipeUpText : swipeUpHand)
                        )}
                    </div>
                </div>`
            win.document.body.appendChild(swipeUpOverlay)

            if (useHtml5FullScreen) {
                let htmlElement = win.document.documentElement
                let fixedFlexBox = $('.fixedFlexBox').get()
                fixedFlexBox.addEventListener('click', () => this.fscreen.requestFullscreen(htmlElement))
                fixedFlexBox.addEventListener('touchmove', (event) => event.preventDefault())
            }

            let debugWidgetTrigger = new DebugWidgetTrigger(this, swipeUpOverlay, win)
            debugWidgetTrigger.shouldShowWidgetOnLoad ? this.showDebugWidget() : null

            const resizeHandler = (event) => {
                showOrHide(this)
                _debugWidget.get(this) ? _debugWidget.get(this).update() : null
            }

            new EventThrottle('resize', 'optimizedResize', win)
            new EventThrottle('orientationchange', 'optimizedOrientationchange', win)
            //new EventThrottle('scroll', 'optimizedScroll', win)
            //new EventThrottle('touchmove', 'optimizedTouchmove', win)
            win.addEventListener('optimizedResize', resizeHandler)
            win.addEventListener('optimizedOrientationchange', resizeHandler)
            //win.addEventListener('optimizedScroll', resizeHandler)
            //win.addEventListener('optimizedTouchmove', resizeHandler)
        }
    }

    get isShown() {
        return _swipeUpOverlay.get(this).style.display === 'block'
    }

    get isUserAgentExcluded() {
        return _options.get(this).excludedUserAgents &&
               _options.get(this).excludedUserAgents instanceof RegExp &&
               _options.get(this).excludedUserAgents.test(_win.get(this).navigator.userAgent)
    }

    disable() {
        this.isEnabled = false
        $(_swipeUpOverlay.get(this)).hide()
    }

    enable() {
        this.isEnabled = true
        _win.get(this).localStorage.setItem(localStorageDisableKey, 'false')
        !this.isUserAgentExcluded ? showOrHide(this) : null
    }

    showDebugWidget() {
        if (!_debugWidget.get(this)) {
            _debugWidget.set(this, new DebugWidget(this, _swipeUpOverlay.get(this)))
        }
        _debugWidget.get(this).show()
    }

    hideDebugWidget() {
        if (!_debugWidget.get(this)) {
            _debugWidget.set(this, new DebugWidget(this, _swipeUpOverlay.get(this)))
        }
        _debugWidget.get(this).hide()
    }

    toggleDebugWidget() {
        if (!_debugWidget.get(this)) {
            _debugWidget.set(this, new DebugWidget(this, _swipeUpOverlay.get(this)))
        }
        _debugWidget.get(this).toggle()
    }
}