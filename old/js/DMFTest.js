//watchify uFab_test.js -t babelify -v --outfile bundle.js
//watchify DMF_test_01.js -t babelify -v --outfile ../../renderer/static/js/DMFApp.js

    paper.install(window);
    // Keep global references to both tools, so the HTML
    // links below can access them.
    var tool1, tool2;
    var start;
    var current_stroke;
    var width = 20;
    var cornerWidth = width/2;
    var gridSize = 20;
    var strokes = [];
    var strokeHistory = [];
    //console.log(strokeHistory);
    var forceSnap = true;
    var forceSharpCorners = false;
    var forceHit = true;
    var ctrl = false;
    var ePos = new Point(50,50);
    var eParams = {
        type: "zigzag",
        width: 80,
        height: 80,
        rows: 4,
        columns: 4,
        spacing: 4
    }

    var zigzagParams = {
        zigWidth: 10,
        zigHeight: 6
    }

    var swiftParams = {
    }

    var rectParams = {
    }

    var typeOptions = {
        zigzag: zigzagParams,
        swift: swiftParams,
        rect: rectParams
    }

    var typeDivs = {
    }

    var hitOptions = {
    stroke: true,
    ends: false,
    fill: false,
    segments: false,
    class: Path,
    tolerance: 8
    };

    window.onload = function() {
        paper.setup('c');

        var intersectionGroup = new Group();
        var highlightGroup = new Group();
        var gridGroup = new Group();
        var electrodeGroup = new Group();

        var background = new Path.Rectangle(view.bounds);
        //background.fillColor = 'grey';

        var vert = new Symbol(vertGridLine());
        var horiz = new Symbol(horizGridLine());

        makeGrid();

        function makeGrid(){
        	vertGrid();
        	horizGrid();
        	gridGroup.insertBelow(intersectionGroup);
        }

        function vertGrid(){
        	for (var i = 0; i < view.bounds.width; i += gridSize){
        		var p = new Point(i+gridSize/2,view.bounds.height/2);
        		var s = vert.place(p);
        		gridGroup.addChild(s);
        	}
        }

        function horizGrid(){
        	for (var i = 0; i < view.bounds.height; i+= gridSize){
        		var p = new Point(view.bounds.width/2, i+gridSize/2);
        		var s = horiz.place(p);
        		gridGroup.addChild(s);
        	}
        }

        // Create two drawing tools.
        // tool1 will draw straight lines,
        // tool2 will draw clouds.

        // Both share the mouseDown event:

        //loadStrokes();

        function gridLine(start, end){
        	var line = new Path.Line(start, end);
        	line.strokeColor = 'lightblue';
        	line.strokeWidth = 1;
        	line.remove();
        	line.guide = true;
        	return line;
        }

        function vertGridLine(){
        	return gridLine(view.bounds.bottomLeft, view.bounds.topLeft);
        }

        function horizGridLine(){
        	return gridLine(view.bounds.topLeft, view.bounds.topRight);
        }

        function loadStrokes(){
            console.log(localStorage.strokes);
            strokeHistory = JSON.parse(localStorage.strokes);
            if (strokeHistory == null){
                strokeHistory = [];
            }
            for (var stroke in strokeHistory){
                st = strokeHistory[stroke];
                var sta = new Point(st[0], st[1]);
                var end = new Point(st[2], st[3]);
                var c = makeChannel(sta, end);
                strokes.push(c);
            }
        }

        function saveStrokes(){
            localStorage.setItem("strokes", JSON.stringify(strokeHistory));
            //console.log(localStorage.strokes);
        }

        function removeLastStroke(){
            var last;
            if (strokes.length > 1){
                last = strokes.pop();
                strokeHistory.pop();
            } else if (strokes.length ==1){
                last = strokes[0];
            }
            if (last){
                last.remove();
            }
            saveStrokes();
        }

        function onKeyDown(event) {
            // When a key is pressed, set the content of the text item:
            if (event.key.charCodeAt(0) == 26){
                removeLastStroke();
                console.log("removing stroke");
            }
        }

        function XOR(bool1, bool2){
            if ((bool1 && !bool2) || (bool2 && !bool1)){
                return true;
            } else {
                return false;
            }
        }

        function highlightTarget(target){
            highlightGroup.removeChildren();
            var highlight = new Path.Circle(target, 15);
            highlight.fillColor = 'purple';
            highlight.opacity = .5;
            highlight.parent = highlightGroup;
            highlight.removeOnMove();
        }

        function onMouseMove(event){
            selectStroke(event);
            highlightTarget(targetHandler(event));
        }

        function getTarget(point, snap, sharp, hit, start = null){
            //first snap the target point to x/y if sharp corners are enforced
            if (start && sharp){
                point = snapXY(start, point);
            }

            var hitResult = project.hitTest(point, hitOptions);

            if (!hitResult || !hit){
                if (snap){
                    return snapToGrid(point, gridSize);
                } else {
                    return point;
                }
            } else {
                if (snap){
                    var snapPoint = snapToGrid(point, gridSize);
                    var snapResult = project.hitTest(snapPoint, hitOptions);
                    if (snapResult){
                        return snapResult.point;
                    } else {
                        return hitResult.point;
                    }
                } else {
                    return hitResult.point;
                }
            }
        }

        function targetHandler(event){
            var snapGrid = XOR(event.modifiers.control, forceSnap);
            var sharpCorners = XOR(event.modifiers.shift, forceSharpCorners);
            var hitStrokes = XOR(event.modifiers.option, forceHit);
            var point = event.point;
            return getTarget(point, snapGrid, sharpCorners, hitStrokes, start);
        }

        function onMouseDown(event) {
            start = targetHandler(event);
            if (current_stroke){
                current_stroke.selected = false;
                current_stroke = null;
            }
        }

        tool1 = new Tool();
        tool1.onMouseDown = onMouseDown;
        tool1.onKeyDown = onKeyDown;
        tool1.onMouseMove = onMouseMove;

        tool2 = new Tool();
        tool2.activate();

        function selectStroke(event){
            project.activeLayer.selected = false;
            if (event.item && event.item != background){
                event.item.selected = true;
            }
        }

        function hitTestAll(point){
        	var hitResult = project.hitTest(point, hitOptions);
        	if (hitResult){
        		console.log(hitResult.type);
        	}

        }

        function showIntersections(path1, path2) {
		    var intersections = path1.getIntersections(path2);
		    for (var i = 0; i < intersections.length; i++) {
		        var c = new Path.Circle({
		            center: intersections[i].point,
		            radius: 5,
		            fillColor: '#009dec',
		            parent: intersectionGroup
		        }).removeOnMove();	
	    	}
   		}

        tool1.onMouseDrag = function(event) {
            clearStroke();
            var target = targetHandler(event);
            current_stroke = makeChannel(start, target);
            current_stroke.insertBelow(intersectionGroup);
            current_stroke.selected = true;
        }

        tool1.onMouseUp = function(event){
            strokes.push(current_stroke);
            strokeHistory.push([current_stroke.start.x, current_stroke.start.y, current_stroke.end.x, current_stroke.end.y]);
            saveStrokes();
            current_stroke.selected = false;
            start = null;
        }

        function clearStroke(){
            if (current_stroke){
                current_stroke.remove();
            }
        }

        function makeChannel(start, end){
            var s = makeRoundedLine(start, end, width);
            
            var c1 = new Path.Circle(start, cornerWidth);
            c1.fillColor = 'black';
            var c2 = new Path.Circle(end, cornerWidth);
            c2.fillColor = 'black';
            var l = makeGuideLine(start, end);

            var g = new Group([s,c1,c2,l]);
            g.start = start;
            g.end = end;

            return g;
        }	

        function snapToGrid(target, gridSize){
            var newTarget = new Point();
            newTarget.x = Math.round(target.x / gridSize) * gridSize;
            newTarget.y = Math.round(target.y / gridSize) * gridSize;
            return newTarget;
        }

        function makeGuideLine(start, end){
        	var l = new Path.Line(start, end);
        	l.strokeWidth = 1;
        	l.strokeColor = 'none';
        	return l;
        }

        function makeHollowLine(start, end){
            var l1 = makeLine(start, end, width);
            var l2 = makeLine(start, end, width/2);
            return new CompoundPath({
                children: [l1, l2],
                fillColor: 'black'
            });
        }

        function makeRoundedLine(start, end, thickness){
            /*
            var l = new Path.Line(start, end);
            l.strokeColor = 'black';
            l.strokeWidth = width;
            return l;
            */
            var vec = end.subtract(start);
            var rec = new Path.Rectangle({
                size: [vec.length, thickness],
                point: start,
                fillColor: 'black'
            });
            rec.translate([0,-thickness/2]);
            rec.rotate(vec.angle, start);
            return rec;

        }

        function snapXY(start, end){
            var vec = start.subtract(end);
            if (Math.abs(vec.x) > Math.abs(vec.y)){
                vec.y = 0;
            } else {
                vec.x = 0;
            }
            return start.subtract(vec);

            //loadStrokes()
        }

        function SpikeElectrode(position, width, height, options){
            var spikeWidth;
            if (options.spikeWidth){

            }
            var outline = new Path();

            return outline;
        }

        function ZigzagElectrode(position, width, height, options){
            var outline = new Path();
            //outline.closed = true;
            console.log(options);

            var zigWidth;
            var zigHeight;
            if (options.zigWidth){
                zigWidth = options.zigWidth;
            } else {
                zigWidth = Math.min(width, height)/6;
            }

            if (options.zigHeight){
                zigHeight = options.zigHeight;
            } else {
                zigHeight = Math.min(width, height)/8;
            }

            var perTop = Math.floor(width/zigWidth);
            var perSide = Math.floor(height/zigWidth);
            var topRemainder = width - zigWidth * perTop;
            var sideRemainder = height - zigWidth * perSide;
            var topLeft = position;
            var topRight = new Point(position.x + width, position.y);
            var bottomRight = new Point(topRight.x, topRight.y - height);
            var bottomLeft = new Point(bottomRight.x - width, bottomRight.y);

            outline.add(topLeft);
            var partialZigX = zigWidth / 4;
            var partialZigY = zigHeight /2;
            var topStart = new Point(topLeft.x + topRemainder/2, topLeft.y);

            outline.add(topLeft);
            for (var i =0; i < perTop; i ++){
                var start = new Point(topStart.x + i * zigWidth, topStart.y);
                var up = new Point(start.x + partialZigX, start.y - partialZigY);
                var mid = new Point(up.x + partialZigX, start.y);
                var down = new Point(mid.x + partialZigX, start.y + partialZigY);     

                outline.add(start);
                outline.add(up);
                outline.add(mid);
                outline.add(down);
            }
            var topEnd = new Point(topStart.x + perTop * zigWidth, topStart.y);
            outline.add(topEnd);

            outline.add(topRight);
            var rightStart = new Point(topRight.x, topRight.y - sideRemainder/2);

            for (var i =0; i < perSide; i ++){
                var start = new Point(rightStart.x, rightStart.y - i * zigWidth);
                var right = new Point(start.x - partialZigY, start.y - partialZigX);
                var mid = new Point(start.x, right.y - partialZigX);
                var left = new Point(start.x + partialZigY, mid.y - partialZigX);

                outline.add(start);
                outline.add(right);
                outline.add(mid);
                outline.add(left);
            }
            var rightEnd = new Point(topRight.x, rightStart.y - perSide * zigWidth);
            outline.add(rightEnd);

            outline.add(bottomRight);


            var botStart = new Point(bottomRight.x - topRemainder/2, bottomRight.y);
            for (var i =0; i < perTop; i ++){
                var start = new Point(botStart.x - i * zigWidth, botStart.y);
                var up = new Point(start.x - partialZigX, start.y + partialZigY);
                var mid = new Point(up.x - partialZigX, start.y);
                var down = new Point(mid.x - partialZigX, start.y - partialZigY);     

                outline.add(start);
                outline.add(up);
                outline.add(mid);
                outline.add(down);
            }
            var botEnd = new Point(botStart.x - perTop * zigWidth, botStart.y);
            outline.add(botEnd);


            outline.add(bottomLeft);

            var leftStart = new Point(bottomLeft.x, bottomLeft.y + sideRemainder/2);

            for (var i =0; i < perSide; i ++){
                var start = new Point(leftStart.x, leftStart.y + i * zigWidth);
                var right = new Point(start.x + partialZigY, start.y + partialZigX);
                var mid = new Point(start.x, right.y + partialZigX);
                var left = new Point(start.x - partialZigY, mid.y + partialZigX);

                outline.add(start);
                outline.add(right);
                outline.add(mid);
                outline.add(left);
            }

            var leftEnd = new Point(leftStart.x, leftStart.y + perSide * zigWidth);
            outline.add(leftEnd);
            outline.closed = true;
            
            return outline;
        }

        function SwiftElectrode(position, width, height, options){
            var curve;
            if (options.curveDistance){
                curve = options.curveDistance;
            } else {
                curve = height/3;
            }
            var outline = new Path();
            outline.closed = true;

            var topLeft = position;
            var topRight =  new Point(topLeft.x + width, topLeft.y);
            var midRight = new Point(topRight.x + curve, topLeft.y - height/2);
            var bottomRight = new Point(topRight.x, topRight.y - height);
            var bottomLeft = new Point(bottomRight.x - width, bottomRight.y);
            var midLeft = new Point(bottomLeft.x + curve, bottomLeft.y + height/2);

            outline.add(topLeft);
            outline.lineTo(topRight);
            outline.curveTo(midRight, bottomRight);
            outline.lineTo(bottomLeft);
            outline.curveTo(midLeft, topLeft);

            return outline;
        }

        function RectElectrode(position, width, height, options){
            var round;
            if (!options.round){    
                round = height/10;
            } else {
                round = options.round;
            }
            var outline = Path.Rectangle(new Rectangle(position, new Size(width, height)), round);
            outline.translate(new Point(0, -height));
            return outline;
        }

        function ElectrodeArray(position, type, width, height, columns, rows, spacing, options){

            if (!options){
                options = {};
            }
            var group = new Group();
            var spaceX = spacing + width;
            var spaceY = spacing + height;

            for (var i = 0; i < columns; i ++){
                for (var j = 0; j < rows; j ++){
                    var eX = position.x + (i * spaceX);
                    var eY = position.y + (j * spaceY) + height;
                    var pos = new Point(eX, eY);
                    var s;
                    if (type == "swift"){
                        s = new SwiftElectrode(pos, width, height, options);
                    } else if (type == "spike"){
                    } else if(type == "zigzag"){
                        s = new ZigzagElectrode(pos, width, height, options);
                    } else if (type == "rect"){
                        s = new RectElectrode(pos,width,height, options);
                    }
                    group.addChild(s);
                }
            }
            return group;
        }


        function renderArray(){
            electrodeGroup.removeChildren();
            var options = typeOptions[eParams.type];
            var electrodes = ElectrodeArray(ePos, eParams.type, eParams.width, eParams.height, eParams.columns, eParams.rows, eParams.spacing, options);
            electrodes.strokeColor = 'black';
            electrodes.fillColor = 'gold';
            electrodeGroup.addChild(electrodes);
            showType();
            view.update(true);
        }

        function setType(type){
            eParams.type = type;
            renderArray();
        }

        function updateParams(name, value){
            eParams[name] = parseFloat(value);
            var options = typeOptions[eParams[type]];
            renderArray(eParams, typeOptions[eParams["type"]]);
        }

        function createSlider(name, id, start, min, max, step){
            var container = document.createElement("div");
            container.setAttribute('class', "slider-container");
            var slider1 = document.createElement("div");
            var label = document.createElement("h5");
            label.innerHTML = name;
            container.appendChild(label);
            container.appendChild(slider1);
            slider1.setAttribute('id', id);
            noUiSlider.create(slider1, {
                start: [start],
                step: step,
                range: {
                    'min': [min],
                    'max': [max]
                }
            });
            return container;
        }

        function createParamSlider(name, start, min, max, step){
            var id = name + "-param-slider";
            var sliderDiv = createSlider(name, id, start, min, max, step);
            var container = document.getElementById("param-slider-container");
            container.appendChild(sliderDiv);
            var slider = document.getElementById(id);

            slider.noUiSlider.on('slide', function(){
                updateParams(name, slider.noUiSlider.get());
            })

            return slider;
        }

        function setupRectForms(){
            var container = document.getElementById("rect-slider-container");
            var round = createSlider("roundedness", "rect-round", 1, 1, 30, 1);
            container.appendChild(round);
            var roundSlider = document.getElementById("rect-round");
            roundSlider.noUiSlider.on('slide', function(){
                var val = parseFloat(roundSlider.noUiSlider.get());
                if (val == 0){
                    //val = null;
                }
                rectParams.round = val;
                renderArray();
            });

            typeDivs["rect"] = container;

            container.appendChild(document.createElement("hr"));

        }

        function setupSwiftForms(){
            var container = document.getElementById("swift-slider-container");
            var curve = createSlider("curveDistance", "swift-curve", 20, 1, 60, 1);
            container.appendChild(curve);
            var curveSlider = document.getElementById("swift-curve");
            curveSlider.noUiSlider.on('slide', function(){
                var val = parseFloat(curveSlider.noUiSlider.get());
                if (val == 0){
                    //val = null;
                }
                swiftParams.curveDistance = val;
                renderArray();
            });

            typeDivs["swift"] = container;

            container.appendChild(document.createElement("hr"));

        }

        function setupZigZagForms(){
            var container = document.getElementById("zigzag-slider-container");
            var zigWidth = createSlider("zigWidth", "zigzag-zigWidth", 10, 10, 30, 1);
            container.appendChild(zigWidth);
            var widthSlider = document.getElementById("zigzag-zigWidth");

            
            widthSlider.noUiSlider.on('slide', function(){
                var val = parseFloat(widthSlider.noUiSlider.get());
                if (val == 0){
                    //val = null;
                }
                zigzagParams.zigWidth = val;
                renderArray();
                
                console.log(widthSlider.noUiSlider.get());
            });
            
            

            var zigHeight = createSlider("zigHeight", "zigzag-zigHeight", 6, .1, 12, 1);
            container.appendChild(zigHeight);
            var heightSlider = document.getElementById("zigzag-zigHeight");
            heightSlider.noUiSlider.on('slide', function(){
                
                var val = parseFloat(heightSlider.noUiSlider.get());
                if (val == 0){
                    //val = null;
                } 
                zigzagParams.zigHeight = val;
                renderArray();
                

            console.log(heightSlider.noUiSlider.get());

            });

            container.appendChild(document.createElement("hr"));


            typeDivs["zigzag"] = container;
        }

        function hideDiv(div){
            div.style.display = "none";
        }

        function showDiv(div){
            div.style.display = "block";
        }

        function showType(){
            for (var eType in typeDivs){
                var target = typeDivs[eType];
                if (eType == eParams["type"]){
                    showDiv(target);
                } else {
                    hideDiv(target);
                }
            }
        }

        function setupForms(){
            document.getElementById("type").value = eParams.type;
            var columns = createParamSlider("columns", eParams["columns"], 1,5,1);
            var rows = createParamSlider("rows", eParams["rows"], 1,5,1);
            var width = createParamSlider("width", eParams["width"], 10,200,1);
            var height = createParamSlider("height", eParams["height"], 10,200,1);
            var spacing = createParamSlider("spacing", eParams["spacing"], 0, 20, 1);

            setupZigZagForms();
            setupRectForms();
            setupSwiftForms();
        }

        document.getElementById("type").onchange = function(){
            setType(this.value);
        }

        setupForms();
        showType(typeOptions[eParams.type]);
        renderArray();
        console.log("Hello, Autodesk!");

    }






