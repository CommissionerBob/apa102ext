def on_button_pressed_a():
    pass
input.on_button_pressed(Button.A, on_button_pressed_a)

vol = 0
strip = APA102.create_strip(8, PixelMode.RGB)
strip.set_pin(DigitalPin.P1, DigitalPin.P0)
strip.set_brightness(200)

def on_forever():
    global vol
    vol = Math.map(input.sound_level(), 0, 150, 0, 360)
    strip.show_color(APA102.to_col(vol, 255, 50))
basic.forever(on_forever)
