const { spawn } = require("child_process");
const path = require("path");
const cwd = path.join(__dirname, "frontend");
console.log("cwd", cwd);
const child = spawn("npm", ["run", "test:unit"], { shell: true, stdio: "inherit", cwd });
child.on("error", err => {
  console.error("ERR", err);
});
