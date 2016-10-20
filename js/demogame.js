﻿/**
	Issues that need to be debug:
	1. When the ball hits the wall every once in a while it sticks to the wall
		Fixed: The reason this happened was because the ball would be in a position where
		the x flipping would occure every frame so it seemed not to move.
	2. When balls are being removed from the scene multiple balls will be removed at the same time
		Issue: When one ball goes through the remove process it seems to also be connected to all the other
		balls in the game.  Working on a fix for this one.
	3. When the ball hits the ground some times the y velocity is removed even though there should still be bouncing
		Fixed: This was the same issue that happened with the x bounderies.  Now when velocity is flipped the y position
		is set to the ground plane.
	4. Now the balls don't stop bouncing.
		Fixed: The frame count was not high enough to accoung for the low bounce frame count.
	5. When a ball is suppose to be removed it still is being processed.
		Fixed: The remove process needed to be cleaned up to only remove items when the engine calls them so that
		potentially we don't remove an item that is in the process of being drawn.
*/

// Connect the game to the load event
if (window.addEventListener) {
	window.addEventListener('load', demoGame, false);
} else {
	window.attachEvent('onload', demoGame);
}


// First thing I need to do is create an event for the site when it is complete
// There are multiple ways to do this but for today I'm going to be lazy and use jQuery
function demoGame () {
	// Before we initialize the engine we need to create a config object
	let cfg = {
		clearClr: '#202020',
		canvasId: 'theCanvas'
	};
	// Now when the page is done loading it is time to initialize the game engine
	let engine = new Canven(cfg);

	class LineEntity extends Entity{
		constructor(config) {
			super(config);
			this.name = "Line";
			this.color = '#c0c0c0';
		}
		Draw(ctx){
			// Draw a line down the middle of the field
			let oldStyle = ctx.strokeStyle;
			let x = (engine.size.x / 2)-5;

			ctx.beginPath();
			let rgb = engine.HexToRGB(this.color);
			ctx.strokeStyle = `rgba(${rgb.toString()},0.5`;
			ctx.lineWidth = 1;

			ctx.moveTo(x, 0);
			ctx.lineTo(x, engine.size.y);
			ctx.stroke();

			ctx.strokeStyle = oldStyle;
		}
	}

	// Need a new entity object we can use to add into the game engine
	class GravBall extends Entity {
		constructor(config){
			super(config);
			this.name = "Gravity Ball";
			this.alpha = 1.0;
			this.ballFriction = 0.007;
			this.ballSize = 10;
			this.color = '#ffffff';
			this.frameCnt = 0;
			this.gravity = 0.2;
			this.isMoving = true;
			this.speed = -15;
		}

		Calculate(){
			// Setup the needed values for the rise over run formula
			let delta = new Vector2D(0, 0);
			// Need the differences of each value in the vector/point
			delta.x = this.Position.x - this.Target.x;
			delta.y = this.Position.y - this.Target.y;
			let numerator = Math.abs(delta.x) + Math.abs(delta.y);

			// Set initial velocity for the ball
			this.Velocity.x = (delta.x / numerator) * this.speed;
			this.Velocity.y = (delta.y / numerator) * this.speed;
		}

		Draw(ctx){
			// ctx is provided by the game engine when the draw
			// routine is called.

			// Save the ctx fill style before we wack it out
			let oldStyle = ctx.fillStyle;
			let b = this; // Add this so the arc command is on one line

			// Convert ball color into RGB
			let rgb = engine.HexToRGB(b.color);

			ctx.fillStyle = `rgba(${rgb.toString()},${b.alpha}`;
			ctx.beginPath();
			ctx.arc(b.Position.x, b.Position.y, b.ballSize, 0, 2 * Math.PI);
			ctx.fill();

			// Return the style back to original value before I wakced it
			ctx.fillStyle = oldStyle;
		}

		Move(deltaTime){
			// I don't like these but I'm to lazy to refactor right now
			if (!this.isMoving) return;

			let ground = engine.size.y - 60;
			// Just change the position based on the entoty velocity
			this.Position.x += this.Velocity.x * deltaTime;
			this.Position.y += this.Velocity.y * deltaTime;
			// Adjust the velocity by my FAKE gravity
			//*
			this.Velocity.y += this.gravity;

			// Need to add in a ground layer collision detection
			if (this.Position.y > ground) {
				if (this.frameCnt > 18) {
					this.Velocity.y *= -0.8 // Just an estimate for now
				} else {
					// Fix the gitter after physics has depleted the y energy
					this.Velocity.y = 0
				}
				this.Position.y = ground;
				this.frameCnt = 0;
			}

			// Ball went bye bye :(
			if (this.Position.x > engine.size.x - 10 || this.Position.x < 10) {
				// Need to flip x velocity
				this.Velocity.x *= -0.7;
				if (this.Position.x > engine.size.x - 10) {
					this.Position.x = engine.size.x - 10;
				} else {
					this.Position.x = 10;
				}
			}

			// Slow down ball when on the ground
			if (this.Position.y == ground && this.Velocity.x != 0) {
				// So we need to always subtract the friction from velocity
				this.Velocity.x -= this.ballFriction
					* (this.Velocity.x / Math.abs(this.Velocity.x));
				// Clean up the velocity and make it stop moving
				if (Math.abs(this.Velocity.x) < 0.01) {
					this.Velocity.x = 0;
				}
			}
			// Adding a kill ball and remove from simulation process
			if (this.Velocity.x == 0 && this.Velocity.y == 0) {
				this.isMoving = false;
				setTimeout(this.RemoveBall, 1000);
			}

			++this.frameCnt;
			//*/
		}

		RemoveBall(){
			// Not perfect but it is getting there
			// It would be nice to fade ball out instead of doing a harsh rip out of game engine
			let steps = 1 / 60; // 1.0 divided by 60 frames
			this.alpha -= steps;
			if (this.alpha > 0) {
				setTimeout(this.RemoveBall, 1000 / 60);
			} else {
				// This method doesn't exists so time to make it
				engine.RemoveEntity(this);
			}

		}
	};

	class BallCollider extends Collider {
		constructor(config) {
			super(config);
			this.radius = 0;
			this.colliderActive = true;
		}

		Collision(you) {
			// Need to figure out what to do when another ball hits me
			/*
			let dirChange = -1;
			let youPos = you.Position;
			let mePos = this.entity.Position;
			let vel = this.entity.Velocity;

			let velSum = Math.abs(vel.x) + Math.abs(vel.y);

			let delta = engine.NewVector2D(youPos.x - mePos.x, youPos.y - mePos.y);
			let numerator = Math.abs(delta.x) + Math.abs(delta.y);

			vel.x = dirChange * ((delta.x / numerator) * velSum);
			vel.y = dirChange * ((delta.y / numerator) * velSum);
			//*/
		}

		CheckHit(you) {
			// Setup the math variable we need
			let youPos = you.Position;
			let mePos = this.entity.Position;
			let youRaidus = you.ballSize;
			let meRadius = this.entity.ballSize;

			// Calculate the square of the two lines
			let sqDiff = (Math.abs(mePos.x - youPos.x) * Math.abs(mePos.x - youPos.x)) +
				(Math.abs(mePos.y - youPos.y) * Math.abs(mePos.y - youPos.y));
			// Calculate the square of the radius
			let sqRadius = (youRaidus + meRadius) * (Math.abs(mePos.y - youPos.y));

			return sqDiff < sqRadius;
		}
	}

	class Ground extends Entity {
		constructor(config) {
			super(config);
			this.name = "Ground";
			this.color = '#814607';
		}

		Draw(ctx) {
			console.log("Drawing ground");
			let pos = this.Position;
			let oldStyle = ctx.fillStyle;

			ctx.fillStyle = this.color;
			ctx.fillRect(0, engine.size.y - 50, engine.size.x, engine.size.y);

			ctx.fillStyle = oldStyle;
		}
	}

	// Now I want to add a gun to the scene :)
	function TheBigGun(config) {
		let gun = engine.NewEntity({
			name: "The BIG Gun!",
			Draw: (ctx) => {
				let oldStyle = ctx.fillStyle;
				ctx.fillStyle = this.color;
				// Position is the center point so calculate the rect
				let rect = { x: 0, y: 0, h: 50, w: 10 };
				rect.x = this.Position.x - 5;
				rect.y = this.Position.y;

				ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

				ctx.fillStyle = oldStyle;
			},
			Move: (deltaTime) => {

			},
			color: '#ff0000'
		});

		Object.assign(gun, config);
		Object.assign(this, gun);
	}

	// Run the initialization part of the engine
	engine.Init();


	// I want to shoot a ball now!!!!
	let cv = document.getElementById(engine.canvasId);
	cv.onclick = (e) => {
		// Get the event object
		e = e || windows.event;
		let clickPos = new Vector2D(
			e.pageX - engine.canvas.offsetLeft,
			e.pageY - engine.canvas.offsetTop);
		// Add this so we can debug the start position
		let startPos = new Vector2D((engine.size.x / 2) - 5, engine.size.y - 100);
		// Need to create a new ball each time
		let newball = new GravBall({
			Position: startPos,
			Target: clickPos,
		});
		newball.collider = new BallCollider({ entity: newball });
		// Need to calculate the velocity as it is shot to the click position
		newball.Calculate();
		// Need to add the ball to the simulator or noting will happen duh!?!?
		engine.AddEntity(newball);
	}

	window.onkeydown = (e) => {
		e = e || windows.event;
		if (e.which == 81) {
			engine.Close();
		}
	};

	let line = new LineEntity({ color: '#ffffff' });
	let ground = new Ground({});
//	let theBigOne = new TheBigGun({ Position: new Vector2D((engine.size.x / 2) - 5, engine.size.y - 80) });
	engine.AddEntity(line);
//	engine.AddEntity(theBigOne);
	engine.AddEntity(ground);

	// Run the simulation
	engine.Run();
};