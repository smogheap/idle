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
function IdleEngine()
{
	this.debug				= false;
	this.frame				= 0;

	this.width				= 320;
	this.height				= 240;

	/* Setup keyboard input */
	this.input				= new IdleInput(this);

	/*
		Details about where to render the play area. These will be updated in
		this.resize().
	*/
	this.scale				= 2;
	this.center				= [ 0, 0 ];

	/* The starting area */
	// TODO	At some point we should determine the starting area from a save
	this.area				= new IdleArea(this, [ 0, 0 ]);

	this.seed				= WRand.getSeed(NaN);
	this.imgcache			= {};
	this.tileSize			= [ 32, 16 ];

	/* Start at noon */
	this.time				= 0.5;

	this.setDebug(false);

	this.start();
}

/*
	Darken an image.

	This uses the same work canvas each time, so using it will overwrite
	whatever image was written to it last.
*/
IdleEngine.prototype.darkenImage = function darkenImage(img, color)
{
	var canvas	= document.createElement('canvas');
	var ctx		= canvas.getContext('2d');

	canvas.setAttribute('width',		img.width);
	canvas.setAttribute('height',		img.height);

	ctx.drawImage(img, 0, 0);
	ctx.globalCompositeOperation = 'source-atop';
	ctx.fillStyle = color;

	ctx.fillRect(0, 0, canvas.width, canvas.height);

	return(canvas);
};

IdleEngine.prototype.getImage = function getImage(name, overlaycolor)
{
	var img;

	if (typeof name != "string" && name.name) {
		/*
			It looks like the caller passed in an already loaded image, possibly
			with a different darkness.

			Luckily we stored the name earlier.
		*/
		name = name.name;
	}

	if (!(img = this.imgcache[name])) {
		this.imgcache[name] = img = new Image();
		img.src = 'images/' + name + '.png';

		/* Keep the image name, we may want it later */
		img.name = name;
	}

	if (overlaycolor) {
		/*
			Get a darker version of the image. If it already exists then use
			then use that. Otherwise, create it.
		*/
		if (!img.darkened) {
			img.darkened = {};
		}

		if (!(tmp = img.darkened[overlaycolor])) {
			img.darkened[overlaycolor] = tmp = this.darkenImage(img, overlaycolor);
		}

		if (tmp) {
			img = tmp;
		}
	}

	return(img);
};

IdleEngine.prototype.loadImages = function loadImages(names, cb)
{
	var loaded	= 0;

	for (var i = 0, n; n = names[i]; i++) {
		var tile = this.getImage(n);

		tile.onload = function() {
			if (++loaded == names.length) {
				cb();
			}
		};
	}
};

/*
	Convert from isometric to map coords

	Map is in a map position, isometric is in pixels.
*/
IdleEngine.prototype.isoToMap = function isoToMap(x, y)
{
	var w = this.tileSize[0] / 2;
	var h = this.tileSize[1] / 2;

	/* Our isometric coords are based on the bottom corner of a tile */
	ty -= (this.tileSize[1] - 1);

	var tx = (x / w + (y / h)) / 2;
	var ty = (y / h - (x / w)) / 2;

	return([ Math.floor(tx), Math.floor(ty) ]);
};

/*
	Convert from map coords to isometric

	Map is in a map position, isometric is in pixels.
*/
IdleEngine.prototype.mapToIso = function mapToIso(x, y)
{
	var w = this.tileSize[0] / 2;
	var h = this.tileSize[1] / 2;

	var tx = (x - y) * w;
	var ty = (x + y) * h;

	/* We want the bottom corner, not the top corner. */
	ty += (this.tileSize[1] - 1);

	return([ Math.floor(tx), Math.floor(ty) ]);
};

