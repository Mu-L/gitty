# Gitty

[English](../../README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · **Français** · [Deutsch](README.de.md) · [Español](README.es.md) · [Русский](README.ru.md) · [Português](README.pt.md)

> **Traduit le 2026-08-14.**
> Le [README en anglais](../../README.md) est la version officielle et la seule
> tenue à jour. Ce document en est un instantané ; en cas de divergence, c'est
> l'anglais qui fait foi. L'interface est en anglais, donc les noms de boutons et
> d'entrées de menu sont laissés tels quels.

Un navigateur d'historique git pour le bureau, à quatre volets, dans l'esprit de
`lazygit` mais avec une vraie interaction à la souris : double-clic pour ouvrir
un fichier, clic droit pour copier son chemin, deux commits cliqués pour les
comparer.

```
┌──────────────────────┬──────────────────────┐
│ Working Tree         │ Diff                 │
│ (or a commit's files)│ (unified, coloured)  │
├──────────────────────┼──────────────────────┤
│ Commits              │ Terminal             │
│ (log, ↑↓, Enter)     │ (a real shell)       │
└──────────────────────┴──────────────────────┘
```

Tous les volets se redimensionnent en tirant les séparateurs, et chacun se cache
puis revient — voir [Plein écran et masquage](#full-screen-and-hiding).

Ce que les autres navigateurs git ne font pour la plupart pas :

- **Un vrai shell amarré à l'historique.** Pas un widget qui appelle git, mais
  un véritable shell de connexion (`$SHELL`) enraciné dans le dépôt, dans la même
  fenêtre que le diff, et scindable en plusieurs. La plupart des navigateurs git
  n'ont pas de terminal ou en lancent un externe, si bien que vérifier une
  intuition oblige à changer de fenêtre. Ici il est juste là, et tous les autres
  volets se rafraîchissent à mesure que le dépôt change.
- **Des documents, pas seulement des diffs.** Le markdown est rendu, le HTML
  s'affiche dans un cadre isolé, les images se montrent comme des images — le
  tout à la révision où vous êtes. Un README d'il y a deux ans se rend avec les
  captures que *ce* commit a livrées, lues directement dans la base d'objets —
  rien sur le disque n'entre en jeu, et rien n'est récupéré depuis le web, car
  lire le README de quelqu'un d'autre ne devrait pas vous annoncer à l'hôte vers
  lequel il pointe.
- **Du markdown rendu qui sait encore vous dire où vous êtes dans le fichier.**
  Activez **Markdown source lines** et chaque titre, paragraphe, élément de
  liste, tableau, bloc délimité et image est numéroté dans la gouttière avec la
  ligne où il commence dans la source — si bien qu'un passage trouvé en lisant
  peut être édité par ligne.
- **Un diff, un blame, l'historique d'un fichier et un README rendu, ouverts à
  la fois.** Les fichiers s'ouvrent comme leurs propres onglets *à côté* du diff
  plutôt que par-dessus, chacun se souvenant de la révision à laquelle il a été
  ouvert. Lire un fichier ne vous coûte jamais la modification que vous
  regardiez.
- **Un <kbd>Ctrl+F</kbd> qui marche dans tout ce que montre le volet** — y
  compris le markdown rendu, où une phrase est trouvée à travers les portées de
  gras et de code parce que la recherche lit le texte rendu, et à l'intérieur du
  cadre de l'aperçu HTML.
- **L'historique, servi à votre navigateur.** **Open in Browser** remet un commit
  — ses métadonnées, ses fichiers, ses diffs — au navigateur du système, depuis
  un serveur web à l'intérieur de l'application lié à `127.0.0.1` — votre
  navigateur et personne d'autre. Les commits sont de vraies URL, donc
  l'historique peut se lire en onglets, rester ouvert et se chercher avec la
  recherche du navigateur, tant que le dépôt est ouvert.
- **[gource](https://gource.io/) en un clic**, quand il est installé : tout
  l'historique du dépôt en animation, dans sa propre fenêtre. Là où gource est
  absent, le bouton n'est pas dessiné — rien n'est téléchargé ni proposé qui ne
  puisse tourner.
- **Neuf langues d'interface et un fuseau horaire explicite.** Git enregistre
  chaque commit avec le décalage de son auteur, si bien qu'un horodatage est
  toujours un choix de fuseau ; ici c'est vous qui le faites, et toute l'UI —
  journal, blame, historique de fichier, la frontière entre « aujourd'hui » et
  une date — suit.

![Gitty 0.1.6](../../ref/gitty-0.1.6.png)

## Pourquoi un de plus ? <a id="why-another-one"></a>

Parce que chaque outil vers lequel je me suis tourné se trompait sur un point :

- **Les IDE** — trop lourds et trop lents. (Croyez-moi, j'ai essayé tous ceux que
  j'ai pu trouver.)
- **lazygit, grv** — d'excellents outils, mais hostiles à la souris et à la
  sélection de texte.
- **gitui** — je veux la liste des commits et le diff à l'écran en même temps.
- **SmartGit, GitKraken** — Java, lourds, datés, et ils veulent votre argent.
- **gitg** et consorts — là encore, pas de liste de commits et de diff côte à
  côte.
- **tig** — que des diffs, aucun arbre de fichiers à parcourir.
- **gitk** — moche !

Deux autres choses que je voulais et que presque personne n'offrait : un **aperçu
Markdown**, et un **copier-coller qui marche** partout dans la fenêtre.

## Prérequis <a id="requirements"></a>

- Node.js 20 ou plus récent
- `git` dans le `PATH`
- Linux, macOS ou Windows avec une session de bureau
- [gource](https://gource.io/) dans le `PATH`, optionnel, pour
  [l'animation](#gource) ; rien ne change s'il est absent

## Lancement <a id="running"></a>

Installez la commande `gitty` une fois :

```bash
npm install -g gitty-desktop      # installs the gitty command globally
```

ou, depuis une copie du dépôt, liez-la dans votre PATH avec :

```bash
./setup.sh               # symlink into ~/.local/bin (no sudo)
./setup.sh --system      # symlink into /usr/local/bin (needs sudo)
```

La voie `setup.sh` installe aussi un lanceur cliquable, selon la plateforme.

Sous **Linux**, l'icône est ajoutée au thème hicolor et une entrée `gitty.desktop`
apparaît dans le menu des applications (et sur le bureau, quand la session en a
un). Le cache d'icônes et la base de données de bureau sont ensuite rafraîchis,
de sorte que l'entrée apparaît tout de suite avec son icône. Elle porte un
contournement et l'application tourne avec un interrupteur de bac à sable
désactivé — voir [Intégration au bureau Linux](#linux-desktop-integration).

Sous **macOS**, un `Gitty.app` minimal est écrit dans `~/Applications` (avec un
lien symbolique sur le Bureau) qui enveloppe le même `run.sh`. Rien n'est
empaqueté : le bundle existe pour donner au Finder et au Dock un nom et une
icône. Le Dock n'est pas touché — glissez-le vous-même si vous voulez
l'épingler. Voir [Bundle applicatif macOS](#macos-app-bundle).

Puis ouvrez un dépôt depuis n'importe où :

```bash
gitty                    # open the repository in the current directory
gitty /path/to/repo      # open another repository
gitty --fg               # keep it attached to the terminal (Ctrl+C quits)
gitty --dev              # hot-reloading development mode
gitty --any              # start even outside a work tree (what the desktop
                         # entry uses), falling back to the last repositories
```

Gitty se détache du terminal et affiche son pid, si bien que le shell reste
utilisable et que le fermer n'emporte pas la fenêtre. La sortie va dans
`${XDG_STATE_HOME:-~/.local/state}/gitty/gitty.log`, ramené à son dernier
mégaoctet dès qu'il dépasse 4 Mo.

`./run.sh` est le même script et fonctionne à l'identique sans le lien
symbolique. Le lanceur installe les dépendances et reconstruit le bundle quand
les sources ont changé, donc le premier lancement peut prendre un moment.
`npm run dev`, `npm run build` et `npm start` sont également disponibles
directement.

Démarrer Gitty depuis un répertoire qui n'est pas dans un arbre de travail se
rabat sur le dernier dépôt ouvert, au lieu de se contenter de râler.

## La fenêtre <a id="the-window"></a>

Quatre volets au milieu, une barre de titre au-dessus et une barre d'onglets en
dessous.

### Barre de titre <a id="title-bar"></a>

De gauche à droite, elle décrit le dépôt actif puis agit dessus :

- **Gitty** — l'icône et le nom à l'extrême gauche ouvrent la boîte de dialogue
  **About** : la version, l'heure de construction, l'auteur, et les versions
  d'Electron, Chromium et Node, avec un lien vers la page d'accueil.
- **‹ › ▾** — où vous êtes allé dans ce dépôt. Voir
  [Revenir en arrière](#going-back).
- **Le chemin du dépôt** est un bouton : il ouvre le menu des
  [dépôts récents](#recent-repositories).
- **+** à côté de lui — un sélecteur de répertoire, ouvrant le dépôt que vous
  choisissez dans un nouvel onglet (<kbd>Ctrl+O</kbd>). Il est placé avec le
  bouton du dépôt parce que les deux traitent du même sujet : quel dépôt vous
  regardez, et en ouvrir un autre.
- **⎇ branche** est un bouton aussi — la branche que git a sortie, et un menu de
  toutes les autres branches à lire. Voir
  [parcourir une autre branche](#browsing-another-branch).
- **`origin/main ↑2 ↓0`** — l'amont de la branche sortie et de combien elle est
  en avance ou en retard. Absent sur une branche qui ne suit rien.
- **`3 changed`** — combien de fichiers l'arbre de travail a de non validés, le
  même compte que porte la ligne **Working Tree** du volet des commits.
- **Panes ▾** — afficher ou masquer chacun des quatre ; voir
  [Plein écran et masquage](#full-screen-and-hiding).
- **Settings** — la boîte de dialogue des préférences ([Réglages](#settings)),
  également par <kbd>Ctrl+,</kbd>.
- **Refresh** — relire l'état et le journal à la main (<kbd>F5</kbd> /
  <kbd>Ctrl+R</kbd>). Gitty surveille le dépôt et se rafraîchit tout seul ; ceci
  est pour les fois où la surveillance ne voit pas un changement.

Pendant que vous lisez une autre branche, le bouton de branche affiche
`⎇ main › other-branch`, et les erreurs de la dernière commande git apparaissent
en rouge à côté des compteurs.

### Revenir en arrière <a id="going-back"></a>

Lire l'historique, c'est vagabonder : un commit, un fichier dedans, un autre
commit deux pages plus bas dans le journal, puis retour au premier. Les trois
boutons à gauche de la barre de titre se souviennent de ce cheminement, comme un
navigateur web.

- **‹** (<kbd>Alt+←</kbd>) revient à l'endroit que vous regardiez avant celui-ci,
  et **›** (<kbd>Alt+→</kbd>) retourne à celui que vous venez de quitter. Les
  deux sont grisés quand il n'y a nulle part où aller, et survoler l'un ou l'autre
  nomme l'endroit où il vous mènerait.
- **▾** liste les endroits eux-mêmes, le plus récent en premier, avec un point
  sur celui où vous êtes. Choisissez-en un pour y sauter directement.

Un *endroit* est tout ce que les deux volets du haut montraient : la vue —
l'arbre de travail, un commit, une plage de deux, un instantané — le fichier
sélectionné à l'intérieur, et le document ouvert à côté du diff. Un arrêt se lit
donc `Working tree`, `7bb7787 — Refresh screenshot batches`,
`src/main/git.ts @ 7bb7787` ou `blame: src/main/git.ts @ 7bb7787`, et y revenir
replace le même fichier à l'écran à la même révision plutôt que de simplement
resélectionner le commit.

L'historique appartient au dépôt, pas à la fenêtre : chaque onglet garde ses
cinquante derniers endroits, et changer d'onglet change ceux que les boutons
parcourent. Il n'est pas conservé d'un lancement à l'autre.

### Onglets <a id="tabs"></a>

Une barre d'onglets en bas contient chaque dépôt ouvert — son nom de base, un
point jaune quand l'arbre de travail a des modifications non validées, et une
**×** pour le fermer. Le point compte tout ce que rapporte `git status`, fichiers
non suivis compris, et il gagne sa place sur les onglets que vous ne regardez
*pas* : le dépôt actif affiche déjà `3 changed` dans la barre de titre, alors
qu'un onglet en arrière-plan est entièrement caché ; le point est donc le seul
signe qu'il reste du travail là-bas. Survoler un onglet nomme le dépôt et le dit
en toutes lettres.

**+** (et <kbd>Ctrl+O</kbd>) ouvre un autre dépôt dans un nouvel onglet ; la
barre de titre montre toujours l'actif. Chaque onglet garde ses propres volets et
son terminal, si bien qu'un commit que vous lisez et un shell que vous avez
laissé tourner restent exactement là où ils étaient quand vous partez et
revenez. Fermer le dernier onglet laisse une fenêtre vide avec un bouton pour
ouvrir le dépôt suivant. (Les onglets ouverts ne sont pas retenus d'un lancement
à l'autre.)

### Dépôts récents <a id="recent-repositories"></a>

Le chemin du dépôt dans la barre de titre est un menu des dépôts ouverts
auparavant — nom de base plus répertoire parent — le plus récent en premier.

- **Clic** — l'ouvrir dans un nouvel onglet.
- **Ctrl/Cmd+clic** ou **clic milieu** — l'ouvrir dans l'onglet courant, en
  remplaçant le dépôt qui s'y trouve et en gardant la place de l'onglet dans la
  barre.
- **Clic droit** — retirer l'entrée de la liste. Le menu reste ouvert, on peut
  donc en effacer plusieurs de suite.

**Open Repository…** et **Clear Recent** se trouvent en dessous. La liste vit
dans `~/.config/Gitty/recent-repos.json`, contient douze entrées et saute celles
qui ont depuis été déplacées ou supprimées.

### Plein écran et masquage <a id="full-screen-and-hiding"></a>

L'en-tête de chaque volet porte les deux mêmes contrôles : **⤢** à sa gauche
remplit la fenêtre avec ce volet, et **×** à sa droite le masque.

Le plein écran couvre tout le reste, barres de titre et d'onglets comprises, et
les volets en dessous continuent de fonctionner — le terminal tourne toujours
pendant qu'il est couvert. **⤡** dans le même coin, <kbd>Esc</kbd>, un
double-clic sur l'en-tête, ou <kbd>Ctrl+Shift+1</kbd> … <kbd>Ctrl+Shift+4</kbd>
restaurent la disposition. Un seul volet est en plein écran à la fois.

Le masquage est l'autre direction — n'importe quel volet peut être rangé puis
rappelé :

- **Panes** dans la barre de titre liste les quatre, avec un point à côté des
  visibles ; cliquer l'un le bascule, et **Show All Panes** restaure la
  disposition à quatre volets.
- <kbd>Ctrl+1</kbd> … <kbd>Ctrl+4</kbd> basculent Files, Diff, Commits et
  Terminal, dans cet ordre.
- <kbd>Ctrl+Shift+0</kbd> les ramène tous les quatre — zéro pour « tous », une
  touche après les quatre qui basculent chacun. Elle prend Shift parce que
  <kbd>Ctrl+0</kbd> est le zoom par défaut du moteur du navigateur, que le menu
  View conserve.

Ce qui reste se partage la fenêtre, donc masquer le volet des commits donne au
diff toute la hauteur. Le dernier volet visible n'a pas de **×** — une fenêtre
vide ne laisserait rien à cliquer. Les volets masqués sont retenus d'un lancement
à l'autre, et le volet du terminal est seulement rangé, jamais fermé : ses shells
continuent de tourner et reviennent avec leur historique de défilement.

## Les volets <a id="the-panes"></a>

### Working Tree (en haut à gauche) <a id="working-tree-top-left"></a>

Les fichiers modifiés en arbre repliable, chacun avec son nombre de lignes à côté
du nom. Parcourir tout un dépôt — l'arbre de travail ou l'instantané d'un commit
— s'ouvre avec chaque répertoire fermé, puisque c'est un arbre dans lequel
descendre plutôt qu'une liste de modifications à lire ; une liste de
modifications s'ouvre dépliée. Les répertoires viennent avant les fichiers à
chaque niveau, et dans chaque groupe les noms sont triés comme un lecteur
l'attend plutôt que comme le ferait une comparaison d'octets : les chiffres d'un
nom comptent comme un nombre, si bien que `W9` vient avant `W10`, et la casse
n'est pas une différence de premier ordre, si bien que `butler/` se range avec
les b au lieu d'après toutes les majuscules. Deux colonnes d'état sont affichées :
l'état de l'index (vert) et celui de l'arbre de travail (jaune / rouge) ; les
fichiers non suivis sont `??`. Le compte est lu sur le disque dans l'arbre de
travail et dans la révision partout ailleurs ; les fichiers binaires, les
fichiers supprimés et tout ce qui dépasse 8 Mo n'en affichent simplement aucun.
Vient ensuite le brassage — combien de lignes cette modification a ajoutées et
supprimées dans ce fichier, `+12 −3`, par rapport à HEAD dans l'arbre de travail
et par rapport au parent pour un commit ou une plage. Un instantané est un arbre
plutôt qu'une modification, donc il n'a pas de brassage ; pas plus que les
fichiers binaires ou un commit de fusion, dont le diff combiné n'attribue rien.

- **Clic** — afficher le diff du fichier à droite.
- **Double-clic** — ouvrir le fichier entier comme document à côté du diff, avec
  numéros de ligne et coloration syntaxique (un document rendu pour markdown,
  l'image elle-même pour une image).
- **Clic droit** — View File, Open in System App, Reveal in File Manager, Copy
  Relative Path, Copy Absolute Path, Copy File Name, Blame File, File History.
- **Clic sur un dossier** — le replier ou le déplier.

Quand un commit ou une plage de commits est sélectionné, ce volet liste les
fichiers de ce commit ; **Back to Work Tree** (ou <kbd>Esc</kbd>) revient à
l'arbre de travail. Dans un [instantané](#snapshots), il liste l'arbre entier à ce
commit, pas seulement ce qui a changé.

### Diff (en haut à droite) <a id="diff-top-right"></a>

Diff unifié avec anciens et nouveaux numéros de ligne, en-têtes de hunk et
couleurs d'ajout/suppression, disposé comme une liste de fichiers : chaque chemin
est un titre pleine largeur, l'en-tête de hunk est atténué — c'est une plage de
lignes, pas la chose à regarder en premier — et un renommage se lit
`old → new`. Sans fichier sélectionné, il montre tout d'un coup : chaque
modification non validée de l'arbre de travail, ou chaque fichier du commit
sélectionné.

- **Show Whole Diff** — revenir à ce diff combiné après avoir choisi un fichier.
  Il reste dans l'en-tête et s'allume tant que c'est le diff entier que vous
  regardez. La version arbre de travail couvre ensemble les modifications
  indexées et non indexées et intègre les fichiers non suivis (jusqu'à 50, puis
  un avis), que `git diff` seul laisse de côté.
- **Wrap** — retour à la ligne au lieu du défilement horizontal. Actif par
  défaut.
- **Inline / Side-by-Side** — une colonne avec des marques `+`/`-`, ou l'ancien
  et le nouveau côte à côte, où une série de suppressions est appariée aux ajouts
  qui la suivent. Les moitiés repliées restent alignées.
- **Titres de fichier** — chaque titre replie son fichier : le triangle le réduit
  au nom, et **Collapse All** / **Expand All** dans l'en-tête s'occupent de tout.
  **Ctrl+clic** sur un titre ouvre ce fichier dans un nouvel onglet de document ;
  au clic droit viennent **Open in a New Tab**, **Select in the File List**, les
  copies de chemin et — dans l'arbre de travail, où le fichier sur le disque est
  la version affichée — **Open in System App** et **Reveal in File Manager**. Un
  renommage ouvre son nouveau chemin.
- **Clic droit** — Copy Selection, Copy Whole Diff, et les mêmes bascules.

Les mots modifiés à l'intérieur d'une ligne modifiée sont mis en évidence quand
cela se lit mieux que la ligne entière ; c'est **Word highlight** dans les
[Réglages](#settings).

Les réglages sont retenus d'une exécution à l'autre. Les lignes sont rendues par
blocs de 1500 et s'étendent au défilement, donc les gros commits restent réactifs ;
les diffs de plus de 2 Mo sont tronqués avec un avis.

### Voir des fichiers entiers <a id="viewing-files"></a>

Un diff est ce que le volet affiche par défaut, mais n'importe quel fichier peut
être ouvert en entier : **double-cliquez**-le dans l'arbre, utilisez
**View File** / **Preview** dans l'en-tête, **Ctrl+cliquez** un titre de fichier
dans le diff, ou prenez-le dans l'un des deux menus contextuels.

Le fichier s'ouvre comme document à part dans une bande d'onglets *à côté* du
diff plutôt que par-dessus, de sorte qu'on peut le lire sans perdre le diff où
l'on était. L'onglet **Diff** est toujours premier et un simple clic dans l'arbre
continue de parcourir les diffs sur place. Chaque document retient la révision à
laquelle il a été ouvert, se ferme avec sa propre **×**, et relit un fichier de
l'arbre de travail quand le dépôt change. Les fichiers source reçoivent numéros
de ligne et coloration syntaxique ; le markdown s'ouvre
[rendu](#markdown-preview), avec une bascule vers la source ; le HTML s'ouvre
[rendu aussi](#html-preview) ; une image s'ouvre comme [l'image](#images).

La révision obtenue suit le volet : le fichier sur le disque dans l'arbre de
travail, le fichier tel qu'il était au commit sélectionné partout ailleurs. Ouvrir
un document est une action et non un mode — sélectionner un autre fichier ou un
autre commit remet le diff — si bien que le volet ne reste jamais coincé sur des
fichiers quand vous vouliez des modifications.

#### Instantanés <a id="snapshots"></a>

Faites un clic droit sur un commit et choisissez **Browse Snapshot** pour lire le
dépôt tel qu'il était à ce commit : le volet en haut à gauche liste l'arbre
*entier* plutôt que les fichiers que ce commit a touchés, et n'importe quel
fichier s'ouvre à cette révision. Un instantané n'a pas de diff à montrer, donc
là-bas chaque fichier est un document.

Les fichiers d'un instantané n'ont jamais existé sur le disque à cette révision,
c'est pourquoi **Open in System App** en remet une copie temporaire et que
**Reveal in File Manager** n'est pas proposé. **Back to Work Tree** (ou
<kbd>Esc</kbd>) en sort.

#### Aperçu Markdown <a id="markdown-preview"></a>

Sélectionner un fichier `.md` ajoute un bouton **Preview** — désactivé par
défaut, ainsi un diff reste un diff jusqu'à ce que vous le demandiez. Il rend le
fichier dans son ensemble : la version sur le disque dans l'arbre de travail, la
version au commit sélectionné partout ailleurs.

Les blocs de code délimités sont colorés quand ils nomment un langage, le front
matter YAML est extrait et montré comme son propre bloc coloré, et les niveaux de
titre, les marques de liste, les liens et le code en ligne sont codés par couleur
pour que la structure se lise d'un coup d'œil.

- **Wrap** — la même bascule que pour le diff, active par défaut. La prose passe
  toujours à la ligne ; dans un aperçu, ceci décide si les blocs de code, les
  tableaux larges et les longues chaînes en ligne y passent aussi, au lieu de
  défiler latéralement.
- **Outline** — la structure des titres à côté du document, indentée par niveau,
  suivant le titre auquel vous avez défilé. Cliquez une entrée pour y sauter, et
  tirez le séparateur entre elle et le document pour donner plus de place à l'un
  ou l'autre côté. La largeur est partagée par tous les documents du dépôt —
  c'est une préférence de lecture, pas une propriété d'un seul fichier — et dure
  autant que la fenêtre, comme les tailles des autres volets.
- **Source lines** — désactivé par défaut, et activé dans
  [Réglages](#settings) : chaque titre, paragraphe, élément de liste, tableau,
  bloc délimité et image est numéroté dans la gouttière de gauche avec la ligne
  où il commence dans la source. Les numéros sont dessinés plutôt qu'insérés, si
  bien qu'ils restent hors d'une sélection que vous copiez et hors de ce que
  <kbd>Ctrl+F</kbd> cherche. Une image écrite à l'intérieur d'une phrase prend la
  ligne de son paragraphe, n'en ayant pas à elle.
- **<kbd>Ctrl+F</kbd>** — chercher dans le document ; voir
  [Recherche de texte](#finding-text).
- **Clic droit** — Copy Selection, Copy Markdown Source, les bascules de retour à
  la ligne et de plan, et Show Diff Instead.

Le HTML brut dans le markdown n'est pas rendu, et les liens s'ouvrent dans le
navigateur du système plutôt que dans l'application. Les images écrites en
relatif par rapport au document sont lues dans le dépôt — à la même révision que
le document, donc un vieux commit montre les captures avec lesquelles il est
sorti. Une que le dépôt n'a pas à cet endroit laisse un cadre pointillé portant
son texte alternatif. Les images du web ne sont pas récupérées du tout : lire le
README d'un inconnu ne devrait pas vous annoncer à l'hôte vers lequel il pointe.

![Markdown preview](../../ref/gitty-0.1.5-markdown.png)

#### Aperçu HTML <a id="html-preview"></a>

Un fichier `.html`, `.htm` ou `.xhtml` reçoit le même bouton **Preview**, et le
document est rendu plutôt que montré comme source — la version sur le disque dans
l'arbre de travail, la version au commit sélectionné partout ailleurs.

Il s'affiche dans un cadre isolé chargé par `srcdoc`, si bien que la page ne peut
jamais faire naviguer l'application loin d'elle-même. Ses propres feuilles de
style s'appliquent — la disposition, les couleurs, les polices sont celles du
document. Les scripts ne tournent pas et les images distantes ne sont pas
récupérées : le cadre hérite de la politique de sécurité du contenu de
l'application, qui n'admet ni l'un ni l'autre. Une page est montrée, pas
exécutée. **Wrap** décide si le cadre défile par lui-même ou grandit jusqu'à son
contenu pour que la page entière défile d'un bloc. <kbd>Ctrl+F</kbd> et
<kbd>Ctrl+Shift+C</kbd> fonctionnent à l'intérieur du cadre, dont les touches
n'atteignent jamais le reste de la fenêtre.

#### Images <a id="images"></a>

Un `.png`, `.jpg`, `.gif`, `.webp`, `.bmp`, `.ico`, `.avif` ou `.svg` s'ouvre
comme l'image plutôt que comme un constat qu'il est binaire — depuis le disque
dans l'arbre de travail, depuis le commit partout ailleurs. Elle est ajustée au
volet sur un damier, pour que la transparence se lise comme de la transparence ;
**cliquez** dessus pour la taille réelle et le défilement, cliquez encore pour
l'ajuster. Ses dimensions en pixels et sa taille sur le disque sont en dessous.
Les images de plus de 12 Mo ne sont pas intégrées.

![Image preview](../../ref/gitty-0.1.5-image.png)

#### Blame et historique de fichier <a id="blame-and-file-history"></a>

Faites un clic droit sur n'importe quel fichier de l'arbre et choisissez **Blame
File** ou **File History** ; les deux s'ouvrent comme documents à côté du diff.
Blame montre une ligne par ligne source — le commit, son auteur, sa date et la
ligne elle-même, mis en évidence comme le visualiseur de code, avec un tiret
cadratin quand une ligne n'est pas encore validée — à la révision que vous
consultez. File History liste chaque commit qui a touché le fichier, suit les
renommages, et cliquer un commit l'ouvre.

### Commits (en bas à gauche) <a id="commits-bottom-left"></a>

Le journal de la branche courante, chargé par 300 et étendu au défilement. La
première ligne est **Working Tree** — les modifications non validées, avec un
compte de fichiers modifiés ; la sélectionner ramène les volets du haut à l'arbre
de travail. Un champ de filtre au-dessus du journal réduit la liste aux commits
dont le message ou l'auteur contient le texte saisi — avec un délai, et un ✕ pour
effacer — et la liste se pagine de la même façon.

- **Clic** ou <kbd>Enter</kbd> — montrer ce commit : ses fichiers remplissent le
  volet en haut à gauche et son diff complet celui en haut à droite. Le sujet,
  l'auteur, la date et le corps complet du commit apparaissent dans un bandeau
  au-dessus de la liste des fichiers ; quand le corps est long, un bouton ▸ le
  replie pour que la liste des fichiers garde la place.
- **Ctrl+clic** (<kbd>Cmd</kbd> sur macOS), <kbd>Shift+Click</kbd> ou
  <kbd>Space</kbd> — choisir un second commit et comparer les deux, le plus
  ancien d'abord.
- **↑ ↓ / j k / PgUp / PgDn / Home / End** — déplacer le curseur.
- **Clic droit** — montrer le diff, copier le hash, le hash court ou le sujet,
  [parcourir l'instantané](#snapshots), ou comparer au commit sélectionné.
- **Clic droit → Open in Browser** — rendre ce commit dans le navigateur du
  système ; **Copy Commit URL** copie le lien. Un serveur web à l'intérieur de
  l'application (à l'écoute sur `127.0.0.1` seulement, pour votre propre
  navigateur) sert chaque dépôt ouvert comme une liste de commits parcourable — le
  bouton **Open in Browser** du volet des commits y atterrit — avec les
  métadonnées, les fichiers et le diff de chaque commit, et les diffs par fichier
  à un clic. Les URL fonctionnent tant que le dépôt est ouvert.
- Sélectionner un fichier dans le volet en haut à gauche restreint le diff à ce
  fichier ; **Show Whole Diff** le rélargit.

![Diff against any two commits](../../ref/gitty-0.1.5-range.png)

#### Gource <a id="gource"></a>

Si [gource](https://gource.io/) est dans le `PATH`, le volet des commits gagne un
bouton **Gource** à côté de **Open in Browser** : il joue l'historique du dépôt
comme une animation — l'arborescence qui pousse, les fichiers qui s'allument à
chaque commit, un auteur qui vole de l'un à l'autre par nom dans le journal.
Gource ouvre sa propre fenêtre et continue de tourner après que vous fermez
Gitty ; le bouton attend juste assez longtemps pour voir qu'il a démarré, et
montre ce que gource a dit s'il ne l'a pas fait.

Il est lancé avec un jour d'historique par demi-seconde, les fichiers inactifs
gardés à l'écran et les longs intervalles sautés, ce qui rend un vrai dépôt
lisible plutôt qu'un lent filet. Rien n'est installé pour vous : là où gource
n'est pas dans le `PATH`, le bouton n'est tout simplement pas là.

#### Parcourir une autre branche <a id="browsing-another-branch"></a>

La branche dans la barre de titre ouvre un menu de toutes les branches locales et
de suivi distant, la plus récemment commitée d'abord, et en choisir une affiche
l'historique de cette branche. C'est un regard en lecture seule : gitty ne lance
aucun `checkout`, donc l'arbre de travail, ses diffs et les terminaux restent
exactement où git les a laissés. Pendant que vous regardez une autre branche, la
barre de titre se lit `⎇ main › other-branch` et le volet des commits dit quelle
branche il liste ; **Back to \<branch\>** revient. Chaque onglet parcourt de son
côté.

#### Push et Pull <a id="push-and-pull"></a>

**Push** et **Pull** sont dans l'en-tête, et tous deux agissent sur la branche
sortie, quelle que soit celle que le journal affiche. **Push** compte ce qui n'est
pas poussé — **Push 3** — et se grise quand il n'y a rien à envoyer ; sur une
branche qui ne suit rien, il publie la branche sur `origin` et règle l'amont.
**Pull** avance en fast-forward depuis l'amont, et est grisé quand il n'y a pas
d'amont d'où tirer. Ce que git dit apparaît au-dessus du journal — cliquez pour
l'écarter ; les échecs restent jusqu'à ce que vous le fassiez.

Ni l'un ni l'autre ne peut répondre à une invite : il n'y a pas de terminal
derrière eux, donc un push qui veut un mot de passe ou une phrase secrète échoue
avec le message de git plutôt que de rester bloqué, et un pull qui ne peut pas
avancer le dit. Les deux se terminent ensuite à la main dans le volet du
terminal, qui est juste là.

### Terminal (en bas à droite) <a id="terminal-bottom-right"></a>

Un vrai shell de connexion interactif (`$SHELL`) enraciné dans le dépôt, si bien
que toute commande git peut être lancée directement. <kbd>Ctrl+Shift+C</kbd>
copie la sélection du terminal — <kbd>Ctrl+C</kbd> là-bas est l'interruption, et
reste l'interruption. La même combinaison copie aussi dans tous les autres
volets, si bien qu'elle ne change pas de sens quand le focus se déplace. Les
autres volets se rafraîchissent automatiquement quand le dépôt change sur le
disque. Quel shell il démarre, et s'il démarre comme shell de connexion,
relèvent des [Réglages](#settings) ; les deux sont lus quand un terminal est
créé, si bien qu'un changement prend effet à la prochaine division.

Le volet se divise en autant de shells que vous voulez : **Split →** en place un
nouveau à côté du terminal actif, **Split ↓** en dessous, et les séparateurs
entre eux se tirent comme ceux de tout autre volet. Cliquer un terminal lui donne
le focus — celui qui est encadré est là où atterrissent la prochaine division ou
**Close**. Diviser deux fois dans le même sens allonge la rangée ou la colonne au
lieu d'imbriquer, si bien que trois terminaux côte à côte se redimensionnent les
uns contre les autres.

**Close** termine le shell actif ; quitter un shell par `exit` ferme sa division
tout seul. Le dernier terminal reste toujours : en sortir laisse l'avis à l'écran
au lieu d'un volet vide.

## Recherche de texte <a id="finding-text"></a>

<kbd>Ctrl+F</kbd> cherche dans tout ce que montre le volet de droite : un diff,
un fichier, un document markdown rendu, un [aperçu HTML](#html-preview), un
blame, ou l'historique d'un fichier. Chaque correspondance est mise en évidence
avec l'actuelle distinguée, <kbd>Enter</kbd> et <kbd>Shift+Enter</kbd> (ou les
flèches) les parcourent et rebouclent à chaque extrémité, le compte dit où vous
êtes, et <kbd>Esc</kbd> ferme.

La recherche est insensible à la casse et lit le texte tel qu'il est rendu, pas
le balisage derrière — si bien qu'une phrase est trouvée à travers les portées de
gras et de code que le markdown laisse à l'intérieur, et qu'un diff est cherché
comme les lignes que vous voyez. Les vues qui se rendent par blocs au défilement
(un long fichier, un grand diff) rendent le reste quand la bande s'ouvre, si bien
que le compte couvre le tout plutôt que la partie défilée jusqu'ici. Un fichier
replié dans un diff à plusieurs fichiers reste replié et n'est pas cherché.

## Réglages <a id="settings"></a>

**Settings** dans la barre de titre, ou <kbd>Ctrl+,</kbd>. Tout ici s'applique à
tous les onglets et est retenu d'un lancement à l'autre ; **Restore Defaults**
remet tout en place. La boîte de dialogue est en trois onglets — **Appearance**,
**View** et **Session** — si bien qu'elle reste sur un seul écran à mesure
qu'elle grandit ; le tableau ci-dessous les liste dans cet ordre.

| | |
| --- | --- |
| **Theme** | Dark ou Light. |
| **Language** | English, 简体中文, 日本語, 한국어, Français, Deutsch, Español, Русский ou Português — l'interface, les menus et les boîtes de dialogue changent tous ensemble sans redémarrer. |
| **Time zone** | Le fuseau dans lequel chaque date et heure à l'écran est rendue : celui de la machine par défaut, ou UTC, ou n'importe quel fuseau que le système connaît. Git enregistre chaque commit avec le décalage de son auteur, si bien qu'un horodatage est toujours un choix de fuseau — c'est ici qu'il se fait. La colonne de date du journal le suit, ce qui veut dire que la frontière entre « aujourd'hui » et une date bouge avec lui. |
| **Time format** | Absolute (une heure d'horloge ou une date) ou Relative (`28m ago`, `2h ago`). Relative contourne entièrement la question du fuseau ; l'infobulle au survol d'une ligne reste absolue dans les deux cas, et nomme son fuseau. |
| **Font size** | 9 – 20, par demi-points. S'applique à tous les volets, terminal compris. |
| **Monospace font** | La famille dans laquelle les volets et le terminal sont dessinés, choisie parmi les polices à chasse fixe trouvées sur cette machine. **System default** est la pile intégrée (JetBrains Mono, Fira Code, DejaVu Sans Mono, …). |
| **Row height** | 18 – 26 pixels — la hauteur de ligne sur laquelle chaque liste est bâtie : l'arbre des fichiers, le journal et le diff. Plus serré fait tenir davantage à l'écran, plus aéré se lit mieux. |
| **Diff layout** | Inline ou Side-by-Side, la même bascule que porte l'en-tête du diff. |
| **Context lines** | 0 – 25 lignes inchangées autour de chaque hunk — le `-U` de git, dont le propre défaut est 3. Élargissez-le pour voir dans quoi s'inscrit une modification, resserrez-le pour faire tenir davantage d'un grand diff à l'écran. |
| **Ignore whitespace** | Off, Amount (le `-b` de git : une suite d'espaces qui change de longueur n'est pas une modification) ou All (`-w` : aucune différence d'espace n'en est une). Du code réindenté ou remis à la ligne se lit comme inchangé plutôt que comme un mur de rouge et de vert. Les comptes `+12 −3` de la liste de fichiers suivent le même réglage, si bien qu'elle ne peut pas revendiquer des lignes que le diff refuse ensuite de montrer. |
| **Word wrap** | Retour à la ligne au lieu du défilement horizontal. |
| **Word highlight** | Marquer les mots qui ont changé dans une ligne modifiée, pas seulement la ligne. |
| **Markdown outline** | Afficher le plan à côté d'un document rendu. |
| **Markdown source lines** | Numéroter chaque bloc d'un document rendu avec la ligne où il commence dans la source. Les titres, paragraphes, éléments de liste, tableaux, codes délimités et images en portent tous un, dans une gouttière en bas à gauche. Désactivé par défaut. |
| **File sorting** | Natural ou Byte order. Natural lit les chiffres d'un nom comme un nombre (`W9` avant `W10`) et met la casse en second ; l'ordre d'octets est celui de git, où chaque majuscule se range devant chaque minuscule. |
| **Reopen last session** | Rouvrir les dépôts qui étaient ouverts quand l'application a quitté la dernière fois. Le dépôt avec lequel Gitty a été lancé reste l'onglet actif ; ceux qui ont depuis été supprimés sont discrètement écartés. |
| **Shell** | Le shell qu'un terminal démarre, listé depuis `/etc/shells` plus les chemins habituels (`COMSPEC` et PowerShell sous Windows). **System default** est `$SHELL`. Un chemin qui a depuis disparu y retombe plutôt que de laisser un volet mort. |
| **Login shell** | Le démarrer avec `-l`, pour que le profil de l'utilisateur soit sourcé. Désactivez-le pour un shell plus rapide et plus silencieux — pas de sortie de profil, pas de vérifications de connexion. Les shells Windows n'ont pas un tel drapeau et ignorent ceci. |

**Shell** et **Login shell** sont lus quand un terminal est créé, si bien qu'ils
prennent effet à la prochaine division ou au prochain onglet de dépôt, pas dans
les shells déjà en cours. **Word wrap**, **Diff layout** et **Markdown outline**
sont les mêmes bascules que celles de l'en-tête du diff : en changer une d'un côté
la change des deux. **Word highlight** n'existe qu'ici.

## Raccourcis clavier <a id="keyboard-shortcuts"></a>

| Touche | Action |
| --- | --- |
| <kbd>Enter</kbd> | Montrer le commit sélectionné |
| <kbd>Space</kbd> / <kbd>Ctrl+Click</kbd> | Marquer un second commit et comparer la paire |
| <kbd>Ctrl+Click</kbd> sur un titre de fichier | Ouvrir ce fichier dans un nouvel onglet de document |
| <kbd>Ctrl+F</kbd> | Chercher dans le diff, le fichier, ou tout ce que montre le volet |
| <kbd>Ctrl+C</kbd> / <kbd>Ctrl+Shift+C</kbd> | Copier la sélection, n'importe où dans la fenêtre |
| <kbd>Esc</kbd> | Retour à l'arbre de travail |
| <kbd>Alt+←</kbd> / <kbd>Alt+→</kbd> | Reculer et avancer parmi les endroits consultés |
| <kbd>F5</kbd> / <kbd>Ctrl+R</kbd> | Rafraîchir l'état et le journal |
| <kbd>Ctrl+O</kbd> | Ouvrir un autre dépôt dans un nouvel onglet |
| <kbd>Ctrl+,</kbd> | Réglages |
| <kbd>Ctrl+1</kbd> … <kbd>Ctrl+4</kbd> | Masquer ou afficher Files, Diff, Commits, Terminal |
| <kbd>Ctrl+Shift+0</kbd> | Réafficher les quatre volets |
| <kbd>Ctrl+Shift+1</kbd> … <kbd>Ctrl+Shift+4</kbd> | Remplir la fenêtre avec ce volet |

## Architecture <a id="architecture"></a>

```
src/main       Electron main process — git commands, ptys, fs watchers,
               the recent-repository store, IPC
src/preload    contextBridge API exposed to the renderer as window.gitty
src/renderer   React UI — App.tsx manages tabs, RepoTab.tsx owns one
               repository's four panes
src/shared     Types shared by both sides
build          Application icon (SVG source and rendered PNG)
```

git est piloté par `execFile('git', …)` avec l'analyse de `--porcelain=v2 -z` /
`--name-status -z`, si bien que les chemins avec espaces et les renommages
survivent. Aucune bibliothèque git n'est embarquée ; le `git` du `PATH` est ce
que vous voyez. Le renderer tourne avec `contextIsolation` et sans intégration
node.

Le renderer est découpé en morceaux chargés à la demande pour que la fenêtre se
peigne avant que xterm, highlight.js et markdown-it ne soient analysés. Ce
découpage — les quatre morceaux, les règles pour tenir les bibliothèques lourdes
hors des morceaux chauds, et comment en ajouter une — est spécifié dans
[ref/spec/lazy-loading.md](../../ref/spec/lazy-loading.md).

### Intégration au bureau Linux <a id="linux-desktop-integration"></a>

L'entrée de bureau porte `StartupWMClass=electron`, et c'est elle qui donne à la
fenêtre en cours son icône dans la liste des fenêtres et le dock. Une application
Electron qui est lancée plutôt qu'empaquetée rapporte `electron` comme classe de
fenêtre quel que soit le nom qu'elle se donne, c'est donc ce nom que l'entrée doit
faire correspondre — avec l'effet de bord qu'une autre application Electron non
empaquetée sur la même session emprunterait l'icône de Gitty.

L'application tourne aussi avec le bac à sable SUID de Chromium désactivé
(`ELECTRON_DISABLE_SANDBOX=1`). Le correctif habituel — faire appartenir
`chrome-sandbox` à root en mode 4755 — ne survit pas dans `node_modules`, donc le
désactiver est le choix pragmatique pour un outil local qui ne lit que vos
propres dépôts.

### Bundle applicatif macOS <a id="macos-app-bundle"></a>

`Gitty.app` est une enveloppe, pas un paquet : `Contents/MacOS/Gitty` est un
script de deux lignes qui exécute `run.sh --fg --any`. `--fg` compte — un exec
jusqu'au bout signifie que la tuile du Dock reste sur le bundle au lieu d'être
orpheline d'un processus qui lui survit — et `--any` permet à un lancement depuis
le Finder, qui n'a pas de répertoire de travail à proprement parler, de se
rabattre sur les dépôts ouverts le plus récemment.

Le nom est juste aux trois endroits où il apparaît, et un seul d'entre eux
provient du bundle. Le Finder et le Dock lisent `CFBundleName` et
`CFBundleIconFile` dans `Info.plist` ; la barre de menu est `app.name`, que
`app.setName('Gitty')` définit avant toute fenêtre et que `{ role: 'appMenu' }`
utilise comme étiquette. Contrairement au problème de classe de fenêtre Linux
ci-dessus, rien ici n'est un compromis — c'est pourquoi l'empaquetage
(electron-builder) n'apporterait rien d'autre que la signature.

Un bundle lancé depuis le Finder hérite du `PATH` minimal de launchd, sans nvm ni
Homebrew, et `run.sh` a besoin de `node` et `npm` pour reconstruire quand le
bundle est périmé. `setup.sh` les résout au moment de l'installation et les
préfixe — un préfixe, pour qu'un lancement depuis le terminal ne soit pas
affecté. Changer de version de Node plus tard laisse ce chemin périmé ; relancez
`setup.sh` pour le remettre à jour.

## Licence <a id="licence"></a>

MIT
