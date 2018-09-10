//
//  RecordingsViewControllerTests.swift
//  mobAppTests
//
//  Created by Noah-Vincenz Noeh on 08/04/2018.
//  Copyright © 2018 Noah-Vincenz Noeh. All rights reserved.
//

import XCTest
import Firebase
import FirebaseDatabase
import FirebaseStorage
@testable import mobApp

class RecordingsViewControllerTests: XCTestCase {
    
    override func setUp() {
        super.setUp()
        // Put setup code here. This method is called before the invocation of each test method in the class.

    }
    
    override func tearDown() {
        // Put teardown code here. This method is called after the invocation of each test method in the class.
        super.tearDown()
    }
    
    func testMatches() {

        let viewController = RecordingsViewController()
        XCTAssertEqual(viewController.matches(regEx: "patient\\d", inputText: "patient1@mobapp.com"), ["patient1"])
        XCTAssertEqual(viewController.matches(regEx: "patient\\d", inputText: "patient2@mobapp.com"), ["patient2"])
        XCTAssertEqual(viewController.matches(regEx: "a[a-z]", inputText: "patient1@mobapp.com"), ["at", "ap"])
        
    }
    
    func testAverage() {
        let viewController = RecordingsViewController()
        let array1 = [1,4,5.5,6,8]
        XCTAssertEqual(viewController.average(arr: array1), 4.9)
        let array2 = [5,1,3,1.0,5]
        XCTAssertEqual(viewController.average(arr: array2), 3)
        let array3 = [4,5,9,11,57,22.6,7,4]
        XCTAssertEqual(viewController.average(arr: array3), 14.95)
    }
    
    func testReduceWhitespaces() {
        let viewController = RecordingsViewController()
        let str1 = "S    T s   f   sfd  d"
        let str2 = "  s"
        let str3 = "123 sdmdm 2   3 4    4"
        XCTAssertEqual(viewController.reduceWhitespaces(str: str1), "S T s f sfd d")
        XCTAssertEqual(viewController.reduceWhitespaces(str: str2), "s")
        XCTAssertEqual(viewController.reduceWhitespaces(str: str3), "123 sdmdm 2 3 4 4")

    }
    
    func testMessagesPerformance() {
        // This is an example of a performance test case.
        let viewController = RecordingsViewController()

        self.measure {
            // Put the code you want to measure the time of here.
            for _ in 0...1000 {
                viewController.retrieveMessages(name: "Henry Croft")
            }
        }

    }
    
    func testChartPerformance() {
        // This is an example of a performance test case.
        let viewController = RecordingsViewController()
        self.measure {
            // Put the code you want to measure the time of here.
            for _ in 0...1000 {
                viewController.retrieveChartData(reference: Storage.storage().reference().child("patient1.txt"))
            }
        }
    }
    
}
