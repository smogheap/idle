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
			" ": { name: "grass",	side: "elevation-soil"			},
			"_": { name: "grass",	side: "elevation-soil-fossil1"	},
			"#": { name: "rock",	side: "elevation-rock"			},
			"%": { name: "rock",	side: "elevation-rock-fossil2"	},
			"o": { name: "puddle",	side: "elevation-soil"			},
			"O": { name: "hole",	side: "elevation-soil"			},

			"w": { name: "rock",	side: "elevation-soil", solid: true,
					exterior: { name: "grass",	side: "elevation-soil", height: 4 } },

			"c": { name: "rock",	side: "elevation-soil",
					exterior: { name: "grass",	height: 4 } }
		},

		props: {
			"-": { name: "fence-ne"									},
			"|": { name: "fence-nw"									}
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

	"-1,0": {
		/* A map of the tiles on the ground */
		ground: [
			"           ",
			" wwwwwwwww ",
			" wcccccccw ",
			" wcccccccw ",
			" wcccccccw ",
			" wcccccccw ",
			" wcccccccw ",
			" wwwwcwwww ",
			"           ",
			"           ",
			"           "
		],

		/* An elevation map, default is 5. Values are in hex */
		elevation: [
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
		]
	},


	"0,0": {
		/* A map of the tiles on the ground */
		ground: [
			"     #     ",
			"    ###    ",
			"   #####   ",
			"  #######  ",
			"    ###    ",
			"    ###    ",
			"    ###    ",
			"    ###    ",
			"           ",
			"           ",
			"           "
		],

		/* An elevation map, default is 5. Values are in hex */
		elevation: [
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
		]
	},

	"1,0": {
		/* A map of the tiles on the ground */
		ground: [
			"           ",
			"     #     ",
			"    ###    ",
			"   #####   ",
			"     #     ",
			"     #     ",
			"     #     ",
			"           ",
			"           ",
			"           ",
			"           "
		],

		/* An elevation map, default is 5. Values are in hex */
		elevation: [
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
		]
	},


	"0,-1": {
		/* A map of the tiles on the ground */
		ground: [
			"##### #####",
			"####   ####",
			"###     ###",
			"##       ##",
			"####   ####",
			"####   ####",
			"####   ####",
			"####   ####",
			"###########",
			"###########",
			"###########"
		],

		/* An elevation map, default is 5. Values are in hex */
		elevation: [
			"00000600000",
			"03336663330",
			"03366666330",
			"03666666630",
			"03336663330",
			"03336663330",
			"03336663330",
			"03336663330",
			"03333333330",
			"03333333330",
			"00000000000"
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
		]
	},

	"0,1": {
		ground: [
			"# ### ##__ ",
			" ####%%    ",
			"  # #      ",
			"  #   O    ",
			"      oo   ",
			"           ",
			"   #       ",
			"  #        ",
			"  #  ##  # ",
			" ## #  ####",
			"        #  "
		],

		elevation: [
			"acbaa 9876 ",
			" 9ab999    ",
			"  8 6      ",
			"  6        ",
			"           ",
			"     877   ",
			"       766 ",
			"           ",
			"   0000 0  ",
			"  4        ",
			" 434       "
		],

		props: [
			"           ",
			"           ",
			"           ",
			"        ---",
			"       |   ",
			"       |   ",
			"       |   ",
			"        ---",
			"------     ",
			"           ",
			"           "
		]
	}
};


