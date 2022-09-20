input.onButtonPressed(Button.A, function () {
	
})
let vol = 0
let strip = APA102.createStrip(8, PixelMode.RGB)
strip.setPin(DigitalPin.P1, DigitalPin.P0)
strip.setBrightness(200)
basic.forever(function () {
    vol = Math.map(input.soundLevel(), 0, 150, 0, 360)
    strip.showColor(APA102.toCol(vol, 255, 50))
})
