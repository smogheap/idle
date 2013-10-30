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

/*
	Arguments:
		name:		The character name

		x, y:		The iso coordinates for the current screen

		engine:		The Idle game engine
*/
function IdleCharacter(name, x, y, engine)
{
	this.name		= name;
	this.engine		= engine;

	this.x			= x;
	this.y			= y;

	if (name === "idle") {
		/* Idle moves much slower than the average character */
		this.speed	= 2;
	} else {
		this.speed	= 32;
	}

	/* The size of the character's bounding box in isometric space */
	this.bounding	= [ 16, 8 ];

	this.state		= 'stand';
	this.facing		= 'southeast';
}

IdleCharacter.prototype.getImage = function getImage()
{
	return(this.engine.getImage(this.name + '-' + this.state + '-' + this.facing));
};

/* Return the map coordinates for the character */
IdleCharacter.prototype.getMapCoords = function getMapCoords()
{
	/*
		Return the map coordinates for the character, based on the bottom center
		of the character's bounding box.
	*/
	return(this.engine.isoToMap(this.x, this.y + (this.bounding[1] / 2)));
};

IdleCharacter.prototype.render = function render(ctx, scale, elevationOffset)
{
	var img	= this.getImage();
	var x	= this.x - (img.width / 2);
	var y	= this.y - img.height;
	var m	= this.getMapCoords().slice(0);

	/*
		Mark the previoius location as dirty, unless it happens to match the
		tile the character is still on.
	*/
	if (this.lastRenderedAt &&
		(this.lastRenderedAt[0] != m[0] || this.lastRenderedAt[1] != m[1])
	) {
		this.engine.area.dirtyTile(this.lastRenderedAt);
	}
	this.lastRenderedAt = m;

	ctx = ctx || this.engine.ctx;

	this.elevationOffset = elevationOffset;

	ctx.drawImage(img,
			scale * x,
			scale * (y - elevationOffset),
			scale * img.width,
			scale * img.height);
};

IdleCharacter.prototype.move = function move(facing, direction)
{
	var speed = this.speed;

	if (this.engine.debug) {
		speed *= 3;
	}

	if (this.destination) {
		var area	= this.engine.area;
		var to		= this.engine.mapToIso(this.destination[0], this.destination[1]);
		var fromM	= this.engine.isoToMap(this.x, (this.y - this.bounding[1] / 2));

		/* Aim towards the center */
		to[1] -= this.engine.tileSize[1] / 2;

		/*
			Move the character towards the specified destination, ignoring
			any player input until he/she gets there.
		*/
		var diff = [
			this.x - to[0],
			this.y - to[1]
		];

		/* Limit the movement to the allowed speed */
		diff[0] = Math.min(diff[0], speed);
		diff[0] = Math.max(diff[0], -speed);
		diff[1] = Math.min(diff[1], speed / 2);
		diff[1] = Math.max(diff[1], -(speed / 2));

		this.x -= diff[0];
		this.y -= diff[1];

		/*
			Has the character reached the destination tile? If the entire
			bounding box is on the right tile then we can call it good.
		*/
		if (1 == this.onTile(this.destination)) {
			delete this.destination;
		}

		this.engine.area.dirtyTile(this.lastRenderedAt);
		this.engine.area.dirtyTile(this.getMapCoords());
		return;
	}

	/* Update the character image based on the direction he is facing */
	if (facing) {
		this.facing = facing;
	}

	/* Move the character based on keyboard input */
	if (direction) {
		var dist = 0;
		var to;

		/* Move east or west first */
		if (-1 != direction.indexOf('east')) {
			dist += speed;
		}
		if (-1 != direction.indexOf('west')) {
			dist -= speed;
		}

		if (dist) {
			if ((to = this.walkTo([ this.x + dist, this.y ]))) {
				/* Yup, all good */
				this.x = to[0];
				this.y = to[1];

				this.engine.area.dirtyTile(this.lastRenderedAt);
				this.engine.area.dirtyTile(this.getMapCoords());
			}

			if (this.destination) {
				this.engine.area.dirtyTile(this.lastRenderedAt);
				this.engine.area.dirtyTile(this.getMapCoords());
				return;
			}
		}

		/* Move north or south */
		dist = 0;

		if (-1 != direction.indexOf('north')) {
			dist -= speed / 2;
		}
		if (-1 != direction.indexOf('south')) {
			dist += speed / 2;
		}

		if (dist) {
			if ((to = this.walkTo([ this.x, this.y + dist ]))) {
				/* Yup, all good */
				this.x = to[0];
				this.y = to[1];

				this.engine.area.dirtyTile(this.lastRenderedAt);
				this.engine.area.dirtyTile(this.getMapCoords());
			}
		}
	}
};

/* Return the map coordinates for the character */
IdleCharacter.prototype.getIsoCoords = function getMapCoords()
{
	return([ this.x, this.y ]);
};

