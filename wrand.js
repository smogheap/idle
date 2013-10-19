/*
	Copyright (c) 2010, Micah N Gorrell
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
	Random number generated, that mimics the behavior of the one used in windows
	for compatability with games that rely on consistent results for a given
	seed.

	This is compatible with windows for seeds between 1 and 32000.
*/
WRand = function()
{
	var seed = WRand.getSeed(NaN);

	seed = seed * 214013 + 2531011;
	seed = seed & 4294967295;
	var r = ((seed >> 16) & 32767);

	WRand.seed = seed;

	return(r);
};

WRand.getSeed = function(seed)
{
	WRand.seed = seed || WRand.seed || (new Date()).getTime();

	return(WRand.seed);
};

WRand.setSeed = function(seed)
{
	if (!isNaN(seed)) {
		WRand.seed = seed % 32000;
	}
};


