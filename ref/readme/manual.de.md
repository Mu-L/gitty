# Das Gitty-Handbuch

[English](manual.md) · [简体中文](manual.zh-CN.md) · [日本語](manual.ja.md) · [한국어](manual.ko.md) · [Français](manual.fr.md) · **Deutsch** · [Español](manual.es.md) · [Русский](manual.ru.md) · [Português](manual.pt.md)

Alles, was Gitty tut, Bereich für Bereich. Das [README](../../README.md) ist die
Kurzfassung — was es ist, warum es existiert, wie man es installiert — und bleibt
das; hier leben die Details.

> **Übersetzt am 2026-08-15.**
> Das [englische Handbuch](manual.md) ist die offizielle Fassung und die einzige,
> die weiter gepflegt wird. Dieses Dokument ist eine Momentaufnahme davon; wo
> beide sich widersprechen, gilt das Englische. Die Oberfläche selbst ist
> englisch, deshalb bleiben Schaltflächen- und Menünamen im Original.

---

## Das Fenster <a id="the-window"></a>

Vier Bereiche in der Mitte, darüber eine Titelleiste, darunter eine Tab-Leiste.

### Titelleiste <a id="title-bar"></a>

Von links nach rechts beschreibt sie das aktive Repository und handelt dann daran:

- **Gitty** — das Symbol und der Name ganz links öffnen den **About**-Dialog:
  Version, Build-Zeit, Autor sowie die Versionen von Electron, Chromium und
  Node, mit einem Link zur Startseite.
