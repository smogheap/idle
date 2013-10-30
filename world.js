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

var world = {
	"tiles": {
		ground: {
			/* The default exterior tile is space */
			" ": { ground: "grass",			side: "elevation-soil"			},

			"q": { ground: "grass",			side: "elevation-soil"			},
			"Q": { ground: "grass",			side: "elevation-soil-fossil1"	},
			"w": { ground: "rock",			side: "elevation-rock"			},
			"W": { ground: "rock",			side: "elevation-rock-fossil2"	},

			/* Brick walls */
			"e": { ground: "tile-cement1",	side: "elevation-brick"			},
			"E": { ground: "tile-cement1",	side: "elevation-brickedge1"	},
			"r": { ground: "tile-cement1",	side: "elevation-brickedge2"	},
			"R": { ground: "tile-cement1",	side: "elevation-brickgrey"		},
			"t": { ground: "tile-cement1",	side: "elevation-bricklite"		},


			"z": { ground: "puddle",		side: "elevation-soil"			},
			"Z": { ground: "hole",			side: "elevation-soil"			},
			"x": { ground: "tile-tar1",		side: "elevation-soil"			}
		},

		props: {
			"\\": { prop: "prop-fence-left"									},
			"/": { prop: "prop-fence-right"									}
		},

		// TODO	Make each character class provide a list of images?
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
	},

	"0,0": {
		/* A map of the exterior tiles */
		ground: [
			"           ",
			"  eee      ",
			"  eee      ",
			"  eee      ",
			"           ",
			"           ",
			"           ",
			"           ",
			"           ",
			"           ",
			"           "
		],

		/* An elevation map, default is 5. Values are in hex */
		elevation: [
			"           ",
			"  999      ",
			"  9 9      ",
			"  9 9      ",
			"           ",
			"           ",
			"           ",
			"           ",
			"           ",
			"           ",
			"           "
		],

		/* A map of any props */
		props: [
			"           ",
			"           ",
			"           ",
			"           ",
			"           ",
			"           ",
			"           ",
			"           ",
			"           ",
			"           ",
			"           "
		],

		interior: {
			ground: [
				"           ",
				"  eee      ",
				"  eee      ",
				"  eee      ",
				"           ",
				"           ",
				"           ",
				"           ",
				"           ",
				"           ",
				"           "
			],

			/* An elevation map, default is 5. Values are in hex */
			elevation: [
				"           ",
				"  666      ",
				"  6 6      ",
				"  6 6      ",
				"           ",
				"           ",
				"           ",
				"           ",
				"           ",
				"           ",
				"           "
			]
		}
	}
};


