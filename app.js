/* ═══════════ 网格工位 · 逻辑层 ═══════════ */
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

/* ── 时钟 ── */
function tick() { $("#clock").textContent = new Date().toLocaleTimeString("zh-CN", { hour12: false }); }
setInterval(tick, 1000); tick();

/* ── 栏目切换 ── */
$("#menu").addEventListener("click", (e) => {
  const t = e.target.closest(".m");
  if (!t) return;
  $$(".m").forEach((x) => x.classList.remove("active"));
  t.classList.add("active");
  $$(".pane").forEach((p) => (p.hidden = p.id !== t.dataset.t));
});

/* ═══════════ 01 编辑器 ═══════════ */
const LS_FILES = "gridesk_files_v1";
const DEFAULTS = [
  {
    name: "hello.html",
    content: [
      "<!DOCTYPE html>",
      "<html lang=\"zh-CN\">",
      "<head>",
      "  <meta charset=\"UTF-8\">",
      "  <title>你好</title>",
      "</head>",
      "<body>",
      "  <h1>网格工位</h1>",
      "  <p>点「运行预览」试试。</p>",
      "</body>",
      "</html>",
    ].join("\n"),
  },
  {
    name: "style.css",
    content: [
      "/* 示例样式 */",
      ":root {",
      "  --red: #e32119;",
      "}",
      "h1 {",
      "  color: var(--red);",
      "  letter-spacing: 8px;",
      "}",
      "p {",
      "  line-height: 1.8;",
      "}",
    ].join("\n"),
  },
  {
    name: "app.js",
    content: [
      "// 示例脚本",
      "function greet(name) {",
      "  return '你好，' + name;",
      "}",
      "const msg = greet('制图员');",
      "console.log(msg);",
    ].join("\n"),
  },
];

let files = [];
try { files = JSON.parse(localStorage.getItem(LS_FILES) || "null"); } catch { files = null; }
if (!Array.isArray(files) || files.length === 0) files = JSON.parse(JSON.stringify(DEFAULTS));
let active = 0;

function saveFiles() { localStorage.setItem(LS_FILES, JSON.stringify(files)); }

const ta = $("#code"), hl = $("#hl"), gut = $("#gutterIn");

/* 语法高亮：注释 / 字符串 / 数字 / 关键词 */
const KW = "function|return|if|else|for|while|do|const|let|var|class|new|import|export|from|default|async|await|try|catch|finally|switch|case|break|continue|typeof|instanceof|this|null|undefined|true|false|document|window|console|Math|JSON|Object|Array|String|Number";
const HL_RE = new RegExp(
  "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|<!--[\\s\\S]*?-->)" + // 1 注释
  "|(\"(?:[^\"\\\\\\n]|\\\\.)*\"|'(?:[^'\\\\\\n]|\\\\.)*'|`(?:[^`\\\\]|\\\\.)*`)" + // 2 字符串
  "|\\b(\\d+(?:\\.\\d+)?)\\b" + // 3 数字
  "|\\b(" + KW + ")\\b", // 4 关键词
  "g"
);
function highlight(code) {
  let out = "", last = 0, m;
  while ((m = HL_RE.exec(code))) {
    out += esc(code.slice(last, m.index));
    if (m[1]) out += '<span class="c">' + esc(m[1]) + "</span>";
    else if (m[2]) out += '<span class="s">' + esc(m[2]) + "</span>";
    else if (m[3]) out += '<span class="n">' + esc(m[3]) + "</span>";
    else out += '<span class="k">' + esc(m[4]) + "</span>";
    last = m.index + m[0].length;
  }
  return out + esc(code.slice(last));
}

function update() {
  const code = ta.value;
  hl.innerHTML = highlight(code) + "\n";
  const lines = code.split("\n").length;
  let g = "";
  for (let i = 1; i <= lines; i++) g += i + "\n";
  gut.textContent = g;
  files[active].content = code;
  saveFiles();
  status();
}

function status() {
  const v = ta.value, s = ta.selectionStart;
  const before = v.slice(0, s);
  const ln = before.split("\n").length;
  const col = s - before.lastIndexOf("\n");
  $("#stPos").textContent = "Ln " + ln + " · Col " + col;
  $("#stCnt").textContent = v.split("\n").length + " 行 · " + v.length + " 字符";
  const ext = (files[active].name.split(".").pop() || "").toLowerCase();
  $("#stLang").textContent = "语法 " + ({ html: "HTML", htm: "HTML", css: "CSS", js: "JavaScript", json: "JSON" }[ext] || "纯文本");
}

