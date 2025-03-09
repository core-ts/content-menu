import { NextFunction, Request, Response } from "express"

export interface StringMap {
  [key: string]: string
}
export interface MenuItem {
  id?: string
  name: string
  path?: string
  resource?: string
  icon?: string
  sequence?: number
  type?: string
  children?: MenuItem[]
}
export interface Category {
  id: string
  name: string
  path?: string
  resource?: string
  icon?: string
  sequence?: number
  type?: string
  parent?: string
  children?: MenuItem[]
}
export class MenuItemLoader {
  constructor(private query: <T>(sql: string, args?: any[]) => Promise<T[]>, private sql: string) {
    this.load = this.load.bind(this)
  }
  load(): Promise<MenuItem[]> {
    return this.query<Category>(this.sql).then((categories) => {
      return toMenuItems(categories)
    })
  }
}

export function sub(n1?: number, n2?: number): number {
  if (!n1 && !n2) {
    return 0
  } else if (n1 && n2) {
    return n1 - n2
  } else if (n1) {
    return n1
  } else if (n2) {
    return -n2
  }
  return 0
}
function subMenuItem(p1: MenuItem, p2: MenuItem): number {
  return sub(p1.sequence, p2.sequence)
}
export function toMenuItems(m: Category[]): MenuItem[] {
  const ps: Category[] = getRoot(m)
  for (const p of ps) {
    getChildren(p, m)
  }
  return ps.sort(subMenuItem)
}
function getRoot(ms: Category[]): Category[] {
  const ps: Category[] = []
  for (const m of ms) {
    if (!m.parent || m.parent.length === 0) {
      delete m.parent
      ps.push(m)
    }
  }
  return ps.sort(subMenuItem)
}
function getChildren(m: Category, all: Category[]) {
  const children: MenuItem[] = []
  for (const s of all) {
    if (s.parent === m.id) {
      delete s.parent
      children.push(s)
      getChildren(s, all)
    }
  }
  if (children.length > 0) {
    children.sort(subMenuItem)
    m.children = children
  }
}

function renderSingleItem(item: MenuItem, r: StringMap): string {
  let name = item.name
  if (r && item.resource) {
    const x = r[item.resource]
    name = !x || x === "" ? item.name : x
  }
  return `<li><a class="menu-item" href="${item.path}" onclick="navigate(event)"><i class="material-icons">${item.icon}</i><span>${name}</span></a></li>`
}
function renderArray(item: MenuItem[], r: StringMap): string {
  return item.map((i) => renderSingleItem(i, r)).join("")
}
function renderItem(item: MenuItem, r: StringMap): string {
  if (item.children && item.children.length > 0) {
    let name = item.name
    if (r && item.resource) {
      const x = r[item.resource]
      name = !x || x === "" ? item.name : x
    }
    return `<li class="open">
  <div class="menu-item" onclick="toggleMenuItem(event)">
    <i class="material-icons">${item.icon}</i><span>${name}</span><i class="entity-icon down"></i>
  </div>
  <ul class="sub-list expanded">${renderArray(item.children, r)}</ul>
</li>`
  } else {
    return renderSingleItem(item, r)
  }
}
export function renderItems(items: MenuItem[], r: StringMap): string {
  return items.map((i) => renderItem(i, r)).join("")
}

export class MenuBuilder {
  constructor(private getResource: (lang: string) => StringMap, private load: () => Promise<MenuItem[]>, private langs: string[], private defaultLang: string) {
    this.build = this.build.bind(this)
  }
  build(req: Request, res: Response, next: NextFunction) {
    let lang = req.params["lang"]
    if (!lang || lang.length === 0) {
      lang = query(req, "lang")
    }
    if (!lang || lang.length === 0) {
      lang = req.params["id"]
    }
    if (!lang || lang.length === 0) {
      lang = this.defaultLang
    } else {
      if (!(this.langs.includes(lang) && lang !== this.defaultLang)) {
        lang = this.defaultLang
      }
    }
    if (!this.langs.includes(lang)) {
      lang = this.defaultLang
    }
    this.load()
      .then((items) => {
        if (isPartial(req)) {
          res.locals.menu = items
          next()
        } else {
          const r = this.getResource(lang)
          rebuildItems(items, lang, this.defaultLang)
          res.locals.menu = renderItems(items, r)
          next()
        }
      })
      .catch((err) => {
        next(err)
      })
  }
}
function rebuildItems(items: MenuItem[], lang: string, defaultLang: string) {
  if (lang === defaultLang) {
    return
  }
  for (const item of items) {
    item.path = item.type === "content" ? `/${lang}${item.path}` : `${item.path}?lang=${lang}`
    const children = item.children
    if (children && children.length > 0) {
      rebuildItems(children, lang, defaultLang)
    }
  }
}
export function query(req: Request, name: string): string {
  const p = req.query[name]
  if (!p || p.toString().length === 0) {
    return ""
  }
  return p.toString()
}
export function isPartial(req: Request): boolean {
  const p = req.query["partial"]
  if (p && p.toString() === "true") {
    return true
  }
  return false
}
