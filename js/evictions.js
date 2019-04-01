//most recent
/* evictions for SF evictions */
(function(){

// variables for data join
var attrArray =["Access Denial","Breach","Capital Improvement","Condo Conversion","Demolition",
    "Development","Ellis Act Withdrawal","Failure to Sign Renewal","Illegal_Use",
    "Late Payments","Lead Remediation","Nuisance","Other Cause","Owner Move-in","Roommate Same Unit",
    "Substantial Rehab","Unapproved Subtenant","non_payment"]
 
var attrDesc ={
    "AccessDenial":" DESCRIPTION: If the landlord indicated unlawful denial of access to unit as a grounds for eviction.",
    "Breach":"DESCRIPTION: If the landlord indicated breach of lease as a grounds for eviction.",
    "Capital Improvement":"DESCRIPTION: If the landlord indicated a capital improvement as a grounds for eviction.",
    "Condo Conversion":"DESCRIPTION: If the landlord indicated a condo conversion as a grounds for eviction.",
    "Demolition":"DESCRIPTION: If the landlord indicated demolition of property as a grounds for eviction.",
    "Development":"DESCRIPTION: If the landlord indicated a development agreement as a grounds for eviction.",
    "Ellis Act Withdrawal":"DESCRIPTION: If the landlord indicated an Ellis Act withdrawal (going out of business) as a grounds for eviction.",
    "Failure to Sign Renewal":"DESCRIPTION: If the landlord indicated failure to sign lease renewal as a grounds for eviction.",
    "Illegal Use":"DESCRIPTION: If the landlord indicated an illegal use of the rental unit as a grounds for eviction.",
    "Late Payments":"DESCRIPTION: If the landlord indicated habitual late payment of rent as a grounds for eviction.",
    "Lead Remediation":"DESCRIPTION: If the landlord indicated lead remediation as a grounds for eviction.",
    "Nuisance":"DESCRIPTION: If the landlord indicated nuisance as a grounds for eviction.",
    "Other Cause":"DESCRIPTION: If some other cause not covered by the admin code was indicated by the landlord. These are not enforceable grounds, but are indicated here for record keeping.",
    "Owner Move in":"DESCRIPTION: If the landlord indicated an owner move in as a grounds for eviction.",
    "Roommate Same Unit":"DESCRIPTION: If the landlord indicated if they were evicting a roommate in their unit as a grounds for eviction.",
    "Substantial Rehab":"DESCRIPTION: If the landlord indicated substantial rehabilitation as a grounds for eviction.",
    "Unapproved Subtenant":"DESCRIPTION: If the landlord indicated the tenant had an unapproved subtenant as a grounds for eviction.",
    "non payment":"DESCRIPTION: If the landlord indicated non-payment of rent as a grounds for eviction."
}


var expressed = attrArray[0]; //initial attribute

// dimensions
var w = $('#d3container').width() * 0.6 ;
var h = window.innerHeight*0.85;


//chart frame dimensions for chart function
//var chartW = $("#d3container").width() *0.425,
//    chartH = h,
var chartW = window.innerWidth *0.5,
    chartH = 460,
    leftPadding = chartW* 0.1,
    rightPadding = leftPadding/2,
    topPadding = chartH * 0.1,
    bottomPadding = leftPadding, 
    chartInnerW = chartW- leftPadding - rightPadding, //creates innner chart
    chartInnerH =chartH - topPadding - bottomPadding,
    translate = "translate(" + leftPadding +"," + topPadding+")";

var yScale = d3.scaleLinear()
    .range([chartH-10, 0])
    .domain([0,105]);

//begin sript when window loads

window.onresize = setMap();


//set up choropleth map 
function setMap(){
    //map frame dimensions
    var width = window.innerWidth, height = 460;
    //create new svg contrainer for the map
    var map = d3.select("#d3container") // id d3container to control second part of body
        .append("div")// add a div to our d3container 
        .classed("svg-map", true) // sets this a specific type of d3container, allowing manipulation in CSS
        .attr("id","mapDiv")// more customizing and 
        .append("svg") // add an svg
        //.attr("preserveAspectRatio", "xMinYMin meet")//force svg to keep its shape
        //.attr("viewBox","0 0 "+ w + " " + h )//assign viewbox dimensions
        .classed("svg-map-responsive",true)
        .attr("class","map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic proj. centered on SF
    var projection = d3.geoAlbers()
        .center([-36.20, 34.855])
        .rotate([84.64, -3.64, 0])
        .parallels([-35.0, 30.00])
        .scale(190000.00)
        .translate([chartW / 2, chartH / 2]);
    // projection variable 
    var path = d3.geoPath()
        .projection(projection);

    //use queue to parallelize asynchronous data loading 
    d3.queue()
        .defer(d3.csv, "data/sf_eviction_07_17.csv") //load attributes from csv
        .defer(d3.json, "data/sfzipcodes.topojson") //load background spatial data
        .await(callback);

    function callback(error,csvData, sfZipCodes){
        //sanFranZipTopo used for regions and multiple functions
        //console.log(error);
        //console.log(csvData);
        //console.log(sfZipCodes);

        //translate sf zip into topoJSON
        var sanFranZipTopo = topojson.feature(sfZipCodes, sfZipCodes.objects.sfzipcodes).features;
        //console.log(sanFranZipTopo);
        //join data function 
        sanFranZipTopo = joinData(sanFranZipTopo, csvData);
        //create the color scale
        var colorScale = makeColorScale(csvData);
        //add enumeration units to the map 
        setEnumerationsUnits(sanFranZipTopo,map,path,colorScale);
        //add coordinated visualizations
        setChart(csvData, colorScale);
        //adds the drop down to the map 
        createDropdown(csvData);

    };// end of callback function 

}// end of set map 

//function to create color scale generator
function makeColorScale(data){
    var colorClasses = [
    //need to update on colorbrewer
    "#ffffcc",
    "#c2e699",
    "#78c679",
    "#31a354",
    "#006837"
    ];
    //create color scale generator 
    //creating a qunatile scale generator
    var colorScale = d3.scaleQuantile()
        .range(colorClasses);
    //build array of all values of the expressed attribute
    var domainArray = [];
    for (var i=0; i<data.length; i++){
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);

    }; //end of domainArray

    //asign array of expressed values as scale domian
    colorScale.domain(domainArray); //replace with minmax for equal interval
    
    return colorScale;
};//end of colorScale

//function to test for data value and return color
function choropleth(props, colorScale){
    // make sure attribute value is a number 
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (typeof val =='number' && !isNaN(val)){
        return colorScale(val);
    } else{
        return "#404040";
    };
};


function joinData(sanFranZipTopo, csvData){
    //data join loops from example 1.1 sfzip.objects.sfzipcodes.geometries
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i=0; i < csvData.length; i++){
        var csvZIP = csvData[i]; // the current region  
        var csvKey = csvZIP.zip_code; // the csv primary key zip_code VERY IMPORTANT THEY MATCH!!!
        //primary key should not start with digits!!!!!

        //loop through geojson zips to find correct zips
        for (var a=0; a < sanFranZipTopo.length; a++){
            var geojsonProps = sanFranZipTopo[a].properties;
            //console.log(geojsonProps)
            var geojsonKey = geojsonProps.zip_code;
            //console.log(geojsonKey)
            
            //where  primary keys match, transfer csv data to geojson properties object 
            if (geojsonKey == csvKey){
                //assign all attributes and values
                attrArray.forEach(function(attr){ //get csv attribute value
                    var val = parseFloat(csvZIP[attr]); //get csv attribute value 
                    geojsonProps[attr] = val;//assign attribute and value to geojson properties 
                    //console.log(geojsonProps)

                }); 
            };
        };
    };
    return sanFranZipTopo;
}; // end of join DATA



function setEnumerationsUnits(sanFranZipTopo, map, path, colorScale){
    //..Add Zipcodes to the map 
    var addZipcodes = map.selectAll(".addZipcodes")
            .data(sanFranZipTopo)
            .enter()
            .append("path")
            .attr("class",function(d){
                //console.log(d.properties.id)
                return "addZipcodes " + d.properties.zip_code; //use zip_code
            })
            .attr("d", path)
            .style("fill", function(d){
                return choropleth(d.properties, colorScale);
            })
            
            .on("mouseover", function(d){
                highlight(d.properties);
            })
            .on("mouseout", function(d){
                dehighlight(d.properties);
            })
            .on("mousemove", moveLabel);

        var desc = addZipcodes.append("desc")
            .text('{"stroke": "#000", "stroke-width": "0.5px"}');


}; 


function setChart(csvData,colorScale){
    //create s second svg element to hold the bar chart 
    //negotiate if I want to use bubbles 
    var chart = d3.select("#d3container") //selecting the second portion of my html
        .append("div")//adding a div for the second visual, the chart 
        .classed("svg-chart", true) // sets the chart as d3container and allowing for customizing
        .attr("id","chartDiv")// adding to customize 
        .append("svg")
        .attr("preserveAspectRatio", "xMinYMin meet")//force svg to keep its shape
        .classed("svg-chart-responsive",true)
        .attr("width", chartW)
        .attr("height", chartH)
        .attr("class", "chart");
    
    //Creates a rectangle for chart background fill
    // var chartBackground = chart.append("rect")
    //     .attr("class","chartBackground")
    //     .attr("width", chartInnerW)
    //     .attr("height", chartInnerH)
    //     .attr("transform", translate);
    
    //     var chartBackground = chart.append("rect")
    //         .attr("class", "chartBackground")
    //         .attr("width", chartInnerWidth)
    //         .attr("height", chartInnerHeight)
    //         .attr("transform", translate);

    // set bars for each ZipCode
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a,b){
            // return  b[expressed] - a[expressed] 
            return  b.value - a.value
        })
        .attr("class", function(d){
            //console.log(d)
            return "bar " + d.zip_code;
        })
        .attr("width", chartInnerW / csvData.length - 1)
        .attr("height", chartInnerH)
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        //allows us to control highlighting units
        .on("mousemove", moveLabel);


