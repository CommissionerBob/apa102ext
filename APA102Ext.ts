/**
 * Well known colors for a APA102 strip
 */
enum PixelColors {
    //% block=red
    Red = 0xFF0000,
    //% block=orange
    Orange = 0xFF7F00,
    //% block=yellow
    Yellow = 0xFFFF00,
    //% block=green
    Green = 0x00FF00,
    //% block=cyan
    Cyan = 0x00FFFF,
    //% block=blue
    Blue = 0x0000FF,
    //% block=indigo
    Indigo = 0x4B0082,
    //% block=purple
    Purple = 0x800080,
    //% block=white
    White = 0xFFFFFF
}

/**
 * Different modes for APA102 strips
 */
enum PixelMode {
    //% block="RGB"
    RGB = 0,
    //% block="RBG"
    RBG = 1,
    //% block="GRB"
    GRB = 2,
    //% block="GBR"
    GBR = 3,
    //% block="BRG"
    BRG = 4,
    //% block="BGR"
    BGR = 5,

}

/**
 * Functions to operate APA102 strips.
 */
//% weight=5 color=#619300 icon="\uf110"
namespace apa102 {
    let MAX_BRIGHTNESS = 31 // Safeguard: Set to a value appropriate for your setup
    let LED_START = 0b11100000 // Three "1" bits, followed by 5 brightness bits
    let RGB_MAP = [
        [3, 2, 1], [3, 1, 2], [2, 3, 1],
        [2, 1, 3], [1, 3, 2], [1, 2, 3]
    ]

    /**
     * A APA102 strip
     */
    export class Strip {
        buf: Buffer;
        // TODO: encode as bytes instead of 32bit
        brightness: number;
        start: number; // start offset in LED strip
        _length: number; // number of LEDs
        _mode: PixelMode;

        /**
         * Shows all LEDs to a given color (range 0-255 for r, g, b). 
         * @param rgb RGB color of the LED
         */
        //% blockId="APA102_set_strip_color" block="%strip|show color %rgb=APA102_colors"
        //% strip eg: neoStrip
        //% weight=98 blockGap=8
        showColor(rgb: number) {
            this.setAllRGB(rgb);
            this.show();
        }

        /**
         * Shows all LEDs to a given hue (hue = 1 - 360). 
         * @param hue color of the LED
         */
        //% blockId="APA102_set_strip_HSL" block="%strip|show HSL %hsl=APA102_hsl"
        //% strip eg: neoStrip
        //% weight=98 blockGap=8
        showHSL(hsl: HSL) {
            let rgb = toCol(hsl.h, hsl.s, hsl.l);
            this.setBrightness(hsl.l)
            this.setAllRGB(rgb);
            this.show();
        }
        
        /**
        * Shows a rainbow pattern on all LEDs.
        * @param startHue the start hue value for the rainbow, eg: 1
        * @param endHue the end hue value for the rainbow, eg: 360
        */
        //% blockId="set_strip_bow" block="%strip|show Rainbow from %startHue|to %endHue"
        //% strip.defl=strip
        //% weight=85 blockGap=8
        
