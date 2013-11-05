
namespace(this, "automata.games.robot", function (exports, globals) {

    exports.World = Object.create(automata.model.World).augment({
        sensors:   ["WL", "WR", "WA", "EOR"],
        actuators: ["LF", "LB", "RF", "RB"],

        width: 100,
        height: 100,
        
        walls: [],
        
        robotRadius: 10,
        sensorFactor: 1.4,
        stepDistance: 1,
        
        startX: 0,
        startY: 0,
        startAngle: 0,

        goalX: 0,
        goalY: 0,
        goalRadius: 10,
        
        init: function () {
            this.sensorRadius = this.robotRadius / 4;
            this.sensorPoints = [
                {x: -this.robotRadius,                     y: -this.robotRadius * this.sensorFactor},
                {x: -this.robotRadius,                     y:  this.robotRadius * this.sensorFactor},
                {x:  this.robotRadius * this.sensorFactor, y: 0}
            ];
            return automata.model.World.init.call(this);
        },
        
        onReset: function () {
            this.robotMatrix = (new Snap.Matrix()).rotate(this.startAngle).translate(this.startX, this.startY);
        },
        
        onStep: function () {
            var transform = this.robotMatrix.split();
            this.sensorValues = ["0", "0", "0", "0"];
            
            // Compute next coordinates
            var leftDir = 0;
            if (this.actuatorValues[0] === "1") {
                leftDir += 1;
            }
            if (this.actuatorValues[1] === "1") {
                leftDir -= 1;
            }
            var rightDir = 0;
            if (this.actuatorValues[2] === "1") {
                rightDir += 1;
            }
            if (this.actuatorValues[3] === "1") {
                rightDir -= 1;
            }

            var nextMatrix = this.robotMatrix.clone();
            if (leftDir === rightDir) {
                nextMatrix.translate(leftDir * this.stepDistance, 0);
            }
            else if (leftDir === -rightDir) {
                nextMatrix.rotate(leftDir * this.stepDistance * 180 / this.robotRadius / Math.PI);
            }
            else if (leftDir === 0) {
                nextMatrix.rotate(-rightDir * this.stepDistance * 90 / this.robotRadius / Math.PI, this.sensorPoints[0].x, this.sensorPoints[0].y);
            }
            else if (rightDir === 0) {
                nextMatrix.rotate(leftDir * this.stepDistance * 90 / this.robotRadius / Math.PI, this.sensorPoints[1].x, this.sensorPoints[1].y);
            }

            // Detect collisions
            function intersect(cx, cy, r, wx, wy1, wy2) {
                var r2 = r * r;
                var d = wx - cx;
                var d2 = d * d;
                if (r2 < d2) {
                    return false;
                }
                else {
                    var s = Math.sqrt(r2 - d2);
                    var y1 = cy + s;
                    var y2 = cy - s;
                    return y1 >= wy1 && y1 <= wy2 || y2 >= wy1 && y2 <= wy2;
                }
            }
            
            var collision =
                intersect(nextMatrix.e, nextMatrix.f, this.robotRadius, 0,           0, this.height) ||
                intersect(nextMatrix.e, nextMatrix.f, this.robotRadius, this.width,  0, this.height) ||
                intersect(nextMatrix.f, nextMatrix.e, this.robotRadius, 0,           0, this.width)  ||
                intersect(nextMatrix.f, nextMatrix.e, this.robotRadius, this.height, 0, this.width);
            
            for (var index = 0; index < this.walls.length; index ++) {
                var w = this.walls[index];
                if (intersect(nextMatrix.e, nextMatrix.f, this.robotRadius, w[0], w[1], w[3]) ||
                    intersect(nextMatrix.e, nextMatrix.f, this.robotRadius, w[2], w[1], w[3]) ||
                    intersect(nextMatrix.f, nextMatrix.e, this.robotRadius, w[1], w[0], w[2]) ||
                    intersect(nextMatrix.f, nextMatrix.e, this.robotRadius, w[3], w[0], w[2])) {
                    collision = true;
                    break;
                }
            }
            
            if (!collision) {
                if (leftDir !== rightDir && (nextMatrix.a === 0 || nextMatrix.a * this.robotMatrix.a < 0 ||
                                             nextMatrix.b === 0 || nextMatrix.b * this.robotMatrix.b < 0)) {
                    if (nextMatrix.a > 0.99) {
                        nextMatrix.a = 1;
                        nextMatrix.b = 0;
                    }
                    if (nextMatrix.a < -0.99) {
                        nextMatrix.a = -1;
                        nextMatrix.b = 0;
                    }
                    if (nextMatrix.b > 0.99) {
                        nextMatrix.a = 0;
                        nextMatrix.b = 1;
                    }
                    if (nextMatrix.b < -0.99) {
                        nextMatrix.a = 0;
                        nextMatrix.b = -1;
                    }
                    this.sensorValues[3] = "1";
                }

                this.robotMatrix = nextMatrix;
            }
            
            // Update sensors
            for (var index = 0; index < this.sensorPoints.length; index ++) {
                var s = this.sensorPoints[index];
                var sx = this.robotMatrix.x(s.x, s.y);
                var sy = this.robotMatrix.y(s.x, s.y);
                for (var wIndex = 0; wIndex < this.walls.length; wIndex ++) {
                    var w = this.walls[wIndex];
                    if (intersect(sx, sy, this.sensorRadius, w[0], w[1], w[3]) ||
                        intersect(sx, sy, this.sensorRadius, w[2], w[1], w[3]) ||
                        intersect(sy, sx, this.sensorRadius, w[1], w[0], w[2]) ||
                        intersect(sy, sx, this.sensorRadius, w[3], w[0], w[2])) {
                        this.sensorValues[index] = "1";
                        break;
                    }
                }
            }
            
            // Check goal
            var goalDx = this.goalX - this.robotMatrix.e;
            var goalDy = this.goalY - this.robotMatrix.f;
            if (goalDx * goalDx + goalDy * goalDy <= this.goalRadius * this.goalRadius) {
                this.done();
            }
        }        
    });
});