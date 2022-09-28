let strip = apa102.createStrip(60, PixelMode.RGB)
let range2 = strip.range(0, 2)
strip.setPin(DigitalPin.P1, DigitalPin.P0)
range2 = strip.range(10, 30)
range2.showbow(1, 180)
for (let index = 0; index <= 20; index++) {
    range2 = strip.range(10, 30 - index)
    range2.clear()
    range2.showbow(1, 180)
    basic.pause(1)
}