IdleEngine.prototype.setArea = function setArea(id)
{
	var oldid	= this.area.id;

	var diff	= [
		oldid[0] - id[0],
		oldid[1] - id[1]
	];

	console.log(diff);
	this.area.setID(id);

	if (this.oldarea) {
		clearTimeout(this.oldarea.killcb);
		this.oldarea.reset();
		delete this.oldarea;
	}

	if (!this.debug) {
		this.oldarea = new IdleArea(this, oldid, false, 1);

		/*
			Render this.oldarea in the same spot that this.area will end up. The
			render function will then move both areas until the new one is in
			the right spot.

			Each only needs to be rendered once at the start. Simply moving them
			with CSS will be sufficient to complete the transition.
		*/
		/* Calculate where the "new" area should appear */
		var w		= this.tileSize[0] * this.area.size * this.scale;
		var h		= this.tileSize[1] * this.area.size * this.scale;
		var center	= this.center.slice(0);

		center[0] += (-diff[0] - diff[1]) * (w / 2);
		center[1] += (-diff[0] + diff[1]) * (h / 2);

		this.oldarea.render([], this.center,
					[ this.width, this.height ], this.scale);

		this.area.render(this.characters, center,
				[ this.width, this.height ], this.scale);

		/* Correct the positions on the screen so that they overlap correctly */
// TODO	Work out why swapping the nodes is not working right...
		if (center[1] < this.center[1]) {
console.log('The new area is higher on the screen, so it should be lower in zIndex');
			document.body.removeChild(this.area.div);
			document.body.insertBefore(this.area.div, this.oldarea.div);
		} else {
console.log('The new area is lower on the screen, so it should be higher in zIndex');
			document.body.removeChild(this.oldarea.div);
			document.body.insertBefore(this.oldarea.div, this.area.div);
		}


		setTimeout(function() {
			/* Set the correct position for both areas */
			var center	= this.center.slice(0);

			center[0] -= (-diff[0] - diff[1]) * (w / 2);
			center[1] -= (-diff[0] + diff[1]) * (h / 2);

			/* Set the styles to move the elements to the correct positions */
			this.area.div.style.transition		= 'left 0.5s linear, top 0.5s linear';
			this.area.move(this.center);

			this.oldarea.div.style.transition	= 'left 0.5s linear, top 0.5s linear';
			this.oldarea.move(center);

			this.oldarea.killcb = setTimeout(function() {
				/* Done, cleanup */
				if (this.area && this.area.div) {
					this.area.div.style.transition = null;
				}

				if (this.oldarea) {
					this.oldarea.reset();
					delete this.oldarea;
				}
			}.bind(this), 500);
		}.bind(this), 1);
	}

	/*
		Reset the debug areas, which will force them to reload relative to the
		ID of this.area.
	*/
	this.setDebug(this.debug);
};

IdleEngine.prototype.inputLoop = function inputLoop()
{
	/* How many real life seconds should it take for a day to pass in game */
	var SecondsPerDay	= 30;
	var speed			= 2;
	var idle			= this.characters[0];
	var direction		= '';

	/* Request next call for the input loop */
	window.setTimeout(this.inputLoop.bind(this), 33);

	this.time += 1 / (SecondsPerDay * 30);

	if (this.input) {
		this.input.mouseUpdate();
	}

	/* Update the character image based on the direction he is facing */
	if (this.keys.left || this.keys.right || this.keys.up || this.keys.down) {
		if (this.keys.up && !this.keys.down) {
			direction += 'north';
		} else if (this.keys.down && !this.keys.up) {
			direction += 'south';
		}

		if (this.keys.left && !this.keys.right) {
			direction += 'west';
		} else if (this.keys.right && !this.keys.left) {
			direction += 'east';
		}
	}

	if (!direction.length) {
		direction = null;
	}

	/*
		Ask the characters to move. If the character happens to be Idle then
		tell him to face that direction and move in that direction.
	*/
	for (var i = 0, c; c = this.characters[i]; i++) {
		c.move(i == 0 ? direction : null, i == 0 ? direction : null);
	}
};

