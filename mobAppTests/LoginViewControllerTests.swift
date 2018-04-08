//
//  LoginViewControllerTests.swift
//  mobAppTests
//
//  Created by Noah-Vincenz Noeh on 08/04/2018.
//  Copyright © 2018 Noah-Vincenz Noeh. All rights reserved.
//

import XCTest
import Firebase
import FirebaseAuth
@testable import mobApp

class LoginViewControllerTests: XCTestCase {
    
    override func setUp() {
        super.setUp()
        // Put setup code here. This method is called before the invocation of each test method in the class.
    }
    
    override func tearDown() {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
        super.tearDown()
    }
    
    func testExample() {
        // This is an example of a functional test case.
        // Use XCTAssert and related functions to verify your tests produce the correct results.
    }
    
    func testLoginPerformance() {
        // This is an example of a performance test case.
        let viewController = LoginViewController()
        viewController.userNameTextField = UITextField()
        viewController.passwordTextField = UITextField()
        viewController.userNameTextField.text = "patient1@mobapp.com"
        viewController.passwordTextField.text = "patient1"
        self.measure {
            // Put the code you want to measure the time of here.
            for _ in 0...1000 {
                viewController.loginButtonPressed(viewController.loginButton)
            }
        }
    }
}
