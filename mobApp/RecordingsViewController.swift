//
//  RecordingsViewController.swift
//  mobApp
//
//  Created by Noah-Vincenz Noeh on 20/03/2018.
//  Copyright © 2018 Noah-Vincenz Noeh. All rights reserved.
//

import UIKit
import Charts
import Firebase
import FirebaseDatabase
import FirebaseStorage

/**
 
 This class controls the recordings view. It retrieves the patient's ECG and PCG data from the Firebase storage system using the patient's ID, which is contained in the user email address that was passed in from the login screen. It also handles the retrieval of the messages for the patient by first getting the patient's name from the database and then using that name to access the messages for that patient. These messages are then stored in an array, which is passed to the messages view controller when the transition occurs.
 
 */
class RecordingsViewController: UIViewController {
    
    // MARK: - Outlets and variables
    
    @IBOutlet weak var ecgView: LineChartView!
    @IBOutlet weak var pcgView: LineChartView!
    @IBOutlet weak var heartRateLabel: UILabel!
    var patientID: String = ""
    var patientName: String = ""
    var messagesArray: [(String, String)] = []
    // Create a database reference from the Firebase real time database service
    let databaseRef = Database.database().reference()
    // Create a storage reference from the Firebase storage service
    let storageRef = Storage.storage().reference()
    var interval = 0.000 //the time interval at which samples were taken
    
    // MARK: - Parent methods
    
    override func viewDidLoad() {
        super.viewDidLoad()

      
        // Do any additional setup after loading the view, typically from a nib.
        let email = Auth.auth().currentUser?.email
        
        //Creating regular expression that matches the patient ID
        let messageRegex = "patient" + "\\d"
        var matched = matches(regEx: messageRegex, inputText: email!)
        self.patientID = matched[0]
        
        //Set the patient name variable to the currently logged in patient and retrieve the messages for that patient name
        setPatientName()
        self.retrieveChartData(reference: storageRef.child(self.patientID + ".txt"))
    }
    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    //Things that should be done before the segue transition happens.
    override func prepare(for segue: UIStoryboardSegue, sender: Any?) {
        if segue.identifier == "segueToMessages" {
            
            let destinationVC = segue.destination as! MessagesViewController
            destinationVC.messagesArray = self.messagesArray
            destinationVC.patientName = self.patientName
            
        }
        else if segue.identifier == "unwindSegueToLogin" {
            //Sign the user out on the Firebase authentication system
            try! Auth.auth().signOut()
            let destinationVC = segue.destination as! LoginViewController
            
            //Set the text fields to be empty - otherwise when the user logs out the user details will still be stored in the text fields which is not desirable
            destinationVC.patientIDTextField.text = ""
            destinationVC.passwordTextField.text = ""
            
        }
    }

   
    // MARK: - Chart handling
    
    /**
     
     This function retrieves the chart data from the Firebase storage service. Firstly, the .txt file is downloaded from the specified path and then the text from this file is extracted and inserted into an array.
     
     - parameter fileReference: The reference to the file on the Firebase storage system.
     - parameter signalType: The string the specifies whether the signal is an ECG or PCG signal.
     
     */
    func retrieveChartData(reference: StorageReference) {

        reference.getData(maxSize: 1 * 1024 * 1024) { data, error in
            if let myError = error?.localizedDescription {
                print(myError) // gives more information
                print("An error occured whilst trying do download the data for the chart.")
            } else {
                
                let x = NSString(data: data!, encoding: String.Encoding.utf8.rawValue)! as String
                let newX = x.reduceWhitespaces() //removing multiple whitespace chars
                let words = newX.split{$0 == " "}.map(String.init) //splitting the text by the single white space char
                
                var ecgData = [(Double, Double)]()
                var pcgData = [(Double, Double)]()
                var time: Double = 0.000
                let unrounded = Double(words[6])! - Double(words[3])! //detects the sampling rate of the recording
                self.interval = Double(round(1000*unrounded)/1000)

                //looping through the file
                for i in 3...words.count-1 {

                    if i % 3 == 1 { //ie. 4, 7, 10 - these are all ECG values
                        ecgData.append((time, Double(words[i])!))
                    }
                    if i % 3 == 2 { //ie. 5, 8, 11 - these are all PCG values
                        pcgData.append((time, Double(words[i])!))
                        time += self.interval
                    }
                }
                self.drawChart(dataPoints: ecgData, viewToPlot: 1)
                self.drawChart(dataPoints: pcgData, viewToPlot: 2)
                // we want to use that signal to calculate the patient's heart rate
                self.calculateHeartRate(dataArray: ecgData)
            }
        }
       
    }
    
    
    /**
     
     This function plots the charts for the signal data. It uses the data from the array that is passed in as a parameter and creates ChartDataEntry instances for each of those array elements.
     
     - parameter dataPoints: The 2-dimensional array containing the data for the chart to be plotted.
     - parameter type: The string indicating whether the data is an ECG or PCG signal.
     
     */
     func drawChart(dataPoints: [(Double, Double)], viewToPlot: Int) {
        
        var lineChartEntry  = [ChartDataEntry]() //array that will contain the data for the chart later on
        
        for i in 0..<dataPoints.count {
            
            var value: ChartDataEntry
            value = ChartDataEntry(x: dataPoints[i].0, y: dataPoints[i].1) // setting the X and Y values for a new chartDataEntry instance
            lineChartEntry.append(value)
            
        }
        var line: LineChartDataSet
        var view: LineChartView
    
        if viewToPlot == 1 {
            
            line = LineChartDataSet(values: lineChartEntry, label: "Voltage") //Here we convert lineChartEntry to a LineChartDataSet
            view = ecgView
            
        } else {
            
            line = LineChartDataSet(values: lineChartEntry, label: "Amplitude") //Here we convert lineChartEntry to a LineChartDataSet
            view = pcgView
            
        }
        line.colors = [NSUIColor.black] //Sets the colour to blue
        line.drawCirclesEnabled = false
        let data = LineChartData() //Creating a LineChartData object
        data.addDataSet(line)
        view.data = data //This adds the computed data to the chart
        view.rightAxis.axisLineColor = NSUIColor.red
        view.leftAxis.axisLineColor = NSUIColor.red
        view.rightAxis.gridColor = NSUIColor.red
        view.leftAxis.gridColor = NSUIColor.red
        view.chartDescription?.text = ""
    }
    
    
    // MARK: - Heart rate calculation
    
