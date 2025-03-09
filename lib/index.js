"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var MenuItemLoader = (function () {
  function MenuItemLoader(query, sql) {
    this.query = query;
    this.sql = sql;
    this.load = this.load.bind(this);
  }
  MenuItemLoader.prototype.load = function () {
    return this.query(this.sql).then(function (categories) {
      return toMenuItems(categories);
    });
  };
  return MenuItemLoader;
}());
exports.MenuItemLoader = MenuItemLoader;
function sub(n1, n2) {
  if (!n1 && !n2) {
    return 0;
  }
  else if (n1 && n2) {
    return n1 - n2;
  }
  else if (n1) {
    return n1;
  }
  else if (n2) {
    return -n2;
  }
  return 0;
}
exports.sub = sub;
function subMenuItem(p1, p2) {
  return sub(p1.sequence, p2.sequence);
}
function toMenuItems(m) {
  var ps = getRoot(m);
  for (var _i = 0, ps_1 = ps; _i < ps_1.length; _i++) {
    var p = ps_1[_i];
    getChildren(p, m);
  }
  return ps.sort(subMenuItem);
}
exports.toMenuItems = toMenuItems;
function getRoot(ms) {
  var ps = [];
  for (var _i = 0, ms_1 = ms; _i < ms_1.length; _i++) {
    var m = ms_1[_i];
    if (!m.parent || m.parent.length === 0) {
      delete m.parent;
      ps.push(m);
    }
  }
  return ps.sort(subMenuItem);
}
function getChildren(m, all) {
  var children = [];
  for (var _i = 0, all_1 = all; _i < all_1.length; _i++) {
    var s = all_1[_i];
    if (s.parent === m.id) {
      delete s.parent;
      children.push(s);
      getChildren(s, all);
    }
  }
  if (children.length > 0) {
    children.sort(subMenuItem);
    m.children = children;
  }
}
function renderSingleItem(item, r) {
  var name = item.name;
  if (r && item.resource) {
    var x = r[item.resource];
    name = !x || x === "" ? item.name : x;
  }
  return "<li><a class=\"menu-item\" href=\"" + item.path + "\" onclick=\"navigate(event)\"><i class=\"material-icons\">" + item.icon + "</i><span>" + name + "</span></a></li>";
}
function renderArray(item, r) {
  return item.map(function (i) { return renderSingleItem(i, r); }).join("");
}
function renderItem(item, r) {
  if (item.children && item.children.length > 0) {
    var name = item.name;
    if (r && item.resource) {
      var x = r[item.resource];
      name = !x || x === "" ? item.name : x;
    }
    return "<li class=\"open\">\n  <div class=\"menu-item\" onclick=\"toggleMenuItem(event)\">\n  <i class=\"material-icons\">" + item.icon + "</i><span>" + name + "</span><i class=\"entity-icon down\"></i>\n  </div>\n  <ul class=\"sub-list expanded\">" + renderArray(item.children, r) + "</ul>\n</li>";
  }
  else {
    return renderSingleItem(item, r);
  }
}
function renderItems(items, r) {
  return items.map(function (i) { return renderItem(i, r); }).join("");
}
exports.renderItems = renderItems;
var MenuBuilder = (function () {
  function MenuBuilder(getResource, load, langs, defaultLang) {
    this.getResource = getResource;
    this.load = load;
    this.langs = langs;
    this.defaultLang = defaultLang;
    this.build = this.build.bind(this);
  }
  MenuBuilder.prototype.build = function (req, res, next) {
    var _this = this;
    var lang = req.params["lang"];
    if (!lang || lang.length === 0) {
      lang = query(req, "lang");
    }
    if (!lang || lang.length === 0) {
      lang = req.params["id"];
    }
    if (!lang || lang.length === 0) {
      lang = this.defaultLang;
    }
    else {
      if (!(this.langs.includes(lang) && lang !== this.defaultLang)) {
        lang = this.defaultLang;
      }
    }
    if (!this.langs.includes(lang)) {
      lang = this.defaultLang;
    }
    this.load()
      .then(function (items) {
      if (isPartial(req)) {
        res.locals.menu = items;
        next();
      }
      else {
        var r = _this.getResource(lang);
        rebuildItems(items, lang, _this.defaultLang);
        res.locals.menu = renderItems(items, r);
        next();
      }
    })
      .catch(function (err) {
      next(err);
    });
  };
  return MenuBuilder;
}());
exports.MenuBuilder = MenuBuilder;
function rebuildItems(items, lang, defaultLang) {
  if (lang === defaultLang) {
    return;
  }
  for (var _i = 0, items_1 = items; _i < items_1.length; _i++) {
    var item = items_1[_i];
    item.path = item.type === "content" ? "/" + lang + item.path : item.path + "?lang=" + lang;
    var children = item.children;
    if (children && children.length > 0) {
      rebuildItems(children, lang, defaultLang);
    }
  }
}
function query(req, name) {
  var p = req.query[name];
  if (!p || p.toString().length === 0) {
    return "";
  }
  return p.toString();
}
exports.query = query;
function isPartial(req) {
  var p = req.query["partial"];
  if (p && p.toString() === "true") {
    return true;
  }
  return false;
}
exports.isPartial = isPartial;
