# Gitty

[English](../../README.md) · **简体中文** · [日本語](README.ja.md) · [한국어](README.ko.md) · [Français](README.fr.md) · [Deutsch](README.de.md) · [Español](README.es.md) · [Русский](README.ru.md) · [Português](README.pt.md)

> **翻译于 2026-08-14。**
> [英文 README](../../README.md) 是官方版本，也是唯一持续更新的版本。本文是那一
> 刻的快照，两者不一致时以英文版为准。界面本身全是英文，所以下文中的按钮名、菜单
> 项一律保留原文。

一个桌面端的四窗格 git 历史浏览器，气质接近 `lazygit`，但真正为鼠标而设计：双击
打开文件，右键复制路径，点两个提交就能比较它们。

```
┌──────────────────────┬──────────────────────┐
│ Working Tree         │ Diff                 │
│ (or a commit's files)│ (unified, coloured)  │
├──────────────────────┼──────────────────────┤
│ Commits              │ Terminal             │
│ (log, ↑↓, Enter)     │ (a real shell)       │
└──────────────────────┴──────────────────────┘
```

所有窗格都能拖动分隔条调整大小，每一个都可以收起再唤回——见
[全屏与隐藏](#full-screen-and-hiding)。

其他 git 浏览器大多做不到的事：

- **一个真正的 shell 就停靠在历史旁边。** 不是调用 git 的小部件——而是一个以仓库为
  根的真正登录 shell（`$SHELL`），和 diff 在同一个窗口里，可分裂成好几个。多数 git
  浏览器要么没有终端，要么启动外部终端，于是验证一个念头就得来回切窗口。这里它就在
  手边，而且仓库一变，其余每个窗格都会刷新。
- **文档，而不只是 diff。** Markdown 会被渲染，HTML 在沙箱 frame 里运行，图片就显示
  成图片——全都在你当前所处的版本上。两年前的 README 会带着*那个*提交随附的截图渲染
  出来，从对象数据库里读出；不涉及磁盘上的任何东西，也不会从网络抓取任何东西。
- **渲染后的 markdown 仍能告诉你在文件里的位置。** 打开 **Markdown source lines**，
  每个标题、段落、列表项、表格、围栏代码块和图片都会在行号槽里标出它在源码里起始的
  那一行——于是你靠阅读找到的一段文字，就能按行号去编辑。
- **diff、blame、文件历史和渲染好的 README 同时打开。** 文件作为自己的标签页开在
  diff *旁边*而不是盖在它上面，每个都记住自己被打开时的版本。读文件绝不会让你丢掉
  正在看的改动。
- **<kbd>Ctrl+F</kbd> 在窗格显示的任何内容里都管用**——包括渲染后的 markdown（搜索读
  的是渲染文本，所以一个短语能跨加粗和代码片段找到），以及 HTML 预览的 frame 内部。
- **历史，端到你的浏览器。** **Open in Browser** 把一次提交——它的元数据、文件、
  diff——交给系统浏览器，由应用内部一个绑定在 `127.0.0.1` 的 web 服务器提供——只有你
  自己的浏览器，没有别人。提交是真实 URL，所以只要仓库开着，历史就能在标签页里读、
  保持打开、用浏览器自带的查找搜索。
- **[gource](https://gource.io/) 一键播放**，装了就可用：仓库的整段历史以动画呈现，
  开在自己的窗口里。gource 不在时按钮不绘制——不会下载或提供任何跑不起来的东西。
- **九种界面语言，以及一个明确的时区。** git 给每个提交记录作者的偏移量，所以时间戳
  永远是一个时区选择；在这里你来定，整个 UI——日志、blame、文件历史、"今天"与某个日
  期的分界——都会跟随。

![Gitty 0.1.6](../../ref/gitty-0.1.6.png)

## 为什么又造一个？ <a id="why-another-one"></a>

因为我伸手够到的每个工具都有一处不对：

- **各类 IDE** —— 太重、太慢。（信我，能找到的我都试过。）
- **lazygit、grv** —— 出色的工具，但对鼠标和文本选择不友好。
- **gitui** —— 我想让提交列表和 diff 同时在屏幕上。
- **SmartGit、GitKraken** —— Java，笨重，样式过时，还要收钱。
- **gitg** 之流 —— 同样没有提交列表与 diff 并排。
- **tig** —— 只有 diff，没有文件树可翻。
- **gitk** —— 丑！

还有两件我想要而几乎没人提供的：**Markdown 预览**，以及在窗口任何地方**都能正常
用的复制粘贴**。

## 环境要求 <a id="requirements"></a>

- Node.js 20 或更新版本
- `PATH` 上有 `git`
- Linux、macOS 或 Windows，且有桌面会话
- 可选：[gource](https://gource.io/) 在 `PATH` 上，用于[动画](#gource)；没有也不
  影响任何功能

## 运行 <a id="running"></a>

安装一次 `gitty` 命令：

```bash
npm install -g gitty-desktop      # installs the gitty command globally
```

或者，从检出的源码把它链接进 PATH：

```bash
./setup.sh               # symlink into ~/.local/bin (no sudo)
./setup.sh --system      # symlink into /usr/local/bin (needs sudo)
```

走 `setup.sh` 这条路还会装一个可点击的启动器，按平台而定。

在 **Linux** 上，图标加进 hicolor 主题，应用菜单里出现一个 `gitty.desktop` 条目
（会话有桌面时，桌面上也有）。之后图标缓存和 desktop 数据库会被刷新，所以条目连
同图标会立刻出现。它带一个变通设置，且应用关掉了一个沙箱开关——见
[Linux 桌面集成](#linux-desktop-integration)。

在 **macOS** 上，一个极简的 `Gitty.app` 会被写入 `~/Applications`（桌面上带一个符
号链接），封装同一个 `run.sh`。没有任何打包：这个 bundle 的存在只是为了给 Finder
和 Dock 一个名字和图标。Dock 不会被碰——想固定它的话自己拖过去。见
[macOS 应用 bundle](#macos-app-bundle)。

然后在任何地方打开一个仓库：

```bash
gitty                    # open the repository in the current directory
gitty /path/to/repo      # open another repository
gitty --fg               # keep it attached to the terminal (Ctrl+C quits)
gitty --dev              # hot-reloading development mode
gitty --any              # start even outside a work tree (what the desktop
                         # entry uses), falling back to the last repositories
```

Gitty 会从终端脱离并打印自己的 pid，所以 shell 依然可用，关掉它也不会带走窗口。输
出写到 `${XDG_STATE_HOME:-~/.local/state}/gitty/gitty.log`，超过 4 MB 后会被截到
最后 1 MB。

`./run.sh` 是同一个脚本，不做符号链接也一样能用。启动器会在源码有改动时安装依赖并
重建 bundle，所以第一次运行可能要等一会儿。`npm run dev`、`npm run build` 和
`npm start` 也可以直接用。

从不在工作区里的目录启动 Gitty 时，它会回退到上次打开的仓库，而不是只抱怨一句。

## 窗口 <a id="the-window"></a>

中间四个窗格，上方一条标题栏，下方一条标签栏。

### 标题栏 <a id="title-bar"></a>

从左到右，它先描述当前仓库，再对它动手：

- **Gitty** —— 最左边的图标和名字打开 **About** 对话框：版本、构建时间、作者，以及
  Electron、Chromium 和 Node 的版本，带一个指向主页的链接。
- **‹ › ▾** —— 你在这个仓库里去过的地方。见[后退](#going-back)。
- **仓库路径**是一个按钮：点开[最近仓库](#recent-repositories)菜单。
- 它旁边的 **+** —— 目录选择器，把你选中的仓库开进新标签页（<kbd>Ctrl+O</kbd>）。
  它和仓库按钮放在一起，因为两者是同一个主题：你在看哪个仓库，以及打开另一个。
- **⎇ 分支**也是按钮——显示 git 当前检出的分支，并给出其余分支的菜单供你阅读。见
  [浏览另一个分支](#browsing-another-branch)。
- **`origin/main ↑2 ↓0`** —— 当前检出分支的上游，以及领先、落后多少。分支没有跟踪
  目标时不显示。
- **`3 changed`** —— 工作区有多少个文件未提交，和提交窗格里 **Working Tree** 那行
  带的计数是同一个数。
- **Panes ▾** —— 显示或隐藏这四个窗格；见[全屏与隐藏](#full-screen-and-hiding)。
- **Settings** —— 首选项对话框（[设置](#settings)），也可按 <kbd>Ctrl+,</kbd>。
- **Refresh** —— 手动重新读取状态和日志（<kbd>F5</kbd> / <kbd>Ctrl+R</kbd>）。
  Gitty 会监视仓库并自动刷新；这个按钮留给监视看不见的情况。

当你在读另一个分支时，分支按钮显示为 `⎇ main › other-branch`；上一条 git 命令的
错误会以红字出现在计数旁边。

### 后退 <a id="going-back"></a>

读历史就是到处逛：一个提交、里面的一个文件、往下翻两页日志后的另一个提交、再回到
第一个。标题栏最左边的三个按钮会记住这些脚步，就像浏览器的前进后退一样。

- **‹**（<kbd>Alt+←</kbd>）回到你看这一个之前的那个位置，**›**（<kbd>Alt+→</kbd>）
  向前回到你刚才离开的那个。无处可去时两者都会变灰，鼠标悬停时显示它会带你去的位
  置名称。
- **▾** 列出这些位置本身，最近的在最前面，你当前所在的那个旁边有个点。随便选一个
  就能直接跳过去。

一个*位置*包含了上方两个窗格所显示的一切：视图——工作区、一个提交、两个提交的区间、
一个快照——其中选中的文件，以及 diff 旁边打开的文档。所以一个停留点读作
`Working tree`、`7bb7787 — Refresh screenshot batches`、
`src/main/git.ts @ 7bb7787` 或 `blame: src/main/git.ts @ 7bb7787`，回到它意味着把
同一个文件以同一个版本放回屏幕，而不只是重新选中那个提交。

历史属于仓库，不属于窗口：每个标签页各自记住自己最近五十个位置，切换标签页就是切
换按钮漫步的是哪一组。历史不跨重启保留。

### 标签页 <a id="tabs"></a>

底部的标签栏容纳每一个打开的仓库——它的目录名、工作区有未提交改动时的一个黄点，以
及关闭用的 **×**。这个点统计 `git status` 报告的一切，包含未跟踪文件；而它真正的价
值在你*没有*在看的那些标签页上：当前仓库的标题栏已经写着 `3 changed`，而后台标签页
是完全隐藏的，于是这个点是「那边还有活儿没干完」的唯一信号。把鼠标停在标签上，会显
示仓库路径并用文字说明这一点。

**+**（以及 <kbd>Ctrl+O</kbd>）把另一个仓库开进新标签页；标题栏永远显示当前那个。每
个标签页各自保有自己的窗格和终端，所以你正在读的提交、以及你留着跑的 shell，在你切
走再切回来时还在原处。关掉最后一个标签页会留下一个空窗口和一个打开下一个仓库的按
钮。（打开的标签页不会跨重启记住。）

### 最近仓库 <a id="recent-repositories"></a>

标题栏里的仓库路径是一个菜单，列出之前打开过的仓库——目录名加上它的父目录——最近的
在前。

- **点击** —— 在新标签页打开。
- **Ctrl/Cmd+点击**或**中键点击** —— 在当前标签页打开，替换掉那里的仓库，并保持标
  签在栏中的位置。
- **右键** —— 把该条目从列表移除。菜单会留着不关，所以可以连着清好几条。

**Open Repository…** 和 **Clear Recent** 在下方。列表存在
`~/.config/Gitty/recent-repos.json`，保留十二条，并跳过那些已被移走或删除的。

### 全屏与隐藏 <a id="full-screen-and-hiding"></a>

每个窗格的标题栏都带着同样两个控件：左端的 **⤢** 让该窗格铺满窗口，右端的 **×** 把
它藏起来。

全屏会盖住其余一切，标题栏和标签栏也不例外，而底下的窗格照常工作——终端在被盖住期
间仍在运行。同一角上的 **⤡**、<kbd>Esc</kbd>、在标题上双击，或者
<kbd>Ctrl+Shift+1</kbd> … <kbd>Ctrl+Shift+4</kbd>，都能恢复布局。同一时刻只有一个
窗格能全屏。

隐藏是另一个方向——任何窗格都能收起来再唤回：

- 标题栏里的 **Panes** 列出四个窗格，可见的那些旁边有个点；点一下切换，
  **Show All Panes** 恢复四窗格布局。
- <kbd>Ctrl+1</kbd> … <kbd>Ctrl+4</kbd> 依次切换 Files、Diff、Commits 和 Terminal。
- <kbd>Ctrl+Shift+0</kbd> 把四个全部带回——零代表「全都要」，比那四个各自切换的键
  多一个。它需要 Shift 是因为 <kbd>Ctrl+0</kbd> 是浏览器引擎的还原缩放，留在 View
  菜单里。

剩下的窗格会分掉整个窗口，所以隐藏提交窗格就把整个高度让给了 diff。最后一个可见窗
格没有 **×**——空窗口会让人无处可点。隐藏状态跨重启记住，而终端窗格只是被收起、从不
关闭：它的 shell 继续运行，回来时连滚动缓冲一起带回。

## 各个窗格 <a id="the-panes"></a>

### Working Tree（左上） <a id="working-tree-top-left"></a>

改动过的文件，呈可折叠的树，每个文件名旁边带着行数。浏览整个仓库——工作区或一个提
交的快照——打开时所有目录都折叠着，因为那是一棵要下钻的树，而不是一张要读的改动列
表；一张改动列表则打开即展开。每一层目录都排在文件前面，而每个组里的名字按读者期望
的方式排序，而不是按字节比较的方式：名字里的数字按数值算，所以 `W9` 排在 `W10` 前
面；大小写不是头等差别，所以 `butler/` 和 b 开头的排在一起，而不是排在每个大写字母
之后。显示两列状态：暂存区状态（绿色）和工作区状态（黄 / 红）；未跟踪文件是 `??`。
行数在工作区从磁盘读取，其他情况从对应版本读取；二进制文件、已删除的文件，以及超过
8 MB 的文件不显示行数。行数之后跟着变更量（churn）——这个改动在这个文件里增删了多少
行，显示为 `+12 −3`：工作区里是与 HEAD 比较，提交或区间里是与父提交比较。快照是一
棵树而不是一次改动，所以没有变更量；二进制文件和合并提交也没有——合并 diff 不会把
改动归到具体文件。

- **点击** —— 在右边显示该文件的 diff。
- **双击** —— 把整个文件作为文档开在 diff 旁边，带行号和语法高亮（Markdown 是渲染
  后的文档，图片则是图片本身）。
- **右键** —— View File、Open in System App、Reveal in File Manager、Copy Relative
  Path、Copy Absolute Path、Copy File Name、Blame File、File History。
- **点击文件夹** —— 折叠或展开。

选中一个提交或一段提交区间时，这个窗格改为列出那个提交涉及的文件；
**Back to Work Tree**（或 <kbd>Esc</kbd>）回到工作区。在[快照](#snapshots)里，它列
出的是那个提交处的整棵树，而不只是改动过的部分。

### Diff（右上） <a id="diff-top-right"></a>

统一格式 diff，带新旧行号、hunk 头和增删着色，按文件列表排布：每个路径是一条通栏标
题，hunk 头是暗的——那是行号范围，不是该先看的东西——重命名显示为 `old → new`。没有
选中文件时，它一次显示全部：工作区里每一处未提交改动，或者选中提交里的每个文件。

- **Show Whole Diff** —— 挑过某个文件之后，回到那份合并的 diff。它常驻在标题栏里，
  当屏幕上正是整段 diff 时会亮起。工作区版本同时涵盖已暂存和未暂存的改动，并内联未
  跟踪文件（最多 50 个，之后给一条提示），这些是单靠 `git diff` 看不到的。
- **Wrap** —— 长行折行，而不是横向滚动。默认开。
- **Inline / Side-by-Side** —— 单栏加 `+`/`-` 标记，或者新旧并排；并排时一连串删除
  行会和紧随其后的新增行配对。折行后的两半仍保持对齐。
- **文件标题** —— 每条标题都能折叠它的文件：三角形把它收成只剩文件名，标题栏里的
  **Collapse All** / **Expand All** 一次搞定全部。**Ctrl+点击**标题会把那个文件开进
  新文档标签；右键它可以得到 **Open in a New Tab**、**Select in the File List**、各
  种路径复制，以及——在工作区里，也就是磁盘上的文件正是所显示版本时——
  **Open in System App** 和 **Reveal in File Manager**。重命名打开的是新路径。
- **右键** —— Copy Selection、Copy Whole Diff，以及同样那些开关。

当逐词比整行更好读时，改动行内变化的词会被高亮；它是[设置](#settings)里的
**Word highlight**。

设置在多次运行之间记住。行以 1500 为一块渲染并随滚动延伸，所以大提交也不卡；超过
2 MB 的 diff 会被截断并给出提示。

### 查看整个文件 <a id="viewing-files"></a>

窗格默认显示的是 diff，但任何文件都能整个打开：在树里**双击**它，用标题栏的
**View File** / **Preview**，在 diff 里 **Ctrl+点击**文件标题，或者从两个右键菜单里
取用。

文件会作为独立文档开在 diff *旁边*的一条标签里，而不是盖在它上面，所以读文件不必丢
掉你正看的 diff。**Diff** 标签永远排第一，而在树里单击仍然是就地浏览 diff。每个文档
记住自己被打开时的版本，用自己的 **×** 关闭，并在仓库变化时重新读取工作区文件。源码
文件带行号和语法高亮；Markdown 打开时是[渲染好的](#markdown-preview)，可切回源码；
图片则作为[图片本身](#images)打开。

拿到哪个版本取决于窗格所处的位置：工作区里是磁盘上的文件，其余情况是所选提交处的那
个版本。打开文档是一个动作而非一种模式——选择另一个文件或另一个提交就会把 diff 放回
来——所以窗格绝不会在你想看改动时卡在文件上。

#### 快照 <a id="snapshots"></a>

右键一个提交，选 **Browse Snapshot**，就能按那个提交当时的样子阅读整个仓库：左上窗
格列出*整棵*树，而不是该提交碰过的文件，随便挑一个文件都会以那个版本打开。快照没有
diff 可显示，所以那里每个文件都是文档。

快照里的文件在那个版本从未存在于磁盘上，因此 **Open in System App** 交出去的是它的
一份临时副本，而 **Reveal in File Manager** 干脆不提供。
**Back to Work Tree**（或 <kbd>Esc</kbd>）离开快照。

#### Markdown 预览 <a id="markdown-preview"></a>

选中 `.md` 文件会多出一个 **Preview** 按钮——默认关闭，所以在你开口之前 diff 仍然是
diff。它把文件作为整体渲染：工作区里是磁盘上的版本，其余情况是所选提交处的版本。

围栏代码块在注明语言时会有语法高亮，YAML front matter 被单独摘出、作为自己的高亮块
显示，而标题层级、列表标记、链接和行内代码都有配色，让结构一眼可辨。

- **Wrap** —— 和 diff 那个是同一个开关，默认开。散文永远折行；在预览里，这个开关决
  定围栏代码块、宽表格和长的行内字符串是否也折行，而不是横向滚动。
- **Outline** —— 文档旁边的标题结构，按层级缩进，跟随你滚动到的标题。点一条即可跳
  转，拖动它和文档之间的分隔条可以给任一侧更多空间。这个宽度由仓库里的每个文档共
  享——它是阅读偏好，不是单个文件的属性——和其他窗格的尺寸一样，随窗口存续。
- **<kbd>Ctrl+F</kbd>** —— 在文档里查找；见[查找文本](#finding-text)。
- **右键** —— Copy Selection、Copy Markdown Source、折行与大纲开关，以及
  Show Diff Instead。

Markdown 里的原始 HTML 不会被渲染，链接在系统浏览器里打开而不是应用内。相对于文档写
的图片路径会从仓库里读出来——版本与文档相同，所以旧提交显示的是它当时随附的截图。仓
库在那个版本没有的图片，留下一个带 alt 文本的虚线占位框。网络上的图片根本不会去
取：读别人的 README 不该向对方的主机报到。

![Markdown preview](../../ref/gitty-0.1.5-markdown.png)

#### HTML 预览 <a id="html-preview"></a>

`.html`、`.htm` 或 `.xhtml` 文件得到同样的 **Preview** 按钮，文档被渲染出来而不是显
示为源码——工作区里是磁盘上的版本，其余情况是所选提交处的版本。

它跑在一个通过 `srcdoc` 载入的沙箱 frame 里，所以页面永远无法把应用导航走，而它自
己的样式和脚本照常运行：它是你的文件，按浏览器渲染它的方式渲染。**Wrap** 决定 frame
自己滚动，还是长到内容那么高、让页面作为整体滚动。它的图片受与 markdown 相同的规则
约束——`img-src 'self' data:`，所以不从网络抓取任何东西。<kbd>Ctrl+F</kbd> 和
<kbd>Ctrl+Shift+C</kbd> 在 frame 内管用，而 frame 里的按键永远不会到达窗口其余部分。

#### 图片 <a id="images"></a>

`.png`、`.jpg`、`.gif`、`.webp`、`.bmp`、`.ico`、`.avif` 或 `.svg` 打开时是图片本
身，而不是一句「这是二进制文件」——工作区里从磁盘取，其余情况从提交里取。它被适配到
窗格大小，衬在棋盘格上，所以透明就看得出是透明；**点击**它切到原始尺寸并可滚动查
看，再点一次回到适配。像素尺寸和磁盘占用写在下方。超过 12 MB 的图片不内联。

![Image preview](../../ref/gitty-0.1.5-image.png)

#### Blame 与文件历史 <a id="blame-and-file-history"></a>

在树里右键任何文件，选择 **Blame File** 或 **File History**；两者都作为 diff 旁边的
文档打开。Blame 每行源码一行——提交、作者、日期以及行本身，像代码查看器一样高亮，尚
未提交的行显示为 em dash——在你正在查看的版本上。File History 列出碰过这个文件的每一
次提交，跟踪重命名，点一个提交就打开它。

### Commits（左下） <a id="commits-bottom-left"></a>

当前分支的日志，一次加载 300 条并随滚动延伸。第一行是 **Working Tree** —— 未提交的
改动，带改动文件数；选中它会把上方两个窗格带回工作区。日志上方有一个过滤框，把列表
收窄到提交消息或作者包含你输入文字的条目——带防抖，有清空用的 ✕——列表同样按页加
载。

- **点击**或 <kbd>Enter</kbd> —— 显示那个提交：它的文件填满左上窗格，它的完整 diff
  填满右上窗格。提交的 subject、作者、日期和完整正文显示在文件列表上方的一个信息条
  里；正文太长时，▸ 开关可以把它折起，把空间留给文件列表。
- **Ctrl+点击**（macOS 上是 <kbd>Cmd</kbd>）、<kbd>Shift+点击</kbd> 或
  <kbd>Space</kbd> —— 选第二个提交并比较两者，旧的在前。
- **↑ ↓ / j k / PgUp / PgDn / Home / End** —— 移动光标。
- **右键** —— 显示 diff，复制哈希、短哈希或标题，[浏览快照](#snapshots)，或者与当
  前选中的提交比较。
- **右键 → Open in Browser** —— 在系统浏览器里渲染这个提交；**Copy Commit URL** 复
  制链接。应用内部有一个 web 服务器（只监听 `127.0.0.1`，只服务你自己的浏览器），把
  每个打开的仓库作为可浏览的提交列表提供出去——提交窗格的 **Open in Browser** 按钮就
  落在那里——每个提交有自己的元数据、文件列表和 diff，单个文件的 diff 也只差一次点
  击。这些 URL 在仓库保持打开期间有效。
- 在左上窗格选中一个文件会把 diff 收窄到那个文件；**Show Whole Diff** 再把它放回
  去。

![Diff against any two commits](../../ref/gitty-0.1.5-range.png)

#### Gource <a id="gource"></a>

如果 [gource](https://gource.io/) 在 `PATH` 上，提交窗格会在 **Open in Browser** 旁
边多出一个 **Gource** 按钮：它把仓库历史播放成动画——目录树生长，每次提交落地时文件
亮起，日志中每个名字对应一个作者在文件间飞来飞去。Gource 打开自己的窗口，在你关掉
Gitty 之后继续运行；按钮只等足够确认它已启动的时间，如果没启动成就显示 gource 说的
话。

启动时每天历史占半秒，空闲文件留在屏幕上，长间隔被跳过——这才是让真实仓库可读而非缓
慢滴淌的配置。不会替你安装任何东西：gource 不在 `PATH` 上时，按钮干脆不出现。

#### 浏览另一个分支 <a id="browsing-another-branch"></a>

标题栏里的分支会打开一个菜单，列出每个本地分支和远程跟踪分支，最新提交的在前，选一
个就改为显示那个分支的历史。这是只读的一瞥：gitty 不跑 `checkout`，所以工作区、它的
diff 和终端全都停在 git 留下的地方。你在看另一个分支时，标题栏读作
`⎇ main › other-branch`，提交窗格会说明自己正在列哪个分支；**Back to \<branch\>**
返回。每个标签页各自浏览各自的。

#### Push 与 Pull <a id="push-and-pull"></a>

**Push** 和 **Pull** 位于标题栏，无论日志指向哪个分支，两者都作用于已检出的那个分
支。**Push** 会数出还没推的提交数——**Push 3**——没有东西可推时变灰；在一个没有跟踪目
标的分支上，它会把该分支发布到 `origin` 并设置上游。**Pull** 从上游做快进，没有上游
可拉时变灰。git 说了什么就显示在日志上方——点一下消掉；失败的会一直留到你消掉为止。

两者都无法回答提示：它们背后没有终端，所以一次要密码或口令的 push 会带着 git 自己的
消息失败，而不是挂在那里；无法快进的 pull 也会照实说。之后这两件事都在终端窗格里手
动收尾——它就在旁边。

### Terminal（右下） <a id="terminal-bottom-right"></a>

一个真正的交互式登录 shell（`$SHELL`），根在仓库目录，所以任何 git 命令都能直接跑。
<kbd>Ctrl+Shift+C</kbd> 复制终端的选中内容——<kbd>Ctrl+C</kbd> 在那里是中断，也始终
保持是中断。同一个组合键在其余每个窗格里也是复制，所以它不会随着焦点移动而改变含
义。仓库在磁盘上变化时，其余窗格自动刷新。它启动哪个 shell、是否作为登录 shell，都
是[设置](#settings)；两者在创建终端时读取，所以改动在下一次分裂时生效。

这个窗格能分裂成任意多个 shell：**Split →** 在聚焦的终端旁边放一个新的，
**Split ↓** 放在它下面，它们之间的分隔条和其他窗格一样可拖动。点一个终端即聚焦
它——带轮廓的那个就是下一次分裂或 **Close** 落点。朝同一方向连分两次会延长这一行或
这一列，而不是嵌套，所以三个并排的终端是彼此互调大小的。

**Close** 结束聚焦的那个 shell；用 `exit` 离开一个 shell 也会自行关掉它那一格。最后
一个终端始终留着：退出它只会在屏幕上留下提示，而不是一个空窗格。

## 查找文本 <a id="finding-text"></a>

<kbd>Ctrl+F</kbd> 搜索右侧窗格显示的任何内容：diff、文件、渲染好的 markdown 文档、
HTML 预览、blame，或文件历史。每个匹配都被高亮，当前那个被挑出来，<kbd>Enter</kbd>
和 <kbd>Shift+Enter</kbd>（或方向键）在它们之间走动并在两端回绕，计数告诉你所在位
置，<kbd>Esc</kbd> 关闭。

搜索大小写不敏感，读的是渲染后的文本而非背后的标记——所以一个短语能跨 markdown 留在
其中的加粗和代码片段找到，diff 也按你看到的那些行来搜。随滚动分块渲染的视图（长文
件、大 diff）在搜索条打开时会渲染其余部分，所以计数覆盖的是整份内容，而不是目前滚到
的那部分。多文件 diff 里折叠起来的文件保持折叠，不会被搜到。

## 设置 <a id="settings"></a>

标题栏里的 **Settings**，或 <kbd>Ctrl+,</kbd>。这里的一切对每个标签页都生效，并跨重
启记住；**Restore Defaults** 把它们全部还原。对话框分三栏——**Appearance**、**View**
和 **Session**——所以即使内容增长也保持一屏装得下；下表按这个顺序列出。

| | |
| --- | --- |
| **Theme** | Dark 或 Light。 |
| **Language** | English、简体中文、日本語、한국어、Français、Deutsch、Español、Русский 或 Português——界面、菜单和对话框一起切换，无需重启。 |
| **Time zone** | 屏幕上每个日期和时间以哪个时区渲染：默认是机器自己的，或 UTC，或系统认识的任何时区。git 给每个提交记录作者的偏移量，所以时间戳永远是时区选择——就在这里做。日志的日期列跟随它，也就意味着「今天」和某个日期的分界也随之移动。 |
| **Time format** | Absolute（一个钟点或一个日期）或 Relative（`28m ago`、`2h ago`）。Relative 完全绕开时区问题；行的悬停提示无论如何都保持绝对，并标明时区。 |
| **Font size** | 9 – 20，以半磅为步长。作用于每个窗格，终端也算在内。 |
| **Monospace font** | 窗格和终端所用的字体族，从这台机器上找到的等宽字体里挑选。**System default** 是内置栈（JetBrains Mono、Fira Code、DejaVu Sans Mono、…）。 |
| **Row height** | 18 – 26 像素——所有列表赖以构建的行高，文件树、日志和 diff 都在内。紧一点屏幕装得下更多，松一点更好读。 |
| **Diff layout** | Inline 或 Side-by-Side，和 diff 标题栏里那个开关是同一个。 |
| **Context lines** | 每个 hunk 周围 0 – 25 行未变行——git 的 `-U`，它自己的默认是 3。放宽看改动所处的上下文，收窄好让大 diff 在屏幕上装下更多。 |
| **Ignore whitespace** | Off、Amount（git 的 `-b`：一串空格长度变化不算改动）或 All（`-w`：没有任何空白差异算改动）。重新缩进或重新折行的代码读作未变，而不是一片红绿。文件列表的 `+12 −3` 计数遵循同一设置，所以它不会声称某些行有改动而 diff 随后拒绝显示。 |
| **Word wrap** | 长行折行，而不是横向滚动。 |
| **Word highlight** | 标出改动行内部变化的词，而不只是整行。 |
| **Markdown outline** | 在渲染好的文档旁显示大纲。 |
| **Markdown source lines** | 给渲染文档的每个块标上它在源码里起始的那一行。标题、段落、列表项、表格、围栏代码和图片都带一个，在左侧行号槽里。默认关。 |
| **File sorting** | Natural 或 Byte order。Natural 把名字里的数字当数值读（`W9` 在 `W10` 前）并把大小写放到次要；byte order 是 git 自己的，每个大写都排在每个小写之前。 |
| **Reopen last session** | 重新打开应用上次退出时开着的那些仓库。Gitty 启动时所在的那个仓库仍是活动标签；已被删除的则悄悄丢弃。 |
| **Shell** | 终端启动的 shell，从 `/etc/shells` 加常见路径（Windows 上是 `COMSPEC` 和 PowerShell）列出。**System default** 是 `$SHELL`。已经失效的路径会回退到它，而不是留下一个死窗格。 |
| **Login shell** | 用 `-l` 启动，好让用户的 profile 被加载。关掉它得到更快、更安静的 shell——没有 profile 输出，没有登录时检查。Windows 的 shell 没有这个旗标，会忽略它。 |

**Shell** 和 **Login shell** 在创建终端时读取，所以它们在下一次分裂或下一个仓库标签
页生效，而不是在已经运行的 shell 里。**Word wrap**、**Diff layout** 和
**Markdown outline** 与 diff 标题栏上的开关是同一批，在哪边改，另一边跟着变。
**Word highlight** 只在这里有。

## 键盘快捷键 <a id="keyboard-shortcuts"></a>

| 按键 | 动作 |
| --- | --- |
| <kbd>Enter</kbd> | 显示选中的提交 |
| <kbd>Space</kbd> / <kbd>Ctrl+Click</kbd> | 标记第二个提交并比较这一对 |
| <kbd>Ctrl+Click</kbd> 于文件标题 | 把那个文件开进新文档标签 |
| <kbd>Ctrl+F</kbd> | 在 diff、文件或窗格显示的任何内容里查找 |
| <kbd>Ctrl+C</kbd> / <kbd>Ctrl+Shift+C</kbd> | 复制选中内容，窗口任何地方 |
| <kbd>Esc</kbd> | 回到工作区 |
| <kbd>Alt+←</kbd> / <kbd>Alt+→</kbd> | 在浏览过的位置间后退和前进 |
| <kbd>F5</kbd> / <kbd>Ctrl+R</kbd> | 刷新状态和日志 |
| <kbd>Ctrl+O</kbd> | 在新标签页打开另一个仓库 |
| <kbd>Ctrl+,</kbd> | 设置 |
| <kbd>Ctrl+1</kbd> … <kbd>Ctrl+4</kbd> | 隐藏或显示 Files、Diff、Commits、Terminal |
| <kbd>Ctrl+Shift+0</kbd> | 把四个窗格全部带回 |
| <kbd>Ctrl+Shift+1</kbd> … <kbd>Ctrl+Shift+4</kbd> | 让那个窗格铺满窗口 |

## 架构 <a id="architecture"></a>

```
src/main       Electron main process — git commands, ptys, fs watchers,
               the recent-repository store, IPC
src/preload    contextBridge API exposed to the renderer as window.gitty
src/renderer   React UI — App.tsx manages tabs, RepoTab.tsx owns one
               repository's four panes
src/shared     Types shared by both sides
build          Application icon (SVG source and rendered PNG)
```

git 通过 `execFile('git', …)` 驱动，解析 `--porcelain=v2 -z` /`--name-status -z`，
所以带空格的路径和重命名都能完好通过。不打包任何 git 库；`PATH` 上的 `git` 是什么，
你看到的就是什么。渲染进程带着 `contextIsolation` 运行，且没有 node 集成。

渲染进程被切成若干按需加载的 chunk，好让窗口在 xterm、highlight.js 和 markdown-it
被解析之前就画出来。这套切分——四个 chunk、把重库挡在热 chunk 之外的规则，以及如何
新增一个——规定在 [ref/spec/lazy-loading.md](../../ref/spec/lazy-loading.md)。

### Linux 桌面集成 <a id="linux-desktop-integration"></a>

桌面条目带着 `StartupWMClass=electron`，正是它让运行中的窗口在窗口列表和 dock 里显
示自己的图标。以「运行」而非「打包」方式启动的 Electron 应用，无论应用自称什么，都
把 `electron` 报告为自己的窗口类，所以条目只能匹配这个名字——副作用是同一会话里另一
个未打包的 Electron 应用会借走 Gitty 的图标。

应用还关掉了 Chromium 的 SUID 沙箱运行（`ELECTRON_DISABLE_SANDBOX=1`）。通常的办法
——把 `chrome-sandbox` 改为 root 所有、权限 4755——在 `node_modules` 里存活不下来，所
以对一个只读你自己仓库的本地工具而言，关掉它是务实的选择。

### macOS 应用 bundle <a id="macos-app-bundle"></a>

`Gitty.app` 是一个封装，不是一个打包好的应用：`Contents/MacOS/Gitty` 是一个两行脚
本，exec 到 `run.sh --fg --any`。`--fg` 很关键——一路 exec 到底意味着 Dock 图标留在
bundle 上，而不是被一个比它活得更久的进程孤立——`--any` 让从 Finder 启动（没有工作目
录可言）回退到最近打开的仓库。

它在三个出现的地方名字都是对的，而只有一处来自 bundle。Finder 和 Dock 从
`Info.plist` 中读取 `CFBundleName` 和 `CFBundleIconFile`；菜单栏是 `app.name`，由
`app.setName('Gitty')` 在任何窗口存在之前设置，被 `{ role: 'appMenu' }` 用作标签。
所以不像上面 Linux 的窗口类问题，这里没有任何妥协——这也是为什么打包
（electron-builder）除了签名什么也买不到。

从 Finder 启动的 bundle 继承的是 launchd 的极简 `PATH`，上面没有 nvm 也没有
Homebrew，而 `run.sh` 在 bundle 过期时需要 `node` 和 `npm` 来重建。`setup.sh` 在安
装时解析它们并把路径前置——用前缀，所以从终端启动不受影响。之后切换 Node 版本会让那
条路径过时；重新运行 `setup.sh` 来重新指向。

## 许可 <a id="licence"></a>

MIT