// var max = d3.max(dataDict, function(d) { return +d.value;} );
//         var min = d3.min(dataDict, function(d) { return d.value;} );
        
//         var yScale = d3.scaleLinear()
//             .range([chartHeight, 0])
//             .domain([-1, max+3]);
        
//         //set bars for each province
//         var bars = chart.selectAll(".bars")
//             .data(dataDict)
//             .enter()
//             .append("rect")
//             .sort(function(a, b){
//                 return b.value-a.value





    //chart title 
    var chartTitle = chart.append("text")
        .attr("x", 98)
        .attr("y", 80)
        .attr("class", "chartTitle")
        //.text(expressed + " evictions per zip code");
    var desc = bars.append("desc")
       .text('{"stroke": "none", "stroke-width": "0px"}');


    var max = d3.max(csvData, function(d){
        return + parseFloat(d[expressed])
    });
    
    // scale of N to display on chart
    // var yScale = d3.scaleLinear()
    // .range([chartH-100, 0])
    // .domain([-30,max]);
    // create vertical axis generator used in the axis var below 
    
    var yAxis = d3.axisLeft(yScale)
    
    //place Y axis
    var axis = chart.append("g")
        .attr("class","axis")
        .attr("transform",translate)
        .call(yAxis);
    //frame. Where the bars will display 
    var chartFrame = chart.append("rect")
        .attr("class","chartFrame")
        .attr("width", chartInnerW)
        .attr("height", chartInnerH)        
        // .attr("width", chartInnerW)
        // .attr("height", chartInnerH)
        .attr("transform", translate);
        console.log(chartInnerW);
        console.log(chartInnerH);

    //set bar positions, heights, and colors
    updateChart(bars, csvData.length, colorScale);


}; // the end of set Charts 