        showbow(startHue: number = 1, endHue: number = 360) {
            if (this._length <= 0) return;

            startHue = startHue >> 0;
            endHue = endHue >> 0;
            const saturation = 100;
            const luminance = 31;
            const steps = this._length;
            const direction = HueInterpolationDirection.Clockwise;

            //hue
            const h1 = startHue;
            const h2 = endHue;
            const hDistCW = ((h2 + 360) - h1) % 360;
            const hStepCW = Math.idiv((hDistCW * 100), steps);
            const hDistCCW = ((h1 + 360) - h2) % 360;
            const hStepCCW = Math.idiv(-(hDistCCW * 100), steps);
            let hStep: number;
            if (direction === HueInterpolationDirection.Clockwise) {
                hStep = hStepCW;
            } else if (direction === HueInterpolationDirection.CounterClockwise) {
                hStep = hStepCCW;
            } else {
                hStep = hDistCW < hDistCCW ? hStepCW : hStepCCW;
            }
            const h1_100 = h1 * 100; //we multiply by 100 so we keep more accurate results while doing interpolation

            //sat
            const s1 = saturation;
            const s2 = saturation;
            const sDist = s2 - s1;
            const sStep = Math.idiv(sDist, steps);
            const s1_100 = s1 * 100;

            //lum
            const l1 = luminance;
            const l2 = luminance;
            const lDist = l2 - l1;
            const lStep = Math.idiv(lDist, steps);
            const l1_100 = l1 * 100

            //interpolate
            if (steps === 1) {
                this.setPixelColor(0, toCol(h1 + hStep, s1 + sStep, l1 + lStep))
            } else {
                this.setPixelColor(0, toCol(startHue, saturation, luminance));
                for (let i = 1; i < steps - 1; i++) {
                    const h = Math.idiv((h1_100 + i * hStep), 100) + 360;
                    const s = Math.idiv((s1_100 + i * sStep), 100);
                    const l = Math.idiv((l1_100 + i * lStep), 100);
                    this.setPixelColor(i, toCol(h, s, l));
                }
                this.setPixelColor(steps - 1, toCol(endHue, saturation, luminance));
            }
            this.show();
        }
        /**
         * Displays a vertical bar graph based on the `value` and `high` value.
         * If `high` is 0, the chart gets adjusted automatically.
         * @param value current value to plot
         * @param high maximum value, eg: 255
         */
        //% blockId=APA102_show_bar_graph block="%strip|show bar graph of %value |up to %high" icon="\uf080" blockExternalInputs=true
        //% weight=41 blockGap=8
        showBarGraph(value: number, high: number): void {
            if (high <= 0) {
                this.clear();
                this.setPixelColor(0, PixelColors.Blue);
                this.show();
                return;
            }

            value = Math.abs(value);
            const n = this._length;
            const n1 = n - 1;
            let v = Math.idiv((value * n), high);
            if (v == 0) {
                this.setPixelColor(0, 0x666600);
                for (let i = 1; i < n; ++i)
                    this.setPixelColor(i, 0);
            } else {
                for (let i = 0; i < n; ++i) {
                    if (i <= v) {
                        let b = Math.idiv( i * 255 , n1);
                        this.setPixelColor(i, apa102.rgb(b, 0, 255 - b));
                    }
                    else this.setPixelColor(i, 0);
                }
            }
            this.show();
        }

        /**
         * Set LED to a given color (range 0-255 for r, g, b). 
         * You need to call ``show`` to make the changes visible.
         * @param pixeloffset position of the APA102 in the strip
         * @param rgb RGB color of the LED
         */
        //% blockId="APA102_set_pixel_color" block="%strip|set pixel color at %pixeloffset|to %rgb=APA102_colors"
        //% weight=97 blockGap=8
        setPixelColor(pixeloffset: number, rgb: number): void {
            this.setPixelRGB(pixeloffset, rgb);
        }

        /**
         * Send all the changes to the strip.
         */
        //% blockId="APA102_show" block="%strip|show"
        //% weight=96 blockGap=8
        show() {
            for (let i = 0; i < 4; i++) {
                pins.spiWrite(0);
            }
            /**for (let i = this.start * 4; i < (this._length + this.start) * 4; i++) {
                pins.spiWrite(this.buf[i]);
            }
            */

            for (let i = 0; i < (this._length + this.start) * 4; i++) {
                pins.spiWrite(this.buf[i]);
            }

            for (let i = 0; i < (this._length + 15) / 16; i++) {
                pins.spiWrite(0);
            }
        }

        /**
         * Turn off all LEDs.
         * You need to call ``show`` to make the changes visible.
         */
        //% blockId="APA102_clear" block="%strip|clear"
        //% weight=76 blockGap=8
        clear(): void {
            for (let i = 0; i < this.start + this._length; i++) {
                this.buf[i * 4 + 1] = 0;
                this.buf[i * 4 + 2] = 0;
                this.buf[i * 4 + 3] = 0;
            }
        }

        /**
         * Gets the number of pixels declared on the strip
         */
        //% blockId="APA102_length" block="%strip|length"
        //% weight=60  blockGap=8 advanced=true
        length() {
            return this._length;
        }
        /**
        * Gets the start number the strip
        */
        //% blockId="APA102_startNum" block="%strip|startNum"
        //% weight=60  blockGap=8 advanced=true
        startNum() {
            return this.start;
        }
        /**
         * Set the brightness of the strip. This flag only applies to future operation.
         * @param brightness a measure of LED brightness in 0-31. eg: 31
         */
        //% blockId="APA102_set_brightness" block="%strip|set brightness %brightness"
        //% weight=59 blockGap=8 advanced=true
        setBrightness(brightness: number): void {
            this.brightness = brightness & 0b00011111;
            for (let i = this.start; i < this._length + this.start; i++) {
                this.buf[i * 4] = (this.brightness & 0b00011111) | LED_START;
            }
        }

