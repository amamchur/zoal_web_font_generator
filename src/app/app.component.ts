import {Component, ViewChild, ElementRef} from '@angular/core';
import {Font} from "../font/Font";
import {Glyph} from "../font/Glyph";
import {UnicodeRange} from "../font/UnicodeRange";

const DEFAULT_RANGES: UnicodeRange[] = [
  {start: 0x0020, end: 0x007E, base: 0},
  {start: 0x0404, end: 0x0457, base: 0},
  {start: 0x0490, end: 0x0491, base: 0}
];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'zoal_web_font_generator';
  canvasWidth = 1366;
  canvasHeight = 768;
  fontName = 'FontName';
  fontSize = 16;
  threshold = 100;
  useThreshold = true;
  pixelSize = 10;
  value = 110;
  font?: Font = undefined;

  opentypeFont: any;
  displayedColumns: string[] = ['from', 'to', 'action'];

  ranges: UnicodeRange[] = [...DEFAULT_RANGES];
  rangeStart: string = "0x20";
  rangeEnd: string = "0x7e";

  @ViewChild('myCanvas', {static: false})
  myCanvas?: ElementRef<HTMLCanvasElement>;

  loadFont() {
    // @ts-ignore
    opentype.load('assets/Roboto-Regular.ttf', (error, font) => {
      if (!error) {
        this.opentypeFont = font;
        this.renderGlyph();
      }
    });
  }

  deleteRange(element: UnicodeRange) {
    this.ranges = this.ranges.filter((e) => {
      return e !== element;
    });
  }

  addRange() {
    let range = new UnicodeRange();
    range.start = parseInt(this.rangeStart, 16);
    range.end = parseInt(this.rangeEnd, 16);
    this.ranges = [...this.ranges, range];
  }

  setPixel(x: number, y: number): void {
    let el = this.myCanvas?.nativeElement;
    let ctx = el ? el.getContext("2d") : null;
    if (!ctx || !el) {
      console.error("Canvas not found!")
      return;
    }

    ctx.fillStyle = `rgba(0, 100, 0)`;
    ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
  }

  plotLine(x0: number, y0: number, x1: number, y1: number): void {
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, e2; /* error value e_xy */

    x1 = Math.round(x1);
    y1 = Math.round(y1);

    for (; ;) {  /* loop */
      x0 = Math.round(x0);
      y0 = Math.round(y0);

      this.setPixel(x0, y0);
      if (x0 == x1 && y0 == y1) break;
      e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      } /* e_xy+e_x > 0 */
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      } /* e_xy+e_y < 0 */
    }
  }

  plotQuadBezierSeg(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number): void {
    let sx = x2 - x1, sy = y2 - y1;
    let xx = x0 - x1, yy = y0 - y1, xy;         /* relative values for checks */
    let dx, dy, err, cur = xx * sy - yy * sx;                    /* curvature */
    if (sx * sx + sy * sy > xx * xx + yy * yy) { /* begin with longer part */
      x2 = x0;
      x0 = sx + x1;
      y2 = y0;
      y0 = sy + y1;
      cur = -cur;  /* swap P0 P2 */
    }
    if (cur != 0) {                                    /* no straight line */
      xx += sx;
      xx *= sx = x0 < x2 ? 1 : -1;           /* x step direction */
      yy += sy;
      yy *= sy = y0 < y2 ? 1 : -1;           /* y step direction */
      xy = 2 * xx * yy;
      xx *= xx;
      yy *= yy;          /* differences 2nd degree */
      if (cur * sx * sy < 0) {                           /* negated curvature? */
        xx = -xx;
        yy = -yy;
        xy = -xy;
        cur = -cur;
      }
      dx = 4.0 * sy * cur * (x1 - x0) + xx - xy;             /* differences 1st degree */
      dy = 4.0 * sx * cur * (y0 - y1) + yy - xy;
      xx += xx;
      yy += yy;
      err = dx + dy + xy;                /* error 1st step */
      do {
        this.setPixel(x0, y0);                                     /* plot curve */
        if (x0 == x2 && y0 == y2) return;  /* last pixel -> curve finished */
        y1 = 2 * err < dx ? 1 : 0;                  /* save value for test of y step */
        if (2 * err > dy) {
          x0 += sx;
          dx -= xy;
          err += dy += yy;
        } /* x step */
        if (y1) {
          y0 += sy;
          dy -= xy;
          err += dx += xx;
        } /* y step */
      } while (dy < dx);           /* gradient negates -> algorithm fails */
    }
    this.plotLine(x0, y0, x2, y2);                  /* plot remaining part to end */
  }

  private renderGlyph() {
    if (!this.opentypeFont) {
      return
    }

    let el = this.myCanvas?.nativeElement;
    let ctx = el ? el.getContext("2d") : null;
    if (!ctx || !el) {
      console.error("Canvas not found!")
      return;
    }

    let s = 'O';
    let glyph = this.opentypeFont.charToGlyph(s);
    ctx.clearRect(0, 0, el.width, el.height);
    let path = glyph.getPath(0, this.fontSize, this.fontSize);
    console.log(path.commands);

    let bb = path.getBoundingBox();
    path.draw(ctx);
    let width = Math.ceil(bb.x2 - bb.x1) + Math.floor(bb.x1);
    let height = Math.ceil(bb.y2 - bb.y1) + Math.floor(bb.y1);
    if (width <= 0 || height <= 0) {
      return;
    }

    let imgData = ctx.getImageData(0, 0, width, height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 600, 400);

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        let index = y * width * 4 + x * 4;
        let r = imgData.data[index];
        let g = imgData.data[index + 1];
        let b = imgData.data[index + 2];
        let a = imgData.data[index + 3];

        if (this.useThreshold) {
          if (a > this.threshold) {
            ctx.fillStyle = `rgba(0, 0, 0)`;
            ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
          }
        } else {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255.0})`;
          ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
        }
      }
    }

    let x = 0;
    let y = 0;
    for (let i = 0; i < path.commands.length; i++) {
      let cmd = path.commands[i];
      if (cmd.type === 'M') {
        x = Math.round(cmd.x);
        y = Math.round(cmd.y);
      } else if (cmd.type === 'L') {
        this.plotLine(x, y, Math.round(cmd.x), Math.round(cmd.y));
        x = Math.round(cmd.x);
        y = Math.round(cmd.y);
      } else if (cmd.type === 'C') {
        // this.b
        // ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
      } else if (cmd.type === 'Q') {
        //this.plotQuadBezierSeg(x, y, Math.round(cmd.x1), cmd.y1, cmd.x, cmd.y)
        // ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
      } else if (cmd.type === 'Z') {
        // ctx.closePath();
      }
    }

    // let glyphs = [];
    // for (let i = 0; i < this.ranges.length; i++) {
    //   let r = this.ranges[i];
    //   for (let j = r.start; j <= r.end; j++) {
    //     let s = String.fromCharCode(j);
    //     let g = this.opentypeFont.charToGlyph(s);
    //     ctx.clearRect(0, 0, el.width, el.height);
    //
    //     let path = g.getPath(0, this.fontSize, this.fontSize);
    //     let bb = path.getBoundingBox();
    //     console.log(bb);
    //     path.draw(ctx);
    //
    //     let width = Math.ceil(bb.x2 - bb.x1);
    //     let height = Math.ceil(bb.y2 - bb.y1)
    //     if (width > 0 && height > 0) {
    //       let data = ctx.getImageData(Math.floor(bb.x1), Math.floor(bb.y1), width, height);
    //       console.log(data);
    //     }
    //   }
    // }
  }

  onDataChange($event: any) {
    this.renderGlyph();
  }
}
