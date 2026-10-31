const fs = require("fs");
const os = require("os");

const isWin = process.platform === "win32";
const isLinux = process.platform === "linux";

// One-line OS description for the startup banner
function osLabel() {
  if (isLinux) {
    try {
      const m = /^PRETTY_NAME="?([^"\n]*)"?/m.exec(
        fs.readFileSync("/etc/os-release", "utf8"),
      );
      if (m) return `${m[1]} (${os.release()})`;
    } catch {}
    return `Linux (${os.release()})`;
  }
  return `${os.version()} (${os.release()})`;
}

// The drive / mount whose free space the banner shows
function diskRoot() {
  return isWin
    ? (process.env.SystemDrive ? process.env.SystemDrive + "\\" : "C:\\")
    : "/";
}

module.exports = { isWin, isLinux, osLabel, diskRoot };