    /**
     
     This function computes the heart rate based on a squaring algorithm and using a threshold of 1/3 of the highest y values in the data array. All values above this threshold should be R peak values.
     
     - parameter dataArray: The 2-dimensional array containing the signal data.
     
     */
    func calculateHeartRate(dataArray: [(Double, Double)]) {
        //creating an array containing the y values only
        var copyOfYValues = [Double]()
        for i in 0...dataArray.count-1 {
            copyOfYValues.append(dataArray[i].1)
        }
        var arrayOfMaxes = [Double]()
        //retrieving the 25 largest y values in the dataArray
        for _ in 0...24 {
            let max = copyOfYValues.max()
            arrayOfMaxes.append(max!)
            //getting the index to remove that element at the specified index
            let indexOfMax = copyOfYValues.index(of: max!)
            copyOfYValues.remove(at: indexOfMax!)
        }
        //taking the average of all values in the array of maxima
        let avg = arrayOfMaxes.average
        let squareOfAvg = avg * avg
        //threshold above which R peaks should be detected: 1/3 of the square of the average
        let threshold = squareOfAvg / 4
        
        //array containing the square of the signal
        var squaredArray = [(Double, Double)]()
        for i in 0...dataArray.count-1 {
            if dataArray[i].1 >= 0 { //otherwise negative values under -1 for instance get added as the square of a negative number becomes positive
                squaredArray.append((dataArray[i].0, dataArray[i].1 * dataArray[i].1))
            } //else the datapoint is not an R-peak as it has an amplitde of 0 or less
        }
        
        //detecting which values are above the threshold and hence should be part of an R peak
        var arrayOfValuesGreaterThanThreshold = [(Double, Double)]()
        for i in 0...squaredArray.count-1 {
            let val = squaredArray[i].1
            if val > threshold {
                arrayOfValuesGreaterThanThreshold.append((squaredArray[i].0, val))
            }
        }
        //now need to get rid of the values that belong to the same R peak but are not the maximum of that peak
        var maxArray = [(Double, Double)]()
        var tmpArray = [(Double, Double)]()
        for i in 0...arrayOfValuesGreaterThanThreshold.count - 1 {
            if i != arrayOfValuesGreaterThanThreshold.count - 1 && arrayOfValuesGreaterThanThreshold[i+1].0 == arrayOfValuesGreaterThanThreshold[i].0 + interval {
                
                    tmpArray.append(arrayOfValuesGreaterThanThreshold[i])
                
            } else if i == arrayOfValuesGreaterThanThreshold.count - 1 && tmpArray.isEmpty {
                
                    maxArray.append(((arrayOfValuesGreaterThanThreshold[i].0), (arrayOfValuesGreaterThanThreshold[i].1).squareRoot()))
                
            } else {
                    
                    tmpArray.append(arrayOfValuesGreaterThanThreshold[i])
                    let maxDatapoint = tmpArray.max { a, b in a.1 < b.1 }
                    //add max from tmpArray
                    maxArray.append(((maxDatapoint!.0), (maxDatapoint?.1)!.squareRoot()))
                    tmpArray = [(Double, Double)]()
    
            }
        }
        
        //beats per minute can now be calculated using the number of peaks in the 30 second period
        let spikesPerTenSeconds = Double(maxArray.count) / dataArray[dataArray.count - 1].0 * 10
        let bpm: Int = Int(round(spikesPerTenSeconds * 6))
        heartRateLabel.text = "Heart Rate = " + String(bpm) + " bpm"
    }
    
