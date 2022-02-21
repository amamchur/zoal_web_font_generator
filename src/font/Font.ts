import {Glyph} from "./Glyph";
import {UnicodeRange} from "./UnicodeRange";

export class Font {
  name: string;
  glyphs: Glyph[] = [];
  unicodeRanges: UnicodeRange[] = [];

  constructor(name: string) {
    this.name = name;
  }
}
