//
//  mobAppUITests.swift
//  mobAppUITests
//
//  Created by Noah-Vincenz Noeh on 20/03/2018.
//  Copyright © 2018 Noah-Vincenz Noeh. All rights reserved.
//

import XCTest

class mobAppUITests: XCTestCase {
        
    override func setUp() {
        super.setUp()
        
        // Put setup code here. This method is called before the invocation of each test method in the class.
        
        // In UI tests it is usually best to stop immediately when a failure occurs.
        continueAfterFailure = false
        // UI tests must launch the application that they test. Doing this in setup will make sure it happens for each test method.
        XCUIApplication().launch()

        // In UI tests it’s important to set the initial state - such as interface orientation - required for your tests before they run. The setUp method is a good place to do this.
    }
    
    override func tearDown() {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
        super.tearDown()
    }
    
    func testExample() {
        // Use recording to get started writing UI tests.
        // Use XCTAssert and related functions to verify your tests produce the correct results.
    
        let app = XCUIApplication()
        testLogin(app: app)
        testMessagesView(app: app)
        testLogout(app: app)
        
    }
    
    func testLogin(app: XCUIApplication) {
        let loginButton = app.buttons["loginButton"]
        let emailTextField = app.textFields["emailTextField"]
        let passwordTextField = app.secureTextFields["passwordTextField"]
        
        loginButton.tap()
        //Test if warning appears
        XCTAssert(app.staticTexts["Please enter your details"].exists)
        emailTextField.tap()
        emailTextField.typeText("patient1@mobapp.com")
        XCTAssertEqual(emailTextField.value as! String, "patient1@mobapp.com")
        passwordTextField.tap()
        passwordTextField.typeText("patient1")
        //Test if password field is hidden
        XCTAssertEqual(passwordTextField.value as! String, "••••••••")
        //Test if next screen is "My Recording"
        loginButton.tap()
        //Asynchronous UI testing as takes a while until My Recording view loads - 10 seconds (takes longer when testing)
        let navigationBar = app.navigationBars["My Recording"]
        let exists = NSPredicate(format: "exists == 1")
        expectation(for: exists, evaluatedWith: navigationBar, handler: nil)
        waitForExpectations(timeout: 10, handler: nil)
        XCTAssert(app.navigationBars["My Recording"].exists) //to check if next view controller is present
    }
    
    func testMessagesView(app: XCUIApplication) {
        app.navigationBars["My Recording"].buttons["Messages"].tap()
        XCTAssert(app.navigationBars["Messages"].exists) //to check if next view controller is present
        app.navigationBars["Messages"].buttons["Refresh"].tap()
        //XCTAssert(app.navigationBars["My Recording"].buttons["My Recording"].exists)
        app.navigationBars["Messages"].buttons["My Recording"].tap()
        XCTAssert(app.navigationBars["My Recording"].exists) //to check if next view controller is present
    }
    
    func testLogout(app: XCUIApplication) {
        app.navigationBars["My Recording"].buttons["Logout"].tap()
        XCTAssert(app.navigationBars["Login"].exists) //to check if next view controller is present
        let emailTextField = app.textFields["emailTextField"]
        XCTAssertEqual(emailTextField.value as! String, "")
        let passwordTextField = app.secureTextFields["passwordTextField"]
        XCTAssertEqual(passwordTextField.value as! String, "")
    }
    
}
