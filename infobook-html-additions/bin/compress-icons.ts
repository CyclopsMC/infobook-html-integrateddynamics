#!/usr/bin/env node
import * as fs from "fs";
import minimist = require("minimist");
import {resolve} from "path";
import {IconCompressor} from "../lib/compress/IconCompressor";

// Process CLI args
const args = minimist(process.argv.slice(2));
if (args.help || args._.length < 1) {
  printUsage();
}

async function run(outputDir: string) {
  const iconsDir = resolve(outputDir, 'assets', 'icons');

  if (!fs.existsSync(iconsDir)) {
    process.stderr.write(`Icons directory not found: ${iconsDir}\n`);
    process.exit(1);
  }

  const compressor = new IconCompressor(iconsDir);
  await compressor.compress();
}

function printUsage() {
  process.stdout.write(`compress-icons Losslessly compress PNG icons in the HTML output directory
Usage:
  compress-icons /path/to/output
Options:
  --help  print this help message
`);
  process.exit(1);
}

run(args._[0]).catch((e) => {
  // tslint:disable-next-line:no-console
  console.error(e);
  process.exit(1);
});