ta.addEventListener("input", update);
ta.addEventListener("keyup", status);
ta.addEventListener("click", status);
ta.addEventListener("scroll", () => {
  hl.scrollTop = ta.scrollTop;
  hl.scrollLeft = ta.scrollLeft;
  gut.style.transform = "translateY(" + (-ta.scrollTop) + "px)";
});

/* Tab 缩进 / 回车自动对齐 / 括号补全 */
const PAIRS = { "(": ")", "[": "]", "{": "}", '"': '"', "'": "'", "`": "`" };
function insertText(txt, cursorOffset) {
  const s = ta.selectionStart, e = ta.selectionEnd;
  ta.value = ta.value.slice(0, s) + txt + ta.value.slice(e);
  const c = s + (cursorOffset == null ? txt.length : cursorOffset);
  ta.selectionStart = ta.selectionEnd = c;
  update();
}
ta.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    insertText("  ");
  } else if (e.key === "Enter") {
    const before = ta.value.slice(0, ta.selectionStart);
    const line = before.slice(before.lastIndexOf("\n") + 1);
    const indent = (line.match(/^\s*/) || [""])[0];
    const extra = /[{[(]\s*$/.test(line) ? "  " : "";
    e.preventDefault();
    insertText("\n" + indent + extra);
  } else if (PAIRS[e.key] && ta.selectionStart === ta.selectionEnd) {
    e.preventDefault();
    insertText(e.key + PAIRS[e.key], 1);
  }
});

/* 文件页签 */
function renderTabs() {
  const bar = $("#fileTabs");
  bar.innerHTML = "";
  files.forEach((f, i) => {
    const b = document.createElement("button");
    b.className = "ftab" + (i === active ? " on" : "");
    const name = document.createElement("span");
    name.textContent = f.name;
    const x = document.createElement("i");
    x.textContent = "×";
    x.title = "关闭";
    x.addEventListener("click", (ev) => { ev.stopPropagation(); delFile(i); });
    b.appendChild(name);
    b.appendChild(x);
    b.addEventListener("click", () => { active = i; loadFile(); });
    bar.appendChild(b);
  });
}
function loadFile() {
  ta.value = files[active].content;
  renderTabs();
  update();
  ta.scrollTop = 0;
}
function delFile(i) {
  if (!confirm("关闭 " + files[i].name + "？")) return;
  files.splice(i, 1);
  if (files.length === 0) files.push({ name: "untitled.txt", content: "" });
  if (active >= files.length) active = files.length - 1;
  saveFiles();
  loadFile();
}
$("#fNew").addEventListener("click", () => {
  const name = prompt("文件名（如 note.js / page.html / main.css）", "untitled.js");
  if (!name || !name.trim()) return;
  files.push({ name: name.trim(), content: "" });
  active = files.length - 1;
  saveFiles();
  loadFile();
  ta.focus();
});

/* 运行预览 */
$("#fRun").addEventListener("click", () => {
  const f = files[active];
  let doc;
  if (/\.html?$/i.test(f.name)) {
    doc = f.content;
  } else if (/\.css$/i.test(f.name)) {
    doc = "<!DOCTYPE html><html><head><style>" + f.content +
      "</style></head><body style='font-family:sans-serif;padding:24px'><h1>标题示例</h1><p>段落示例：网格工位 CSS 预览。</p><button>按钮</button></body></html>";
  } else {
    doc = "<!DOCTYPE html><html><head><style>body{font:13px/1.8 Consolas,monospace;padding:16px}pre{white-space:pre-wrap;margin:0}" +
      "h5{margin:0 0 8px;color:#e32119}</style></head><body><h5>[ console ]</h5><pre id='out'></pre>" +
      "<scr" + "ipt>var __o=document.getElementById('out');" +
      "console.log=function(){__o.textContent+=Array.prototype.slice.call(arguments).map(function(x){try{return typeof x==='object'?JSON.stringify(x):String(x)}catch(e){return String(x)}}).join(' ')+'\\n'};" +
      "</scr" + "ipt><scr" + "ipt>try{" + f.content + "}catch(e){console.log('✗ '+e.message)}</scr" + "ipt></body></html>";
  }
  $("#pvName").textContent = "预览 · " + f.name;
  $("#pvFrame").srcdoc = doc;
  $("#preview").hidden = false;
});
$("#pvClose").addEventListener("click", () => { $("#preview").hidden = true; $("#pvFrame").srcdoc = ""; });

/* ═══════════ 02 文本对比（LCS diff） ═══════════ */
$("#dGo").addEventListener("click", () => {
  const A = $("#da").value.split("\n");
  const B = $("#db").value.split("\n");
  if (A.length * B.length > 160000) {
    $("#dOut").innerHTML = '<div class="dr"><span>文本太长（超过 400×400 行），先拆开再比。</span><span></span></div>';
    return;
  }
  const n = A.length, m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const rows = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { rows.push({ t: "eq", a: A[i], b: B[j] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { rows.push({ t: "del", a: A[i], b: null }); i++; }
    else { rows.push({ t: "add", a: null, b: B[j] }); j++; }
  }
  while (i < n) rows.push({ t: "del", a: A[i++], b: null });
  while (j < m) rows.push({ t: "add", a: null, b: B[j++] });

  const adds = rows.filter((r) => r.t === "add").length;
  const dels = rows.filter((r) => r.t === "del").length;
  const eqs = rows.length - adds - dels;

  let html = '<div class="d-sum">对比结果 <b>- ' + dels + " 行删除</b><span class='g'>+ " + adds +
    " 行新增</span><span>= " + eqs + " 行相同</span></div>";
  let gap = false;
  rows.forEach((r) => {
    if (r.t === "eq") {
      if (!gap) html += '<div class="dr side"><span></span><span></span></div>';
      gap = true;
      html += '<div class="dr eq"><span>' + (esc(r.a) || "&nbsp;") + "</span><span>" + (esc(r.b) || "&nbsp;") + "</span></div>";
    } else {
      gap = false;
      html += '<div class="dr ' + r.t + '"><span>' + (r.a == null ? "&nbsp;" : esc(r.a) || "&nbsp;") +
        "</span><span>" + (r.b == null ? "&nbsp;" : esc(r.b) || "&nbsp;") + "</span></div>";
    }
  });
  $("#dOut").innerHTML = html || '<div class="dr"><span>两个版本都是空的。</span><span></span></div>';
});

/* ═══════════ 03 代码统计 ═══════════ */
$("#sGo").addEventListener("click", () => {
  const f = files[active];
  const c = f.content;
  const lines = c.split("\n");
  const nonBlank = lines.filter((l) => l.trim()).length;
  const comment = lines.filter((l) => /^\s*(\/\/|\/\*|\*|#|<!--)/.test(l)).length;
  const nonSpace = c.replace(/\s/g, "").length;

  const pairs = [["{", "}"], ["(", ")"], ["[", "]"]].map(([a, b]) => ({
    a, b,
    x: c.split(a).length - 1,
    y: c.split(b).length - 1,
  }));
  const balanceOK = pairs.every((p) => p.x === p.y);

  const cells = [
    ["总行数", lines.length],
    ["非空行", nonBlank],
    ["注释行", comment],
    ["字符数", c.length],
    ["非空白字符", nonSpace],
  ];
  let grid = cells.map(([k, v]) => "<div class='sg'><small>" + k + "</small><b>" + v + "</b></div>").join("");
  grid += pairs.map((p) =>
    "<div class='sg " + (p.x === p.y ? "ok" : "warn") + "'><small>" + esc(p.a + " " + p.b) + " 配平</small><b>" +
    p.x + " / " + p.y + "</b></div>"
  ).join("");
  $("#sGrid").innerHTML = grid;

  const tok = {};
  (c.match(/[A-Za-z_][A-Za-z0-9_]*|[\u4e00-\u9fa5]{2,}/g) || []).forEach((t) => { tok[t] = (tok[t] || 0) + 1; });
  const top = Object.entries(tok).sort((p, q) => q[1] - p[1]).slice(0, 8);
  const max = top[0] ? top[0][1] : 1;
  $("#sTok").innerHTML = top.length === 0
    ? "<li style='grid-template-columns:1fr;color:var(--grey)'>没有可统计的词。</li>"
    : top.map(([w, n]) =>
      "<li><span class='tk'>" + esc(w) + "</span><span class='bar'><i style='width:" +
      Math.round(n / max * 100) + "%'></i></span><span class='ct'>×" + n + "</span></li>"
    ).join("");

  $("#sNote").textContent = balanceOK
    ? "括号按字符统计（含字符串与注释内的），当前文件配平。"
    : "注意：括号按字符统计（含字符串与注释内的），当前文件存在不配平的括号。";
});

/* ═══════════ 04 片段库 ═══════════ */
const LS_SNIPS = "gridesk_snips_v1";
const PRESETS = [
  { name: "HTML5 骨架", tag: "PRESET", code: "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>页面标题</title>\n</head>\n<body>\n\n</body>\n</html>" },
  { name: "防抖 debounce", tag: "JS", code: "function debounce(fn, ms = 300) {\n  let t;\n  return (...args) => {\n    clearTimeout(t);\n    t = setTimeout(() => fn(...args), ms);\n  };\n}" },
  { name: "节流 throttle", tag: "JS", code: "function throttle(fn, ms = 200) {\n  let last = 0;\n  return (...args) => {\n    const now = Date.now();\n    if (now - last >= ms) {\n      last = now;\n      fn(...args);\n    }\n  };\n}" },
  { name: "CSS 居中", tag: "CSS", code: ".center {\n  display: grid;\n  place-items: center;\n  min-height: 100vh;\n}" },
  { name: "fetch JSON 封装", tag: "JS", code: "async function getJSON(url) {\n  const r = await fetch(url);\n  if (!r.ok) throw new Error('HTTP ' + r.status);\n  return r.json();\n}" },
  { name: "深拷贝", tag: "JS", code: "const copy = structuredClone(obj);" },
  { name: "时间格式化", tag: "JS", code: "const fmt = (d) =>\n  new Date(d).toLocaleString('zh-CN', { hour12: false });" },
];
let customs = [];
try { customs = JSON.parse(localStorage.getItem(LS_SNIPS) || "[]"); } catch { customs = []; }
if (!Array.isArray(customs)) customs = [];

function saveSnips() { localStorage.setItem(LS_SNIPS, JSON.stringify(customs)); }

function insertAtCursor(txt) {
  $$(".m").forEach((x) => x.classList.remove("active"));
  $('#menu [data-t="ed"]').classList.add("active");
  $$(".pane").forEach((p) => (p.hidden = p.id !== "ed"));
  const s = ta.selectionStart, e = ta.selectionEnd;
  ta.value = ta.value.slice(0, s) + txt + ta.value.slice(e);
  ta.focus();
  ta.selectionStart = ta.selectionEnd = s + txt.length;
  update();
}

function renderSnips() {
  const ul = $("#snipList");
  ul.innerHTML = "";
  const all = PRESETS.map((p) => ({ ...p, preset: true })).concat(customs.map((c) => ({ ...c, tag: "自定义", preset: false })));
  all.forEach((sn) => {
    const li = document.createElement("li");
    const name = document.createElement("div");
    name.className = "sn";
    name.innerHTML = esc(sn.name) + "<small>" + esc(sn.tag || "") + "</small>";
    const code = document.createElement("code");
    code.textContent = sn.code;
    const ops = document.createElement("div");
    ops.className = "ops";
    const ins = document.createElement("button");
    ins.className = "b sm";
    ins.textContent = "插入光标处";
    ins.addEventListener("click", () => insertAtCursor(sn.code + "\n"));
    ops.appendChild(ins);
    if (!sn.preset) {
      const del = document.createElement("button");
      del.className = "b sm";
      del.textContent = "删除";
      del.addEventListener("click", () => {
        customs = customs.filter((c) => c !== sn);
        saveSnips();
        renderSnips();
      });
      ops.appendChild(del);
    }
    li.appendChild(name);
    li.appendChild(code);
    li.appendChild(ops);
    ul.appendChild(li);
  });
}

$("#snSave").addEventListener("click", () => {
  const name = $("#snName").value.trim();
  const code = $("#snCode").value;
  if (!name || !code.trim()) return;
  customs.unshift({ name, code });
  saveSnips();
  $("#snName").value = "";
  $("#snCode").value = "";
  renderSnips();
});

/* ── 初始化 ── */
loadFile();
renderSnips();
