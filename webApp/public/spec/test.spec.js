/**
 * @author Noah-Vincenz Noeh <noah-vincenz.noeh@kcl.ac.uk>
 */

//This is a file for the unit testing of the index.js file. This testing is based on jasmine.

function getDate() {
   var now     = new Date();
   var year    = now.getFullYear();
   var month   = now.getMonth()+1;
   var day     = now.getDate();
   var dateTime = day + '-' + month + "-" + year;
   return dateTime;
}

describe("#getDate", function() {
    it("returns the current date in the following format: day-month-year", function() {
        var now     = new Date();
        expect(getDate()).toBe(now.getDate()+"-"+(now.getMonth()+1)+"-"+now.getFullYear())
    })
})

function reduceWhitespaces(stringToManipulate) {
    return stringToManipulate.replace(/\s+/g, ' ')
}

describe("#reduceWhitespaces", function() {
    it("condenses multiple whitespaces into single whitespaces", function() {
        expect(reduceWhitespaces("Ss  t O ss ty   OPP")).toBe("Ss t O ss ty OPP")
        expect(reduceWhitespaces("030 333 2 2      0      0 ")).toBe("030 333 2 2 0 0 ")
        expect(reduceWhitespaces("hellohello")).toBe("hellohello")
    })
})

function calculateBPM(maximaArray, lengthOfRecording) {
    var spikesPerTenSeconds = maximaArray.length / lengthOfRecording * 10
    return spikesPerTenSeconds * 6
}

describe("#calculateBPM", function() {
    it("calculates the bpm from the number of spikes in the time period of the recording", function() {
        expect(calculateBPM([{x:1, y:10}, {x:5, y:10}, {x:10, y:10}, {x:15, y:10}, {x:20, y:10}, {x:25, y:10}, {x:30, y:10}], 30)).toBe(14)
        expect(calculateBPM([{x:1, y:10}, {x:5, y:10}, {x:10, y:10}, {x:15, y:10}, {x:20, y:10}, {x:25, y:10}, {x:30, y:10}], 20)).toBe(21)
        expect(calculateBPM([{x:1, y:10}, {x:5, y:10}, {x:10, y:10}, {x:15, y:10}, {x:20, y:10}, {x:25, y:10}], 32)).toBe(11.25)
    })
})

function getAverage(arrayIn) {
    var sum = 0;
    for (var i = 0; i < arrayIn.length; ++i) {
        sum += arrayIn[i]
    }
    return sum / arrayIn.length
}

describe("#getAverage", function() {
    it("gets the average of a one dimensional array of numbers", function() {
        var arrayToBeUsed1 = [1,3]
        var arrayToBeUsed2 = [1,3,5,3,1,5,3,5]
        var arrayToBeUsed3 = [10, 15, 20, 21, 18, 33]
        expect(getAverage(arrayToBeUsed1)).toBe(2)
        expect(getAverage(arrayToBeUsed2)).toBe(3.25)
        expect(getAverage(arrayToBeUsed3)).toBe(19.5)
    })
})

function sortArray(arrayIn) {
    return arrayIn.sort(function(a,b) { return a - b;});
}

describe("#sortArray", function() {
    it("sorts a one-dimensional array in ascending order", function() {

        //1
        var originalArray1 = [1,3]
        var expectedArray1 = [1,3];

        var actualJSON1 = JSON.stringify(sortArray(originalArray1));
        var expectedJSON1 = JSON.stringify(expectedArray1);

        expect(actualJSON1).toEqual(expectedJSON1);

        //2
        var originalArray2 = [1,3,5,3,1,5,3,5]
        var expectedArray2 = [1,1,3,3,3,5,5,5];

        var actualJSON2 = JSON.stringify(sortArray(originalArray2));
        var expectedJSON2 = JSON.stringify(expectedArray2);

        expect(actualJSON2).toEqual(expectedJSON2);

        //3
        var originalArray3 = [10,15,20,21,18,33]
        var expectedArray3 = [10,15,18,20,21,33];

        var actualJSON3 = JSON.stringify(sortArray(originalArray3));
        var expectedJSON3 = JSON.stringify(expectedArray3);

        expect(actualJSON3).toEqual(expectedJSON3);

    })
})

function squareArray(arrayToBeSquared) {
    var returnArray = []
    for (var i = 0; i < arrayToBeSquared.length; ++i) {
        if (arrayToBeSquared[i].y > 0) {
            returnArray.push({
                x: arrayToBeSquared[i].x,
                y: arrayToBeSquared[i].y * arrayToBeSquared[i].y
            })
        }
    }
    return returnArray
}

describe("#squareArray", function() {
    it("squares a 2-dimensional array, that is its y values", function() {

        //1
        var originalArray1 = [{x:1, y:3}, {x:4, y:5}, {x:1, y:10}, {x:1, y:7}, {x:2, y:8}]
        var expectedArray1 = [{x:1, y:9}, {x:4, y:25}, {x:1, y:100}, {x:1, y:49}, {x:2, y:64}]

        var actualJSON1 = JSON.stringify(squareArray(originalArray1));
        var expectedJSON1 = JSON.stringify(expectedArray1);

        expect(actualJSON1).toEqual(expectedJSON1);

        //2
        var originalArray2 = [{x:1, y:3}, {x:1, y:3}, {x:1, y:3}, {x:1, y:3}, {x:1, y:3}, {x:1, y:3}, {x:1, y:3}, {x:1, y:3}, {x:1, y:3}]
        var expectedArray2 = [{x:1, y:9}, {x:1, y:9}, {x:1, y:9}, {x:1, y:9}, {x:1, y:9}, {x:1, y:9}, {x:1, y:9}, {x:1, y:9}, {x:1, y:9}]

        var actualJSON2 = JSON.stringify(squareArray(originalArray2));
        var expectedJSON2 = JSON.stringify(expectedArray2);

        expect(actualJSON2).toEqual(expectedJSON2);

        //3
        var originalArray3 = [{x:1, y:2}, {x:1, y:6}, {x:34, y:10}, {x:15, y:9}, {x:7, y:9}, {x:1, y:1}, {x:3, y:4}]
        var expectedArray3 = [{x:1, y:4}, {x:1, y:36}, {x:34, y:100}, {x:15, y:81}, {x:7, y:81}, {x:1, y:1}, {x:3, y:16}]

        var actualJSON3 = JSON.stringify(squareArray(originalArray3));
        var expectedJSON3 = JSON.stringify(expectedArray3);

        expect(actualJSON3).toEqual(expectedJSON3);

    })
})
