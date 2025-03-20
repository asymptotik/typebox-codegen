import * as Build from './task/build'
import * as Fs from 'fs'

// -------------------------------------------------------------------------------
// Clean
// -------------------------------------------------------------------------------
export async function clean() {
  await folder('node_modules/typebox').delete()
  await folder('target').delete()
}

// -------------------------------------------------------------------------------
// Format
// -------------------------------------------------------------------------------
export async function format() {
  await shell('prettier --no-semi --single-quote --print-width 240 --trailing-comma all --write src test task example/index.ts')
}

// -------------------------------------------------------------------------------
// Start
// -------------------------------------------------------------------------------
export async function start() {
  await shell(`hammer run example/index.ts --dist target/example`)
}

// -------------------------------------------------------------------------------
// Test
// -------------------------------------------------------------------------------
export async function test(testReporter = 'spec', filter = '') {
  const pattern = filter.length > 0 ? `"--test-name-pattern=${filter}.*"` : ''
  await shell('hammer build test/index.ts --dist target/test --platform node')
  await shell(`node --test-reporter ${testReporter} --test ${pattern} target/test/index.js`)
}

// -------------------------------------------------------------------------------
// Build
// -------------------------------------------------------------------------------
export async function build_check(target = 'target/build') {
  const { version } = JSON.parse(Fs.readFileSync('package.json', 'utf8'))
  await shell(`cd ${target} && attw sinclair-typebox-codegen-${version}.tgz`)
}
export async function build(target = 'target/build') {
  await test()
  await clean()
  await Promise.all([Build.Package.build(target), Build.Esm.build(target), Build.Cjs.build(target)])
  await folder(target).add('readme.md')
  await folder(target).add('license')
  await shell(`cd ${target} && npm pack`)
  await build_check(target)
}

// -------------------------------------------------------------------------------
// Build To
// -------------------------------------------------------------------------------
export async function build_to(remote = 'target/remote', target = 'target/build') {
  await clean()
  await Promise.all([Build.Package.build(target), Build.Esm.build(target), Build.Cjs.build(target)])
  await folder(target).add('readme.md')
  await folder(target).add('license')
  await shell(`cd ${target} && npm pack`)
  const { version } = JSON.parse(Fs.readFileSync('package.json', 'utf8'))
  const filename = `${target}/sinclair-typebox-codegen-${version}.tgz`
  await folder(remote).add(filename)
}

// -------------------------------------------------------------------------------
// Install
// -------------------------------------------------------------------------------
export async function install_local() {
  await clean()
  await build('target/typebox')
  await folder('node_modules').add('target/typebox')
}

// -------------------------------------------------------------
// Publish
// -------------------------------------------------------------
export async function publish(otp, target = 'target/build') {
  const { version } = JSON.parse(Fs.readFileSync('package.json', 'utf8'))
  if (version.includes('-dev')) throw Error(`package version should not include -dev specifier`)
  await shell(`cd ${target} && npm publish sinclair-typebox-codegen-${version}.tgz --access=public --otp ${otp}`)
  await shell(`git tag ${version}`)
  await shell(`git push origin ${version}`)
}

// -------------------------------------------------------------
// Publish-Dev
// -------------------------------------------------------------
export async function publish_dev(otp, target = 'target/build') {
  const { version } = JSON.parse(Fs.readFileSync(`${target}/package.json`, 'utf8'))
  if (!version.includes('-dev')) throw Error(`development package version should include -dev specifier`)
  await shell(`cd ${target} && npm publish sinclair-typebox-codegen-${version}.tgz --access=public --otp ${otp} --tag dev`)
}
