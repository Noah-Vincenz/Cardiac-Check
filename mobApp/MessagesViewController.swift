//
//  MessagesViewController.swift
//  mobApp
//
//  Created by Noah-Vincenz Noeh on 23/03/2018.
//  Copyright © 2018 Noah-Vincenz Noeh. All rights reserved.
//

import Foundation
import UIKit
import Firebase
import FirebaseDatabase

class MessagesViewController: UIViewController, UITableViewDelegate, UITableViewDataSource {
    
    
    @IBOutlet weak var tableView: UITableView!
    var messagesArray = [(String, String)]()
    var patientName: String = ""
    let databaseRef = Database.database().reference()
    
    @IBAction func reloadButtonPressed(_ sender: Any) {
        reloadMessages()
    }
    
    
    func reloadMessages() {
        self.messagesArray.removeAll()
        let messagesRef = databaseRef.child("messages")
        messagesRef.observe(DataEventType.value, with: { (snapshot) in
            
            //if the reference has some values (keys in this case)
            if snapshot.childrenCount > 0 {
                let messageRegex = self.patientName + ".*"
                let regex = try! NSRegularExpression(pattern: messageRegex, options: [])
                
                //this is needed to figure out when to reload the table view
                var i = 0
                
                //iterating through all the keys of the patient, ie. name, dob, id, weight
                for messageID in snapshot.children.allObjects as! [DataSnapshot] {
                    //getting value
                    
                    let str = messageID.key
                    let isMatch = regex.firstMatch(in: messageID.key, options: [], range: NSMakeRange(0, str.utf16.count)) != nil
                    if isMatch == true {
                        //this is a message for the current patient
                        
                        //retrieves the date of the message
                        let matched = self.matches(for: "\\d\\d?-\\d\\d?-\\d\\d\\d\\d", in: str)
                        
                        //must be done here as function runs synch. meaning that this func finishes before the inner loop computation finishes, hence array would be empty otherwise
                        self.messagesArray.append((matched[0], messageID.value as! String))
                        
                    }
                    i += 1
                    // the table view should only be reloaded once all messages have been appended to the messages array
                    if i == snapshot.children.allObjects.count {
                        self.tableView.reloadData()
                    }
                    
                }
            }
        })
    }
    
    func matches(for regex: String, in text: String) -> [String] {
        
        do {
            let regex = try NSRegularExpression(pattern: regex)
            let results = regex.matches(in: text,
                                        range: NSRange(text.startIndex..., in: text))
            return results.map {
                String(text[Range($0.range, in: text)!])
            }
        } catch let error {
            print("invalid regex: \(error.localizedDescription)")
            return []
        }
    }
    
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return messagesArray.count
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = UITableViewCell(style: UITableViewCellStyle.default, reuseIdentifier: "cell")
        cell.textLabel?.text = messagesArray[indexPath.row].0 + ": " + messagesArray[indexPath.row].1
        cell.textLabel?.numberOfLines = 0
        return cell
    }
    
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.

    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    
}
