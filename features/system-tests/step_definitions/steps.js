import {defineSupportCode} from 'cucumber'
import {should} from 'chai'; should();
import SwipeUp from '../../../src/swipe-up/index.js'

defineSupportCode(function(context) {
    let Given = context.Given
    let When = context.When
    let Then = context.Then

    let CustomWorld = function() {}

    CustomWorld.prototype.win = {
        innerWidth: 0,
        innerHeight: 0,
        screen: {
            width: 0,
            height: 0
        },
        orientation: 90,
        navigator: {
            userAgent: '',
            standalone: false
        },
        location: {
            search: ''
        },
        document: {
            body: {
                appendChild(){},
                children: [{style:{position:''}}],
                style: {
                    height: '',
                    setProperty(){}
                }
            },
            documentElement: {
                addEventListener(){}
            },
            createElement() {
                return {
                    addEventListener(){},
                    appendChild(){},
                    setAttribute(){},
                    style: {
                        display: ''
                    }
                }
            },
            querySelector() {
                return {
                    addEventListener(){},
                    appendChild(){},
                    insertBefore(){},
                    style: {
                        display: ''
                    },
                    childNodes: []
                }
            },
            createDocumentFragment() {
                return {
                    innerHTML: ''
                }
            }
        },
        localStorage: {
            getItem(){},
            setItem(){}
        },
        addEventListener(){},
        dispatchEvent(){},
        HTMLElement: {}.constructor,
        HTMLCollection: {}.constructor,
        NodeList: {}.constructor,
        Array: {}.constructor
    }

    CustomWorld.prototype.swipeUp = null

    CustomWorld.prototype.updateScreen = function(width, height) {
        this.win.screen.width = width
        this.win.screen.height = height
    }

    CustomWorld.prototype.updateWindow = function(width, height) {
        this.win.innerWidth = width
        this.win.innerHeight = height
    }

    context.setWorldConstructor(CustomWorld)

    Given('a user agent equals to {string}', function(userAgent) {
        this.win.navigator.userAgent = userAgent
        this.swipeUp = new SwipeUp({ initialOrientation: 'LANDSCAPE' }, this.win)
        this.win.orientation = 90
    })

    Given('screen dimensions is {int} x {int}', function(width, height) {
        this.updateScreen(width, height)
    })

    Given('window dimensions is {int} x {int}', function(width, height) {
        this.updateWindow(width, height)
    })

    When('after swipe up window dimensions changes to {int} x {int}', function(width, height) {
        this.updateWindow(width, height)
    })

    When('browser is rotated to portrait', function() {
        this.swipeUp.browserUiState._provider._deviceOrientationDetector._toggleCurrentOrientation()
        this.win.orientation = 0
    })

    When('screen dimensions changes to {int} x {int}', function(width, height) {
        this.updateScreen(width, height)
    })

    When('window dimensions changes to {int} x {int}', function(width, height) {
        this.updateWindow(width, height)
    })

    Then('browser ui state should be equal {string}', function(state) {
        this.swipeUp.browserUiState.state.should.be.equal(state)
    })
})