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

function IdleArea(engine, id, debug, maxLayers)
{
	this.engine			= engine;
	this.debug			= debug;

	/* All areas are 11x11 */
	this.size			= 11;
	this.rowcount		= (this.size * 2) - 1;
	this.rows			= [];

	if (!isNaN(maxLayers)) {
		this.rowsPerLayer	= Math.ceil(this.rowcount / maxLayers);
	} else {
		this.rowsPerLayer	= 4;
	}

	this.setID(id);
};

IdleArea.prototype.setID = function setID(id)
{
	this.id		= id;
	this.data	= this.getMapData(id, this.debug);

	/* Removed any cached tile data on the rows */
	for (var i = 0, r; r = this.rows[i]; i++) {
		delete r.tiles;
	}

	/*
		The row tile caches have just been deleted, so everything will be
		treated as dirty. There is no need to check the dirty list.
	*/
	this.dirty		= {};
	this.dirtyCount	= 1;
};

/*
	Destroy the canvas layers created by this object

	This should be called before destroying this object to ensure that garbage
	isn't left in the DOM.
*/
IdleArea.prototype.reset = function reset()
{
	if (this.div) {
		document.body.removeChild(this.div);
		delete this.div;
	}

	this.rows		= [];
	this.dirty		= {};
	this.dirtyCount	= 1;
};

/*
	Mark the tile at the specified map coordinates as dirty, causing it's row to
	be re-rendered.
*/
IdleArea.prototype.dirtyTile = function dirtyTile(pos, veryDirty)
{
	var line;

	this.dirtyCount++;

// console.log('dirty:', pos);

	if (!(line = this.dirty[pos[0]])) {
		line = this.dirty[pos[0]] = [];
	}

	line[pos[1]] = veryDirty ? 2 : 1;
};

/*
	Determine if the tile at the specified map coordinates is dirty, and if so
	clean it.
*/
IdleArea.prototype.cleanTile = function cleanTile(pos)
{
	var line;
	var r;

	if (!(line = this.dirty[pos[0]])) {
		return(0);
	}

	if (!line[pos[1]]) {
		return(0);
	}

	r = line[pos[1]];
	delete line[pos[1]];
	return(r);
};

IdleArea.prototype.getMapData = function getMapData(id, debug)
{
	var data;
	var keys	= [ "ground", "elevation", "props" ];

	id = id || this.id;

	if ((data = world[id.toString()])) {
		return(data);
	}

	if (debug) {
		data = { };

		for (var c = 0, k; k = keys[c]; c++) {
			data[k] = [];

			for (var i = 0; i < 11; i++) {
				data[k].push("           ");
			}
		}

		world[(id || this.id).toString()] = data;
	}

	return(data);
};

IdleArea.prototype.clearMapData = function clearMapData(id)
{
	id = id || this.id;

	delete world[id.toString()];

	var data = this.getMapData(id, true);

	if (id == this.id) {
		/* Make sure everything is treated as dirty */
		this.setID(id);
	}

	return(data);
};

/*
	Render a tile at the specified iso coordinates.

	If an elevation is specified then only render the portion of the tile that
	is relevant for that elevation.
*/
IdleArea.prototype.renderTile = function renderTile(tile, scale, inside, ctx, elevation)
{
	/* Ground level is at an elevation of 5 */
	var ground		= 5;
	var img;
	var iso			= tile.iso;
	var dark		= false;

	if (isNaN(tile.elevation)) {
		tile.elevation = ground;
	}

	if (inside && !tile.exterior) {
		dark = true;
	}

	if (!isNaN(elevation)) {
		if (!inside && tile.exterior && elevation == tile.exterior.elevation) {
			/* There is an interior & exterior tile, render the exterior now */
			tile		= tile.exterior;
		}

		if (elevation != tile.elevation) {
			/* Wrong elevation, Nothing to do here */
			return;
		}
	}

	/* Calculate the elevation offset */
	var eloff = (tile.elevation - ground) * (this.engine.tileSize[1] / 2);

	if (tile.side) {
		if (typeof tile.side === "string") {
			img = this.engine.getImage(tile.side);
		} else {
			img = tile.side;
		}

		if (dark) {
			/*
				This tile has no interior, so it should be drawn darkened when
				Idle is indoors.
			*/
			img = this.engine.getImage(img, 0.6);
		}

		ctx.drawImage(img,
			scale * (iso[0] - (img.width / 2)),
			scale * (iso[1] - (this.engine.tileSize[1] / 2) - eloff),
			scale * img.width,
			scale * img.height);
	}

	if (tile.img) {
		img = tile.img;
	} else {
		img = this.engine.getImage(tile.name);
	}

	if (dark) {
		/*
			This tile has no interior, so it should be drawn darkened when Idle
			is indoors.
		*/
		img = this.engine.getImage(img, 0.6);
	}

	ctx.drawImage(img,
		scale * (iso[0] - (img.width / 2)),
		scale * (iso[1] - img.height - eloff),
		scale * img.width,
		scale * img.height);

	if (this.debug) {
		this.outlineTile(false, iso[0], iso[1] - eloff,
				'rgba(0, 0, 0, 0.6)', ctx);
	}
};

