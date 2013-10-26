/*
	Copyright (c) 2013, Micah N Gorrell
	All rights reserved.

	THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR IMPLIED
	WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
	MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO
	EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
	SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
	PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
	OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
	WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR
	OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF
	ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

function IdleInput(engine)
{
	this.engine = engine;

	this.mouse = {
		down:	false,

		x:		-1,
		y:		-1
	};

	window.addEventListener('resize',	this.resize.bind(	this), false);
	window.addEventListener('keydown',	this.keydown.bind(	this), false);
	window.addEventListener('keyup',	this.keyup.bind(	this), false);
	window.addEventListener('keypress',	this.keypress.bind(	this), false);

	if ('ontouchstart' in window) {
		document.body.addEventListener('touchstart',	this.mouseDown.bind(	this));
		document.body.addEventListener('touchend',		this.mouseUp.bind(		this));
		document.body.addEventListener('touchmove',		this.mouseMove.bind(	this));
	} else {
		document.body.addEventListener('mousedown',		this.mouseDown.bind(	this));
		document.body.addEventListener('mouseup',		this.mouseUp.bind(		this));
		document.body.addEventListener('mousemove',		this.mouseMove.bind(	this));
	}
};

IdleInput.prototype.resize = function resize(event)
{
	this.engine.resize();
};

IdleInput.prototype.keydown = function keydown(event)
{
	var name	= null;

	/*
		Many browsers will repeat this event while the key is being pressed,
		which is very annoying. Only reset the changed timestamp if the values
		have actually changed.
	*/

	switch (event.keyCode) {
		case 37:	name = 'left';	break;
		case 38:	name = 'up';	break;
		case 39:	name = 'right';	break;
		case 40:	name = 'down';	break;

		/* Tab to toggle debug */
		case 9:
			if (this.engine.debug) {
				console.log(JSON.stringify(this.engine.getMap(), null, "\t"));
			}

			this.engine.debug = !this.engine.debug;
			break;

		default:	return;
	}

	if (name && !this.engine.keys[name]) {
		this.engine.keys.changed = new Date();
		this.engine.keys[name] = true;
	}

	event.preventDefault();
};

IdleInput.prototype.keyup = function keyup(event)
{
	this.engine.keys.changed = new Date();

	switch (event.keyCode) {
		case 37:	this.engine.keys.left	= false; break;
		case 38:	this.engine.keys.up	= false; break;
		case 39:	this.engine.keys.right	= false; break;
		case 40:	this.engine.keys.down	= false; break;

		default:	return;
	}

	event.preventDefault();
};

IdleInput.prototype.keypress = function keypress(event)
{
	var s;

	if (this.engine.debug) {
		try {
			s = String.fromCharCode(event.which);
		} catch (e) {
			return;
		}

		/* Get the tile the character is standing on */
		if (s && this.engine.characters.length > 0) {
			var m = this.engine.characters[0].getMapCoords();

			if (s == ' ' && event.shiftKey) {
				/* Reset the world when shift+space is pressed */
				for (y = 0; y < this.engine.getMap().ground.length; y++) {
					for (x = 0; x < this.engine.getMap().ground[y].length; x++) {
						this.engine.setMapTile(this.engine.getMap(), x, y, ' ');
					}
				}
			} else {
				this.engine.setMapTile(this.engine.getMap(), m[0], m[1], s);
			}
		}
	}
};

IdleInput.prototype.mouseMove = function mouseMove(event)
{
	if (event.touches && event.touches.length > 0) {
		this.mouse.x = event.touches[0].screenX;
		this.mouse.y = event.touches[0].screenY;
	} else {
		this.mouse.x = event.pageX;
		this.mouse.y = event.pageY;
	}

	this.engine.keys.changed = new Date();
	this.mouseUpdate();
};

IdleInput.prototype.mouseUpdate = function mouseUpdate()
{
	var e = this.engine;

	if (!this.mouse.down) {
		return;
	}

	/* Reset all keys */
	e.keys.up		= false;
	e.keys.right	= false;
	e.keys.down		= false;
	e.keys.left		= false;

	/*
		Determine what the mouse position would be on the internal
		canvas, not the display canvas.
	*/
	var x = this.mouse.x;
	var y = this.mouse.y;

	x -= (e.display.canvas.width / 2) - ((e.width * e.scale) / 2);
	y -= (e.display.canvas.height / 2) - ((e.height * e.scale) / 2);

	x = x / e.scale;
	y = y / e.scale;
	// console.log(x, y);

	/* Determine the direction the mouse is relative to Idle */
	var dx = x - (e.characters[0].x + e.offset[0]);
	var dy = y - (e.characters[0].y + e.offset[1] -
					e.characters[0].elevationOffset);

	if (Math.abs(dx) > Math.abs(dy) * 2 || Math.abs(dy) < 10) {
		dy = 0;
	}
	if (Math.abs(dy) > Math.abs(dx) * 2 || Math.abs(dx) < 10) {
		dx = 0;
	}

	// console.log(dx, dy);

	if (dx > 0) e.keys.right	= true;
	if (dx < 0) e.keys.left		= true;
	if (dy < 0) e.keys.up		= true;
	if (dy > 0) e.keys.down		= true;
};

IdleInput.prototype.mouseDown = function mouseDown(event)
{
	this.mouse.down = true;
	this.mouseMove(event);
};

IdleInput.prototype.mouseUp = function mouseUp(event)
{
	this.mouseMove(event);
	this.mouse.down = false;

	/* Reset all keys on mouse up */
	this.engine.keys.up		= false;
	this.engine.keys.right	= false;
	this.engine.keys.down	= false;
	this.engine.keys.left	= false;
};

(function() {
    var lastTime	= 0;
    var vendors		= ['webkit', 'moz'];

    for (var x = 0, vendor; (vendor = vendors[x]) && !window.requestAnimationFrame; x++) {
        window.requestAnimationFrame =
				window[vendor + 'RequestAnimationFrame'];

        window.cancelAnimationFrame =
				window[vendor + 'CancelAnimationFrame'] ||
				window[vendor + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function(callback, element) {
            var currTime	= new Date().getTime();
            var timeToCall	= Math.max(0, 16 - (currTime - lastTime));
            var id			= window.setTimeout(function()
				{
					callback(currTime + timeToCall);
				}, timeToCall);

            lastTime = currTime + timeToCall;
            return id;
        };
	}

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
	}
}());

