const { isWin, isLinux } = require("./index");

// Asks the OS to own maximize / resize / snapping for the frameless window.
// true  -> the OS handles it and the app just mirrors the state into its UI
// false -> the app falls back to its own resize handles and maximize logic (main.js)
function enableNativeWindow(w) {
  if (isWin) return enableWindowsSnap(w);
  // Linux window managers maximize and resize frameless windows themselves.
  // PULSE_MANUAL_WINDOW=1 switches to the app's own handles if a desktop doesn't cooperate.
  if (isLinux) return process.env.PULSE_MANUAL_WINDOW !== "1";
  return false;
}

// Linux fallback for setups without a compositor (transparent windows come out black there):
// PULSE_OPAQUE=1 or the --opaque flag gives a normal opaque window.
function isOpaque() {
  return isLinux && (process.env.PULSE_OPAQUE === "1" || process.argv.includes("--opaque"));
}

// A transparent Electron window has no native resize frame, so Windows won't offer Snap Layouts or edge snapping.
// Adding WS_THICKFRAME / WS_MAXIMIZEBOX / WS_MINIMIZEBOX to it restores those.
function enableWindowsSnap(w) {
  try {
    const koffi = require("koffi");
    const user32 = koffi.load("user32.dll");
    const GetStyle = user32.func(
      "intptr_t __stdcall GetWindowLongPtrW(void* hWnd, int nIndex)",
    );
    const SetStyle = user32.func(
      "intptr_t __stdcall SetWindowLongPtrW(void* hWnd, int nIndex, intptr_t value)",
    );
    const SetPos = user32.func(
      "bool __stdcall SetWindowPos(void* hWnd, void* after, int x, int y, int cx, int cy, uint flags)",
    );
    const buf = w.getNativeWindowHandle();
    const hwnd = koffi.decode(buf, "void *");
    const GWL_STYLE = -16;
    const style = Number(GetStyle(hwnd, GWL_STYLE));
    SetStyle(hwnd, GWL_STYLE, style | 0x00040000 | 0x00010000 | 0x00020000);
    SetPos(hwnd, null, 0, 0, 0, 0, 0x0001 | 0x0002 | 0x0004 | 0x0010 | 0x0020);
    // WS_THICKFRAME makes DWM draw its own square border/backdrop behind the page; round it and drop the border
    try {
      const SetAttr = koffi
        .load("dwmapi.dll")
        .func(
          "int __stdcall DwmSetWindowAttribute(void* hWnd, uint attr, int *val, uint size)",
        );
      SetAttr(hwnd, 33, [2], 4); // DWMWA_WINDOW_CORNER_PREFERENCE = DWMWCP_ROUND
      SetAttr(hwnd, 34, [0xfffffffe], 4); // DWMWA_BORDER_COLOR = DWMWA_COLOR_NONE
    } catch (err) {
      console.error("DWM corner attributes unavailable:", err.message);
    }
    return true;
  } catch (err) {
    console.error("native snap unavailable:", err.message);
    return false;
  }
}

module.exports = { enableNativeWindow, isOpaque };
