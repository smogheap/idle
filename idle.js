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

	this.canvas.engine		= this;

	this.seed				= WRand.getSeed(NaN);
	this.time				= this.seed;
}

IdleEngine.prototype.getTile = function getTile(name)
{
	if (!this.tiles[name]) {
		this.tiles[name] = new Image();
		this.tiles[name].src = 'tiles/' + name + '.png';
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

IdleEngine.prototype.render = function render()
{
	var x		= 0;
	var y		= 0;
	var l		= 0;	/* Left	*/
	var t		= 0;	/* Top	*/
	var eltile	= this.getTile('elevation');
	var size = [
		(this.canvas.width  / this.tileSize[0]) + 1,
		((this.canvas.height / this.tileSize[1]) + 1 ) * 2
	];

	this.ctx.save();
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

	for (y = 0; y <= size[1]; y++) {
		WRand.setSeed(this.seed + (y * y));

		for (x = 0; x <= size[0]; x++) {
			var tile;

			switch (WRand() % 15) {
				default:
				case 0:	tile = this.getTile('grass');		break;
				case 1:	tile = this.getTile('fence-ne');	break;
				case 2:	tile = this.getTile('fence-nw');	break;
				case 3:	tile = this.getTile('hole');		break;
				case 4:	tile = this.getTile('puddle');		break;
			}

			/* Figure out the position for the tile */
			t = (y * (this.tileSize[1] / 2));
			l = (x * (this.tileSize[0]));

			if (false) { // debug
				t += y * 2;
				l += x * 2;
			}

			if (y % 2 == 0) {
				l += this.tileSize[0] / 2;
			}

			/*
				Adjust the height of the tile based on it's elevation.
			*/
			// var elevation = Math.random() * 100;
			var elevation = 0;

/*
			if (y < 21 && x < 20) {
				elevation++;

				if (y < 11 && x < 10) {
					elevation++;

					if (y < 5 && x < 5) {
						elevation++;
					}
				}
			}
*/
			if (x < 10) {
				if (x * 2 >= y) {
					elevation += 1.8;
				}

				if (x * 2 >= (y - 6)) {
					elevation++;
				}
			} else {
				if ((20 - x) * 2 >= (y + 1)) {
					elevation += 1.8;
				}

				if ((20 - x) * 2 >= (y - 5)) {
					elevation++;
				}
			}


			if (elevation < 3 && elevation > 0) {
				t -= elevation * this.tileSize[1];

				var el = l;
				var et = t;

				/*
					Adjust so we're drawing from the point that the bottom
					center of the real tile should be.
				*/
				el -= eltile.width / 2;
				et -= this.tileSize[1] / 2;

				/* Draw the elevation image */
				this.ctx.drawImage(eltile, el, et);
			}

			/*
				Adjust for the size of the tile so that we render each tile from
				the bottom center.
			*/
			l -= tile.width / 2;
			t -= tile.height;

			this.ctx.drawImage(tile, l, t);
		}
	}

	WRand.setSeed(this.seed);

	var time = ((++this.time) % 1000) / 1000;

	this.ctx.fillStyle = this.timeToColor(time);
	this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

	this.ctx.restore();
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
	setInterval(this.render.bind(this), 1000/30);
};

IdleEngine.prototype.resize = function resize()
{
	this.canvas.width	= window.innerWidth;
	this.canvas.height	= window.innerHeight;
};

window.addEventListener('load', function() {
	var c		= document.getElementById('game');
	var engine	= new IdleEngine(c);

	engine.loadTiles([
		"fence-ne",
		"fence-nw",
		"grass",
		"hole",
		"puddle",
		"elevation"
	], function() {
		engine.resize();
		engine.start();
	});
}, false);

window.addEventListener('resize', function() {
	var c = document.getElementById('game');

	c.engine.resize();
}, false);


