/**
 * Post-codegen workaround for custom Android package names (create-nitro-module pattern).
 */
const path = require('node:path')
const { writeFile, readFile } = require('node:fs/promises')

const androidWorkaround = async () => {
  const androidOnLoadFile = path.join(
    process.cwd(),
    'nitrogen/generated/android',
    'TaqlynSdkOnLoad.cpp',
  )
  try {
    const str = await readFile(androidOnLoadFile, { encoding: 'utf8' })
    await writeFile(androidOnLoadFile, str.replace(/margelo\/nitro\//g, ''))
  } catch (e) {
    if (e && e.code === 'ENOENT') {
      console.warn('post-script: TaqlynSdkOnLoad.cpp not found — skip')
      return
    }
    throw e
  }
}

androidWorkaround()
