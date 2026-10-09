;
/**
 * Create a new post in the content directory: src/content/blogs/<slug>/index.mdx
 *
 * Usage: node src/scripts/index.js new [options] <post-title>
 *
 * Options:
 *   -s, --slug <slug>    Directory name / URL slug (default: slugified title)
 *   -l, --lang <zh|en>   Set the language, en creates index-en.mdx (default: zh)
 *   -d, --draft          Create a draft post (default: false)
 *   -h, --help           Show this help message
 *
 * Example:
 *   node src/scripts/index.js new "Hello World"
 *   node src/scripts/index.js new -s hello-world "你好，世界"
 *   node src/scripts/index.js new -l en -s hello-world "Hello World"
 */

import fs from 'node:fs';
import path from 'node:path';



import minimist from './libs/minimist.cjs';
import slugify from './libs/slugify.cjs';


function getDate() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0') // Month is 0-based
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

function getPostSlug(postTitle) {
  let slug = slugify(postTitle).toLocaleLowerCase()
  if (slug === '') {
    slug = 'untitled'
  }
  return slug
}

const HELP_INFO = `Usage: node src/scripts/index.js new [options] <post-title>

Options:
  -s, --slug <slug>    Directory name / URL slug (default: slugified title)
  -l, --lang <zh|en>   Set the language, en creates index-en.mdx (default: zh)
  -d, --draft          Create a draft post (default: false)
  -h, --help           Show this help message

Example:
  node src/scripts/index.js new "Hello World"
  node src/scripts/index.js new -s hello-world "你好，世界"
  node src/scripts/index.js new -l en -s hello-world "Hello World"
`
const TARGET_DIR = 'src/content/blogs/'
const LANGS = ['zh', 'en']

export default function main(args) {
  const parsedArgs = minimist(args, {
    string: ['lang', 'slug'],
    boolean: ['draft', 'help'],
    default: {
      lang: 'zh',
      draft: false
    },
    alias: {
      s: 'slug',
      l: 'lang',
      d: 'draft',
      h: 'help'
    }
  })

  if (parsedArgs.help) {
    console.log(HELP_INFO)
    process.exit(0)
  }

  if (!LANGS.includes(parsedArgs.lang)) {
    console.error(`ERROR: Unsupported language "${parsedArgs.lang}", expected one of: ${LANGS.join(', ')}`)
    process.exit(1)
  }

  let postTitle = parsedArgs._.join(' ') // join the rest of the arguments
  if (!postTitle || postTitle.trim() === '') {
    postTitle = 'Untitled'
  }
  console.log('Creating new post:', postTitle)

  // slugify drops non-ASCII characters, so Chinese titles need an explicit --slug
  const slug = getPostSlug(parsedArgs.slug || postTitle)
  if (!parsedArgs.slug && slug === 'untitled') {
    console.warn('WARN: Title has no ASCII characters, use --slug to set the directory name')
  }

  // Chinese version is index.mdx, English version is index-en.mdx in the same directory
  const postDir = path.join(TARGET_DIR, slug)
  const fileName = parsedArgs.lang === 'en' ? 'index-en.mdx' : 'index.mdx'
  const fullPath = path.join(postDir, fileName)

  console.log('Full path:', fullPath)

  if (fs.existsSync(fullPath)) {
    console.error(`ERROR: File ${fullPath} already exists`)
    process.exit(1)
  }

  let content = `---
title: ${JSON.stringify(postTitle)}
description: 'Write your description here.'
publishDate: ${getDate()}
`
  content += parsedArgs.draft ? 'draft: true\n' : ''
  content += `language: ${parsedArgs.lang}\n`
  content += `tags: ['tag1', 'tag2']
---

Write your content here.
`

  fs.mkdirSync(postDir, { recursive: true })
  fs.writeFileSync(fullPath, content)
  console.log(`Post "${postTitle}" created at ${fullPath}`)
}
