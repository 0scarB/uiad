const fs = require('node:fs/promises')
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

const DEV_SERVER_HOST = "localhost"
const DEV_SERVER_PORT = 8080
const DEV_SERVER_POLL_FILES_INTERVAL = 0.05

async function main() {
  if (process.argv.includes("--gen-test-html")) {
    await rebuildTestHTML()
  }

  if (process.argv.includes("--open-test-html")) {
    await openURIWithDefaultApp("test.html")
  }

  if (process.argv.includes("--compile-other-ts-versions")) {
    compileToOtherTypeScriptVersions()
  }

  if (process.argv.includes("--test-server")) {
    await runTestServer()
  }
}

async function rebuildTestHTML() {
  await removeOldGeneratedTestFiles(['test.js', 'test.html'])
  await compileTypeScript({tsMinorVersion: '4.7', in_: "test.ts", out: "test.js"})
  await generateTestHTML({libFile: "index.js", testFile: "test.js", out: "test.html"})
}

async function compileToOtherTypeScriptVersions() {
  for (const tsMinorVersion of ["5.2"]) {
    await compileTypeScript({tsMinorVersion, in_: "test.ts", out: "test.js"})
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

async function openURIWithDefaultApp(uri) {
  console.log(`Opening ${uri} with default application...`)

  switch (process.platform) {
    case 'linux':
      await exec(`xdg-open ${uri}`)
      break
    case 'darwin':
      await exec(`open ${uri}`)
      break
    case 'win32':
      await exec(`start ${uri}`)
      break
    default:
      console.log(`ERROR: Unhandled operating system '${process.platform}'. Feel free to submit a PR :)`)
      process.exit(1)
  }

  console.log(`Opened ${uri} with default application.`)
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

function runTestServer() {
  let lastModTimes = {
    "./index.js": 0,
    "./index.d.ts": 0,
    "./test.ts": 0,
  }
  let latestBuildWasServed = false
  let rebuildPromise = Promise.resolve()
  let isRebuilding = false

  async function getNewModTimes() {
    const newModTimes = {}
    for (const filePath in lastModTimes) {
      const newModTime = (await fs.stat(filePath)).mtimeMs
      newModTimes[filePath] = newModTime
    }
    
    return newModTimes
  }

  async function pollAndRebuildOnModify() {
    setInterval(() => {
      if (isRebuilding) {
        return
      }

      getNewModTimes().then(newModTimes => {
        const currentTime = new Date().toISOString()
        let filesWereUpdated = false
        for (const filePath in newModTimes) {
          if (newModTimes[filePath] > lastModTimes[filePath]) {
            console.log(`[Polling ${currentTime}]: ${filePath} changed!`)
            filesWereUpdated = true
          }
        }
        if (!filesWereUpdated) {
          // console.log(`[Polling ${currentTime}]: Nothing changed`)
          return
        }
        isRebuilding = true
        rebuildPromise = rebuildTestHTML()
        rebuildPromise.then(() => {
          lastModTimes = newModTimes
          latestBuildWasServed = false
          isRebuilding = false
          compileToOtherTypeScriptVersions()
        })
      })
    }, DEV_SERVER_POLL_FILES_INTERVAL * 1000)
  }

  async function handleConnect() {
    const serverURL = `http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}`
    console.log(
      `Serving uiad test page at ${serverURL}`
    )
    await openURIWithDefaultApp(serverURL)
  }

  // TODO: Use web socket!

  async function handleGETRoot(req, res) {
    await rebuildPromise
    const htmlContent = await fs.readFile("./test.html")
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(htmlContent)
    latestBuildWasServed = true
  }

  async function handleGETPageReload(req, res) {
    if (latestBuildWasServed) {
      res.writeHead(204, {'Content-Type': 'text/plain'})
      res.end("No content to reload!")
      return
    }

    await rebuildPromise
    const htmlContent = await fs.readFile("./test.html")
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(htmlContent)
    latestBuildWasServed = true
  }

  async function handlePOSTReport(req, res) {
    const body = []
    req.on('data', (chunk) => body.push(chunk))
    req.on('end', () => console.log(Buffer.concat(body).toString()))
    res.writeHead(200, {'Content-Type': 'text/plain'})
    res.end('ok')
  }

  const runServer = new Promise(
    (resolve, reject) => {
      const http = require('node:http');

      const server = http.createServer((req, res) => {
        if (req.url === "/" && req.method === "GET") {
          handleGETRoot(req, res).catch((err) => reject(err))
        } else if (req.url === "/page-reload" && req.method === "GET") {
          handleGETPageReload(req, res).catch((err) => reject(err))
        } else if (req.url === "/report" && req.method === "POST") {
          handlePOSTReport(req, res)
        } else {
          res.writeHead(404, {'Content-Type': 'text/plain'})
          res.end(`Unhandled route '${req.url}'`)
        } 
      })

      server.listen(DEV_SERVER_PORT, DEV_SERVER_HOST, () => {
        handleConnect().catch((err) => reject(err))
      })
    }
  )

  return Promise.all([
    pollAndRebuildOnModify(),
    runServer,
  ])
}

main() 