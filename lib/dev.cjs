const fs = require('node:fs/promises')
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

async function main() {
  if (process.argv.includes("--gen-test-html")) {
    await removeOldGeneratedTestFiles(['test.js', 'test.html'])
    await compileTypeScript({tsMinorVersion: '4.7', in_: "test.ts", out: "test.js"})
    await generateTestHTML({libFile: "index.js", testFile: "test.js", out: "test.html"})
  }

  if (process.argv.includes("--open-test-html")) {
    await openFileWithDefaultApp("test.html")
  }

  if (process.argv.includes("--compile-other-ts-versions")) {
    for (const tsMinorVersion of ["5.2"]) {
      await compileTypeScript({tsMinorVersion, in_: "test.ts", out: "test.js"})
    }
  }
}

async function removeOldGeneratedTestFiles(filePaths) {
  for (const filePath of filePaths) {
    if (await fileExists(filePath)) {
      console.log(`Removing '${filePath}'...`)
      await fs.rm(filePath)
      console.log(`Removed '${filePath}'.`)
    }
  }
}

async function compileTypeScript({
  tsMinorVersion,
  in_,
  out,
}) {
  const tscExe = `./node_modules/typescript-${tsMinorVersion}/bin/tsc`
  let {stdout: tsFullVersion} = await exec(`${tscExe} --version`)
  tsFullVersion = tsFullVersion.trim()
  console.log(`[TypeScript ${tsFullVersion}]: Compiling '${in_}' to '${out}'...`)
  await exec(`${tscExe} --allowJs --checkJs --target 'es6' --lib 'es2015,dom' --outDir '.' ${in_}`)
  const tempOutFile = in_.replace(/.ts$/g, '.js')
  if (tempOutFile !== out) {
    await fs.cp(tempOutFile, out)
    await fs.unlink(tempOutFile)
  }
  console.log(`[TypeScript ${tsFullVersion}]: Compiled '${in_}' to '${out}'.`)
}

async function generateTestHTML({libFile, testFile, out}) {
  console.log(`Generating ${out}...`)
  
  const libFileContent = await fs.readFile(libFile, {encoding: 'utf-8'})
  const testFileContent = await fs.readFile(testFile, {encoding: 'utf-8'})

  const htmlFileContent = [
    '<!DOCTYPE html>'                                                                ,
    '<html lang="en">'                                                               ,
    '<head>'                                                                         ,
    '    <meta charset="UTF-8">'                                                     ,
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0">'     ,
    '<script id="lib" type="module">'                                                ,
    // The contents of 'index.js' is injected into the script tag with id=lib
    libFileContent                                                                   ,
    '</script>'                                                                      ,
    '    <title>UIAD Tests</title>'                                                  ,
    '</head>'                                                                        ,
    '<body>'                                                                         ,
    '    <main id="log"></main>'                                                     ,
    '<script type="module">'                                                         ,
    // The inner html of the script tag with id=lib is converted to a data url and imported
    'const libText = document.getElementById("lib").innerHTML'                       ,
    'const libModule = await import(`data:text/javascript;base64,` + btoa(libText))' ,
    // The import statement in 'test.ts' 
    // is replaced with a call to the import function on the libModule object
    testFileContent.replace(/import (.+) from .+/, 'const $1 = libModule')           ,
    '</script>'                                                                      ,
    '</body>'                                                                        ,
    '</html>'                                                                        ,
  ].join('\n')

  await fs.writeFile(out, htmlFileContent)

  console.log(`Generated ${out}.`)
}

async function openFileWithDefaultApp(filePath) {
  console.log(`Opening ${filePath} with default application...`)

  switch (process.platform) {
    case 'linux':
      await exec(`xdg-open ${filePath}`)
      break
    case 'darwin':
      await exec(`open ${filePath}`)
      break
    case 'win32':
      await exec(`start ${filePath}`)
      break
    default:
      console.log(`ERROR: Unhandled operating system '${process.platform}'. Feel free to submit a PR :)`)
      process.exit(1)
  }

  console.log(`Opened ${filePath} with default application.`)
}

// Utilities
// =========

async function fileExists(path) {
  try {
    await fs.access(path, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

main(); 