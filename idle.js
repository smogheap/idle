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
	this.debug				= false;
	this.canvas				= canvas;
	this.ctx				= canvas.getContext('2d');

	this.imgcache			= {};

	this.tileSize			= [ 32, 16 ];

	/* Offset for rendering in the middle of the screen */
	this.offset				= [ 350, 50 ];

	this.canvas.engine		= this;

	this.seed				= WRand.getSeed(NaN);

	/* Start at noon */
	this.time				= 0.5;
}

IdleEngine.prototype.tiles = {
	" ": { name: "grass"													},
	"%": { name: "rock"														},
	"'": { name: "rock",		elevation: 0.5, elname: "elevation-rock"	},
	"#": { name: "rock",		elevation: 1.0, elname: "elevation-rock"	},
	".": { name: "rock",		elevation: 0.5, elname: "elevation-rock"	},
	"_": { name: "grass",		elevation: 1.0, elname: "elevation-soil"	},
	"=": { name: "rock",		elevation: 2.0, elname: "elevation-rock"	},
	":": { name: "grass",		elevation: 1.5, elname: "elevation-soil"	},
	"o": { name: "puddle"													},
	"O": { name: "hole"														},
	"-": { name: "fence-ne",	solid: true									},
	"|": { name: "fence-nw",	solid: true									}
};

IdleEngine.prototype.world = {
	"map": [
		"=======_=           ",
		"_==::      |-----|  ",
		"  __.      |     |  ",
		"  .        |  O  |  ",
		"           |  oo |  ",
		"  =        |     |  ",
		"  =        |     |# ",
		"      o     -----   ",
		"               '''%%",
		"              ##    ",
		"          o '''     ",
		"             %      ",
		"            %%      ",
		"           %%       ",
		"%%      o  %        ",
		"  %%%%%%% %         ",
		"-------------|      ",
		"             |      ",
		"   OOO       |      ",
		"             |      "
	]
};

IdleEngine.prototype.getImage = function getImage(name, type)
{
	type = type || 'tiles';

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

	var tx = (x / w + (y / h)) / 2;
	var ty = (y / h - (x / w)) / 2;

	return([ Math.round(tx), Math.round(ty) ]);
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

	/* Isometric position should be centered */
	ty += h;

	return([ Math.round(tx), Math.round(ty) ]);
};

IdleEngine.prototype.outlineTile = function outlineTile(full, x, y, color)
{
	this.ctx.save();

	x += this.offset[0];
	y += this.offset[1] - 1;

	if (full) {
		this.ctx.fillStyle		= color || 'rgba(255, 255, 255, 0.5)';
	} else {
		this.ctx.strokeStyle	= color || 'rgba(255, 255, 255, 1.0)';
	}
	this.ctx.beginPath();

	if (full) {
		this.ctx.moveTo(x, y);
		this.ctx.lineTo(x - (this.tileSize[0] / 2), y - (this.tileSize[1] / 2));
		this.ctx.lineTo(x, y - this.tileSize[1]);
	} else {
		this.ctx.moveTo(x, y - this.tileSize[1]);
	}
	this.ctx.lineTo(x + (this.tileSize[0] / 2), y - (this.tileSize[1] / 2));
	this.ctx.lineTo(x, y);

	if (full) {
		this.ctx.fill();
	} else {
		this.ctx.stroke();
	}

	this.ctx.restore();
};

IdleEngine.prototype.getMapTile = function getMapTile(map, x, y)
{
	if (y < 0 || y >= map.length || x < 0 || x >= map[y].length) {
		return(null);
	}

	var c = map[y].charAt(x);
	var t = this.tiles[c];

	/* Main image */
	if (t.name && !t.img) {
		t.img = this.getImage(t.name);
	}

	/* Elevation image */
	if (t.elname && !t.elimg) {
		t.elimg = this.getImage(t.elname);
	}

	return(t);
};

IdleEngine.prototype.setMapTile = function setMapTile(map, x, y, c)
{
	if (y < 0 || y >= map.length || x < 0 || x >= map[y].length) {
		return;
	}

	var old = map[y];

	map[y] = old.substr(0, x) + c + old.substr(x + 1);
};