    // MARK: - Other
    
    /**
     
     This function sets the variable patientName to the name of the currently logged in patient using the Firebase database service to check for the ID that we know.
     
     */
    func setPatientName() {
        let patientRef = databaseRef.child("patients").child(self.patientID)
        patientRef.observe(DataEventType.value, with: { (snapshot) in
            
            //if the reference has some values (keys in this case)
            if snapshot.childrenCount > 0 {
                
                //iterating through all the keys of the patient, ie. name, dob, id, weight
                for attribute in snapshot.children.allObjects as! [DataSnapshot] {
                    //getting value
                    if attribute.key == "name" {
                        // must be called here as fetching the name takes longer than this function returning
                        self.patientName = attribute.value! as! String
                        self.retrieveMessages(name: attribute.value! as! String)
                    }
            
                }
            }
        })
    }
    
    /**
     
     This function retrieves the messages for the patient that is currently logged in using their name.
     
     - parameter name: This is the patient's name.
     
     */
    func retrieveMessages(name: String) {

        //Creating a reference to the messages entry in the storage system
        let messagesRef = databaseRef.child("messages")
        
        messagesRef.observe(DataEventType.value, with: { (snapshot) in
            
            //if the reference has some values (keys in this case)
            if snapshot.childrenCount > 0 {
                
                let messageRegex = name + ".*"
                let regex = try! NSRegularExpression(pattern: messageRegex, options: [])
                
                //iterating through all the keys of the patient, ie. name, dob, id, weight
                for messageID in snapshot.children.allObjects as! [DataSnapshot] {
                    
                    //Find messages that are aimed at the currently logged in patient, ie. start with their name followed by some date
                    let str = messageID.key
                    let isMatch: Bool = regex.firstMatch(in: str, options: [], range: NSMakeRange(0, str.utf16.count)) != nil
                    if isMatch == true {
                        //this is a message for the current patient
                        
                        //retrieves the date of the message
                        let matched = self.matches(regEx: "\\d\\d?-\\d\\d?-\\d\\d\\d\\d", inputText: str)
                        
                        //This must be done here as function runs synch. meaning that this func finishes before the inner loop computation finishes, hence array would be empty otherwise
                        self.messagesArray.append((matched[0], messageID.value as! String))
                        
                    }
                }
            }
        })
    }
    
    /**
     
     This function is used to return substrings within a string that match a specific regular expression.
     
     - parameter regEx: The regular expression used to check against the string.
     - parameter inputText: The string that this regular expression is checked against.
     - returns: The array of all the substrings that match the regular expression.
     
     */
    func matches(regEx: String, inputText: String) -> [String] {
        
        do {
            let regex = try NSRegularExpression(pattern: regEx)
            let stringsMatched = regex.matches(in: inputText,
                                        range: NSRange(inputText.startIndex..., in: inputText))
            return stringsMatched.map {
                String(inputText[Range($0.range, in: inputText)!])
            }
        //Catch the error, print an error message and return an empty array.
        } catch let error {
            print("invalid regex: \(error.localizedDescription)")
            return []
        }
    }
    
    //THESE ARE FOR TESTING PURPOSES ONLY
    func average(arr: [Double]) -> Double {
        return arr.average
    }
    
    func reduceWhitespaces(str: String) -> String {
        return str.reduceWhitespaces()
    }
    //
}
    
    
/**
 
 This is an extension that can be used to calculate the average of an array in a simple manner. This is used in the heart rate calculation.
 
 */
extension Array where Element: FloatingPoint {
    /// Return the sum of all floating point numbers in the array
    var total: Element {
        return reduce(0, +)
    }
    /// Return the average of all floating point numbers in the array
    var average: Element {
        return isEmpty ? 0 : total / Element(count)
    }
}

/**
 
 This is an extension that can be used to get rid of multiple whitespaces in a string and condense them to single whitespaces.
 
 */
extension String {
    func reduceWhitespaces() -> String {
        let components = self.components(separatedBy: NSCharacterSet.whitespacesAndNewlines)
        return components.filter { !$0.isEmpty }.joined(separator: " ")
    }
}

