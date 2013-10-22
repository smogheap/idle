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

IdleEngine.prototype.tiles = {
	ground: {
		" ": { name: "grass",	side: "elevation-soil"			},
		"_": { name: "grass",	side: "elevation-soil-fossil1"	},
		"#": { name: "rock",	side: "elevation-rock"			},
		"%": { name: "rock",	side: "elevation-rock-fossil2"	},
		"o": { name: "puddle",	side: "elevation-soil"			},
		"O": { name: "hole",	side: "elevation-soil"			}
	},

	props: {
		"-": { name: "fence-ne"									},
		"|": { name: "fence-nw"									}
	},

	characters: {
		"idle": {
			n:	"idle-stand-north",
			ne:	"idle-stand-northeast",
			e:	"idle-stand-east",
			se:	"idle-stand-southeast",
			s:	"idle-stand-south",
			sw:	"idle-stand-southwest",
			w:	"idle-stand-west",
			nw:	"idle-stand-northwest"
		}
	}
};

IdleEngine.prototype.getMap = function getMap(screen)
{
	return(world[(screen || this.screen).toString()]);
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

IdleEngine.prototype.outlineBoundingBox = function outlineBoundingBox(npc, elevationOffset, color)
{
	this.ctx.save();

	var x = npc.x;
	var y = npc.y;

	if (elevationOffset) {
		y -= elevationOffset;
	}

	x += this.offset[0];
	y += this.offset[1] - 1;

	this.ctx.fillStyle		= color || 'rgba(255, 255, 255, 0.5)';
	this.ctx.beginPath();

	this.ctx.moveTo(x - (npc.bounding[0] / 2), y);
	this.ctx.lineTo(x, y - (npc.bounding[1] / 2));
	this.ctx.lineTo(x + (npc.bounding[0] / 2), y);
	this.ctx.lineTo(x, y + (npc.bounding[1] / 2));
	this.ctx.lineTo(x - (npc.bounding[0] / 2), y);

	this.ctx.fill();
	this.ctx.restore();
};

/* Return a tile based on the ground, elevation & props maps for this screen */
IdleEngine.prototype.getMapTile = function getMapTile(map, x, y)
{
	var tile = {};
	var line;
	var c;
	var t;

	/* Get the ground and side tile from the first map */
	if ((line = map.ground[y]) && (c = line.charAt(x)) && c.length == 1) {
		if ((t = this.tiles.ground[c])) {
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

	/* Is there a prop on this tile? */
	if ((line = map.props[y]) && (c = line.charAt(x)) && c.length == 1) {
		if (c != ' ' && (t = this.tiles.props[c])) {
			if (t.name) {
				tile.prop = this.getImage(t.name);
			}
		}
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
			if (this.tiles.ground[c]) {
				map.ground[y]	= replace(map.ground[y],	x, c);
			} else if (this.tiles.props[c]) {
				map.props[y]	= replace(map.props[y],		x, c);
			}
			break;
	}
};

IdleEngine.prototype.renderMap = function renderMap(map, characters)
{
	/* Ground level is at an elevation of 5 */
	var ground	= 5;

	/*
		Calculate the bottom center position of each character that is on the
		screen and determine which tile the character is on.
	*/
	for (var i = 0, npc; npc = characters[i]; i++) {
		/*
			Calculate the map coords of the character so we know when to render
			him/her.

			The map coords should be calculated from the bottom center of the
			character's bounding box.
		*/
		npc.map = this.isoToMap(npc.x, npc.y + (npc.bounding[1] / 2));
	}

	/* Set some clipping for the game area */
	this.ctx.save();
	this.ctx.beginPath();

	var x = this.offset[0];
	var y = this.offset[1] - this.tileSize[1] / 2;
	var w = map.ground.length / 2;

	this.ctx.moveTo(x, y - 3 - (this.tileSize[1] * 4));
	this.ctx.lineTo(x + (w * this.tileSize[0]) + 3,
					y + (w * this.tileSize[1]) - (this.tileSize[1] * 4));
	this.ctx.lineTo(x + (w * this.tileSize[0]) + 3,
					y + (w * this.tileSize[1]) + (this.tileSize[1] * 1));
	this.ctx.lineTo(x,
					y + (w * 2 * this.tileSize[1]) + 3 + (this.tileSize[1] * 1));
	this.ctx.lineTo(x - (w * this.tileSize[0]) - 3,
					y + (w * this.tileSize[1]) + (this.tileSize[1] * 1));
	this.ctx.lineTo(x - (w * this.tileSize[0]) - 3,
					y + (w * this.tileSize[1]) - (this.tileSize[1] * 4));
	this.ctx.lineTo(x, y - 3 - (this.tileSize[1] * 4));
	this.ctx.clip();

	var tile;

	/*
		Render each row in 2 passes, one for the ground at elevation (and sides)
		and another for the characters and props.
	*/
	for (var row = 0; row < map.ground.length * 4; row++) {
		/* First pass for ground */
		for (var x = 0, y = row; x <= row; y--, x++) {
			if (!(tile = this.getMapTile(map, x, y))) {
				continue;
			}

			/* Calculate isometric coords */
			var iso = this.mapToIso(x, y);

			/* Calculate the elevation offset for this pass */
			var eloff = (tile.elevation - ground) * (this.tileSize[1] / 2);

			if (tile.side) {
				this.ctx.drawImage(tile.side,
					iso[0] + this.offset[0] - (tile.side.width / 2),
					iso[1] + this.offset[1] - (this.tileSize[1] / 2) - eloff);
			}

			this.ctx.drawImage(tile.img,
				iso[0] + this.offset[0] - (tile.img.width / 2),
				iso[1] + this.offset[1] - tile.img.height - eloff);

			if (this.debug) {
				this.outlineTile(false, iso[0], iso[1] - eloff,
						'rgba(0, 0, 0, 0.6)');
			}
		}

		/* 2nd pass for characters and props */
		for (var x = 0, y = row; x <= row; y--, x++) {
			if (!(tile = this.getMapTile(map, x, y))) {
				continue;
			}

			/* Calculate isometric coords */
			var iso = this.mapToIso(x, y);

			/* Calculate the elevation offset for this pass */
			var eloff = (tile.elevation - ground) * (this.tileSize[1] / 2);

			/* Are there any characters standing on this tile? */
			for (var i = 0, npc; npc = characters[i]; i++) {
				if (x == npc.map[0] && y == npc.map[1]) {
					if (this.debug) {
						this.outlineTile(true, iso[0], iso[1] - eloff,
							'rgba(0, 0, 255, 0.3)');
					}

					/*
						Bottom center position of the character's bounding box
					*/
					var l = npc.x - (npc.img.width / 2);
					var t = npc.y - (npc.img.height);

					this.outlineBoundingBox(npc, eloff);
					this.ctx.drawImage(npc.img,
						l + this.offset[0],
						t + this.offset[1] - eloff);
				}
			}

			/* Render any props for this tile */
			if (tile.prop) {
				this.ctx.drawImage(tile.prop,
					iso[0] + this.offset[0] - (tile.prop.width / 2),
					iso[1] + this.offset[1] - tile.prop.height - eloff);
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

IdleEngine.prototype.inputLoop = function inputLoop(time)
{
	/* How many real life seconds should it take for a day to pass in game */
	var SecondsPerDay	= 30;
	var speed			= 2;
	var idle			= this.characters[0];

	/* Request next call for the input loop */
	window.setTimeout(this.inputLoop.bind(this), 33);

	this.time += 1 / (SecondsPerDay * 30);

	if (idle.destination) {
		var diff = [
			idle.destination[0] - idle.x,
			idle.destination[1] - idle.y
		];

		/*
			Limit the movement to the allowed speed

			He should be limited to speed/1 for vertical movement, but it looks
			more natural if he isn't.
		*/
		if (diff[0] > speed) {
			diff[0] = speed;
		} else if (diff[0] < -speed) {
			diff[0] = -speed;
		}

		if (diff[1] > speed) {
			diff[1] = speed;
		} else if (diff[1] < -speed) {
			diff[1] = -speed;
		}

		idle.x += diff[0];
		idle.y += diff[1];

		if (idle.x == idle.destination[0] &&
			idle.y == idle.destination[1]
		) {
			delete idle.destination;
		}
		return;
	}

	/* Move idle based on keyboard input */
	if (this.keys.left || this.keys.right || this.keys.up || this.keys.down) {
		var x	= idle.x;
		var y	= idle.y;

		if (this.keys.left) {
			if (this.keys.up) {
				idle.img = this.getImage('idle-stand-northwest');
			} else if (this.keys.down) {
				idle.img = this.getImage('idle-stand-southwest');
			} else {
				idle.img = this.getImage('idle-stand-west');
			}
		} else if (this.keys.right) {
			if (this.keys.up) {
				idle.img = this.getImage('idle-stand-northeast');
			} else if (this.keys.down) {
				idle.img = this.getImage('idle-stand-southeast');
			} else {
				idle.img = this.getImage('idle-stand-east');
			}
		} else if (this.keys.up) {
			idle.img = this.getImage('idle-stand-north');
		} else if (this.keys.down) {
			idle.img = this.getImage('idle-stand-south');
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

		var to;

		if ((to = this.walkTo(idle, this.getMap(), [ x, y ]))) {
			/* Yup, all good */
			idle.x = to[0];
			idle.y = to[1];
		}
	}
};

IdleEngine.prototype.renderLoop = function renderLoop(time)
{

	/* Request the next animation frame */
	requestAnimationFrame(this.renderLoop.bind(this));
	this.ctx.save();

	this.ctx.fillStyle = 'rgb(0, 0, 0)';
	this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

	this.renderMap(this.getMap(), this.characters);

	this.ctx.font = '20pt Arial';
	this.ctx.fillStyle = 'rgb(255, 255, 255)';
	this.ctx.fillText('idle', 5, 25);

	this.ctx.font = '5pt Arial';
	this.ctx.fillStyle = 'rgb(255, 255, 255)';
	this.ctx.fillText('Press tab to toggle editor',	5, 35);
	this.ctx.fillText('arrows or wasd to move',		5, 45);
	this.ctx.fillText(this.getTimeStr(),			5, 55);

	this.ctx.restore();

	/* Draw a scaled image to our display */
	this.display.ctx.clearRect(0, 0,
			this.display.canvas.width, this.display.canvas.height);
	this.display.ctx.drawImage(this.canvas,
		(this.display.canvas.width / 2) - ((this.width * this.scale) / 2),
		(this.display.canvas.height / 2) - ((this.height * this.scale) / 2),
		this.width * this.scale, this.height * this.scale);
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

/*
	Based on a characters coords (iso, not map) determine if the character is
	allowed to move from one spot to another.

	If allowed then return the coordinates that the character ends up on.
*/
IdleEngine.prototype.walkTo = function walkTo(npc, map, to)
{
	/* Where is the character coming from? */
	var fromM		= this.isoToMap(npc.x, npc.y);
	var fromT		= this.getMapTile(map, fromM[0], fromM[1]);
	var newscreen	= null;

	/*
		Check each corner of the character's bounding box. The box should be
		small enough to let the character through a 1 tile gap.
	*/
	var tolist = [
		[ to[0] - (npc.bounding[0] / 2), to[1] ],
		[ to[0] + (npc.bounding[0] / 2), to[1] ],
		[ to[0], to[1] - (npc.bounding[1] / 2) ],
		[ to[0], to[1] + (npc.bounding[1] / 2) ],
		[ to[0], to[1] ]
	];

	for (var i = 0, t; t = tolist[i]; i++) {
		var toM = this.isoToMap(t[0], t[1]);
		var toT = this.getMapTile(map, toM[0], toM[1]);

		/* Only the last check can actually change the screen */
		newscreen = null;

		if (!toT) {
			// TODO	Determine which map he should be walking to.
			newscreen	= [ 0, 1 ];

			map = this.getMap(newscreen.toString());

			if (!map && this.debug) {
				// TODO	Create a new map
			}

			if (map) {
				while (toM[1] < 0) {
					toM[1] += map.ground.length;
				}
				toM[1] %= map.ground.length;

				while (toM[0] < 0) {
					toM[0] += map.ground[toM[1]].length;
				}
				toM[0] %= map.ground[toM[1]].length;

				toT = this.getMapTile(map, toM[0], toM[1]);
			}

			if (!toT) {
				return(null);
			}
		}

		if (!this.debug) {
			if (fromT) {
				if (toT.elevation - fromT.elevation > 1) {
					/* He can't climb something that steep */
					return(null);
				}

				if (fromT.elevation - toT.elevation > 2) {
					/* We wouldn't want him to hurt himself */
					return(null);
				}

				if (toT.prop) {
					/* He shouldn't walk into things, that would hurt */
					return(null);
				}
			}
		}

		if (newscreen) {
			this.screen = newscreen;

			/* Move him to the center of the correct tile on the new screen */
			to = this.mapToIso(toM[0], toM[1]);
			to[1] -= this.tileSize[1] / 2;
		} else if (toT.elevation != fromT.elevation) {
			/*
				Make him move to the center of the tile to avoid standing too
				close to the edge after passing from one tile to another.
			*/
			npc.destination = this.mapToIso(toM[0], toM[1]);
			npc.destination[1] -= this.tileSize[1] / 2;
		}
	}

	return(to);
};

IdleEngine.prototype.start = function start()
{
	/* Find the center of the map */
	var iso = this.mapToIso(5, 5);

	this.characters = [{
		name:		"idle",
		x:			iso[0],
		y:			iso[1] - this.tileSize[1] / 2,

		img:		this.getImage('idle-stand-east'),

		/* The size of the character's bounding box in isometric space */
		bounding:	[ 16, 8 ]
	}];

	this.keys = {};

	/* Build a list of images to load */
	var images = [];

	var listimages = function(o) {
		var keys	= Object.keys(o);

		for (var i = 0, k; k = keys[i]; i++) {
			if (typeof o[k] === "string") {
				if (-1 == images.indexOf(o[k])) {
					images.push(o[k]);
				}
			} else {
				listimages(o[k]);
			}
		}
	};

	listimages(this.tiles);
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

window.addEventListener('resize', function()
{
	var c = document.getElementById('game');

	c.engine.resize();
}, false);

window.addEventListener('keydown', function(event)
{
	var c = document.getElementById('game');

	switch (event.keyCode) {
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
		case 9:
			if (c.engine.debug) {
				console.log(JSON.stringify(c.engine.getMap(), null, "\t"));
			}

			c.engine.debug = !c.engine.debug;
			break;

		default:	return;
	}

	event.preventDefault();
}, false);

window.addEventListener('keyup', function(event)
{
	var c = document.getElementById('game');

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
			var m = e.isoToMap(e.characters[0].x, e.characters[0].y);

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

