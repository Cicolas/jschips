const esbuild = require("esbuild");
const fs = require("fs");

async function build() {
  fs.mkdirSync("dist", { recursive: true });

  await esbuild.build({
    entryPoints: ["jschips.js"],
    outfile: "dist/jschips.min.js",
    minify: true,
  });

  await esbuild.build({
    entryPoints: ["styles.css"],
    outfile: "dist/jschips.min.css",
    minify: true,
  });

  const jsSize = fs.statSync("dist/jschips.min.js").size;
  const cssSize = fs.statSync("dist/jschips.min.css").size;
  console.log(`dist/jschips.min.js  ${jsSize} bytes`);
  console.log(`dist/jschips.min.css  ${cssSize} bytes`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