        /**
         * Apply brightness to current colors possible future operation.
         **/
        //% blockId="APA102_each_brightness" block="%strip|ease brightness"
        //% weight=58  blockGap=8 advanced=true
        easeBrightness(): void {
            this.setBrightness(1);
        }

        /** 
         * Create a range of LEDs.
         * @param start offset in the LED strip to start the range
         * @param length number of LEDs in the range. eg: 4
         */
        //% blockId="APA102_range" block="%strip|range from %start|with %length|leds"
        
        //% parts="apa102"
        //% blockSetVariable=range
        //% weight=95 blockGap=8 advanced=true
        range(start2: number, length: number): Strip {
            start2 = start2 >> 0;
            length = length >> 0;
            let newstrip = new Strip();
            newstrip.buf = this.buf;
            newstrip.brightness = this.brightness;
            newstrip.start = this.start + Math.clamp(0, this._length - 1, start2);
            newstrip._length = Math.clamp(0, this._length - (newstrip.start - this.start), length);
            return newstrip;
        }
        

        /**
         * Shift LEDs forward and clear with zeros.
         * You need to call ``show`` to make the changes visible.
         * @param offset number of pixels to shift forward, eg: 1
         */
        //% blockId="APA102_shift" block="%strip|shift pixels by %offset" 
        //% weight=40 blockGap=8
        shift(offset: number = 1): void {
            this.buf.shift(-offset * 4, this.start * 4, this._length * 4);
            this.buf[this.start * 4] = (this.brightness & 0b00011111) | LED_START;
        }

        /**
         * Rotate LEDs forward.
         * You need to call ``show`` to make the changes visible.
         * @param offset number of pixels to rotate forward, eg: 1
         */
        //% blockId="APA102_rotate" block="%strip|rotate pixels by %offset" blockGap=8
        //% weight=39 blockGap=8
        rotate(offset: number = 1): void {
            this.buf.rotate(-offset * 4, this.start * 4, this._length * 4);
        }

        /**
         * Set the pin where the APA102 is connected, defaults to P8???P12.
         * @param sdi the serial data input pin where the APA102 is connected, eg: DigitalPin.P1
         * @param cki the serial clock input pin where the APA102 is connected, eg: DigitalPin.P0
         */
        //% blockId="APA102_setPin" block="%strip|set SDI pin %sdi|CKI pin %cki"
        //% weight=99 blockGap=8 
        setPin(sdi: DigitalPin, cki: DigitalPin): void {
            pins.spiPins(sdi, 0, cki);
            pins.spiFormat(8, 3);
            pins.spiFrequency(1000000);
        }

        private setBufferRGB(offset: number, red: number, green: number, blue: number): void {
            this.buf[offset + RGB_MAP[this._mode][0]] = red
            this.buf[offset + RGB_MAP[this._mode][1]] = green;;
            this.buf[offset + RGB_MAP[this._mode][2]] = blue;
        }

        private setAllRGB(rgb: number) {
            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);
            for (let i = 0; i < this.start; ++i) {
                this.setBufferRGB(i * 4, 0,0,0)
            }
            const end = this.start + this._length;
            for (let i = this.start; i < end; ++i) {
                this.setBufferRGB(i * 4, red, green, blue)
            }
        }