IdleEngine.prototype.render = function render(map, characters)
{
	var l		= 0;	/* Left	*/
	var t		= 0;	/* Top	*/

	/*
		Calculate the bottom center position of each character that is on the
		screen and determine which tile the character is on.
	*/
	for (var i = 0, npc; npc = characters[i]; i++) {
		/*
			Calculate the isometric coords of the character since the screen is
			rendered that way.
		*/
		npc.mcoords = this.isoToMap(npc.x, npc.y);
	}

	/* Set some clipping for the game area */
	this.ctx.save();
	this.ctx.beginPath();

	var x = this.offset[0];
	var y = this.offset[1] - this.tileSize[1] / 2;

	this.ctx.moveTo(x, y - 3 - (this.tileSize[1] * 4));
	this.ctx.lineTo(x + (10 * this.tileSize[0]) + 3,
					y + (10 * this.tileSize[1]) - (this.tileSize[1] * 4));
	this.ctx.lineTo(x + (10 * this.tileSize[0]) + 3,
					y + (10 * this.tileSize[1]) - 1);
	this.ctx.lineTo(x,
					y + (20 * this.tileSize[1]) + 3 - 2);
	this.ctx.lineTo(x - (10 * this.tileSize[0]) - 3,
					y + (10 * this.tileSize[1]) - 1);
	this.ctx.lineTo(x - (10 * this.tileSize[0]) - 3,
					y + (10 * this.tileSize[1]) - (this.tileSize[1] * 4));
	this.ctx.lineTo(x, y - 3 - (this.tileSize[1] * 4));
	this.ctx.clip();


	for (var row = 0; row < map.length * 4; row++) {
		for (var x = 0, y = row; x <= row; y--, x++) {
			var tile = this.getMapTile(map, x, y);

			if (!tile) {
				continue;
			}

			/* Calculate isometric coords */
			var iso = this.mapToIso(x, y);

			if (tile.elevation > 0) {
				// TODO	Draw the elevation image
				this.ctx.drawImage(tile.elimg,
					iso[0] + this.offset[0] - (tile.elimg.width / 2),
					iso[1] + this.offset[1] - (this.tileSize[1] / 2) -
						(tile.elevation * this.tileSize[1]));
			}

			this.ctx.drawImage(tile.img,
				iso[0] + this.offset[0] - (tile.img.width / 2),
				iso[1] + this.offset[1] - tile.img.height -
						(tile.elevation * this.tileSize[1]));

			if (this.debug) {
				this.outlineTile(false, iso[0],
					iso[1] - (tile.elevation * this.tileSize[1]),
					'rgba(0, 0, 0, 0.6)');
			}
		}

		/* Render any characters standing on this row */
		for (var x = 0, y = row; x <= row; y--, x++) {
			var tile = this.getMapTile(map, x, y);

			if (!tile) {
				continue;
			}

			/* Are there any characters standing on this tile? */
			for (var i = 0, npc; npc = characters[i]; i++) {
				if (x == npc.mcoords[0] && y == npc.mcoords[1]) {
					/* Remember the last tile the character was on */
					npc.tile = tile;

					if (this.debug) {
						var iso = this.mapToIso(x, y);

						this.outlineTile(true, iso[0],
							iso[1] - (tile.elevation * this.tileSize[1]),
							'rgba(255, 0, 0, 0.5)');
					}

					/* Bottom center position of the character */
					var l = npc.x - (npc.img.width / 2);
					var t = npc.y - (npc.img.height);

					/* Offset the character by 4 pixels */
					this.ctx.drawImage(npc.img,
						l + this.offset[0],
						t + this.offset[1] - 4 -
								(tile.elevation * this.tileSize[1]));
				}
			}
		}
	}

	/*
		Draw over everything as a rather weak way of changing the time of day.
		It isn't elegant, but it works reasonably well.

		This mask assumes a 20x20 screen.
	*/
	this.ctx.fillStyle = this.getTimeColor(this.time);
	this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

	this.ctx.restore();
};

