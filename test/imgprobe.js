// emits a sixel image and an iTerm2 inline image
const w = s => process.stdout.write(s);
// 6x12 px sixel: two bands of a solid red/blue block
w('\x1bPq#0;2;100;0;0#1;2;0;0;100#0!12~-#1!12~\x1b\\');
w('\r\n');
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
w(`\x1b]1337;File=inline=1;width=4;height=2;preserveAspectRatio=0:${png}\x07`);
w('\r\nIMG_DONE\r\n');
