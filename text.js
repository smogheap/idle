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
function IdleText(font, down)
{
	this.font	= font;
	this.dir	= down ? -1 : 1;

	this.space	= ' '.charCodeAt(0);
	this.tilde	= '~'.charCodeAt(0);
	this.lf		= '\n'.charCodeAt(0);
}

IdleText.prototype.setPos = function setPos(dx, dy)
{
	this.dx = dx;
	this.dy = dy;
};

IdleText.prototype.shiftPos = function shiftPos(dx, dy)
{
	this.dx += dx;
	this.dy += dy;
};

IdleText.prototype.setScale = function setScale(scale)
{
	this.scale = scale;
};

/*
	Draw the specified text

	dx, dy and scale are optional arguments, which can be set before hand.
*/
IdleText.prototype.render = function render(ctx, value, dx, dy, scale)
{
	if (isNaN(dx))		dx		= this.dx;
	if (isNaN(dy))		dy		= this.dy;
	if (isNaN(scale))	scale	= this.scale;

	/* Positions needed for new lines */
	var ox	= dx;
	var oy	= dy;

	for (var i = 0, c; !isNaN(c = value.charCodeAt(i)); i++) {
		var sx;
		var sy;

		if (lf == c) {
			/* New line */
			oy += 16;

			dx = ox;
			dy = oy;
			continue;
		}

		if (c < this.space || c > this.tilde) {
			/* Unsupported character ... */
			continue;
		}

		/*
			Find the right portion of the source image.

			There are 32 characters per line in the source image.
		*/
		sx = c - this.space;
		sy = Math.floor(sx / 32);
		sx %= 32;

		/* Each character is 8x16 pixels */
		sy *= 16;
		sx *= 8;

		ctx.drawImage(this.font,
				sx, sy, sx + 8, sy + 16,
				dx, dy,
				dx + (8 * scale), dy + (16 * scale));

		/* Adjust position for the next character */
		dx += 8;
		dy += (dir * 4);
	}
};

