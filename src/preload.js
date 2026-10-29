const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("term", {
  winBuild: Number(process.getSystemVersion().split(".")[2]) || 0,
  create: (cols, rows) => ipcRenderer.invoke("pty:create", { cols, rows }),
  write: (id, d) => ipcRenderer.send("pty:write", id, d),
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
