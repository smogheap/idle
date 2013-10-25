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

function IdleEngine(canvas)
{
	canvas.engine			= this;

	this.debug				= false;

	/* Setup our internal canvas */
	this.width				= 320;
	this.height				= 240;

	this.canvas				= document.createElement('canvas');
	this.canvas.setAttribute('width',		this.width);
	this.canvas.setAttribute('height',		this.height);

	this.ctx				= this.canvas.getContext('2d');

	/* Keep track of our display canvas */
	this.display = {
		canvas:				canvas,
		ctx:				canvas.getContext('2d')
	};

	/* Keep an extra canvas for modifying images... */
	this.work = {
		canvas:				document.createElement('canvas')
	};
	this.work.ctx			= this.work.canvas.getContext('2d');
	this.work.canvas.setAttribute('width',		48);
	this.work.canvas.setAttribute('height',		48);

	/*
		Scale the image based on the size of our display canvas, this will be
		updated in the resize function.
	*/
	this.scale				= 2;

	/* The screen we start on */
	this.screen				= [ 0, 0 ];

	this.imgcache			= {};

	this.tileSize			= [ 32, 16 ];

	/* Offset for rendering in the middle of the screen */
	this.offset				= [ this.width / 2, 55 ];

	this.seed				= WRand.getSeed(NaN);

	/* Start at noon */
	this.time				= 0.5;

	this.start();
}

IdleEngine.prototype.getMap = function getMap(screen)
{
	var map;
	var keys	= [ "ground", "elevation", "props" ];

	if ((map = world[(screen || this.screen).toString()])) {
		return(map);
	}

	if (this.debug) {
		map = { };

		for (var c = 0, k; k = keys[c]; c++) {
			map[k] = [];

			for (var i = 0; i < 11; i++) {
				map[k].push("           ");
			}
		}
	}

	world[(screen || this.screen).toString()] = map;
	return(map);
};

