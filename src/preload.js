const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("term", {
  platform: process.platform,
  // only meaningful on Windows, where xterm needs the ConPTY build number
  winBuild:
    process.platform === "win32"
      ? Number(process.getSystemVersion().split(".")[2]) || 0
      : 0,
  // name of the shell new tabs start (shown on a tab until the shell sets its own title)
  shellLabel: ipcRenderer.sendSync("shell:label"),
  // true when the window was started without transparency (Linux fallback)
  opaque: process.argv.includes("--ct-opaque"),
  // saved settings, read synchronously so the page can start from them; the main process owns the file
  settings: ipcRenderer.sendSync("settings:get"),
  setSetting: (k, v) => ipcRenderer.send("settings:set", k, v),
  onSetting: (cb) => ipcRenderer.on("settings:changed", (e, k, v) => cb(k, v)),
  create: (cols, rows) => ipcRenderer.invoke("pty:create", { cols, rows }),
  write: (id, d) => ipcRenderer.send("pty:write", id, d),
  ack: (id, n) => ipcRenderer.send("pty:ack", id, n),
  resize: (id, c, r) => ipcRenderer.send("pty:resize", id, c, r),
  kill: (id) => ipcRenderer.send("pty:kill", id),
  onData: (cb) => ipcRenderer.on("pty:data", (e, id, d) => cb(id, d)),
  onExit: (cb) => ipcRenderer.on("pty:exit", (e, id) => cb(id)),
  resizeStart: (edge) => ipcRenderer.send("win:rs-start", edge),
  resizeEnd: () => ipcRenderer.send("win:rs-end"),
  minimize: () => ipcRenderer.send("win:min"),
  maximize: () => ipcRenderer.send("win:max"),
  close: () => ipcRenderer.send("win:close"),
  isMaximized: () => ipcRenderer.invoke("win:ismax"),
  onMaxState: (cb) =>
    ipcRenderer.on("win:maxstate", (e, m, native) => cb(m, native)),
});