//function for drop down menu 
function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("#dropdown")
        .append("select")

        .style("left","2vw")
        .style("top",window.innerHeight*0.25)
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });
    //add initial option
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled","true")
        .text("Select Eviction Type");
    //add attribute name options
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d})
        .text(function(d){return d});
        //.text(function(d){return attrDict[d]});


}// the end of create dropdown 


function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;
    //recreate the color scale
    var colorScale = makeColorScale(csvData);
    //recolor enumeration units
    var addZipcodes = d3.selectAll(".addZipcodes")
        .transition()
        .duration(1000)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });
    //get max value for selected attribute
    var max = d3.max(csvData, function(d){
        return + parseFloat(d[expressed])
    });

    yScale = d3.scaleLinear()
        .range([chartH-10,0])
        .domain([0,max]);
    
    //re-sort, resize, and recolor bars
    var bars = d3.selectAll(".bar")
        .sort(function(a,b){
            return b[expressed] - a[expressed];
        })
        .transition() // add animation
        .delay(function(d,i){
            return i * 5 
        })
        .duration(500);
    var datadesc = d3.select("#datadesc")
        .text(attrDesc[expressed]);


        updateChart(bars,csvData.length,colorScale);
};// the end ofchange attribute


function updateChart(bars,n,colorScale){
    //position bars
    bars.attr("x", function(d,i){
        return i * (chartInnerW / n ) + leftPadding;
    })
    //size/resize bars return 0 for values less than zero
    .attr("height",function(d,i){
        var outH =  (chartH) - yScale(parseFloat(d[expressed]));
        if (outH<0 ){ 
            return 0; 
        } else{ 
            return outH
        }})
    .attr("y",function(d,i){
        var outY = yScale(parseFloat(d[expressed])) -0;
        if (outY <0) { return 0;}
        else{ return outY; }
    })
    //color/recolor bars
    .style("fill", function(d){
        return choropleth(d, colorScale);
    });
    var chartTitle = d3.select(".chartTitle")
        .text(expressed + " evictions filed by Zip ");
    
    //update the chart axis
    var yAxis =d3.axisLeft()
        .scale(yScale)

    d3.selectAll("g.axis")
        .call(yAxis);
};// end of updateChart