IdleEngine.prototype.getImage = function getImage(name, type)
{
	type = type || 'images';

	if (!this.imgcache[name]) {
		this.imgcache[name] = new Image();
		this.imgcache[name].src = type + '/' + name + '.png';
	}

	return(this.imgcache[name]);
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

IdleEngine.prototype.outlineTile = function outlineTile(full, x, y, color, ctx)
{
	ctx = ctx || this.ctx;

	ctx.save();

	x += this.offset[0];
	y += this.offset[1] - 1;

	if (full) {
		ctx.fillStyle		= color || 'rgba(255, 255, 255, 0.5)';
	} else {
		ctx.strokeStyle	= color || 'rgba(255, 255, 255, 1.0)';
	}
	ctx.beginPath();

	ctx.moveTo(x, y);
	ctx.lineTo(x - (this.tileSize[0] / 2), y - (this.tileSize[1] / 2));
	ctx.lineTo(x, y - this.tileSize[1]);
	ctx.lineTo(x + (this.tileSize[0] / 2), y - (this.tileSize[1] / 2));
	ctx.lineTo(x, y);

	if (full) {
		ctx.fill();
	} else {
		ctx.stroke();
	}

	ctx.restore();
};

/* Return a tile based on the ground, elevation & props maps for this screen */
IdleEngine.prototype.getMapTile = function getMapTile(map, x, y, tileDefinition)
{
	var tile	= {};
	var t		= null;
	var line;
	var c;

	/* Get the ground and side tile from the first map */
	if ((line = map.ground[y]) && (c = line.charAt(x)) && c.length == 1) {
		if (!(t = tileDefinition)) {
			t = world.tiles.ground[c];
		}

		if (t) {
			tile.solid = t.solid;

			if (t.name) {
				tile.img = this.getImage(t.name);
			}

			if (t.side) {
				tile.side = this.getImage(t.side);
			}
		}
	}

	if (!tile.img) {
		/* A tile requires at least a ground tile */
		return(null);
	}

	/* Get the elevation */
	if (tile.side && (line = map.elevation[y]) && (c = line.charAt(x)) && c.length == 1) {
		tile.elevation = parseInt(c, 16);
	}

	if (isNaN(tile.elevation)) {
		/* default to ground level */
		tile.elevation = 5;
	}

	if (t && t.height) {
		tile.elevation += t.height;
	}

	/* Is there a prop on this tile? */
	if ((line = map.props[y]) && (c = line.charAt(x)) && c.length == 1) {
		if (c != ' ' && (t = world.tiles.props[c])) {
			if (t.name) {
				tile.prop = this.getImage(t.name);
			}
		}
	}

	if (t && t.exterior) {
		tile.exterior = this.getMapTile(map, x, y, t.exterior);
	}

	return(tile);
};

IdleEngine.prototype.setMapTile = function setMapTile(map, x, y, c)
{
	var d = 1;

	if (y < 0 || y >= map.length || x < 0 || x >= map.ground[y].length) {
		return;
	}

	var replace = function(old, x, c) {
		return(old.substr(0, x) + c + old.substr(x + 1));
	};

	switch (c) {
		case ' ':
			/* Reset the tile in all 3 maps */
			map.ground[y]		= replace(map.ground[y],	x, ' ');
			map.props[y]		= replace(map.props[y],		x, ' ');
			map.elevation[y]	= replace(map.elevation[y], x, ' ');
			break;

		case '-':
			d = -1;
			// fallthrough

		case '+': case '=':
			/* Adjust the elevation */
			var e = parseInt(map.elevation[y].charAt(x), 16);

			if (isNaN(e)) {
				e = 5;
			}

			e += d;

			if (e < 0 || e > 0xf) {
				return;
			}

			map.elevation[y]	= replace(map.elevation[y], x, e.toString(16));
			break;

		default:
			if (world.tiles.ground[c]) {
				map.ground[y]	= replace(map.ground[y],	x, c);
			} else if (world.tiles.props[c]) {
				map.props[y]	= replace(map.props[y],		x, c);
			}
			break;
	}
};

/*
	Darken an image.

	This uses the same work canvas each time, so using it will overwrite
	whatever image was written to it last.
*/
IdleEngine.prototype.darkenImage = function darkenImage(img, darkness)
{
	if (darkness == 0) {
		return(img);
	}

	this.work.ctx.save();

	this.work.canvas.setAttribute('width',		img.width);
	this.work.canvas.setAttribute('height',		img.height);

	this.work.ctx.drawImage(img, 0, 0);
	this.work.ctx.globalCompositeOperation = 'source-atop';
	this.work.ctx.fillStyle = 'rgba(0, 0, 0, ' + darkness + ')';

	this.work.ctx.fillRect(0, 0,
		this.work.canvas.width, this.work.canvas.height);

	return(this.work.canvas);
};

/*
	Render a tile at the specified iso coordinates.

	If an elevation is specified then only render the portion of the tile that
	is relevant for that elevation.
*/
IdleEngine.prototype.renderTile = function renderTile(tile, iso, ctx, elevation)
{
	/* Ground level is at an elevation of 5 */
	var ground	= 5;
	var inside	= false;
	var img;

	if (isNaN(tile.elevation)) {
		tile.elevation = ground;
	}

	if (!isNaN(elevation)) {
		if (tile.exterior) {
			if (tile.exterior.elevation == elevation) {
				if (this.inside) {
					inside = true;
				}

				tile = tile.exterior;
			}
		}

		if (tile.elevation != elevation) {
			/* We don't have anything to render here */
			return;
		}
	}

	/* Calculate the elevation offset for this pass */
	var eloff = (tile.elevation - ground) * (this.tileSize[1] / 2);

	if (tile.side) {
		if (typeof tile.side === "string") {
			img = this.getImage(tile.side);
		} else {
			img = tile.side;
		}

		if (this.inside && !tile.exterior) {
			/*
				Tiles that only have an exterior should be drawn darker when
				Idle is indoors.
			*/
			img = this.darkenImage(img, 0.6);
		}

		ctx.drawImage(img,
			iso[0] + this.offset[0] - (img.width / 2),
			iso[1] + this.offset[1] - (this.tileSize[1] / 2) - eloff);

		ctx.globalAlpha = 1.0;
	}

	if (inside) {
		// TODO	It might be nice to fade the roofs in and out using globalAlpha?

		/* Don't draw the roof when inside */
		return;
	}

	if (tile.img) {
		img = tile.img;
	} else {
		img = this.getImage(tile.name);
	}

	if (this.inside && !tile.exterior) {
		/*
			Tiles that only have an exterior should be drawn darker when Idle is
			indoors.
		*/
		img = this.darkenImage(img, 0.6);
	}

	ctx.drawImage(img,
		iso[0] + this.offset[0] - (img.width / 2),
		iso[1] + this.offset[1] - img.height - eloff);

	if (this.inside && !tile.exterior) {
		this.work.ctx.clearRect(0, 0,
			this.work.canvas.width, this.work.canvas.height);
		this.work.ctx.restore();
	}

	if (this.debug) {
		this.outlineTile(false, iso[0], iso[1] - eloff,
				'rgba(0, 0, 0, 0.6)', ctx);
	}
};

IdleEngine.prototype.renderMap = function renderMap(map, characters, ctx)
{
	// TODO	Allow changing the base ground level on a per screen basis
	/* Ground level is at an elevation of 5 */
	var ground	= 5;

	ctx = ctx || this.ctx;

	/* Set some clipping for the game area */
	ctx.save();
	ctx.beginPath();

	var x = this.offset[0];
	var y = this.offset[1] - this.tileSize[1] / 2;
	var w = map.ground.length / 2;

	ctx.moveTo(x, y - 3 - (this.tileSize[1] * 4));
	ctx.lineTo(x + (w * this.tileSize[0]) + 3, 0);
	ctx.lineTo(x + (w * this.tileSize[0]) + 3,
					y + (w * this.tileSize[1]) + (this.tileSize[1] * 1));
	ctx.lineTo(x,
					y + (w * 2 * this.tileSize[1]) + 3 + (this.tileSize[1] * 1));
	ctx.lineTo(x - (w * this.tileSize[0]) - 3,
					y + (w * this.tileSize[1]) + (this.tileSize[1] * 1));
	ctx.lineTo(x - (w * this.tileSize[0]) - 3, 0);
	ctx.lineTo(x, y - 3 - (this.tileSize[1] * 4));

	ctx.clip();

	var tile;

	/*
		If Idle is standing on a tile that has an interior and an exterior then
		render all exterior tiles transparently.
	*/
	this.inside = false;
	if (characters.length >= 1) {
		var m = characters[0].getMapCoords();

		if ((tile = this.getMapTile(map, m[0], m[1])) && tile.exterior) {
			this.inside = true;
		}
	}


	/*
		Render each row from lowest elevation to highest elevation.

		For each elevation render the ground (and walls) first, then a second
		pass for characters and props.

		This ensures that a character or prop will be above the ground, but
		behind anything that is at a higher elevation.
	*/
	for (var row = 0; row < map.ground.length * 4; row++) {
		var elmax	= 0x0;
		var elmin	= 0xf;

		/* First pass to determine the highest and lowest points of the row */
		for (var x = 0, y = row; x <= row; y--, x++) {
			if (!(tile = this.getMapTile(map, x, y))) {
				continue;
			}

			if (tile.exterior && !isNaN(tile.exterior.elevation)) {
				elmax = Math.max(elmax, tile.exterior.elevation);
			}

			elmax = Math.max(elmax, tile.elevation);
			elmin = Math.min(elmin, tile.elevation);
		}

		for (var el = elmin; el <= elmax; el++) {
			/* Render the ground and walls */
			for (var x = 0, y = row; x <= row; y--, x++) {
				if (!(tile = this.getMapTile(map, x, y))) {
					continue;
				}

				/* Calculate isometric coords */
				var iso = this.mapToIso(x, y);

				this.renderTile(tile, iso, ctx, el);
			}

			/* Render characters and props */
			for (var x = 0, y = row; x <= row; y--, x++) {
				if (!(tile = this.getMapTile(map, x, y)) || tile.elevation != el) {
					continue;
				}

				/* Calculate isometric coords */
				var iso = this.mapToIso(x, y);

				/* Calculate the elevation offset for this pass */
				var eloff = (tile.elevation - ground) * (this.tileSize[1] / 2);

				/* Are there any characters standing on this tile? */
				for (var i = 0, npc; npc = characters[i]; i++) {
					var m = npc.getMapCoords();

					if (x == m[0] && y == m[1]) {
						if (this.debug) {
							this.outlineTile(true, iso[0], iso[1] - eloff,
								'rgba(0, 0, 255, 0.3)', ctx);
						}

						npc.draw(ctx, eloff);
					}
				}

				/* Render any props for this tile */
				if (tile.prop) {
					ctx.drawImage(tile.prop,
						iso[0] + this.offset[0] - (tile.prop.width / 2),
						iso[1] + this.offset[1] - tile.prop.height - eloff);
				}
			}
		}
	}

	ctx.restore();
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

	if (this.mouseupdate) {
		this.mouseupdate();
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

IdleEngine.prototype.renderLoop = function renderLoop(time)
{
	var ctx;
	var canvas;

	/* Request the next animation frame */
	requestAnimationFrame(this.renderLoop.bind(this));

	this.display.ctx.clearRect(0, 0,
			this.display.canvas.width, this.display.canvas.height);

	if (!this.debug) {
		/* Normal Mode */
		ctx		= this.ctx;
		canvas	= this.canvas;

		ctx.save();

		ctx.fillStyle = 'rgb(0, 0, 0)';
		ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

		this.renderMap(this.getMap(), this.characters, ctx);

		ctx.font = '20pt Arial';
		ctx.fillStyle = 'rgb(255, 255, 255)';
		ctx.fillText('idle', 5, 25);

		ctx.font = '5pt Arial';
		ctx.fillStyle = 'rgb(255, 255, 255)';
		ctx.fillText('Press tab to toggle editor',	5, 35);
		ctx.fillText('arrows to move',				5, 45);
		ctx.fillText(this.getTimeStr(),				5, 55);

		ctx.restore();

		/* Draw a scaled image to our display */
		this.display.ctx.drawImage(this.canvas,
			Math.floor((this.display.canvas.width  / 2) - ((this.width * this.scale)  / 2)),
			Math.floor((this.display.canvas.height / 2) - ((this.height * this.scale) / 2)),
			this.width * this.scale, this.height * this.scale);
	} else {
		/* Editor Mode: Render the current screen and all bordering screens */
		var offset	= this.offset.slice(0);
		var scale	= this.scale;
		var w		= this.tileSize[0] * 11;
		var h		= this.tileSize[1] * 11;

		ctx		= this.display.ctx;
		canvas	= this.display.canvas;

		for (var x = -1; x <= 1; x++) {
			for (var y = 1; y >= -1; y--) {
				var map;

				this.offset = [
					Math.floor(this.display.canvas.width  / 2),
					h
				];

				/* Adjust the rendering offset */
				this.offset[0] -= (-x - y) * (w / 2);
				this.offset[1] -= (-x + y) * (h / 2);

				if ((map = this.getMap([ this.screen[0] + x, this.screen[1] + y ]))) {
					/* Only render the center map with a grid, etc */
					if (x != 0 || y != 0) {
						this.debug = false;
					}

					this.renderMap(map,
						(x == 0 && y == 0) ? this.characters : [],
						this.display.ctx);

					this.debug = true;
				}
			}
		}

		/* Render an editor legend */
		var x			= 15;
		var types		= [ "ground", "props" ];

		ctx.save();

		ctx.font = '15pt Arial';
		ctx.fillStyle = 'rgb(255, 255, 255)';

		this.offset = [ 0, 0 ];
		for (var t = 0, type; type = types[t]; t++) {
			var keys	= Object.keys(world.tiles[type]);

			for (var k = 0, key; key = keys[k]; k++) {
				var tile = world.tiles[type][key];
				var img;

				ctx.fillText(key, x - 5, canvas.height - 65);

				this.renderTile(tile, [ x, canvas.height - 40 ], ctx);

				x += 46;
			}
		}

		ctx.fillText("+- Adjust Height", x, canvas.height - 15);

		ctx.restore();

		/* Restore the original render options */
		this.offset	= offset;
		this.scale	= scale;
	}

	/*
		Draw over everything as a rather weak way of changing the time of day.
		It isn't elegant, but it works reasonably well.
	*/
	this.display.ctx.save();

	this.display.ctx.fillStyle = this.getTimeColor(this.time);
	this.display.ctx.fillRect(0, 0, this.display.canvas.width, this.display.canvas.height);

	this.display.ctx.restore();
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
	this.characters = [
		new IdleCharacter("idle", iso[0], iso[1] - this.tileSize[1] / 2, this)
	];

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
		this.renderLoop();
		this.inputLoop();
	}.bind(this));
};

IdleEngine.prototype.resize = function resize()
{
	this.display.canvas.width	= window.innerWidth;
	this.display.canvas.height	= window.innerHeight;

	/* We want to look old school */
	this.display.ctx.imageSmoothingEnabled			= false;
	this.display.ctx.mozImageSmoothingEnabled		= false;
	this.display.ctx.webkitImageSmoothingEnabled	= false;

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
};

window.addEventListener('load', function()
{
	var c		= document.getElementById('game');
	var engine	= new IdleEngine(c);
}, false);


