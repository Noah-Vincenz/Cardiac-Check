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

class RecordingsViewController: UIViewController {
    
    @IBOutlet weak var ecgView: LineChartView!
    @IBOutlet weak var pcgView: LineChartView!
    @IBOutlet weak var heartRateLabel: UILabel!
    
    var months: [Double]!
    var patientName: String = ""
    
    let databaseRef = Database.database().reference()
    // Create a storage reference from our storage service
    let storageRef = Storage.storage().reference()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Do any additional setup after loading the view, typically from a nib.
        //pass in the patientname from the previous view
        
        setPatientName()
        doGraphs()
    }
    
    func setPatientName() {
        let patientRef = databaseRef.child("patients").child("patient1")
        patientRef.observe(DataEventType.value, with: { (snapshot) in
            
            //if the reference has some values (keys in this case)
            if snapshot.childrenCount > 0 {
                
                //iterating through all the keys of the patient, ie. name, dob, id, weight
                for attribute in snapshot.children.allObjects as! [DataSnapshot] {
                    //getting value
                    if attribute.key == "name" {
                        self.patientName = attribute.value! as! String
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
    
    func retrieveMessages() {
        let messagesRef = databaseRef.child("messages")
        messagesRef.observe(DataEventType.value, with: { (snapshot) in
            
            //if the reference has some values (keys in this case)
            if snapshot.childrenCount > 0 {
                
                let messageRegex = self.patientName + ".*"
                let regex = try! NSRegularExpression(pattern: messageRegex, options: [])
                
                //iterating through all the keys of the patient, ie. name, dob, id, weight
                for messageID in snapshot.children.allObjects as! [DataSnapshot] {
                    //getting value
                    
                    let str = messageID.key
                    let isMatch = regex.firstMatch(in: messageID.key, options: [], range: NSMakeRange(0, str.utf16.count)) != nil
                    if isMatch == true {
                        //this is a message for the current patient
                        var arr = [(String, String)]() //array containing pairs of date and message content
                        
                        //retrieves the date of the message
                        let matched = self.matches(for: "\\d\\d?-\\d\\d?-\\d\\d\\d\\d", in: str)
                        
                        arr.append((matched[0], messageID.value as! String))
                        
                    }
                    
                }
            }
        })
    }
    
    
    
    func doGraphs() {
        
        self.retrieveChartData(fileReference: storageRef.child("ECGdata/" + "patient1" + ".txt"), signalType: "ECG")
        self.retrieveChartData(fileReference: storageRef.child("PCGdata/" + "patient1" + ".txt"), signalType: "PCG")

    }
    
    func retrieveChartData(fileReference: StorageReference, signalType: String) {
        // Download in memory with a maximum allowed size of 1MB (1 * 1024 * 1024 bytes)
        fileReference.getData(maxSize: 10 * 1024 * 1024) { data, error in
            if let error = error {
                // Uh-oh, an error occurred!
            } else {
                
                let x = NSString(data: data!, encoding: String.Encoding.utf8.rawValue)! as String
                var xArr = x.split{$0 == "\n"}.map(String.init)
                
                var dataToPlot = [(Double, Double)]()
                var time: Double = 0
                for i in 4...xArr.count-1 {
                    dataToPlot.append((time, Double(xArr[i])!))
                    if signalType == "ECG" {
                        time += 0.01
                    } else { //PCG
                        time += 0.003
                    }
                }
                self.setChart(dataPoints: dataToPlot, type: signalType)
                if signalType == "ECG" {
                    self.calculateHeartRate(dataArray: dataToPlot)
                }
            }
        }
    }
    
    func calculateHeartRate(dataArray: [(Double, Double)]) {
        var copyOfYValues = [Double]()
        for i in 0...dataArray.count-1 {
            copyOfYValues.append(dataArray[i].1)
        }
        var arrayOfMaxes = [Double]()
        //retrieving the 15 largest y values in the dataArray
        for _ in 0...14 {
            let max = copyOfYValues.max()
            arrayOfMaxes.append(max!)
            let indexOfMax = copyOfYValues.index(of: max!)
            copyOfYValues.remove(at: indexOfMax!)
        }
        //taking the average of all values in the array of maxima
        let avg = arrayOfMaxes.average
        let squareOfAvg = avg * avg
        //threshold above which R peaks should be detected: 1/3 of the square of the average
        let threshold = squareOfAvg / 3
        
        //array containing the square of the signal
        var squaredArray = [(Double, Double)]()
        for i in 0...dataArray.count-1 {
            if dataArray[i].1 > 0 { //otherwise negative values under -1 get added as the square of a negative number becomes positive
                squaredArray.append((dataArray[i].0, dataArray[i].1 * dataArray[i].1))
            }
        }
        
        var arrayOfValuesGreaterThanThreshold = [(Double, Double)]()
        for i in 0...squaredArray.count-1 {
            let val = squaredArray[i].1
            if val > threshold {
                arrayOfValuesGreaterThanThreshold.append((squaredArray[i].0, val))
            }
        }
        //now need to get rid of the values that belong to the same R peak but are not the maximum of that peak
        var maxArray = [(Double, Double)]()
        var i:Int = 0
        
        while i <= arrayOfValuesGreaterThanThreshold.count-1 {

            var tmpArray = [(Double, Double)]()
            tmpArray.append(arrayOfValuesGreaterThanThreshold[i])
            var index = i

            while (index < arrayOfValuesGreaterThanThreshold.count - 1 && arrayOfValuesGreaterThanThreshold[index+1].0 == arrayOfValuesGreaterThanThreshold[index].0 + 0.01 && arrayOfValuesGreaterThanThreshold[index+1].1 >= arrayOfValuesGreaterThanThreshold[index].1) {
                tmpArray.append(arrayOfValuesGreaterThanThreshold[index+1])
                index += 1
                
            }
            //now max is at current index
            maxArray.append((arrayOfValuesGreaterThanThreshold[index].0, arrayOfValuesGreaterThanThreshold[index].1.squareRoot()))
            
            while (index < arrayOfValuesGreaterThanThreshold.count - 1 && arrayOfValuesGreaterThanThreshold[index+1].0 == arrayOfValuesGreaterThanThreshold[index].0 + 0.01 && arrayOfValuesGreaterThanThreshold[index+1].1 <= arrayOfValuesGreaterThanThreshold[index].1) {
                tmpArray.append(arrayOfValuesGreaterThanThreshold[index+1])
                index += 1
            }
            

            //now we are at the next S peak and want to go up from there again -> so go forward in outer for loop
            i += tmpArray.count
        }
        //beats per minute can now be calculated using the number of peaks in the 30 second period
        let bpm = (maxArray.count / 3 * 6)
        heartRateLabel.text = "Heart Rate = " + String(bpm) + " bpm"
        print(maxArray)
    }
    

    
    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Dispose of any resources that can be recreated.
    }
    
    func setChart(dataPoints: [(Double, Double)], type: String) {
    
        var lineChartEntry  = [ChartDataEntry]() //this is the Array that will eventually be displayed on the graph.
    
    
        //here is the for loop
        for i in 0..<dataPoints.count {
    
            var value: ChartDataEntry
            if type == "ECG" {
                value = ChartDataEntry(x: dataPoints[i].0, y: dataPoints[i].1) // here we set the X and Y status in a data chart entry
            } else {
                value = ChartDataEntry(x: dataPoints[i].0, y: dataPoints[i].1 / 1000) // here we set the X and Y status in a data chart entry
            }
            lineChartEntry.append(value) // here we add it to the data set
       
        }
        var line: LineChartDataSet
        var view: LineChartView
        if type == "ECG" {
            line = LineChartDataSet(values: lineChartEntry, label: "Voltage") //Here we convert lineChartEntry to a LineChartDataSet
            view = ecgView
        } else {
            line = LineChartDataSet(values: lineChartEntry, label: "Amplitude") //Here we convert lineChartEntry to a LineChartDataSet
            view = pcgView
        }
        line.colors = [NSUIColor.black] //Sets the colour to blue
        line.drawCirclesEnabled = false
    
        let data = LineChartData() //This is the object that will be added to the chart
        data.addDataSet(line) //Adds the line to the dataSet
        
        view.data = data //finally - it adds the chart data to the chart and causes an update
        view.rightAxis.axisLineColor = NSUIColor.red
        view.leftAxis.axisLineColor = NSUIColor.red
        view.rightAxis.gridColor = NSUIColor.red
        view.leftAxis.gridColor = NSUIColor.red
        view.chartDescription?.text = "" // Here we set the description for the graph
        
    }
    
    
}

extension Array where Element: FloatingPoint {
    /// Returns the sum of all elements in the array
    var total: Element {
        return reduce(0, +)
    }
    /// Returns the average of all elements in the array
    var average: Element {
        return isEmpty ? 0 : total / Element(count)
    }
}