IdleEngine.prototype.setDebug = function setDebug(debug)
{
	this.debug = debug;

	/* Reset all debug areas to avoid leaving around stale DOM nodes */
	if (this.legend) {
		document.body.removeChild(this.legend);
		delete this.legend;
	}

	if (this.debugAreas) {
		var keys = Object.keys(this.debugAreas);

		for (var i = 0, k; k = keys[i]; i++) {
			this.debugAreas[k].reset();
		}
	}
	this.area.reset();

	this.area.debug = debug;

	if (!debug) {
		delete this.debugAreas;

		this.area.reset();


		return;
	}

	this.debugAreas = {};

	/* Create a canvas for the legend */
	this.legend = document.createElement('canvas');

	this.legend.setAttribute('width',  '400px');
	this.legend.setAttribute('height', '70px');

	this.legend.style.position		= 'absolute';
	this.legend.style.height		= '70px';
	this.legend.style.left			= '5px';
	this.legend.style.bottom		= '3px';


	document.body.appendChild(this.legend);
	var ctx = this.legend.getContext('2d');
	/*
		We want to look old school

		These attributes get reset when the canvas size is changed, so
		they need to be corrected here.
	*/
	ctx.imageSmoothingEnabled			= false;
	ctx.mozImageSmoothingEnabled		= false;
	ctx.webkitImageSmoothingEnabled		= false;

	/* Render the editor legend */
	var x			= 15;
	var types		= [ "ground", "props" ];

	ctx.save();

	ctx.font		= '15pt Arial';
	ctx.fillStyle	= 'rgb(255, 255, 255)';

	for (var t = 0, type; type = types[t]; t++) {
		var keys	= Object.keys(world.tiles[type]);

		for (var k = 0, key; key = keys[k]; k++) {
			var tile = world.tiles[type][key];
			var img;

			ctx.fillText(key, x - 5, 15);

			tile.iso = [ x, 45 ];
			this.area.renderTile(tile, 1, false, ctx, NaN);

			x += 46;
		}
	}

	ctx.restore();
};

IdleEngine.prototype.render = function render(time)
{
	this.frame++;

	/* Request the next animation frame */
	requestAnimationFrame(this.render.bind(this));

	if (!this.debug) {
		/*
			Normal Mode

			If this.oldarea is set then we are in the middle of a transition and
			should not set the location.
		*/
		this.area.render(this.characters,
					this.oldarea ? null : this.center,
					[ this.width, this.height ], this.scale);

		// TODO	Draw the OSD
	} else {
		var w		= this.tileSize[0] * this.area.size;
		var h		= this.tileSize[1] * this.area.size;

		for (var x = -1; x <= 1; x++) {
			for (var y = 1; y >= -1; y--) {
				var name	= [ x, y ].toString();
				var center	= this.center.slice(0);
				var area;
				var middle	= (x == 0 && y == 0);

				/* Adjust the rendering position */
				center[0] -= (-x - y) * (w / 2);
				center[1] -= (-x + y) * (h / 2);

				if (middle) {
					/* Only the center area should be marked as debug */
					area = this.area;
					area.debug = true;
				} else if (!(area = this.debugAreas[name])) {
					/*
						These areas only need a single layer. They will never
						have any dirty tiles.
					*/
					area = this.debugAreas[name] = new IdleArea(this,
								[ this.area.id[0] + x, this.area.id[1] + y ],
								false, 1);
				}

				area.render(middle ? this.characters : [], center,
					[ 400, 400 ], 1);
			}
		}
	}

	/* Display the weather */
	if (!this.weather) {
		this.weather = document.createElement('div');

		document.body.appendChild(this.weather);
		this.weather.style.zIndex		= 99;
		this.weather.style.position		= 'absolute';
		this.weather.style.top			= '0px';
		this.weather.style.right		= '0px';
		this.weather.style.bottom		= '0px';
		this.weather.style.left			= '0px';
	}

	if (this.frame % 5 == 0) {
		/* No reason to do this every frame */
		this.weather.style.backgroundColor	= this.getTimeColor(this.time);
	}
};

IdleEngine.prototype.timeColors = [
	[   0,   0,  20, 0.7 ],	/* Just after midnight	*/
	[  10,   0,  20, 0.6 ],
	[  20,   0,  20, 0.5 ],
	[  40,   0,  10, 0.4 ],
	[  80,   0,   0, 0.3 ],	/* Morning				*/
	[ 255, 255, 250, 0.0 ],
	[ 255, 230, 230, 0.1 ], /* Noon					*/
	[ 255, 255, 255, 0.0 ],
	[ 255, 255, 255, 0.0 ],
	[ 255, 255, 255, 0.0 ],
	[ 255, 255, 255, 0.0 ],
	[ 180,  50,  80, 0.3 ],	/* Sunset				*/
	[  40,   0,  20, 0.5 ],
	[   0,   0,  30, 0.8 ]	/* Just before midnight	*/
];

