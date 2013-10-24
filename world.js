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
	"-1,0": {
		/* A map of the tiles on the ground */
		ground: [
			"           ",
			"     #     ",
			"    ###    ",
			"   #####   ",
			"     #     ",
			"     #     ",
			"           ",
			"     #     ",
			" ##  #     ",
			"     #     ",
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


