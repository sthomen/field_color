"use strict";

(function(w,d) {
	w.addEventListener('load', onload, false);

	function onload() {
		var pickers=d.querySelectorAll('input.field-color-picker');
		for (var i=0;i<pickers.length;i++) {
			var picker=new ColorPicker(pickers[i]);
			picker.run();
		}
	}

	function ColorPicker(element) {
		var self = this;
		this.element = element;
		this.picker = null;
		this.square = null;
		this.bar = null;
		this.preview = null;

		this.barmoving = false;

		this.hue = 0;
		this.saturation = 0;
		this.value = 0;

		this.run = function() {
			this.picker = d.createElement('div');
			this.picker.className = 'colorPicker';
			this.picker.style.display = 'none';

			this.square = d.createElement('canvas');
			this.square.className = 'square';
			this.picker.appendChild(this.square);

			this.bar = d.createElement('canvas');
			this.bar.className = 'bar';
			this.picker.appendChild(this.bar);

			this.preview=d.createElement('span');
			this.preview.className='colorPickerPreview';

			this.element.parentElement.insertBefore(this.preview, this.element);

			/* read existing value */
			this.readValue();

			/* draw the HSV square and bar */
			this.renderSquare();
			this.renderBar();

			var body=d.querySelector('body');

			/* dragging on the palettes */
			this.square.addEventListener('mousemove', this.squareMouseMove, false);
			this.square.addEventListener('mousedown', this.squareMouseMove, false);
			this.bar.addEventListener('mousemove', this.barMouseMove, false);
			this.bar.addEventListener('mousedown', this.barMouseMove, false);

			/* click handlers */
			this.picker.addEventListener('click', this.eatClickHandler, false);
			this.element.addEventListener('click', this.clickHandler, false);
			this.preview.addEventListener('click', this.clickHandler, false);
			body.addEventListener('click', this.bodyClickHandler, false);

			/* handle manual editing of the input value */
			this.element.addEventListener('keyup', this.changeHandler, false);

			body.appendChild(this.picker);
		}

		this.eatClickHandler = function(evt) {
			evt.stopPropagation();
		}

		this.clickHandler = function(evt) {
			evt.stopPropagation();

			self.show();
		}

		this.bodyClickHandler = function(evt) {
			self.hide();
		}

		this.changeHandler = function(evt) {
			self.readValue();
		}

		this.show=function() {
			var bounds=this.element.getBoundingClientRect();
			this.picker.style.left=bounds.left + "px";
			this.picker.style.top=bounds.bottom + 10 + "px";
			this.picker.style.display="block";
		}

		this.hide=function() {
			this.picker.style.display="none";
		}

		this.squareMouseMove = function(evt) {
			if (evt.buttons == 1) {
				var bounds=self.square.getBoundingClientRect();
				self.saturation = (evt.clientY - bounds.y) / bounds.height;
				self.value = Math.abs((bounds.x - evt.clientX) / bounds.width);

				self.renderSquare();
				self.setValue();
			}
		}

		this.barMouseMove = function(evt) {
			if (evt.buttons == 1) {
				var bounds=self.bar.getBoundingClientRect();
				self.hue = ((evt.clientY - bounds.y) / bounds.height) * 360;
				self.renderSquare();
				self.renderBar();

				self.setValue();
			}
		}

		this.readValue = function() {
			var rgb=new Color();
			rgb.fromHex(self.element.value);
			var hsv=rgb.toHSV();

			if (hsv[0] != NaN) {
				self.hue=hsv[0];
				self.saturation=hsv[1];
				self.value=hsv[2];
			}

			self.preview.style.background=rgb.toHex(true);
			self.renderSquare();
			self.renderBar();
		}

		this.setValue = function() {
			var rgb=new Color();
			rgb.fromHSV(self.hue, self.saturation, self.value);

			self.element.value=rgb.toHex();
			self.preview.style.background=rgb.toHex(true);
		}

/*************************************************************************
 * Canvas renderers
 ************************************************************************/

		this.renderSquare = function() {
			var context=this.square.getContext("2d");

			var width=200;
			var height=200;
			var qwidth=width*4;

			var id=context.createImageData(width, height);

			this.square.width = width;
			this.square.height = height;

			var color = new Color();

			for (var y=0;y<height;y++) {
				for (var x=0;x<qwidth;x+=4) {
					color.fromHSV(this.hue, y/height, x/qwidth);
					var pos=(y*qwidth)+x;

					id.data[pos+0]=color.r;
					id.data[pos+1]=color.g;
					id.data[pos+2]=color.b;
					id.data[pos+3]=255;
				}
			}

			context.putImageData(id, 0, 0);

			var posX=this.value * height;
			var posY=this.saturation * width;

			context.moveTo(posX-10,posY);
			context.lineTo(posX+10,posY);

			context.moveTo(posX,posY-10);
			context.lineTo(posX,posY+10);

			context.strokeStyle="#fff";
			context.stroke();
		}

		this.renderBar = function() {
			var context=this.bar.getContext("2d");

			var width=40;
			var height=200;
			var qwidth=width*4;

			var color = new Color();

			var id=context.createImageData(width, height);

			this.bar.width=width;
			this.bar.height=height;

			for (var y=0;y<height;y++) {
				color.fromHSV((y/height)*360, 1, 1);
				for (var x=0;x<qwidth;x+=4) {
					var pos=(y*qwidth)+x;

					id.data[pos+0]=color.r;
					id.data[pos+1]=color.g;
					id.data[pos+2]=color.b;
					id.data[pos+3]=255;
				}
			}

			context.putImageData(id, 0, 0);

			var pos=(this.hue / 360) * height;

			context.moveTo(0,pos);
			context.lineTo(width,pos);
			context.strokeStyle="#fff";
			context.stroke();
		}
	}

/*************************************************************************
 * Color converter
 ************************************************************************/

	function Color() {
		this.r=0;
		this.g=0;
		this.b=0;

		this.fromHSV=function(h, s, v) {
			var chroma=s*v;
			var hx=h/60;
			var x=chroma*(1-Math.abs(hx % 2-1));
			var m=v-chroma;

			var rgb=[0,0,0];

			if (0 <= hx && hx < 1) {
				rgb=[chroma, x, 0];
			} else if (1 <= hx && hx < 2) {
				rgb=[x, chroma, 0];
			} else if (2 <= hx && hx < 3) {
				rgb=[0, chroma, x];
			} else if (3 <= hx && hx < 4) {
				rgb=[0, x, chroma];
			} else if (4 <= hx && hx < 5) {
				rgb=[x, 0, chroma];
			} else if (5 <= hx && hx < 6) {
				rgb=[chroma, 0, x];
			}

			this.r=(rgb[0] + m)*255;
			this.g=(rgb[1] + m)*255;
			this.b=(rgb[2] + m)*255;

			return this;
		}

		this.fromHex=function(input) {
			var hex3=input.match(/[0-9a-f]/ig);
			var hex6=input.match(/[0-9a-f]{2}/ig);
			var hex=[];

			if (hex3 != null && hex3.length == 3) {
				for (var i=0;i<hex3.length;i++)
					hex[i]=hex3[i] + hex3[i];
			} else if (hex6 != null && hex6.length == 3) {
				hex=hex6;
			}

			this.r=parseInt(hex[0], 16);
			this.g=parseInt(hex[1], 16);
			this.b=parseInt(hex[2], 16);
		}

		this.toHex=function(hash) {
			if (isNaN(this.r))
				return "";

			return (hash ? "#" : "") +
				(this.r < 16 ? "0" : "") + Math.trunc(this.r).toString(16) +
				(this.g < 16 ? "0" : "") + Math.trunc(this.g).toString(16) +
				(this.b < 16 ? "0" : "") + Math.trunc(this.b).toString(16);
		}

		this.toHSV=function() {
			var h=0, s=0, v=0;

			var r=this.r / 255;
			var g=this.g / 255;
			var b=this.b / 255;

			var max=Math.max(r, g, b);
			var min=Math.min(r, g, b);

			if (max == 0)
				return [ NaN, 0, 0 ];

			var d = max - min;

			v = max;
			s = d/max;

			if (r == max) {
				h = (g - b)/d;
			} else if (g == max) {
				h = 2 + (b - r)/d;
			} else if (b == max) {
				h = 4 + (r - g)/d;
			}

			h*=60;

			if (h < 0)
				h+=360;

			return [ h, s, v ];
		}
	}

})(window,document);
