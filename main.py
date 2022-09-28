strip = apa102.create_strip(60, PixelMode.RGB)
range2 = strip.range(0, 2)
strip.set_pin(DigitalPin.P1, DigitalPin.P0)
range2 = strip.range(10, 10)
range2.showbow(1, 180)
for index in range(100):
    range2.rotate(1)
    range2.show()
    basic.pause(100)