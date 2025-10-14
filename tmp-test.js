const { spawn } = require("child_process");
const child = spawn("npm", ["--version"], { shell: true, stdio: "inherit" });
child.on("error", err => console.error("ERR", err));