//function to highlight enumeration units and bars 
function highlight(props){
    var selected = d3.selectAll("."+ props.zip_code)
        .style("stroke", "#660000")
        .style("stroke-width","3");
    setLabel(props);
}// end of highlight


//function to reset the element style on mouseout
function dehighlight(props){
    var selected = d3.selectAll("."+props.zip_code)
        .style("stroke", function(){
            return getStyle(this, "stroke")
        })
        .style("stroke-width", function(){
            return getStyle(this, "stroke-width")
        });
    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();
        var styleObject = JSON.parse(styleText);
        
        return styleObject[styleName];
    };
    d3.select(".infolabel")
        .remove();
};
    

//function to create dynamic label 
function setLabel(props){
    //label content
    var numEvictions = noData(Math.round(parseFloat(props[expressed])))
    var labelAttribute = "<h1>" + props[expressed] +"</h1><b>" + expressed + "</b>";
    //create info label div
    var infolabel = d3.select("body")
    //console.log(props)
        .append("div")
        .attr("class","infolabel")
        .attr("id", props.zip_code +"_label")
        .html(labelAttribute);
    
    var zipName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.zip_code);
    
    //catch and replace NaN responses
    function noData(value){
        if(String(value) == "NaN"){
            return "No data";
        } else {
            return value
        };
    };
}; // end of setLabel




//function to move info label with mouse
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;
    
    //use coordinates of mousemove event to set label coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 10,
        y2 = d3.event.clientY + 25;
    
    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 :y1;
    
    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");
};


})(); // of global function, no more JS 