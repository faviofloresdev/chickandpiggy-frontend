const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')

// Load the actual route and metadata builder, replacing only external CMS/config dependencies.
function loadPage(hero, global) {
  function load(file) {
    const source = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
      fileName: file,
      compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX},
    }).outputText
    const module = {exports: {}}
    function requireModule(name) {
      if (name === '@/lib/api/strapi') return {strapiContentApi: {
        getLandingHero: async () => ({data: hero}),
        getGlobal: async () => ({data: global}),
      }}
      if (name === '@/lib/config/env') return {env: {siteUrl: 'https://www.chickandpiggy.com'}}
      if (name === '@/lib/seo/metadata') return load('lib/seo/metadata.ts')
      if (name.startsWith('@/components/')) return {}
      return require(name)
    }
    new Function('require', 'module', 'exports', source)(requireModule, module, module.exports)
    return module.exports
  }
  return load('app/page.tsx')
}

test('home uses Landing SEO in title, description and social metadata without appending a second brand', async () => {
  const page = loadPage({
    metaTitle: 'Handmade Soaps for Kids | Chick and Piggy',
    metaDescription: 'Approved home description.',
    ogImage: 'https://images.example/home.jpg',
  }, {defaultSeo: {metaTitle: 'Global title', metaDescription: 'Global description'}})
  const metadata = await page.generateMetadata()
  assert.deepEqual(metadata.title, {absolute: 'Handmade Soaps for Kids | Chick and Piggy'})
  assert.equal(metadata.description, 'Approved home description.')
  assert.equal(metadata.openGraph.title, 'Handmade Soaps for Kids | Chick and Piggy')
  assert.equal(metadata.twitter.description, 'Approved home description.')
  assert.equal(metadata.openGraph.images[0].url, 'https://images.example/home.jpg')
  assert.equal(metadata.alternates.canonical, '/')
  assert.equal(metadata.robots, undefined)
})

test('empty Landing SEO falls back to Global SEO and sharing image', async () => {
  const page = loadPage({metaTitle: '  ', metaDescription: ''}, {defaultSeo: {
    metaTitle: 'Global title | Chick and Piggy', metaDescription: 'Global description',
    shareImage: 'https://images.example/global.jpg',
  }})
  const metadata = await page.generateMetadata()
  assert.deepEqual(metadata.title, {absolute: 'Global title | Chick and Piggy'})
  assert.equal(metadata.description, 'Global description')
  assert.equal(metadata.twitter.images[0], 'https://images.example/global.jpg')
})

test('fields fall back individually without replacing populated Landing values', async () => {
  const metadata = await loadPage({metaTitle: 'Landing title'}, {defaultSeo: {
    metaTitle: 'Global title', metaDescription: 'Global description',
  }}).generateMetadata()
  assert.deepEqual(metadata.title, {absolute: 'Landing title'})
  assert.equal(metadata.description, 'Global description')
})

test('missing CMS SEO retains a descriptive, indexable home page', async () => {
  const metadata = await loadPage({}, {}).generateMetadata()
  assert.equal(metadata.title, 'Handcrafted Soaps for Kids')
  assert.match(metadata.description, /handcrafted soaps for kids/)
  assert.equal(metadata.alternates.canonical, '/')
  assert.equal(metadata.robots, undefined)
})
