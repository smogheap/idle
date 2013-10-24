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
window.addEventListener('load', function()
{
	var c		= document.getElementById('game');
	var engine	= new IdleEngine(c);
}, false);

window.addEventListener('resize', function()
{
	var c = document.getElementById('game');

	c.engine.resize();
}, false);

window.addEventListener('keydown', function(event)
{
	var c		= document.getElementById('game');
	var name	= null;

	/*
		Many browsers will repeat this event while the key is being pressed,
		which is very annoying. Only reset the changed timestamp if the values
		have actually changed.
	*/

	switch (event.keyCode) {
		case 65:	// a, h or left
		case 72:
		case 37:	name = 'left';	break;

		case 87:	// w, k or up
		case 75:
		case 38:	name = 'up';	break;

		case 68:	// d, l or right
		case 76:
		case 39:	name = 'right';	break;

		case 83:	// s, j or down
		case 74:
		case 40:	name = 'down';	break;

		/* Tab to toggle debug */
		case 9:
			if (c.engine.debug) {
				console.log(JSON.stringify(c.engine.getMap(), null, "\t"));
			}

			c.engine.debug = !c.engine.debug;
			break;

		default:	return;
	}

	if (name && !c.engine.keys[name]) {
		c.engine.keys.changed = new Date();
		c.engine.keys[name] = true;
	}

	event.preventDefault();
}, false);

window.addEventListener('keyup', function(event)
{
	var c = document.getElementById('game');

	c.engine.keys.changed = new Date();

	switch (event.keyCode) {
		case 65:	// a, h or left
		case 72:
		case 37:	c.engine.keys.left	= false; break;

		case 87:	// w, k or up
		case 75:
		case 38:	c.engine.keys.up	= false; break;

		case 68:	// d, l or right
		case 76:
		case 39:	c.engine.keys.right	= false; break;

		case 83:	// s, j or down
		case 74:
		case 40:	c.engine.keys.down	= false; break;

		default:	return;
	}

	event.preventDefault();
}, false);

window.addEventListener('keypress', function(event)
{
	var c = document.getElementById('game');
	var e = c.engine;
	var s;

	if (e.debug) {
		try {
			s = String.fromCharCode(event.which);
		} catch (e) {
			return;
		}

		/* Get the tile the character is standing on */
		if (s) {
			var m = e.characters[0].getMapCoords();

			if (s == ' ' && event.shiftKey) {
				/* Reset the world when shift+space is pressed */
				for (y = 0; y < e.getMap().ground.length; y++) {
					for (x = 0; x < e.getMap().ground[y].length; x++) {
						e.setMapTile(e.getMap(), x, y, ' ');
					}
				}
			} else {
				e.setMapTile(e.getMap(), m[0], m[1], s);
			}
		}
	}
}, false);

window.addEventListener('load', function()
{
	var c		= document.getElementById('game');
	var body	= c.parentNode;
	var mouse	= {
		x:		-1,
		y:		-1,

		move: function(ev) {
			if (ev.touches && ev.touches.length > 0) {
				this.x = ev.touches[0].screenX;
				this.y = ev.touches[0].screenY;
			} else {
				this.x = ev.pageX;
				this.y = ev.pageY;
			}

			c.engine.keys.changed = new Date();
			this.update();
		},

		update: function() {
			var e = c.engine;

			if (!this.down) {
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
			var x = this.x;
			var y = this.y;

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
		},

		down: function(ev) {
			var e = c.engine;

			e.mouseupdate = this.update.bind(this);

			this.down = true;
			this.move(ev);
		},

		up: function(ev) {
			var e = c.engine;

			this.move(ev);
			this.down		= false;

			/* Reset all keys on mouse up */
			e.keys.up		= false;
			e.keys.right	= false;
			e.keys.down		= false;
			e.keys.left		= false;
		}
	};

	if ('ontouchstart' in window) {
		body.addEventListener('touchstart',	mouse.down.bind(mouse));
		body.addEventListener('touchend',	mouse.up.bind(mouse));
		body.addEventListener('touchmove',	mouse.move.bind(mouse));
	} else {
		body.addEventListener('mousedown',	mouse.down.bind(mouse));
		body.addEventListener('mouseup',	mouse.up.bind(mouse));
		body.addEventListener('mousemove',	mouse.move.bind(mouse));
	}

	mouse.down = false;
}, false);

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