/*
	Is the character standing on the specified map position?

	Result:
		1:	The character is on the tile, including all points of his/her
			bounding box.

		>1:	The character is on the tile, but part of the bounding box is not.

		0:	The character is not on the tile.
*/
IdleCharacter.prototype.onTile = function onTile(position)
{
	var count = 0;

	var list = [
		[ this.x - (this.bounding[0] / 2), this.y ],
		[ this.x + (this.bounding[0] / 2), this.y ],
		[ this.x, this.y - (this.bounding[1] / 2) ],
		[ this.x, this.y + (this.bounding[1] / 2) ]
	];

	for (var i = 0, t; t = list[i]; i++) {
		var toM = this.engine.isoToMap(t[0], t[1]);

		if (toM[0] == position[0] && toM[1] == position[1]) {
			count++;
		}
	}

	if (count == list.length) {
		/* Entirely on the tile */
		return(1);
	}

	if (count > 0) {
		/* Partially on the tile */
		return(2);
	}

	/* Not on the tile */
	return(0);
};

/*
	Based on a characters coords (iso, not map) determine if the character is
	allowed to move from one spot to another.

	If allowed then return the coordinates that the character ends up on.
*/
IdleCharacter.prototype.walkTo = function walkTo(to)
{
	/* Where is the character coming from? */
	var area		= this.engine.area;
	var fromM		= this.engine.isoToMap(this.x, (this.y - this.bounding[1] / 2));
	var fromT		= area.getMapTile(fromM[0], fromM[1]);
	var newscreen	= null;
	var destination	= [];

	/*
		Check each corner of the character's bounding box. The box should be
		small enough to let the character through a 1 tile gap.

		Bottom center is last because that is where the character is rendered
		from.
	*/
	var tolist = [
		[ to[0] - (this.bounding[0] / 2), to[1] ],
		[ to[0] + (this.bounding[0] / 2), to[1] ],
		[ to[0], to[1] - (this.bounding[1] / 2) ],
		[ to[0], to[1] + (this.bounding[1] / 2) ]
	];

	for (var i = 0, t; t = tolist[i]; i++) {
		var toM = this.engine.isoToMap(t[0], t[1]);
		var toT = area.getMapTile(toM[0], toM[1]);

		/* Only the last check can actually change the screen */
		newscreen = null;

		if (!toT) {
			var newmap;

			newscreen = area.id.slice(0);

			if (toM[1] < 0) {
				newscreen[1]++;
			} else if (toM[1] >= area.size) {
				newscreen[1]--;
			} else if (toM[0] < 0) {
				newscreen[0]--;
			} else if (toM[0] >= area.size) {
				newscreen[0]++;
			}

			if (!(newmap = area.getMapData(newscreen.toString()))) {
				newscreen = null;
			}

			if (newmap) {
				while (toM[1] < 0) {
					toM[1] += area.size;
				}
				toM[1] %= area.size;

				while (toM[0] < 0) {
					toM[0] += newmap.exterior[toM[1]].length;
				}
				toM[0] %= newmap.exterior[toM[1]].length;

				toT = area.getMapTile(toM[0], toM[1], newmap);
			}

			if (!toT) {
				return(null);
			}
		}

		/*
			Keep track of any changes to elevation that would be caused by this
			move for any one point.
		*/
		if (!newscreen && toT && fromT && toT.elevation != fromT.elevation) {
			destination.push({
				mapID:	toM.slice(0),
				tile:	toT
			});
		}

		if (!this.engine.debug) {
			if (toT.solid) {
				return(null);
			}

			if (fromT) {
				if (toT.elevation - fromT.elevation > 1) {
					/* He can't climb something that steep */
					return(null);
				}

				if (fromT.elevation - toT.elevation > 1) {
					/*
						Don't let him jump off of something unless he has had
						a second (at least 1 second) to think it through.
					*/
					if ((new Date() - this.engine.keys.changed) < 500) {
						// console.log('Sorry, it has only been', (new Date() - this.engine.keys.changed), 'ms... think it over some more');
						return(null);
					}
				}

				if (toT.prop) {
					/* He shouldn't walk into things, that would hurt */
					return(null);
				}
			}
		}
	}

	if (newscreen && this.name == "idle") {
		this.engine.setArea(newscreen);

		/* Move him to the center of the correct tile on the new screen */
		to = this.engine.mapToIso(toM[0], toM[1]);
		to[1] -= this.engine.tileSize[1] / 2;

		delete this.destination;

		this.engine.keys.changed = new Date();
		return(to);
	}

	/*
		Has Idle's elevation changed?

		If any corner of the bounding box is no longer in the same tile that
		Idle started in and has a different elevation then Idle needs to be
		nudged away from the edge.

		If there are 3 elevations involved them don't allow him to move.
	*/
	if (destination.length) {
		/*
			Out of all the possible tiles to go to figure out the best match,
			which is the first that is not connected at a corner.
		*/
		var match = null;

		for (var i = 0, d; d = destination[i]; i++) {
			if (d.mapID[0] == fromM[0] || d.mapID[1] == fromM[1]) {
				/* Not connected at a corner */
				match = d;
				break;
			}
		}

		if (!match) {
			/*
				All matches are connected by a corner.

				Disable the x movement and let the character slide on the y axis
				and the next time around he should be able to move.

				The choice of x vs y is arbitrary here...
			*/
			this.engine.keys.changed = new Date();
			return([ this.x, to[1] ]);
		}

		for (var i = 0, d; d = destination[i]; i++) {
			if (d.tile.elevation != match.tile.elevation) {
				/* 3 elevations involved, not a good idea */
				return(null);
			}
		}

		this.destination = match.mapID;

		this.engine.keys.changed = new Date();
		return([ this.x, this.y ]);
	}

	this.engine.keys.changed = new Date();
	return(to);
};