/*
	Give a time of day between 0 (midnight) and 1 (midnight again) return a
	color that is appropriate.
*/
IdleEngine.prototype.getTimeColor = function getTimeColor(time)
{
	var t = (time * this.timeColors.length) % this.timeColors.length;
	var w = t;

	t = Math.floor(t);
	w -= t;

	/* Find the last exact value */
	var ra	= this.timeColors[t][0];
	var ga	= this.timeColors[t][1];
	var ba	= this.timeColors[t][2];
	var aa	= this.timeColors[t][3];

	/* And the next one */
	t++;
	t = t % this.timeColors.length;
	var rb	= this.timeColors[t][0];
	var gb	= this.timeColors[t][1];
	var bb	= this.timeColors[t][2];
	var ab	= this.timeColors[t][3];

	/* Calculate the difference scaled by the partial number */
	var rd = (rb - ra) * w;
	var gd = (gb - ga) * w;
	var bd = (bb - ba) * w;
	var ad = (ab - aa) * w;

	/* And the final values */
	var r = Math.floor(ra + rd);
	var g = Math.floor(ga + gd);
	var b = Math.floor(ba + bd);
	var a = aa + ad;

	return("rgba(" + r + "," + g + "," + b + "," + a + ")");
};

IdleEngine.prototype.getTimeStr = function getTimeStr(time)
{
	var H = (24 * (time || this.time)) % 24;
	var h = Math.floor(H);
	var m = Math.floor(60 * (H - h));
	var pm = (h >= 12) ? true : false;
	var str = '';

	h = h % 12;

	if (h == 0) {
		str += 12;
	} else {
		str += h;
	}
	str += ':';

	if (m < 10) {
		str += '0';
	}
	str += m;

	if (pm) {
		str += 'pm';
	} else {
		str += 'am';
	}

	if (this.debug) {
		str += ' (' + Math.floor(this.time * 100) + '%)';
	}

	return(str);
};

IdleEngine.prototype.start = function start()
{
	/* Find the center of the map */
	var iso = this.mapToIso(5, 5);

	/* Sanity check to make sure I didn't screw up too horribly */
	for (var y = -3; y <= 3; y++) {
		for (var x = -3; x <= 3; x++) {
			var a = this.mapToIso(x, y);
			var b = this.isoToMap(a[0], a[1]);

			if (x != b[0] || y != b[1]) {
				console.log('OH NO', x, y, '->', a[0], a[1], '->', b[0], b[1]);
			}
		}
	}

	/* Idle is always the first character in the list */
	var idle = new IdleCharacter("idle", iso[0], iso[1] - this.tileSize[1] / 2, this);

	this.characters = [ idle ];

	/* Tell the input class to control Idle */
	this.input.setCharacter(idle);


	this.keys = {};
	this.keys.changed = new Date();

	/* Build a list of images to load */
	var images = [];

	var listimages = function(o) {
		var keys	= Object.keys(o);

		for (var i = 0, k; k = keys[i]; i++) {
			switch (typeof o[k]) {
				case "string":
					if (-1 == images.indexOf(o[k])) {
						images.push(o[k]);
					}
					break;

				case "object":
					listimages(o[k]);
					break;
			}
		}
	};

	listimages(world.tiles);
	console.log('Preloading images:', images);

	this.loadImages(images, function() {
		this.resize();
		this.render();
		this.inputLoop();
	}.bind(this));
};

IdleEngine.prototype.resize = function resize()
{
	/*
		Determine the best scaling to use to fill the display we have as much as
		possible while sticking to an even multiple of our internal screen size.
	*/
	var sw	= Math.floor(window.innerWidth / this.width);
	var sh	= Math.floor(window.innerHeight / this.height);

	if (sw < sh) {
		this.scale = sw;
	} else {
		this.scale = sh;
	}

	if (this.scale < 1) {
		/* Sanity check */
		this.scale = 1;
	}

	this.center = [
		Math.round(window.innerWidth  / 2),
		Math.round(window.innerHeight / 2)
	];
};

window.addEventListener('load', function()
{
	new IdleEngine();
}, false);


