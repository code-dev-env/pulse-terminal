const { contextBridge, ipcRenderer, webUtils } = require("electron");
// version, default shell name and the shells offered in the new-tab menu, read synchronously so the page can start from them
const info = ipcRenderer.sendSync("app:info");
contextBridge.exposeInMainWorld("term", {
  platform: process.platform,
  version: info.version,
  profiles: info.profiles,
  // only meaningful on Windows, where xterm needs the ConPTY build number
  winBuild:
    process.platform === "win32"
      ? Number(process.getSystemVersion().split(".")[2]) || 0
      : 0,
  // name of the shell new tabs start (shown on a tab until the shell sets its own title)
  shellLabel: info.label,
  // true when the window was started without transparency (Linux fallback)
  opaque: process.argv.includes("--ct-opaque"),
  // saved settings, read synchronously so the page can start from them; the main process owns the file
  settings: ipcRenderer.sendSync("settings:get"),
  setSetting: (k, v) => ipcRenderer.send("settings:set", k, v),
  onSetting: (cb) => ipcRenderer.on("settings:changed", (e, k, v) => cb(k, v)),
  create: (cols, rows, profile, light) =>
    ipcRenderer.invoke("pty:create", { cols, rows, profile, light: !!light }),
  write: (id, d) => ipcRenderer.send("pty:write", id, d),
  ack: (id, n) => ipcRenderer.send("pty:ack", id, n),
  resize: (id, c, r) => ipcRenderer.send("pty:resize", id, c, r),
  kill: (id) => ipcRenderer.send("pty:kill", id),
  onData: (cb) => ipcRenderer.on("pty:data", (e, id, d) => cb(id, d)),
  onExit: (cb) => ipcRenderer.on("pty:exit", (e, id) => cb(id)),
  // the main process decides which links may be launched
  openExternal: (url) => ipcRenderer.send("shell:open", String(url)),
  // absolute path of a file dropped onto the window
  pathOf: (file) => webUtils.getPathForFile(file),
  resizeStart: (edge) => ipcRenderer.send("win:rs-start", edge),
  resizeEnd: () => ipcRenderer.send("win:rs-end"),
  minimize: () => ipcRenderer.send("win:min"),
  maximize: () => ipcRenderer.send("win:max"),
  close: () => ipcRenderer.send("win:close"),
  isMaximized: () => ipcRenderer.invoke("win:ismax"),
  onMaxState: (cb) =>
    ipcRenderer.on("win:maxstate", (e, m, native) => cb(m, native)),
});
