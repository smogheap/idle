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
}

IdleEngine.prototype.getTile = function getTile(name)
{
	if (!this.tiles[name]) {
		this.tiles[name] = new Image();
		this.tiles[name].src = 'tiles/' + name + '.png';
	}

	return(this.tiles[name]);
};

IdleEngine.prototype.loadTiles = function getTile(names, cb)
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
	var x	= 0;
	var y	= 0;
	var l	= 0;	/* Left	*/
	var t	= 0;	/* Top	*/
	var size = [
		(this.canvas.width  / this.tileSize[0]),
		(this.canvas.height / this.tileSize[1]) * 2 + 1
	];

	for (y = 0; y <= size[1]; y++) {
		for (x = 0; x <= size[0]; x++) {
			var tile;

			switch (Math.floor((Math.random() * 15))) {
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

			if (y % 2 == 0) {
				l += this.tileSize[0] / 2;
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
};

window.addEventListener('load', function() {
	var c		= document.getElementById('game');
	var engine	= new IdleEngine(c);

	engine.loadTiles([
		"fence-ne",
		"fence-nw",
		"grass",
		"hole",
		"puddle"
	], function() {
		engine.render();
	});
}, false);