IdleEngine.prototype.timeColors = [
	[   0,   0,  20, 0.8 ],	/* Just after midnight	*/
	[   0,   0,  20, 0.8 ],
	[   0,   0,  20, 0.8 ],
	[  20,   0,  10, 0.8 ],
	[  80,   0,   0, 0.5 ],	/* Morning				*/
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
	var H = 24 * this.time;
	var h = Math.floor(H);
	var m = Math.floor(60 * (H - h));
	var pm = (h >= 12) ? true : false;

	h = h % 12;

	var str = '';

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

/*
	Based on a characters coords (iso, not map) determine if the character is
	allowed to move from one spot to another.
*/
IdleEngine.prototype.canWalk = function canWalk(map, to, from)
{
	var		waist	= 4;

	if (this.debug) {
		return(true);
	}

	/* Adjust for the offset that the character is rendered at */
	to[1] -= 4;
	from[1] -= 4;

	/*
		Build a list of coordinates to check

		Idle is not just a single pixel... Make sure there is room for him.

		Only check in the direction we are heading though, so we aren't blocked
		because of something behind him.
	*/
	var m = [];

	m.push(this.isoToMap(from[0], from[1]));
	m.push(this.isoToMap(to[0], to[1]));

	if (to[1] < from[1]) {
		m.push(this.isoToMap(to[0] - waist, to[1] - waist));
		m.push(this.isoToMap(to[0] + waist, to[1] - waist));
	}

	if (to[1] > from[1]) {
		m.push(this.isoToMap(to[0] - waist, to[1] + waist));
		m.push(this.isoToMap(to[0] + waist, to[1] + waist));
	}

	if (to[0] < from[0]) {
		m.push(this.isoToMap(to[0] - waist, to[1] - waist));
		m.push(this.isoToMap(to[0] - waist, to[1] + waist));
	}

	if (to[0] > from[0]) {
		m.push(this.isoToMap(to[0] + waist, to[1] - waist));
		m.push(this.isoToMap(to[0] + waist, to[1] + waist));
	}


	var tiles = [];
	for (var i = 0, tmp; tmp = m[i]; i++) {
		tiles.push(this.getMapTile(map, tmp[0], tmp[1]));
	}

	var w = tiles[0];
	for (var i = 1, t; t = tiles[i]; i++) {
		if (!t) continue;

		if (t.solid) {
			return(false);
		}

		if (w) {
			if (t.elevation - w.elevation > 0.5) {
				/* He can't climb that high */
				return(false);
			}

			if (w.elevation - t.elevation > 1.0) {
				/*
					If we let him fall from that height then we'll have to
					implement a health meter, and let him die!.
				*/
				// TODO	Implement a health meter and let him die
				return(false);
			}
		}
	}

	return(true);
};

IdleEngine.prototype.start = function start()
{
	var speed			= 2;
	var fps				= 30;

	/* How many real life seconds should it take for a day to pass in game */
	// var SecondsPerDay	= 120;
	var SecondsPerDay	= 30;

	this.characters = [{
		name:		"idle",
		x:			25,
		y:			150,

		img:		this.getImage('idle-stand-east', 'characters')
	}];

	this.keys = {};

	/* Build a list of tiles to load */
	var tiles = [];
	for (var i = 0, k; k = Object.keys(this.tiles)[i]; i++) {
		var t = this.tiles[k];

		if (isNaN(t.elevation)) {
			t.elevation = 0;
		}

		/* Normal tile image */
		if (t.name && -1 == tiles.indexOf(t.name)) {
			tiles.push(t.name);
		}

		/* Elevation image */
		if (t.elname && -1 == tiles.indexOf(t.elname)) {
			tiles.push(t.elname);
		}
	}

	this.loadImages(tiles, function() {
		this.resize();
		setInterval(function() {
			this.time += 1 / (SecondsPerDay * fps);

			this.ctx.save();

			this.ctx.fillStyle = 'rgb(0, 0, 0)';
			this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

			/* Move idle based on keyboard input */
			if (this.keys.left || this.keys.right || this.keys.up || this.keys.down) {
				var x	= this.characters[0].x;
				var y	= this.characters[0].y;

				if (this.keys.left) {
					if (this.keys.up) {
						this.characters[0].img = this.getImage('idle-stand-northwest', 'characters');
					} else if (this.keys.down) {
						this.characters[0].img = this.getImage('idle-stand-southwest', 'characters');
					} else {
						this.characters[0].img = this.getImage('idle-stand-west', 'characters');
					}
				} else if (this.keys.right) {
					if (this.keys.up) {
						this.characters[0].img = this.getImage('idle-stand-northeast', 'characters');
					} else if (this.keys.down) {
						this.characters[0].img = this.getImage('idle-stand-southeast', 'characters');
					} else {
						this.characters[0].img = this.getImage('idle-stand-east', 'characters');
					}
				} else if (this.keys.up) {
					this.characters[0].img = this.getImage('idle-stand-north', 'characters');
				} else if (this.keys.down) {
					this.characters[0].img = this.getImage('idle-stand-south', 'characters');
				}

				if (this.keys.left) {
					x -= speed;
				}
				if (this.keys.right) {
					x += speed;
				}

				/* Vertical speed is half horizontal due to the isometric display */
				if (this.keys.up) {
					y -= speed / 2;
				}
				if (this.keys.down) {
					y += speed / 2;
				}

				if (this.canWalk(this.world.map, [ x, y ],
						[ this.characters[0].x, this.characters[0].y ])
				) {
					/* Yup, all good */
					this.characters[0].x = x;
					this.characters[0].y = y;
				}
			}

			this.render(this.world.map, this.characters);

			this.ctx.font = '20pt Arial';
			this.ctx.fillStyle = 'rgb(255, 255, 255)';
			this.ctx.fillText('idle', 10, 30);

			this.ctx.font = '10pt Arial';
			this.ctx.fillStyle = 'rgb(255, 255, 255)';
			this.ctx.fillText('Press tab to toggle grid', 10, 50);
			this.ctx.fillText('arrows or wasd to move', 10, 70);
			this.ctx.fillText(this.getTimeStr(), 620, 50);

			this.ctx.restore();
		}.bind(this), 1000 / fps);
	}.bind(this));
};

IdleEngine.prototype.resize = function resize()
{
	this.canvas.width	= window.innerWidth;
	this.canvas.height	= window.innerHeight;
};

window.addEventListener('load', function()
{
	var c		= document.getElementById('game');
	var engine	= new IdleEngine(c);

	engine.start();
}, false);

window.addEventListener('resize', function()
{
	var c = document.getElementById('game');

	c.engine.resize();
}, false);

window.addEventListener('keydown', function(e)
{
	var c = document.getElementById('game');

	switch (e.keyCode) {
		case 65:	// a, h or left
		case 72:
		case 37:	c.engine.keys.left	= true; break;

		case 87:	// w, k or up
		case 75:
		case 38:	c.engine.keys.up	= true; break;

		case 68:	// d, l or right
		case 76:
		case 39:	c.engine.keys.right	= true; break;

		case 83:	// s, j or down
		case 74:
		case 40:	c.engine.keys.down	= true; break;

		/* Tab to toggle debug */
		case 9:		c.engine.debug = !c.engine.debug; break;

		default:	return;
	}

	e.preventDefault();
}, false);

window.addEventListener('keyup', function(e)
{
	var c = document.getElementById('game');

	switch (e.keyCode) {
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

	e.preventDefault();
}, false);

window.addEventListener('keypress', function(event)
{
	var c = document.getElementById('game');
	var e = c.engine;
	var s;

	if (e.debug) {
		try {
			s = String.fromCharCode(event.which).trim();
		} catch (e) {
			return;
		}

		/* Get the tile the character is standing on */
		var t	= e.tiles[s];

		if (s) {
			var m = e.isoToMap(e.characters[0].x, e.characters[0].y);

			e.setMapTile(e.world.map, m[0], m[1], s);
		}
	}
}, false);