- **‹ › ▾** — wo du in diesem Repository gewesen bist. Siehe
  [Zurückgehen](#going-back).
- **Der Repository-Pfad** ist eine Schaltfläche: sie öffnet das Menü der
  [zuletzt geöffneten Repositories](#recent-repositories).
- **+** daneben — ein Verzeichnisdialog, der das gewählte Repository in einem
  neuen Tab öffnet (<kbd>Strg+O</kbd>). Es steht bei der Repository-Schaltfläche,
  weil beide dasselbe Thema haben: welches Repository man gerade ansieht und ein
  weiteres zu öffnen.
- **⎇ Branch** ist ebenfalls eine Schaltfläche — der Branch, den git ausgecheckt
  hat, und ein Menü aller anderen zum Lesen. Siehe
  [einen anderen Branch durchsehen](#browsing-another-branch).
- **`origin/main ↑2 ↓0`** — der Upstream des ausgecheckten Branches und wie weit
  er voraus und zurück ist. Fehlt bei einem Branch, der nichts verfolgt.
- **`3 changed`** — wie viele Dateien im Arbeitsverzeichnis nicht committet sind;
  dieselbe Zahl, die die Zeile **Working Tree** im Commit-Bereich trägt.
- **Panes ▾** — jeden der vier Bereiche ein- oder ausblenden; siehe
  [Vollbild und Ausblenden](#full-screen-and-hiding).
- **Settings** — der Einstellungsdialog ([Einstellungen](#settings)), auch über
  <kbd>Strg+,</kbd>.
- **Refresh** — Status und Log von Hand neu einlesen (<kbd>F5</kbd> /
  <kbd>Strg+R</kbd>). Gitty beobachtet das Repository und aktualisiert von selbst;
  das hier ist für die Fälle, die das Beobachten nicht sieht.

Während man einen anderen Branch liest, zeigt die Branch-Schaltfläche
`⎇ main › other-branch`, und Fehler des letzten Git-Befehls erscheinen rot neben
den Zählern.

### Zurückgehen <a id="going-back"></a>

Historie zu lesen heißt umherzustreifen: ein Commit, eine Datei darin, ein
weiterer Commit zwei Seiten tiefer im Log, dann zurück zum ersten. Die drei
Schaltflächen links in der Titelleiste merken sich dieses Herumstreifen, so wie
ein Browser.

- **‹** (<kbd>Alt+←</kbd>) kehrt zu dem Ort zurück, den man vor diesem
  betrachtet hat, und **›** (<kbd>Alt+→</kbd>) geht zu dem, von dem man
  weggegangen ist. Beide sind grau, wenn es nirgendwo hinzugehen gibt, und wenn
  man über eine fährt, nennt sie den Ort, zu dem sie einen bringen würde.
- **▾** listet die Orte selbst, die jüngsten zuerst, mit einem Punkt auf dem,
  bei dem man gerade ist. Einen auszuwählen springt direkt hin.

Ein *Ort* ist alles, was die beiden oberen Bereiche gezeigt haben: die
Ansicht — das Arbeitsverzeichnis, ein Commit, ein Bereich aus zwei Commits,
eine Momentaufnahme — die darin gewählte Datei und das neben dem Diff geöffnete
Dokument. Ein Haltepunkt liest sich als `Working tree`,
`7bb7787 — Refresh screenshot batches`, `src/main/git.ts @ 7bb7787` oder
`blame: src/main/git.ts @ 7bb7787`, und dorthin zurückzukehren bringt dieselbe
Datei in derselben Revision wieder auf den Schirm, statt nur den Commit erneut
auszuwählen.

Die Historie gehört dem Repository, nicht dem Fenster: jeder Tab merkt sich seine
eigenen fünfzig jüngsten Orte, und zwischen den Tabs zu wechseln wechselt, durch
welche die Schaltflächen gehen. Über Neustarts hinweg wird sie nicht behalten.

### Tabs <a id="tabs"></a>

Eine Tab-Leiste am unteren Rand hält jedes geöffnete Repository — seinen
Basisnamen, einen gelben Punkt, wenn das Arbeitsverzeichnis nicht committete
Änderungen hat, und ein **×** zum Schließen. Der Punkt zählt alles, was
`git status` meldet, unversionierte Dateien eingeschlossen, und seinen Platz
verdient er sich auf den Tabs, die man gerade *nicht* ansieht: das aktive
Repository sagt bereits `3 changed` in der Titelleiste, während ein Tab im
Hintergrund vollständig verborgen ist — der Punkt ist also das einzige Zeichen,
dass dort noch Arbeit liegt. Fährt man über einen Tab, nennt er das Repository
und sagt es in Worten.

**+** (und <kbd>Strg+O</kbd>) öffnet ein weiteres Repository in einem neuen Tab;
die Titelleiste zeigt stets das aktive. Jeder Tab behält seine eigenen Bereiche
und sein Terminal, sodass ein Commit, den man gerade liest, und eine laufen
gelassene Shell genau dort sind, wo sie waren, wenn man weg- und zurückwechselt.
Den letzten Tab zu schließen hinterlässt ein leeres Fenster mit einer
Schaltfläche für das nächste Repository. (Offene Tabs werden über Neustarts
hinweg nicht gemerkt.)

### Zuletzt geöffnete Repositories <a id="recent-repositories"></a>

Der Repository-Pfad in der Titelleiste ist ein Menü der zuvor geöffneten
Repositories — Basisname samt übergeordnetem Verzeichnis — das jüngste zuerst.

- **Klick** — in einem neuen Tab öffnen.
- **Strg/Cmd+Klick** oder **Mittelklick** — im aktuellen Tab öffnen, das dortige
  Repository ersetzen und den Platz des Tabs in der Leiste behalten.
- **Rechtsklick** — den Eintrag aus der Liste entfernen. Das Menü bleibt offen,
  sodass sich mehrere hintereinander löschen lassen.

**Open Repository…** und **Clear Recent** stehen darunter. Die Liste liegt in
`~/.config/Gitty/recent-repos.json`, fasst zwölf Einträge und überspringt alle,
die inzwischen verschoben oder gelöscht wurden.

### Vollbild und Ausblenden <a id="full-screen-and-hiding"></a>

Jede Bereichskopfzeile trägt dieselben zwei Bedienelemente: **⤢** links füllt das
Fenster mit diesem Bereich, **×** rechts blendet ihn aus.

Das Vollbild deckt alles andere ab, Titel- und Tab-Leiste eingeschlossen, und die
Bereiche darunter arbeiten weiter — das Terminal läuft auch verdeckt weiter.
**⤡** in derselben Ecke, <kbd>Esc</kbd>, ein Doppelklick auf die Kopfzeile oder
<kbd>Strg+Umschalt+1</kbd> … <kbd>Strg+Umschalt+4</kbd> stellen das Layout wieder
her. Nur ein Bereich ist gleichzeitig im Vollbild.

Ausblenden ist die andere Richtung — jeder Bereich lässt sich wegräumen und
zurückholen:

- **Panes** in der Titelleiste listet alle vier, mit einem Punkt neben den
  sichtbaren; ein Klick schaltet um, und **Show All Panes** stellt das Layout aus
  vier Bereichen wieder her.
- <kbd>Strg+1</kbd> … <kbd>Strg+4</kbd> schalten Files, Diff, Commits und
  Terminal in dieser Reihenfolge um.
- <kbd>Strg+Umschalt+0</kbd> bringt alle vier zurück — Null für »alle«, eine
  Taste hinter den vieren, die je einen umschalten. Es braucht die Umschalttaste,
  weil <kbd>Strg+0</kbd> der Zoom-Zurücksetzen-Befehl der Browser-Engine ist, den
  das View-Menü behält.

Was übrig bleibt, teilt sich das Fenster; den Commit-Bereich auszublenden gibt
dem Diff also die volle Höhe. Der letzte sichtbare Bereich hat kein **×** — ein
leeres Fenster ließe nichts zum Anklicken übrig. Ausgeblendete Bereiche werden
über Neustarts gemerkt, und der Terminal-Bereich wird nur weggeräumt, nie
geschlossen: seine Shells laufen weiter und kommen mit ihrem Scrollback zurück.

## Die Bereiche <a id="the-panes"></a>

### Working Tree (oben links) <a id="working-tree-top-left"></a>

Die geänderten Dateien als einklappbarer Baum, jede mit ihrer Zeilenzahl neben
dem Namen. Ein ganzes Repository zu durchstöbern — das Arbeitsverzeichnis oder
die Momentaufnahme eines Commits — öffnet mit allen Verzeichnissen geschlossen,
denn das ist ein Baum zum Hinabsteigen und keine Liste zu lesender Änderungen;
eine Liste von Änderungen öffnet aufgeklappt. Auf jeder Ebene kommen
Verzeichnisse vor Dateien, und innerhalb jeder Gruppe sind Namen so sortiert,
wie es ein Leser erwartet, statt wie es ein Bytevergleich tut: die Ziffern in
einem Namen zählen als Zahl, also kommt `W9` vor `W10`, und Groß-/Kleinschreibung
ist kein Unterschied erster Ordnung, also sortiert `butler/` zu den b's statt
hinter jeden Großbuchstaben. Zwei Statusspalten werden gezeigt: der Zustand im
Index (grün) und der im Arbeitsverzeichnis (gelb / rot); unversionierte Dateien
sind `??`. Die Zahl wird im Arbeitsverzeichnis von der Platte und sonst aus der
Revision gelesen; Binärdateien, gelöschte Dateien und alles über 8 MB zeigen
schlicht keine. Danach folgt der Änderungsumfang — wie viele Zeilen diese
Änderung in der Datei hinzugefügt und entfernt hat, `+12 −3`, gegen HEAD im
Arbeitsverzeichnis und gegen den Vorgänger bei einem Commit oder einem Bereich.
Eine Momentaufnahme ist ein Baum und keine Änderung, daher hat sie keinen
Änderungsumfang; ebenso Binärdateien oder ein Merge-Commit, dessen kombiniertes
Diff nichts zuschreibt.

- **Klick** — das Diff der Datei rechts zeigen.
- **Doppelklick** — die ganze Datei als Dokument neben dem Diff öffnen, mit
  Zeilennummern und Syntaxhervorhebung (ein gerendertes Dokument bei Markdown,
  das Bild selbst bei einem Bild).
- **Klick auf eine Statusspalte** — die Datei stagen oder, falls bereits
  gestaged, wieder unstagen.
- **Rechtsklick** — View File, Open in System App, Reveal in File Manager, Copy
  Relative Path, Copy Absolute Path, Copy File Name, Blame File, File History,
  Stage / Unstage File, Discard Changes, Delete File.
- **Klick auf einen Ordner** — ein- oder ausklappen.

**Discard Changes** setzt die Datei auf das zurück, was der Index hält, nach einer
nativen Bestätigung, die klar sagt, dass es kein Zurück gibt; eine unversionierte
Datei hat keine Index-Fassung, auf die sie zurückfällt, also bietet sie stattdessen
**Delete File** an, das in den System-Papierkorb geht.

**Send to agent** in der Kopfzeile übergibt den Index. Es tippt einen Befehl in
die Shell im Bereich unten rechts und drückt Enter, und das ist alles: aus Gitty
heraus wird kein Modell aufgerufen, nichts verlässt die Maschine, das du nicht
gesendet hast. Die Prompts und die Ausgabe des Agenten erscheinen im Terminal, wo
ein echtes tty ist, also funktionieren Hooks und gpg-Signatur wie immer.

Der Pfeil neben der Schaltfläche ist der Ort, an dem der Befehl gewählt wird — es
gibt keine Einstellung dafür, denn es ist eine Frage, die einmal pro Übergabe
gestellt wird, nicht einmal pro Installation. Das Dropdown listet die Befehle, an
die Gitty sich erinnert, hakt den ab, den die Schaltfläche selbst ausführt, und
führt den aus, den du wählst. Das **×** rechts an einem Eintrag nimmt ihn nach
einer Bestätigung aus der Liste — die Liste ist der einzige Ort, an dem ein Befehl
festgehalten wird, und das Menü bleibt offen, sodass mehrere hintereinander
entfernt werden können. **New command…** unten öffnet ein einzeiliges Feld, mit
dem aktuellen Befehl
vorbefüllt, für alles, was nicht in der Liste steht. Die Liste beginnt mit
einigen Vorschlägen — welcher Agent installiert ist, kann Gitty nicht wissen — und
ein Befehl kommt in die Liste, indem er ausgeführt wurde; gemerkt wird also nichts
aufgrund einer halb getippten Zeile.

Ein Rechtsklick auf die Arbeitsverzeichnis-Zeile im Commit-Log bietet außerdem
**Copy Staged Diff**, für ein Gespräch, das in einem anderen Fenster stattfindet.

Ist ein Commit oder ein Commit-Bereich gewählt, listet dieser Bereich stattdessen
die Dateien jenes Commits; **Back to Work Tree** (oder <kbd>Esc</kbd>) führt
zurück. In einer [Momentaufnahme](#snapshots) listet er den gesamten Baum zu
diesem Commit, nicht nur das Geänderte.

### Diff (oben rechts) <a id="diff-top-right"></a>

Unified Diff mit alten und neuen Zeilennummern, Hunk-Kopfzeilen und Färbung für
Hinzugefügtes und Gelöschtes, angeordnet als Liste von Dateien: jeder Pfad ist
eine Überschrift über die volle Breite, die Hunk-Kopfzeile ist gedämpft — sie ist
ein Zeilenbereich, nicht das, worauf man zuerst schaut — und eine Umbenennung
liest sich als `old → new`. Ohne gewählte Datei zeigt er alles auf einmal: jede
nicht committete Änderung im Arbeitsverzeichnis oder jede Datei des gewählten
Commits.

- **Show Whole Diff** — zurück zu jenem Gesamt-Diff, nachdem man eine Datei
  gewählt hat. Die Schaltfläche bleibt in der Kopfzeile und leuchtet, solange das
  ganze Diff das ist, was man ansieht. Die Arbeitsverzeichnis-Fassung deckt
  vorgemerkte und nicht vorgemerkte Änderungen zusammen ab und bindet
  unversionierte Dateien ein (bis zu 50, dann ein Hinweis), die `git diff` allein
  auslässt.
- **Wrap** — lange Zeilen umbrechen statt seitwärts scrollen. Standardmäßig an.
- **Inline / Side-by-Side** — eine Spalte mit `+`/`-`-Zeichen, oder Alt und Neu
  nebeneinander, wobei eine Folge von Löschungen mit den darauf folgenden
  Hinzufügungen gepaart wird. Umbrochene Hälften bleiben ausgerichtet.
- **Dateiüberschriften** — jede Überschrift klappt ihre Datei ein: das Dreieck
  reduziert sie auf den Namen, und **Collapse All** / **Expand All** in der
  Kopfzeile erledigen alle auf einmal. **Strg+Klick** auf eine Überschrift öffnet
  die Datei in einem neuen Dokument-Tab; per Rechtsklick gibt es **Open in a New
  Tab**, **Select in the File List**, die Pfad-Kopien und — im
  Arbeitsverzeichnis, wo die Datei auf der Platte die gezeigte Fassung ist —
  **Open in System App** und **Reveal in File Manager**. Eine Umbenennung öffnet
  ihren neuen Pfad.
- **Stage / Unstage** — solange das Diff die Arbeit einer versionierten Datei ist,
  trägt jede Hunk-Kopfzeile eine Schaltfläche, die diesen Hunk in den Index legt
  oder wieder herausnimmt. Wähle zuerst Zeilen aus, und die Schaltfläche wird zu
  **Stage 3 lines**: ein nicht gewählter Zusatz bleibt aus dem Patch, eine nicht
  gewählte Löschung wird zu einer Kontextzeile herabgestuft, und die
  Hunk-Kopfzeile wird neu berechnet — dieselbe Teilung, die `git add -p` macht, aus
  einem Fenster, in dem die ganze Datei vor einem liegt. Die Auswahl ist die
  gewöhnliche Textauswahl, ein Ziehen kopiert also weiterhin. Eine Auswahl über
  zwei Hunks gibt jedem seinen Anteil daran.
- **Unstaged / Staged** — von welcher Seite des Index eine Datei gelesen wird,
  gezeigt, sobald beide Seiten etwas enthalten. Das Stagen wirkt auf das, was auf
  dem Schirm ist. Binärdateien, Modusänderungen und Umbenennungen haben keine
  Hunks zum Wählen und werden aus der Dateiliste als Ganzes gestaged; die
  Hunk-Schaltflächen verschwinden auch, solange **Ignore whitespace** an ist, weil
  jenes Diff nicht jede Änderung enthält, die es anwenden würde.
- **Rechtsklick** — Copy Selection, Copy Whole Diff und dieselben Schalter.

Geänderte Wörter innerhalb einer geänderten Zeile werden hervorgehoben, wo sich
das besser liest als die ganze Zeile; das ist **Word highlight** in den
[Einstellungen](#settings).

Einstellungen werden über Programmläufe hinweg gemerkt. Zeilen werden in Blöcken
zu 1500 gerendert und wachsen beim Scrollen, sodass große Commits flüssig
bleiben; Diffs über 2 MB werden mit einem Hinweis abgeschnitten.

### Ganze Dateien ansehen <a id="viewing-files"></a>

Standardmäßig zeigt der Bereich ein Diff, aber jede Datei lässt sich ganz öffnen:
im Baum **doppelklicken**, **View File** / **Preview** in der Kopfzeile nutzen,
im Diff eine Dateiüberschrift **Strg+klicken** oder es aus einem der beiden
Kontextmenüs nehmen.

Die Datei öffnet als eigenes Dokument in einer Tab-Leiste *neben* dem Diff statt
darüber, sodass man sie lesen kann, ohne das Diff zu verlieren, bei dem man war.
Der Tab **Diff** steht immer zuerst, und ein einfacher Klick im Baum blättert
weiterhin an Ort und Stelle durch Diffs. Jedes Dokument merkt sich die Revision,
in der es geöffnet wurde, schließt mit seinem eigenen **×** und liest eine Datei
aus dem Arbeitsverzeichnis neu, wenn sich das Repository ändert. Quelldateien
bekommen Zeilennummern und Syntaxhervorhebung; Markdown öffnet
[gerendert](#markdown-preview), mit einem Schalter zurück zur Quelle; HTML öffnet
[ebenfalls gerendert](#html-preview); ein Bild öffnet als [das Bild](#images).

Welche Revision man bekommt, folgt dem Bereich: die Datei auf der Platte im
Arbeitsverzeichnis, die Datei zum gewählten Commit überall sonst. Ein Dokument zu
öffnen ist eine Handlung, kein Modus — eine andere Datei oder ein anderer Commit
holt das Diff zurück — sodass der Bereich nie bei Dateien hängen bleibt, wenn man
Änderungen sehen wollte.

#### Momentaufnahmen <a id="snapshots"></a>

Per Rechtsklick auf einen Commit und **Browse Snapshot** liest man das Repository
so, wie es bei diesem Commit war: der Bereich oben links listet den *gesamten*
Baum statt der Dateien, die dieser Commit angefasst hat, und jede Datei öffnet in
jener Revision. Eine Momentaufnahme hat kein Diff zu zeigen, also ist dort jede
Datei ein Dokument.

Die Dateien einer Momentaufnahme haben in jener Revision nie auf der Platte
existiert; darum reicht **Open in System App** eine temporäre Kopie weiter, und
**Reveal in File Manager** wird gar nicht erst angeboten. **Back to Work Tree**
(oder <kbd>Esc</kbd>) verlässt sie.

#### Markdown-Vorschau <a id="markdown-preview"></a>

Eine `.md`-Datei auszuwählen fügt eine Schaltfläche **Preview** hinzu —
standardmäßig aus, sodass ein Diff ein Diff bleibt, bis man danach fragt. Sie
rendert die Datei als Ganzes: die Fassung auf der Platte im Arbeitsverzeichnis,
die Fassung zum gewählten Commit überall sonst.

Abgegrenzte Codeblöcke bekommen Syntaxhervorhebung, wenn sie eine Sprache nennen,
YAML-Frontmatter wird herausgelöst und als eigener hervorgehobener Block gezeigt,
und Überschriftenebenen, Listenzeichen, Links und Inline-Code sind farbcodiert,
damit sich die Struktur auf einen Blick liest.

- **Wrap** — derselbe Schalter wie beim Diff, standardmäßig an. Fließtext bricht
  immer um; in einer Vorschau entscheidet dieser Schalter, ob abgegrenzte
  Codeblöcke, breite Tabellen und lange Inline-Zeichenketten ebenfalls umbrechen,
  statt seitwärts zu scrollen.
- **Outline** — die Überschriftenstruktur neben dem Dokument, nach Ebene
  eingerückt, der Überschrift folgend, zu der man gescrollt hat. Ein Klick auf
  einen Eintrag springt hin, und der Trenner zwischen ihm und dem Dokument lässt
  sich ziehen, um einer der beiden Seiten mehr Raum zu geben. Die Breite teilen
  sich alle Dokumente im Repository — sie ist eine Leseeinstellung, keine
  Eigenschaft einer einzelnen Datei — und sie hält so lange wie das Fenster, wie
  die Größen der anderen Bereiche.
- **Source lines** — standardmäßig aus und in den [Einstellungen](#settings)
  eingeschaltet: jede Überschrift, jeder Absatz, jeder Listeneintrag, jede
  Tabelle, jeder Codeblock und jedes Bild bekommt im linken Rand die
  Zeilennummer, mit der es in der Quelle beginnt. Die Nummern werden gezeichnet
  statt eingefügt, also bleiben sie aus einer Auswahl heraus, die man kopiert,
  und aus dem, was <kbd>Strg+F</kbd> durchsucht. Ein Bild, das innerhalb eines
  Satzes steht, übernimmt die Zeile seines Absatzes, da es keine eigene hat.
- **<kbd>Strg+F</kbd>** — im Dokument suchen; siehe
  [Text suchen](#finding-text).
- **Rechtsklick** — Copy Selection, Copy Markdown Source, die Schalter für
  Umbruch und Gliederung, und Show Diff Instead.

Rohes HTML im Markdown wird nicht gerendert, und ein Link ins Web öffnet im
System-Browser statt in der Anwendung. Ein Link auf eine andere Datei im
Repository — `ref/readme/manual.md`, `../README.md`, `/CHANGELOG.md` — wird hier
stattdessen verfolgt: **Strg/Cmd+Klick** öffnet diese Datei als eigenes Dokument
neben dem Diff, in derselben Revision wie das Dokument, das den Link trägt, sodass
ein README, das man bei einem alten Commit liest, zu den Dateien jenes Commits
führt. Ein `#fragment` am Ende reist mit — `manual.md#the-window` öffnet das
Handbuch bei jener Überschrift, wie es auf einer Forge täte — und eine
Überschrift, die dieses Dokument nicht hat, öffnet es einfach oben. Das Überfahren
eines solchen Links sagt das. Ein einfacher Klick tut wie bisher nichts, und ein
Link, der über die Wurzel des Repositories hinausklettert, gehört nicht dazu.
Bilder, die relativ zum Dokument angegeben sind, werden aus dem Repository
gelesen — in derselben Revision wie das Dokument, sodass ein alter Commit die
Screenshots zeigt, mit denen er ausgeliefert wurde. Eines, das das Repository dort
nicht hat, hinterlässt einen gestrichelten Platzhalter mit seinem Alt-Text. Bilder
aus dem Netz werden überhaupt nicht geholt: das README eines Fremden zu lesen
sollte einen nicht bei dessen Host anmelden.

![Markdown preview](../../ref/gitty-0.1.5-markdown.png)

#### HTML-Vorschau <a id="html-preview"></a>

Eine `.html`, `.htm` oder `.xhtml`-Datei bekommt dieselbe Schaltfläche
**Preview**, und das Dokument wird gerendert statt als Quelle gezeigt — die
Fassung auf der Platte im Arbeitsverzeichnis, die Fassung zum gewählten Commit
überall sonst.

Sie rendert in einem Sandbox-Rahmen, der über `srcdoc` geladen wird, sodass die
Seite die Anwendung nie von sich selbst wegnavigieren kann. Ihre eigenen
Stylesheets gelten — Layout, Farben, Schriften gehören dem Dokument. Skripte
laufen nicht, und entfernte Bilder werden nicht geholt: der Rahmen erbt die
Content-Security-Policy der Anwendung, die keines von beiden zulässt. Eine Seite
wird gezeigt, nicht ausgeführt. **Wrap** entscheidet, ob der Rahmen für sich
scrollt oder auf seinen Inhalt wächst, sodass die ganze Seite als eine scrollt.
<kbd>Strg+F</kbd> und <kbd>Strg+Umschalt+C</kbd> funktionieren innerhalb des
Rahmens, dessen Tasten den Rest des Fensters nie erreichen.

#### Bilder <a id="images"></a>

Eine `.png`, `.jpg`, `.gif`, `.webp`, `.bmp`, `.ico`, `.avif` oder `.svg` öffnet
als das Bild statt als Meldung, dass es binär ist — von der Platte im
Arbeitsverzeichnis, aus dem Commit überall sonst. Es wird über einem Schachbrett
in den Bereich eingepasst, sodass Transparenz als Transparenz lesbar ist; ein
**Klick** zeigt es in Originalgröße zum Scrollen, ein weiterer passt es wieder
ein. Pixelmaße und Größe auf der Platte stehen darunter. Bilder über 12 MB werden
nicht eingebettet.

![Image preview](../../ref/gitty-0.1.5-image.png)

#### Blame und Datei-Historie <a id="blame-and-file-history"></a>

Rechtsklick auf eine Datei im Baum und **Blame File** oder **File History**
wählen; beide öffnen als Dokumente neben dem Diff. Blame zeigt eine Zeile pro
Quellzeile — den Commit, seinen Autor, sein Datum und die Zeile selbst,
hervorgehoben wie im Code-Betrachter, mit einem Geviertstrich, wo eine Zeile
noch nicht committet ist — in der Revision, die man gerade betrachtet. File
History listet jeden Commit, der die Datei berührt hat, folgt Umbenennungen, und
ein Klick auf einen Commit öffnet ihn.

Ein Rechtsklick auf eine Blame-Zeile bietet **History of These Lines**: `git log
-L` über die Zeilen, die die Auswahl abdeckt — oder die geklickte Zeile, ohne
Auswahl — was als eigenes Dokument öffnet und jeden Commit zeigt, der sie berührt
hat, samt dem, was er ihnen angetan hat. Blame antwortet *wer zuletzt*; das hier
antwortet *wie es so weit kam*. Es verfolgt den Bereich über Umbenennungen hinweg
von selbst.

#### Im Repository suchen <a id="searching-the-repository"></a>

**Search** in der Kopfzeile des Arbeitsverzeichnis-Bereichs öffnet ein Feld über
der Dateiliste und führt `git grep` aus. Die Treffer sind ein nach Datei
gruppiertes Dokument, Zeilennummern links hinunter; ein Klick öffnet die Datei an
jener Zeile, wobei die Zeile markiert ist.

Die Suche folgt der Revision auf dem Schirm: im Arbeitsverzeichnis liest sie, was
auf der Platte ist, uncommittete Arbeit eingeschlossen, und bei einem Commit oder
einer Momentaufnahme jene Revision — das Feld sagt, welche. Über 2000 Treffer
hört sie auf und sagt es, wie ein übergroßes Diff. Das Muster erreicht git als ein
einziges Argument, ein regulärer Ausdruck wird also unterwegs nicht zerlegt.

### Commits (unten links) <a id="commits-bottom-left"></a>

Das Log des aktuellen Branches, in Schritten von 300 geladen und beim Scrollen
verlängert. Die erste Zeile ist **Working Tree** — die nicht committeten
Änderungen, mit der Zahl geänderter Dateien; sie auszuwählen holt die oberen
Bereiche zurück ins Arbeitsverzeichnis. Ein Filterfeld über dem Log grenzt die
Liste ein — entprellt, mit einem ✕ zum Löschen — und das Ergebnis blättert auf
dieselbe Weise.

**Graph** in der Kopfzeile zeichnet die Bahnen neben die Hashes: wo ein Branch
sich teilte, wo ein Merge landete, zu welcher Linie ein Commit gehört. Er wird aus
den Eltern jedes Commits berechnet, statt aus `git log --graph` geparst zu werden,
dessen ASCII für ein Terminal gesetzt ist. Eine Bahn behält ihre Farbe die Seite
hinunter, und die Palette ist fest — bewusst anders als beim Blame, dessen Farben
vom SHA abgeleitet sind und „wer" bedeuten. Jenseits von zehn Bahnen teilt sich
der Überlauf die letzte Spalte, umringt, sodass ein Repository mit vielen Köpfen
die Betreffzeilen nicht aus dem Bereich drängen kann. **All Branches** zeigt alle
Branches auf einmal (`git log --all`), und so sieht man zwei Branches in ihrem
Verhältnis zueinander; das Branch-Menü liest weiterhin einen nach dem anderen.

Das Dropdown daneben sagt, wonach gesucht wird:

| | |
| --- | --- |
| **Message / Author** | Die Commit-Nachricht und der Autor, unabhängig von Groß-/Kleinschreibung. Der Standard. |
| **Content** | gits `-S`: die Commits, in denen sich die *Anzahl der Vorkommen* des Texts geändert hat — wo er eingeführt oder entfernt wurde. Wörtlich, eine Suche voller `.` und `(` meint also jene Zeichen. |
| **Content regex** | gits `-G`: jeder Commit, dessen Diff zum Ausdruck passt, einschließlich jener, die die Zeile nur herumgeschoben haben. |

Die beiden Inhaltsmodi beantworten die Frage, die Blame nicht kann — *welcher
Commit diese Zeile eingeführt hat* — und lesen dafür jedes Diff der Historie; das
Feld sagt also, dass gesucht wird, während sie laufen. Den Text oder den Modus zu
ändern tötet die laufende Suche; es wird nichts in eine Befehlszeile eingefügt,
ein regulärer Ausdruck erreicht git also als ein Argument.

- **Klick** oder <kbd>Enter</kbd> — diesen Commit zeigen: seine Dateien füllen
  den Bereich oben links, sein vollständiges Diff den oben rechts. Betreff,
  Autor, Datum und der vollständige Nachrichtentext des Commits erscheinen in
  einem Streifen über der Dateiliste; ist der Text lang, klappt ihn ein
  ▸-Schalter weg, sodass die Dateiliste den Platz behält.
- **Strg+Klick** (<kbd>Cmd</kbd> unter macOS), <kbd>Umschalt+Klick</kbd> oder
  <kbd>Leertaste</kbd> — einen zweiten Commit wählen und beide vergleichen, den
  älteren zuerst.
- **↑ ↓ / j k / Bild↑ / Bild↓ / Pos1 / Ende** — den Cursor bewegen.
- **Rechtsklick** — das Diff zeigen, Hash, Kurz-Hash oder Betreff kopieren,
  [die Momentaufnahme durchsehen](#snapshots) oder gegen den gewählten Commit
  vergleichen.
- **Rechtsklick → Open in Browser** — diesen Commit im System-Browser rendern;
  **Copy Commit URL** kopiert den Link. Ein Webserver in der Anwendung liefert
  jedes offene Repository als durchklickbare Commit-Liste aus — die Schaltfläche
  **Open in Browser** im Commit-Bereich landet dort — mit Metadaten, Dateien und
  Diff jedes Commits und Diffs je Datei einen Klick entfernt.

  Er lauscht auf `127.0.0.1`, und das allein wäre nicht viel: die Loopback-Adresse
  hält andere Rechner draußen, nicht andere Seiten im eigenen Browser, von denen
  jede es abrufen könnte. Also trägt jede URL ein beim Start erzeugtes und im
  Speicher gehaltenes Token — `/t/<token>/…` — das die Links, die Gitty dir reicht,
  bereits haben. Ein falsches Token ist ein 404 statt eines 403, eine Anfrage,
  deren `Host` nicht loopback ist, wird abgewiesen (das ist es, was DNS-Rebinding
  sinnlos macht), und die Seiten werden mit `Referrer-Policy: no-referrer`
  ausgeliefert, sodass ein Link aus einer Commit-Nachricht das Token nicht
  mitnimmt. Das Token ist bei jedem Start neu, also funktionieren die URLs,
  solange diese Sitzung läuft.
- Eine Datei im Bereich oben links auszuwählen verengt das Diff auf diese Datei;
  **Show Whole Diff** weitet es wieder.

![Diff against any two commits](../../ref/gitty-0.1.5-range.png)

#### Gource <a id="gource"></a>

Ist [gource](https://gource.io/) im `PATH`, bekommt der Commit-Bereich eine
Schaltfläche **Gource** neben **Open in Browser**: sie spielt die Historie des
Repositories als Animation ab — der Verzeichnisbaum wächst, Dateien leuchten auf,
wenn ein Commit landet, ein Autor fliegt zwischen ihnen pro Name im Log. Gource
öffnet ein eigenes Fenster und läuft weiter, nachdem man Gitty geschlossen hat;
die Schaltfläche wartet nur lange genug, um zu sehen, dass es gestartet ist, und
zeigt, was gource gesagt hat, wenn nicht.

Es wird mit einem Tag Historie pro halber Sekunde gestartet, inaktive Dateien
bleiben auf dem Schirm und lange Lücken werden übersprungen — das ist es, was ein
echtes Repository lesbar macht statt zu einem langsamen Tröpfeln. Nichts wird für
dich installiert: wo gource nicht im `PATH` ist, ist die Schaltfläche schlicht
nicht da.

#### Einen anderen Branch durchsehen <a id="browsing-another-branch"></a>

Der Branch in der Titelleiste öffnet ein Menü aller lokalen und
Remote-Tracking-Branches, den mit dem neuesten Commit zuerst; einen davon zu
wählen zeigt dessen Historie. Es ist ein Blick, der nur liest: gitty führt kein
`checkout` aus, also bleiben das Arbeitsverzeichnis, seine Diffs und die
Terminals genau dort, wo git sie gelassen hat. Während man einen anderen Branch
ansieht, liest sich die Titelleiste als `⎇ main › other-branch`, und der
Commit-Bereich nennt den Branch, den er auflistet; **Back to \<branch\>** führt
zurück. Jeder Tab sieht für sich durch.

#### Push und Pull <a id="push-and-pull"></a>

**Push** und **Pull** sitzen in der Kopfzeile, und beide wirken auf den
ausgecheckten Branch, gleich auf welchen das Log zeigt. **Push** zählt, was
ungepusht ist — **Push 3** — und wird grau, wenn es nichts zu senden gibt; auf
einem Branch, der nichts verfolgt, veröffentlicht er den Branch auf `origin` und
setzt den Upstream. **Pull** holt per Fast-Forward vom Upstream und ist grau,
wenn es keinen gibt. Was git sagt, erscheint über dem Log — ein Klick schiebt es
weg; Fehlschläge bleiben, bis man das tut.

Keiner von beiden kann auf eine Eingabeaufforderung antworten: hinter ihnen steht
kein Terminal, also scheitert ein Push, der ein Passwort oder eine Passphrase
will, mit gits eigener Meldung, statt hängen zu bleiben, und ein Pull, der nicht
vorspulen kann, sagt es. Beides wird danach von Hand im Terminal-Bereich zu Ende
gebracht, der ja gleich daneben liegt.

### Terminal (unten rechts) <a id="terminal-bottom-right"></a>

Eine echte interaktive Login-Shell (`$SHELL`) mit Wurzel im Repository, sodass
sich jeder Git-Befehl direkt ausführen lässt. <kbd>Strg+Umschalt+C</kbd> kopiert
die Auswahl des Terminals — <kbd>Strg+C</kbd> ist dort der Interrupt und bleibt
der Interrupt. Derselbe Akkord kopiert auch in jedem anderen Bereich, ändert
seine Bedeutung also nicht, wenn der Fokus wandert. Die anderen Bereiche
aktualisieren sich automatisch, wenn sich das Repository auf der Platte ändert.
Welche Shell sie startet und ob sie als Login-Shell startet, sind
[Einstellungen](#settings); beides wird gelesen, wenn ein Terminal entsteht, also
greift eine Änderung bei der nächsten Teilung.

Der Bereich teilt sich in so viele Shells, wie man mag: **Split →** setzt eine
neue neben das fokussierte Terminal, **Split ↓** darunter, und die Trenner
dazwischen lassen sich ziehen wie bei jedem anderen Bereich. Ein Klick auf ein
Terminal fokussiert es — das umrandete ist das, wo die nächste Teilung oder
**Close** landet. Zweimal in dieselbe Richtung zu teilen verlängert die Reihe
oder Spalte, statt zu verschachteln, sodass drei nebeneinanderliegende Terminals
gegeneinander in der Größe verändert werden.

**Close** beendet die fokussierte Shell; eine Shell mit `exit` zu verlassen
schließt ihre Teilung von selbst. Das letzte Terminal bleibt immer: es zu
verlassen hinterlässt den Hinweis auf dem Schirm statt eines leeren Bereichs.

## Text suchen <a id="finding-text"></a>

<kbd>Strg+F</kbd> durchsucht, was der rechte Bereich gerade zeigt: ein Diff, eine
Datei, ein gerendertes Markdown-Dokument, eine [HTML-Vorschau](#html-preview),
ein Blame oder die Historie einer Datei. Jeder Treffer ist hervorgehoben, der
aktuelle herausgehoben, <kbd>Enter</kbd> und <kbd>Umschalt+Enter</kbd> (oder die
Pfeiltasten) gehen sie durch und schlagen an beiden Enden um, die Zählung sagt,
wo man ist, und <kbd>Esc</kbd> schließt.

Die Suche ist unabhängig von Groß-/Kleinschreibung und liest den Text so, wie er
gerendert ist, nicht das Markup dahinter — ein Ausdruck wird also über die Fett-
und Code-Spans hinweg gefunden, die Markdown hinterlässt, und ein Diff wird als
die Zeilen durchsucht, die man sieht. Ansichten, die beim Scrollen in Blöcken
rendern (eine lange Datei, ein großes Diff), rendern den Rest, wenn die
Suchleiste aufgeht, sodass die Zählung das Ganze abdeckt statt nur den bisher
gescrollten Teil. Eine eingeklappte Datei in einem Diff aus mehreren Dateien
bleibt eingeklappt und wird nicht durchsucht.

## Einstellungen <a id="settings"></a>

**Settings** in der Titelleiste, oder <kbd>Strg+,</kbd>. Alles hier gilt für jeden
Tab und wird über Neustarts gemerkt; **Restore Defaults** setzt alles zurück. Der
Dialog liegt in drei Reitern — **Appearance**, **View** und **Session** —, damit
er mit seinem Wachstum eine Bildschirmseite bleibt; die Tabelle unten listet sie
in dieser Reihenfolge.

| | |
| --- | --- |
| **Theme** | Dark oder Light. |
| **Language** | English, 简体中文, 日本語, 한국어, Français, Deutsch, Español, Русский oder Português — die Oberfläche, die Menüs und die Dialoge ändern sich alle gemeinsam, ohne Neustart. |
| **Time zone** | Die Zone, in der jedes Datum und jede Uhrzeit auf dem Schirm gerendert wird: standardmäßig die der Maschine selbst, oder UTC, oder jede Zone, die das System kennt. Git speichert jeden Commit mit dem Versatz seines Autors, also ist ein Zeitstempel immer eine Wahl der Zone — hier wird sie getroffen. Die Datumsspalte des Logs folgt ihr, was heißt, dass die Grenze zwischen „heute" und einem Datum mitwandert. |
| **Time format** | Absolut (eine Uhrzeit oder ein Datum) oder relativ (`28m ago`, `2h ago`). Relativ umgeht die Zonenfrage ganz; der Hover-Tipp auf einer Zeile bleibt in jedem Fall absolut und nennt seine Zone. |
| **Font size** | 9 – 20, in halben Punkten. Gilt für jeden Bereich, das Terminal eingeschlossen. |
| **Monospace font** | Die Schriftfamilie, in der die Bereiche und das Terminal gezeichnet werden, gewählt aus den auf dieser Maschine gefundenen Monospace-Schriften. **System default** ist der eingebaute Stapel (JetBrains Mono, Fira Code, DejaVu Sans Mono, …). |
| **Row height** | 18 – 26 Pixel — die Zeilenhöhe, auf der jede Liste aufbaut: Dateibaum, Log und Diff. Enger passt mehr auf den Schirm, weiter liest sich leichter. |
| **Diff layout** | Inline oder Side-by-Side, derselbe Schalter, den die Diff-Kopfzeile trägt. |
| **Context lines** | 0 – 25 unveränderte Zeilen um jeden Hunk — gits `-U`, dessen eigener Standard 3 ist. Weiter, um zu sehen, worin eine Änderung sitzt; enger, um mehr von einem großen Diff auf den Schirm zu bekommen. |
| **Ignore whitespace** | Aus, Betrag (gits `-b`: eine Reihe von Leerzeichen, die die Länge ändert, ist keine Änderung) oder Alles (`-w`: kein Leerraumunterschied zählt). Neu eingerückter oder umbrochener Code liest sich als unverändert statt als eine Wand aus Rot und Grün. Die `+12 −3`-Zählungen der Dateiliste folgen derselben Einstellung, können also keine Zeilen behaupten, die das Diff dann nicht zeigt. |
| **Word wrap** | Lange Zeilen umbrechen statt seitwärts scrollen. |
| **Word highlight** | Die Wörter markieren, die sich innerhalb einer geänderten Zeile geändert haben, nicht nur die Zeile. |
| **Markdown outline** | Die Gliederung neben einem gerenderten Dokument zeigen. |
| **Markdown source lines** | Jeden Block eines gerenderten Dokuments mit der Zeile nummerieren, mit der er in der Quelle beginnt. Überschriften, Absätze, Listeneinträge, Tabellen, Codeblöcke und Bilder tragen alle eine, in einem Rand links hinunter. Standardmäßig aus. |
| **File sorting** | Natürliche oder Byte-Reihenfolge. Natürlich liest die Ziffern eines Namens als Zahl (`W9` vor `W10`) und stellt Groß-/Kleinschreibung an zweite Stelle; Byte-Reihenfolge ist gits eigene, wo jeder Großbuchstabe vor jedem Kleinbuchstaben sortiert. |
| **Reopen last session** | Die Repositories wieder öffnen, die beim letzten Beenden der Anwendung offen waren. Das Repository, mit dem Gitty gestartet wurde, bleibt der aktive Tab; inzwischen gelöschte werden still fallengelassen. |
| **Shell** | Die Shell, die ein Terminal startet, aufgelistet aus `/etc/shells` plus den üblichen Pfaden (`COMSPEC` und PowerShell unter Windows). **System default** ist `$SHELL`. Ein Pfad, der inzwischen weg ist, fällt darauf zurück, statt einen toten Bereich zu hinterlassen. |
| **Login shell** | Sie mit `-l` starten, damit das Profil des Nutzers geladen wird. Abschalten für eine schnellere, stillere Shell — keine Profilausgabe, keine Prüfungen beim Login. Windows-Shells haben kein solches Flag und ignorieren dies. |

**Shell** und **Login shell** werden gelesen, wenn ein Terminal entsteht, greifen
also bei der nächsten Teilung oder dem nächsten Repository-Tab, nicht in den
bereits laufenden Shells. **Word wrap**, **Diff layout** und **Markdown outline**
sind dieselben Schalter, die die Diff-Kopfzeile trägt: eine Änderung an einer
Stelle wirkt an beiden. **Word highlight** gibt es nur hier.

## Tastenkürzel <a id="keyboard-shortcuts"></a>

| Taste | Aktion |
| --- | --- |
| <kbd>Enter</kbd> | Den gewählten Commit zeigen |
| <kbd>Space</kbd> / <kbd>Ctrl+Click</kbd> | Einen zweiten Commit markieren und das Paar vergleichen |
| <kbd>Ctrl+Click</kbd> auf eine Dateiüberschrift | Diese Datei in einem neuen Dokument-Tab öffnen |
| <kbd>Strg+F</kbd> | Im Diff, in der Datei oder worin auch immer der Bereich zeigt, suchen |
| <kbd>Strg+C</kbd> / <kbd>Strg+Umschalt+C</kbd> | Die Auswahl kopieren, überall im Fenster |
| <kbd>Esc</kbd> | Zurück zum Arbeitsverzeichnis |
| <kbd>Alt+←</kbd> / <kbd>Alt+→</kbd> | Zurück und vorwärts durch die besuchten Orte |
| <kbd>F5</kbd> / <kbd>Strg+R</kbd> | Status und Log aktualisieren |
| <kbd>Strg+O</kbd> | Ein weiteres Repository in einem neuen Tab öffnen |
| <kbd>Strg+,</kbd> | Einstellungen |
| <kbd>Strg+1</kbd> … <kbd>Strg+4</kbd> | Files, Diff, Commits, Terminal aus- oder einblenden |
| <kbd>Strg+Umschalt+0</kbd> | Alle vier Bereiche wieder anzeigen |
| <kbd>Strg+Umschalt+1</kbd> … <kbd>Strg+Umschalt+4</kbd> | Das Fenster mit diesem Bereich füllen |


## Plattform-Hinweise <a id="platform-notes"></a>

### Linux-Desktop-Integration <a id="linux-desktop-integration"></a>

Die beiden Kompromisse unten haben dieselbe Ursache — eine Electron-Anwendung,
die *ausgeführt* statt paketiert wird — also sind beide im `.deb` verschwunden,
und beide bleiben auf dem `setup.sh`-Weg, der wirklich ein unverpacktes Electron
ausführt.

**Fensterklasse.** Der Desktop-Eintrag, den `setup.sh` schreibt, trägt
`StartupWMClass=electron`: das meldet ein unverpacktes Electron, egal wie die
Anwendung sich nennt, und dagegen gleichen Fensterliste und Dock ein Fenster ab,
um sein Symbol zu finden. Der Nebeneffekt ist, dass eine andere unverpackte
Electron-Anwendung derselben Sitzung sich Gittys Symbol borgt. Der paketierte
Build hat seine eigene ausführbare Datei, sein Eintrag passt also auf `gitty`, und
die Kollision kann nicht passieren.

**Sandbox.** `run.sh` und `cli.js` setzen `ELECTRON_DISABLE_SANDBOX=1`, weil
`chrome-sandbox` kein root-gehöriges setuid-Bit innerhalb von `node_modules`
behalten kann. Das `.deb` hat nichts zu umgehen: sein `postinst` setzt den Helfer
auf Kerneln ohne unprivilegierte User-Namespaces auf 4755, lässt ihn auf 0755, wo
die Namespace-Sandbox funktioniert, und installiert das AppArmor-Profil, das
Ubuntu 24.04 verlangt. Für alles, was aus dem Paket installiert wird, ist die
Sandbox also an.

Das `.AppImage` ist das schwächere von beiden: nichts an ihm kann ein setuid-Bit
tragen, also hängt es von unprivilegierten User-Namespaces ab — die die
AppArmor-Richtlinie von Ubuntu 24.04 standardmäßig einschränkt. Erwarte, dort
`--no-sandbox` zu übergeben oder ein eigenes AppArmor-Profil zu installieren.
Bevorzuge das `.deb`, wo du kannst.

### macOS-App-Bundle <a id="macos-app-bundle"></a>

`Gitty.app` ist ein Wrapper, kein Paket: `Contents/MacOS/Gitty` ist ein
zweizeiliges Skript, das `run.sh --fg --any` per exec ausführt. `--fg` ist
wichtig — exec bis ganz nach unten bedeutet, dass das Dock-Symbol beim Bundle
bleibt, statt von einem Prozess verwaist zu werden, der es überlebt — und
`--any` lässt einen Start aus dem Finder, der kein sinnvolles
Arbeitsverzeichnis hat, auf die zuletzt geöffneten Repositories zurückfallen.

Der Name stimmt an allen drei Stellen, an denen er auftaucht, und nur eine davon
kommt aus dem Bundle. Finder und Dock lesen `CFBundleName` und `CFBundleIconFile`
aus `Info.plist`; die Menüleiste ist `app.name`, den `app.setName('Gitty')`
setzt, bevor ein Fenster existiert, und `{ role: 'appMenu' }` als
Beschriftung verwendet. Anders als beim Linux-Fensterklassen-Problem oben ist
hier also nichts ein Kompromiss — weshalb Paketieren nichts außer Signieren
einbrächte und weshalb `electron-builder.yml` nur Linux-Ziele konfiguriert.

Ein aus dem Finder gestartetes Bundle erbt launchds minimalen `PATH`, ohne nvm
und ohne Homebrew, und `run.sh` braucht `node` und `npm`, um neu zu bauen, wenn
das Bundle veraltet ist. `setup.sh` löst sie zur Installationszeit auf und
stellt sie voran — als Präfix, sodass ein Start aus dem Terminal unbeeinflusst
bleibt. Ein späterer Wechsel der Node-Version lässt diesen Pfad veralten;
`setup.sh` erneut auszuführen korrigiert ihn.

