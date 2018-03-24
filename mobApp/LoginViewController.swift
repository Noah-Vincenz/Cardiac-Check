//
//  LoginViewController.swift
//  mobApp
//
//  Created by Noah-Vincenz Noeh on 20/03/2018.
//  Copyright © 2018 Noah-Vincenz Noeh. All rights reserved.
//

import UIKit
import FirebaseAuth

/**
 
 This is the class that controls the login view. It handles the username and password textfield inputs and checks whether the user is a registered user on Firebase. If this is the case then the app will transition to the recordings view.
 
 */
class LoginViewController: UIViewController {
    
    
    //MARK: - Variables
    
    @IBOutlet weak var userNameTextField: UITextField!
    @IBOutlet weak var passwordTextField: UITextField!
    @IBOutlet weak var loginButton: UIButton!
    @IBOutlet weak var errorLabel: UILabel!
    
    
    //MARK: - Parent methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    
    //MARK: - Action handling

    /**
     
     This function is triggered when the login button is pressed. It checks whether the user details entered are registered on Firebase and if this is the case then it performs the segue to the recordings view. Otherwise an error message is displayed in the error label.
     
     - parameter sender: The login Button.
     
     */
    @IBAction func loginButtonPressed(_ sender: Any) {
        
        if userNameTextField.text != "" && passwordTextField.text != "" {
            
            Auth.auth().signIn(withEmail: userNameTextField.text!, password: passwordTextField.text!, completion: {(user, error) in
                if user != nil { //login has been successful
                   
                    self.errorLabel.text = ""
                    self.performSegue(withIdentifier: "segueToRecordings", sender: self) //transition to the next view
                    
                } else { //unsuccessful
                    
                    if let myError = error?.localizedDescription {
                        print(myError) // gives more information
                    
                    } else {
                        print("Error")
                    }
                    self.errorLabel.text = "Login unsuccessful"
                }
            })
        }
        else {
            self.errorLabel.text = "Please enter your details"
        }
    }
    
    /**
     
     This function is used to unwind to this view controller from the recordings view controller and it is triggered as an exit function inside the recordings view controller.
     
     - parameter segue: The segue to the recordings view.
     
     */
    @IBAction func unwindToThisViewController(segue: UIStoryboardSegue) { }
}