// TODO	We maybe able to save on memory if we set the size of each canvas layer
//		to be just large enough to render it's contents. This isn't that hard to
//		do but for now any extra complication will make this harder, so wait.

// TODO	There currently isn't a mask at the bottom of the screen. Do we want
//		to restore it? It could be added to each canvas when the canvas is
//		first created, although this may be promblematic if we optimize the
//		size of each canvas.

// TODO	Allow specifying a number of rows per layer. Depending on the device it
//		may make more sense to have far fewer layers. Even with only a few this
//		method of rendering is going to be cleaner.

/*
	Render the given area at the specified position scaled to the specified
	amount.

	This renderer uses a seperate canvas per row, and only redraws a row if it
	needs to.
*/
IdleArea.prototype.render = function render(characters, center, size, scale)
{
	// TODO	Allow changing the base ground level on a per screen basis
	/* Ground level is at an elevation of 5 */
	var ground	= 5;

	var tile;
	var idle	= null;
	var inside	= false;


	/* Store details about where this area is being rendered */
	if (this.dirtyCount == 0 &&
		this.scale  == scale &&
		this.width  == (size[0] * scale) &&
		this.height == (size[1] * scale)
	) {
		/* Nothing important has changed, so don't bother */
		return;
	}

	this.scale	= scale;
	this.width	= size[0] * scale;
	this.height	= size[1] * scale;

	this.left	= Math.round(center[0] - (this.width  / 2));
	this.top	= Math.round(center[1] - (this.height / 2));

	this.center	= [
		Math.floor((size[0]  * scale) / 2),
		50 * scale
	];

	/*
		In some cases Idle should be treated differently than other characters,
		so find him (if he is even in this area).
	*/
	for (var i = 0, c; c = characters[i]; i++) {
		if (c.name && c.name == "idle") {
			idle = c;
			break;
		}
	}

	/*
		If Idle is standing on a tile that has an interior and an exterior then
		render all exterior tiles transparently.
	*/
	if (idle) {
		var m = idle.getMapCoords();

		if ((tile = this.getMapTile(m[0], m[1])) && tile.exterior) {
			inside = true;
		}
	}

	/*
		Create or reuse a canvas for each layer, which consists of
		this.rowsPerLayer rows.

		r:	row
		rg:	row group
	*/
	for (var rg = 0; rg < this.rowcount; rg += this.rowsPerLayer) {
		var dirty	= 0;
		var row;
		var ctx;

		for (var r = rg; r < (rg + this.rowsPerLayer); r++) {
			if (!(row = this.rows[r])) {
				dirty = 1;

				row = {
					min:	0xf,
					max:	0x0
				};
				this.rows[r] = row;
			}

			/*
				If Idle transitioned from inside to outside then everything will
				need to be rendered fresh.
			*/
			if (row.inside != inside) {
				dirty = 1;
			}
			row.inside = inside;
		}

		row = this.rows[rg];
		if (!row.canvas) {
			dirty = 1;

			if (!this.div) {
				this.div	= document.createElement('div');
				document.body.appendChild(this.div);
			}

			/* Create a canvas for this layer */
			row.canvas		= document.createElement('canvas');
			row.ctx			= row.canvas.getContext('2d');

			/* Insert it into the DOM so it will actually get rendered */
			this.div.appendChild(row.canvas);

			/* Ensure that we can see through the layer */
			row.canvas.style.backgroundColor = 'transparent';
		}

		/*
			Scale the canvas correctly. We will require a redraw if the scale
			has changed.
		*/
		if (row.canvas.width  != this.width ||
			row.canvas.height != this.height
		) {
			dirty = 1;

			row.canvas.setAttribute('width',  this.width);
			row.canvas.setAttribute('height', this.height);

			/*
				We want to look old school

				These attributes get reset when the canvas size is changed, so
				they need to be corrected here.
			*/
			row.ctx.imageSmoothingEnabled			= false;
			row.ctx.mozImageSmoothingEnabled		= false;
			row.ctx.webkitImageSmoothingEnabled		= false;

			/*
				Draw from the top, center of the canvas

				Adjust the height to allow rendering as much as possible. The
				needed height is 240.

				We only need about 200 pixels for a flat area.
			*/
			row.ctx.translate(this.center[0], this.center[1]);
		}

		/* Move the canvas to the correct spot. This doesn't require a redraw */
		row.canvas.style.position	= 'absolute';
		row.canvas.style.left		= this.left + 'px';
		row.canvas.style.top		= this.top  + 'px';

		/* Determine if any rows in this layer are dirty */
		for (var r = rg; r < rg + this.rowsPerLayer; r++) {
			for (var i = 0, x = 0, y = r; x <= r; y--, x++) {
				dirty = Math.max(dirty, this.cleanTile([ x, y ]));
			}
		}

		if (!dirty && row.tiles) {
			/* No need to render this row */
			continue;
		}

		ctx = row.ctx;
		ctx.clearRect(-this.center[0], -this.center[1],
					row.canvas.width, row.canvas.height);

		for (var r = rg; r < rg + this.rowsPerLayer; r++) {
			row = this.rows[r];

			if (!row.tiles || dirty > 1) {
				/* Load the tiles for this row */
				row.tiles = [];

				for (var x = 0, y = r; x <= r; y--, x++) {
					if (!(tile = this.getMapTile(x, y))) {
						continue;
					}

					tile.x = x;
					tile.y = y;

					tile.iso = this.engine.mapToIso(x, y);

					row.tiles.push(tile);
				}
			}

			/* Recalculate the lowest and highest elevation for the row */
			for (var i = 0, x = 0, y = r; x <= r; y--, x++) {
				if (!(tile = row.tiles[i]) || tile.x != x || tile.y != y) {
					continue;
				}
				i++;

				if (tile.exterior) {
					row.max = Math.max(row.max, tile.exterior.elevation);
					row.min = Math.min(row.min, tile.exterior.elevation);
				}

				row.max = Math.max(row.max, tile.elevation);
				row.min = Math.min(row.min, tile.elevation);
			}

			/* Render from the lowest to the highest point */
			for (var el = row.min; el <= row.max; el++) {
				/* Render the ground and walls */
				for (var i = 0, x = 0, y = r; x <= r; y--, x++) {
					if (!(tile = row.tiles[i]) || tile.x != x || tile.y != y) {
						continue;
					}
					i++;

					this.renderTile(tile, scale, inside, ctx, el);
				}

				/* Render characters and props */
				for (var i = 0, x = 0, y = r; x <= r; y--, x++) {
					if (!(tile = row.tiles[i]) || tile.x != x || tile.y != y) {
						continue;
					}
					i++;

					/* Calculate the elevation offset */
					var eloff = (tile.elevation - ground) * (this.engine.tileSize[1] / 2);

					/* Are there any characters standing on this tile? */
					for (var n = 0, npc; npc = characters[n]; n++) {
						var m = npc.getMapCoords();

						if (x == m[0] && y == m[1]) {
							if (this.debug) {
								this.outlineTile(true, tile.iso[0], tile.iso[1] - eloff,
									'rgba(0, 0, 255, 0.3)', ctx);
							}

							npc.render(ctx, scale, eloff);
						}
					}

					/* Render any props for this tile */
					if (tile.prop) {
						ctx.drawImage(tile.prop,
							scale * (tile.iso[0] - (tile.prop.width / 2)),
							scale * (tile.iso[1] - tile.prop.height - eloff),
							scale * tile.prop.width,
							scale * tile.prop.height);
					}
				}
			}
		}
	}

	/* Nothing is dirty now */
	this.dirty = {};
	this.dirtyCount = 0;
};

