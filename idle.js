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
	this.canvas				= canvas;
	this.ctx				= canvas.getContext('2d');

	this.tiles				= {};

	this.tileSize			= [ 32, 16 ];

	/* Offset for rendering in the middle of the screen */
	this.offset				= [ 300, 50 ];

	this.canvas.engine		= this;

	this.seed				= WRand.getSeed(NaN);
	this.time				= this.seed;
}

// TODO	This should probably be loaded from a seperate JSON document, but I
//		don't feel like writing that code yet.
//
//		For now the map is just an array of strings, with the tile index. This
//		will obviously need to be extended...
IdleEngine.prototype.world = {
	"tiles": [
		"grass",		// 0
		"fence-ne",		// 1
		"fence-nw",		// 2
		"hole",			// 3
		"puddle"		// 4
	],

	"elevations": [
		"elevation"
	],

	"map": [
		"                    ",
		"           2111112  ",
		"           2     2  ",
		"           2  3  2  ",
		"           2  44 2  ",
		"           2     2  ",
		"           2     2  ",
		"      4     11111   ",
		"                    ",
		"                    ",
		"          4         ",
		"                    ",
		"                    ",
		"                    ",
		"        4           ",
		"                    ",
		"11111111111112      ",
		"             2      ",
		"             2      ",
		"             2      "
	]
};

IdleEngine.prototype.getTile = function getTile(name, type)
{
	type = type || 'tiles';

	if (!this.tiles[name]) {
		this.tiles[name] = new Image();
		this.tiles[name].src = type + '/' + name + '.png';
	}

	return(this.tiles[name]);
};

IdleEngine.prototype.loadTiles = function loadTiles(names, cb)
{
	var loaded	= 0;

	for (var i = 0, n; n = names[i]; i++) {
		var tile = this.getTile(n);

		tile.onload = function() {
			if (++loaded == names.length) {
				cb();
			}
		};
	}
};

/* Convert from isometric to cartesian */
IdleEngine.prototype.isoToCart = function isoToCart(x, y)
{
	var tx = (2 * y + x) / 2;
	var ty = (2 * y - x) / 2;

	return([ Math.round(tx), Math.round(ty) ]);
};

/* Convert from cartesian to isometric */
IdleEngine.prototype.cartToIso = function cartToIso(x, y)
{
	var tx	= x - y;
	var ty	= (x + y) / 2;

	return([ Math.round(tx), Math.round(ty) ]);
};

IdleEngine.prototype.outlineTile = function outlineTile(x, y, color)
{
	this.ctx.save();

	x += this.offset[0];
	y += this.offset[1] - 1;

	this.ctx.strokeStyle = color || 'rgba(255, 255, 255, 1.0)';
	this.ctx.beginPath();
	this.ctx.moveTo(x, y);
	this.ctx.lineTo(x - (this.tileSize[0] / 2), y - (this.tileSize[1] / 2));
	this.ctx.lineTo(x, y - this.tileSize[1]);
	this.ctx.lineTo(x + (this.tileSize[0] / 2), y - (this.tileSize[1] / 2));
	this.ctx.lineTo(x, y);
	this.ctx.stroke();

	this.ctx.restore();
};

IdleEngine.prototype.render = function render(map, characters)
{
	var l		= 0;	/* Left	*/
	var t		= 0;	/* Top	*/
	var eltile	= this.getTile('elevation');

	/*
		Calculate the bottom center position of each character that is on the
		screen and determine which tile the character is on.
	*/
	for (var i = 0, npc; npc = characters[i]; i++) {
		npc.tile = this.getTile(npc.name, 'characters');

		/* Position on the screen of the character */
		npc.iso = this.isoToCart(
			Math.round(npc.x / this.tileSize[1]),
			Math.round(npc.y / this.tileSize[1]));
	}

	for (var r = 0, row; row = map.map[r]; r++) {
		/* Strip whitespace */
		row = row.replace(/\s/g, '0');

		for (var c = 0, t; (t = row.charAt(c)) && t.length == 1; c++) {
			var x = c * this.tileSize[1];
			var y = r * this.tileSize[1];
			var tile = this.getTile(map.tiles[t * 1]);

			/* Calculate isometric coords */
			var iso = this.cartToIso(x, y);

			this.ctx.drawImage(tile,
				iso[0] - (tile.width / 2)	+ this.offset[0],
				iso[1] - (tile.height)		+ this.offset[1]);

			// this.outlineTile(iso[0], iso[1]);

			/* Are there any characters standing on this tile? */
			for (var i = 0, npc; npc = characters[i]; i++) {
				if (c == npc.iso[0] && r == npc.iso[1]) {
					/* Bottom center position of the character */
					var l = npc.x - npc.tile.width / 2;
					var t = npc.y - npc.tile.height;

					this.ctx.drawImage(npc.tile,
						l + this.offset[0],
						t + this.offset[1]);

					// DEBUG
					this.outlineTile(iso[0], iso[1], 'rgba(0, 0, 0, 1.0)');
				}
			}
		}
	}

	var time = ((++this.time) % 1000) / 1000;

	this.ctx.fillStyle = this.timeToColor(time);
	this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

	for (var i = 0, npc; npc = characters[i]; i++) {
		this.ctx.fillStyle = 'rgba(255, 0, 0, 1.0)';
		this.ctx.fillRect(npc.x - 1 + this.offset[0], npc.y - 1 + this.offset[1], 3, 3);
	}
};

IdleEngine.prototype.timeColors = [
	[   0,   0,  20, 0.8 ],	/* Just after midnight	*/
	[  20,   0,  10, 0.5 ],
	[  80,   0,   0, 0.3 ],	/* Morning				*/
	[ 255, 255, 255, 0.0 ],
	[ 255, 230, 230, 0.2 ], /* Noon					*/
	[ 255, 255, 255, 0.0 ],
	[ 180,  50,  80, 0.3 ],	/* Sunset				*/
	[  40,   0,  20, 0.5 ],
	[   0,   0,  30, 0.8 ]	/* Just before midnight	*/
];

/*
	Give a time of day between 0 (midnight) and 1 (midnight again) return a
	color that is appropriate.
*/
IdleEngine.prototype.timeToColor = function timeToColor(time)
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

IdleEngine.prototype.start = function start()
{
	var speed	= 3;
	var fps		= 30;
	// var fps		= 1;

	this.characters = [{
		name:		"idle",
		x:			10 * this.tileSize[0],
		y:			10 * this.tileSize[1]
	}];

	this.keys = {};

	var tiles = this.world.tiles.concat(this.world.elevations);

	this.loadTiles(tiles, function() {
		this.resize();
		setInterval(function() {
			this.ctx.save();
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

			/* Move idle based on keyboard input */
			if (this.keys.left) {
				this.characters[0].x -= speed;
			}
			if (this.keys.right) {
				this.characters[0].x += speed;
			}

			if (this.keys.up) {
				this.characters[0].y -= speed;
			}
			if (this.keys.down) {
				this.characters[0].y += speed;
			}

			this.render(this.world, this.characters);
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
		case 37: c.engine.keys.left		= true; break;
		case 38: c.engine.keys.up		= true; break;
		case 39: c.engine.keys.right	= true; break;
		case 40: c.engine.keys.down		= true; break;
	}
}, false);

window.addEventListener('keyup', function(e)
{
	var c = document.getElementById('game');

	switch (e.keyCode) {
		case 37: c.engine.keys.left		= false; break;
		case 38: c.engine.keys.up		= false; break;
		case 39: c.engine.keys.right	= false; break;
		case 40: c.engine.keys.down		= false; break;
	}
}, false);