        private setPixelRGB(pixeloffset: number, rgb: number): void {
            if (pixeloffset < 0 || pixeloffset >= this._length)
                return;

            let pixeloffset2 = (pixeloffset + this.start) * 4;

            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            this.setBufferRGB(pixeloffset2, red, green, blue)
        }
    }

    /**
     * Create a new APA102 driver for `numleds` LEDs.
     * @param numleds number of leds in the strip, eg: 4
     */
    //% blockId="APA102_createStrip" block="APA102 strip with %numleds| leds as %mode"
    //% parts="apa102"
    //% blockSetVariable=strip
    //% weight=100 blockGap=8
    export function createStrip(numleds: number, mode: PixelMode): Strip {
        let strip = new Strip();
        let stride = 4;
        strip.buf = pins.createBuffer(numleds * stride);
        strip._mode = mode;
        strip.start = 0;
        strip._length = numleds;
        strip.setBrightness(1)
        strip.setPin(DigitalPin.P8, DigitalPin.P12);
        return strip;
    }

    /**
     * Converts red, green, blue channels into a RGB color
     * @param red value of the red channel between 0 and 255. eg: 255
     * @param green value of the green channel between 0 and 255. eg: 255
     * @param blue value of the blue channel between 0 and 255. eg: 255
     */
    //% blockId="APA102_rgb" block="red %red|green %green|blue %blue"
    //% weight=2 blockGap=8
    export function rgb(red: number, green: number, blue: number): number {
        return packRGB(red, green, blue);
    }
    /**
     * provides hue, saturaion and lumin channels
     * @param hue value between 0 and 360. eg: 180
     * @param sat value between 0 and 99. eg: 50
     * @param lum value between 0 and 31. eg: 20
     */
    //% blockId="APA102_hsl" block="Hue %hue|Sat %sat|Lum %lum"
    //% weight=2 blockGap=8
    export function hsl(hue: number, sat: number, lum: number): HSL {
        return new HSL(hue, sat, lum);
    }

    /**
     * Gets the RGB value of a known color
    */
    //% blockId="APA102_colors" block="%color"
    //% weight=1 blockGap=8
    export function colors(color: PixelColors): number {
        return color;
    }

    function packRGB(a: number, b: number, c: number): number {
        return ((a & 0xFF) << 16) | ((b & 0xFF) << 8) | (c & 0xFF);
    }
    function unpackR(rgb: number): number {
        let r = (rgb >> 16) & 0xFF;
        return r;
    }
    function unpackG(rgb: number): number {
        let g = (rgb >> 8) & 0xFF;
        return g;
    }
    function unpackB(rgb: number): number {
        let b = (rgb) & 0xFF;
        return b;
    }

    /**
     * A HSL (hue, saturation, luminosity) format color
     */
    export class HSL {
        h: number;
        s: number;
        l: number;
        constructor(h: number, s: number, l: number) {
            this.h = h % 360;
            this.s = Math.clamp(0, 99, s);
            this.l = Math.clamp(0, 31, l);
        }

        /**
         * Shifts the hue of a HSL color
         * @param hsl the HSL (hue, saturation, lightness) color
         * @param offset value to shift the hue channel by; hue is between 0 and 360. eg: 10
         */
        rotateHue(offset: number): void {
            this.h = (this.h + offset) % 360;
        }

    }   

    /**
     * Creates a HSL (hue, saturation, luminosity) color
     * @param hue value of the hue channel between 0 and 360. eg: 360
     * @param sat value of the saturation channel between 0 and 100. eg: 100
     * @param lum value of the luminosity channel between 0 and 100. eg: 50
    
    //% blockId="APA102_hsl" block="hue %hue|saturation %sat|luminosity %lum"
    //% weight=2 blockGap=8
    export function hsl(hue: number, sat: number, lum: number): HSL {
        return new HSL(hue, sat, lum);
    }
     */
    /**
         * Converts a hue saturation luminosity value into a RGB color
         * @param h hue from 0 to 360
         * @param s saturation from 0 to 99
         * @param l luminosity from 0 to 31
         */
    //% blockId=toCol block="hue %h|saturation %s|luminosity %l"
    function toCol(h: number, s: number, l: number): number {
        h = Math.round(h);
        s = Math.round(s);
        l = Math.round(l);

        h = h % 360;
        s = Math.clamp(0, 99, s);
        l = Math.clamp(0, 99, l);
        let c = Math.idiv((((100 - Math.abs(2 * l - 100)) * s) << 8), 10000); //chroma, [0,255]
        let h1 = Math.idiv(h, 60);//[0,6]
        let h2 = Math.idiv((h - h1 * 60) * 256, 60);//[0,255]
        let temp = Math.abs((((h1 % 2) << 8) + h2) - 256);
        let x = (c * (256 - (temp))) >> 8;//[0,255], second largest component of this color
        let r$: number;
        let g$: number;
        let b$: number;
        if (h1 == 0) {
            r$ = c; g$ = x; b$ = 0;
        } else if (h1 == 1) {
            r$ = x; g$ = c; b$ = 0;
        } else if (h1 == 2) {
            r$ = 0; g$ = c; b$ = x;
        } else if (h1 == 3) {
            r$ = 0; g$ = x; b$ = c;
        } else if (h1 == 4) {
            r$ = x; g$ = 0; b$ = c;
        } else if (h1 == 5) {
            r$ = c; g$ = 0; b$ = x;
        }
        let m = Math.idiv((Math.idiv((l * 2 << 8), 100) - c), 2);
        let r = r$ + m;
        let g = g$ + m;
        let b = b$ + m;
        return packRGB(r, g, b);
    }
    export enum HueInterpolationDirection {
        Clockwise,
        CounterClockwise,
        Shortest
    }

    
}