/* Return a tile based on the ground, elevation & props maps for this screen */
IdleArea.prototype.getMapTile = function IdleArea(x, y, data, tileDefinition)
{
	var tile	= {};
	var t		= null;
	var line;
	var c;

	if (!(data = data || this.data)) {
		return(null);
	}

	/* Get the ground and side tile from the first map */
	if (!(t = tileDefinition)) {
		if ((line = data.ground[y]) && (c = line.charAt(x)) && c.length == 1) {
			t = world.tiles.ground[c];
		}
	}

	if (t) {
		tile.solid = t.solid;

		if (t.name) {
			tile.img = this.engine.getImage(t.name);
		}

		if (t.side) {
			tile.side = this.engine.getImage(t.side);
		}
	}

	if (!tile.img) {
		/* A tile requires at least a ground tile */
		return(null);
	}

	/* Get the elevation */
	if (tile.side && (line = data.elevation[y]) && (c = line.charAt(x)) && c.length == 1) {
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
	if ((line = data.props[y]) && (c = line.charAt(x)) && c.length == 1) {
		if (c != ' ' && (t = world.tiles.props[c])) {
			if (t.name) {
				tile.prop = this.engine.getImage(t.name);
			}
		}
	}

	if (t && t.exterior) {
		tile.exterior = this.getMapTile(x, y, data, t.exterior);
	}

	return(tile);
};

IdleArea.prototype.setMapTile = function setMapTile(data, x, y, c)
{
	var d = 1;

	data = data || this.data;

	if (y < 0 || y >= data.length || x < 0 || x >= data.ground[y].length) {
		return;
	}

	this.dirtyTile([ x, y ], true);

	var replace = function(old, x, c) {
		return(old.substr(0, x) + c + old.substr(x + 1));
	};

	switch (c) {
		case ' ':
			/* Reset the tile in all 3 maps */
			data.ground[y]		= replace(data.ground[y],	x, ' ');
			data.props[y]		= replace(data.props[y],		x, ' ');
			data.elevation[y]	= replace(data.elevation[y], x, ' ');
			break;

		case '-':
			d = -1;
			// fallthrough

		case '+': case '=':
			/* Adjust the elevation */
			var e = parseInt(data.elevation[y].charAt(x), 16);

			if (isNaN(e)) {
				e = 5;
			}

			e += d;

			if (e < 0 || e > 0xf) {
				return;
			}

			data.elevation[y]	= replace(data.elevation[y], x, e.toString(16));
			break;

		default:
			if (world.tiles.ground[c]) {
				data.ground[y]	= replace(data.ground[y],	x, c);
			} else if (world.tiles.props[c]) {
				data.props[y]	= replace(data.props[y],		x, c);
			}
			break;
	}
};

IdleArea.prototype.outlineTile = function outlineTile(full, x, y, color, ctx)
{
	ctx = ctx || this.ctx;

	ctx.save();

	y--;

	if (full) {
		ctx.fillStyle		= color || 'rgba(255, 255, 255, 0.5)';
	} else {
		ctx.strokeStyle	= color || 'rgba(255, 255, 255, 1.0)';
	}
	ctx.beginPath();

	ctx.moveTo(x, y);
	ctx.lineTo(x - (this.engine.tileSize[0] / 2), y - (this.engine.tileSize[1] / 2));
	ctx.lineTo(x, y - this.engine.tileSize[1]);
	ctx.lineTo(x + (this.engine.tileSize[0] / 2), y - (this.engine.tileSize[1] / 2));
	ctx.lineTo(x, y);

	if (full) {
		ctx.fill();
	} else {
		ctx.stroke();
	}

	ctx.restore();
};


