# O manual do Gitty

[English](manual.md) · [简体中文](manual.zh-CN.md) · [日本語](manual.ja.md) · [한국어](manual.ko.md) · [Français](manual.fr.md) · [Deutsch](manual.de.md) · [Español](manual.es.md) · [Русский](manual.ru.md) · **Português**

Tudo o que o Gitty faz, painel por painel. O [README](../../README.md) é a versão
curta — o que é, por que existe, como instalá-lo — e permanece assim; é aqui que os
detalhes vivem.

> **Traduzido em 2026-08-16.**
> O [manual em inglês](manual.md) é a versão oficial e a única mantida em dia. Este
> documento é um instantâneo daquele momento; onde houver divergência, prevalece o
> inglês. A interface em si é em inglês, então os nomes de botões e itens de menu
> ficam no original.

---

## A janela <a id="the-window"></a>

Quatro painéis no meio, uma barra de título acima deles e uma barra de abas
abaixo.

### Barra de título <a id="title-bar"></a>

Da esquerda para a direita, ela descreve o repositório ativo e então age sobre
ele:

- **Gitty** — o ícone e o nome na extrema esquerda abrem o diálogo **About**: a
  versão, o horário de build, o autor, e as versões do Electron, Chromium e Node,
  com um link para a página inicial.
- **‹ › ▾** — por onde você já esteve neste repositório. Veja
  [Voltar](#going-back).
- **O caminho do repositório** é um botão: abre o menu de
  [repositórios recentes](#recent-repositories).
  Abrir outro repositório é o **+** no fim da [barra de abas](#tabs), ou
  <kbd>Ctrl+O</kbd>.
- **⎇ branch** também é um botão — a branch que o git tem em checkout, e um menu
  com todas as outras branches para ler. Veja
  [navegando por outra branch](#browsing-another-branch).
- **`origin/main ↑2 ↓0`** — o upstream da branch em checkout e o quanto está à
  frente e atrás. Ausente em uma branch que não rastreia nada.
- **`3 changes`** — quantos arquivos a árvore de trabalho tem sem commit, a mesma
  contagem que a linha **Changes** no painel de commits carrega.
- **Panes ▾** — mostra ou oculta cada um dos quatro; veja
  [Tela cheia e ocultar](#full-screen-and-hiding).
- **Settings** — o diálogo de preferências ([Configurações](#settings)),
  também <kbd>Ctrl+,</kbd>.
- **Refresh** — relê status e log manualmente (<kbd>F5</kbd> /
  <kbd>Ctrl+R</kbd>). O Gitty observa o repositório e se atualiza sozinho; isto é
  para as vezes em que a observação não consegue ver uma mudança.

Enquanto você lê outra branch, o botão de branch mostra `⎇ main ›
other-branch`, e erros do último comando git aparecem em vermelho ao lado das
contagens.

### Voltar <a id="going-back"></a>

Ler histórico significa vagar: um commit, um arquivo dentro dele, outro commit
duas páginas abaixo no log, e então de volta ao primeiro. Os três botões à
esquerda da barra de título lembram esse vagar, como um navegador faz.

- **‹** (<kbd>Alt+←</kbd>) volta ao lugar que você estava vendo antes deste, e
  **›** (<kbd>Alt+→</kbd>) vai para aquele do qual você se afastou. Ambos ficam
  acinzentados quando não há para onde ir, e passar o mouse sobre qualquer um
  mostra o nome do lugar para onde ele o levaria.
- **▾** lista os próprios lugares, mais recente primeiro, com um ponto naquele em
  que você está. Escolha qualquer um para pular direto para lá.

Um *lugar* é tudo o que os dois painéis superiores estavam mostrando: a visão — as
mudanças sem commit, um commit, um intervalo de dois, um instantâneo — o arquivo
selecionado dentro dela, e o documento aberto ao lado do diff. Então uma parada
aparece como `Changes`, `7bb7787 — Refresh screenshot batches`,
`src/main/git.ts @ 7bb7787` ou `blame: src/main/git.ts @ 7bb7787`, e voltar a ela
coloca o mesmo arquivo de volta na tela na mesma revisão, em vez de apenas
reselecionar o commit.

O histórico pertence ao repositório, não à janela: cada aba lembra seus próprios
cinquenta lugares mais recentes, e trocar de aba troca quais lugares os botões
percorrem. Ele não é mantido entre reinicializações.

### Abas <a id="tabs"></a>

Uma barra de abas ao longo da parte de baixo guarda cada repositório aberto — seu
nome base, um ponto amarelo quando a árvore de trabalho tem mudanças sem commit, e
um **×** para fechá-lo. O ponto conta tudo o que o `git status` reporta, arquivos
não rastreados incluídos, e ganha seu lugar nas abas que você *não* está vendo: o
repositório ativo já diz `3 changed` na barra de título, enquanto uma aba em
segundo plano fica totalmente oculta, então o ponto é o único sinal de que há
trabalho deixado lá. Passar o mouse sobre uma aba mostra o nome do repositório e
diz isso em palavras.

**+** (e <kbd>Ctrl+O</kbd>) abre outro repositório em uma nova aba; a barra de
título sempre mostra o ativo. Cada aba mantém seus próprios painéis e terminal,
então um commit que você está lendo e um shell que você deixou rodando ficam
exatamente onde estavam quando você alterna e volta. Fechar a última aba deixa
uma janela vazia com um botão para abrir o próximo repositório. (Abas abertas não
são lembradas entre reinicializações.)

### Repositórios recentes <a id="recent-repositories"></a>

O caminho do repositório na barra de título é um menu dos repositórios abertos
antes — nome base mais seu diretório pai — mais recente primeiro.

- **Clique** — abra-o em uma nova aba.
- **Ctrl/Cmd+clique** ou **clique do meio** — abra-o na aba atual, substituindo o
  repositório de lá e mantendo o lugar da aba na barra.
- O **×** à direita de uma entrada — tire-a da lista; clicar nela com o botão
  direito faz o mesmo. O menu continua aberto, então vários podem sair em
  sequência.

**Open Repository…** e **Clear Recent** ficam abaixo. A lista vive em
`~/.config/Gitty/recent-repos.json`, guarda doze entradas, e pula qualquer uma
que desde então tenha sido movida ou apagada.

### Tela cheia e ocultar <a id="full-screen-and-hiding"></a>

Todo cabeçalho de painel carrega os mesmos dois controles: **⤢** à esquerda
preenche a janela com aquele painel, e **×** à direita o oculta.

A tela cheia cobre todo o resto, incluindo as barras de título e de abas, e os
painéis por baixo continuam funcionando — o terminal segue rodando enquanto está
coberto. **⤡** no mesmo canto, <kbd>Esc</kbd>, um clique duplo no cabeçalho, ou
<kbd>Ctrl+Shift+1</kbd> … <kbd>Ctrl+Shift+4</kbd> restauram o layout. Só um painel
fica em tela cheia por vez.

<kbd>Ctrl+Tab</kbd> leva a tela cheia ao próximo painel na ordem do layout e
<kbd>Ctrl+Shift+Tab</kbd> ao anterior, pulando os ocultos e voltando ao começo em
qualquer ponta. Só funciona enquanto um painel preenche a janela, que é onde é
preciso: com o layout na tela, cada painel já está a um clique. O terminal não vê
a tecla, então funciona de dentro de um shell também.

Ocultar é a outra direção — qualquer painel pode ser guardado e trazido de volta:

- **Panes** na barra de título lista os quatro, com um ponto ao lado dos visíveis;
  clicar em um o alterna, e **Show All Panes** restaura o layout de quatro
  painéis.
- <kbd>Ctrl+1</kbd> … <kbd>Ctrl+4</kbd> alternam Files, Diff, Commits e Terminal,
  nessa ordem.
- <kbd>Ctrl+Shift+0</kbd> traz os quatro de volta — zero para "todos eles", uma
  tecla depois das quatro que alternam um cada. Ele usa Shift porque
  <kbd>Ctrl+0</kbd> é o reset de zoom do motor do navegador, que o menu View
  mantém.

O que sobrar divide a janela, então ocultar o painel de commits dá ao diff a
altura total. O último painel visível não tem **×** — uma janela vazia não
deixaria nada para clicar. Painéis ocultos são lembrados entre reinicializações, e
o painel do terminal só é guardado, nunca fechado: seus shells continuam rodando
e voltam com seu scrollback quando ele retorna.

## Os painéis <a id="the-panes"></a>

### Changes (superior esquerdo) <a id="changes-top-left"></a>

Arquivos alterados como uma árvore colapsável, cada um com sua contagem de linhas
ao lado do nome. Navegar por um repositório inteiro — a árvore de trabalho ou o
instantâneo de um commit — abre com todos os diretórios fechados, já que é uma
árvore para descer, e não uma lista de mudanças para ler; uma lista de mudanças
abre expandida. Diretórios vêm antes de arquivos em todos os níveis, e dentro de
cada grupo os nomes são ordenados como um leitor espera, e não como uma comparação
de bytes faria: os dígitos em um nome contam como número, então `W9` vem antes de
`W10`, e maiúsculas não são uma diferença de primeira ordem, então `butler/`
ordena junto aos b's em vez de depois de toda letra maiúscula. Duas colunas de
status são mostradas: o estado do staging (verde) e o estado da árvore de trabalho
(amarelo / vermelho); arquivos não rastreados são `??`. A contagem é lida do disco
na árvore de trabalho e da revisão em todos os outros lugares; arquivos binários,
arquivos apagados e qualquer coisa acima de 8 MB simplesmente não mostram nenhuma.
Depois vem o churn — quantas linhas essa mudança adicionou e removeu naquele
arquivo, `+12 −3`, contra HEAD na árvore de trabalho e contra o pai para um commit
ou um intervalo. Um instantâneo é uma árvore, não uma mudança, então não tem
churn; nem arquivos binários ou um commit de merge, cujo diff combinado não
atribui nada.

- **Clique** — mostra o diff do arquivo à direita.
- **Clique duplo** — abre o arquivo inteiro como um documento ao lado do diff,
  com números de linha e realce de sintaxe (um documento renderizado para
  markdown, a própria figura para uma imagem).
- **Clique em uma coluna de status** — prepara (stage) o arquivo, ou desfaz a
  preparação se ele já estiver preparado.
- **Clique direito** — View File, Open in System App, Reveal in File Manager,
  Copy Relative Path, Copy Absolute Path, Copy File Name, Blame File, File
  History, Stage / Unstage File, Discard Changes, Delete File.
- **Clique em uma pasta** — colapsa ou expande.

**Discard Changes** devolve o arquivo ao que o índice guarda, após uma confirmação
nativa que diz claramente que não há desfazer; um arquivo não rastreado não tem
versão no índice para voltar, então ele oferece **Delete File** em vez disso, que
vai para a lixeira do sistema.

<kbd>Ctrl+F</kbd> com este painel em foco — ou **Filter** no botão de busca do
cabeçalho, cuja seta escolhe entre buscar no repositório e filtrar esta lista —
abre uma caixa de filtro acima da árvore e a estreita aos caminhos que contêm o
que você digita, com a contagem de quantos de quantos arquivos restam. O texto é
comparado com o caminho inteiro, então `src/main` mantém tudo sob aquele
diretório, e maiúsculas não importam. Nada continua fechado enquanto a caixa tiver
texto — uma ocorrência cinco diretórios abaixo é justamente o motivo de ter
digitado. <kbd>Esc</kbd> ou o **✕** a limpa e devolve a árvore inteira, e ir para
outro commit também.

**Send** no cabeçalho entrega o índice. Ele digita um comando no shell do
painel inferior direito e pressiona Enter, e é só isso: nenhum modelo é chamado de
dentro do Gitty, nada deixa a máquina que você não tenha enviado. Os prompts e a
saída do agente aparecem no terminal, onde há um tty de verdade, então hooks e a
assinatura gpg funcionam como sempre.

A caixa à sua esquerda nomeia o comando que ele executaria, e é onde outro é
escolhido — não há configuração para isso, porque é uma pergunta feita uma vez por
entrega, e não uma vez por instalação. O menu lista os comandos de que o Gitty se
lembra, o executado mais recentemente primeiro, e executa o que você escolher;
executar um comando o leva para o topo, então a caixa mostra sempre o último
usado. Sem nada lembrado, a caixa fica pálida e o **Send** fica cinzento. O **×** à direita de uma
entrada a retira da lista, após uma confirmação — a lista é o único lugar onde um
comando fica escrito, e o menu permanece aberto para que vários possam ser
removidos em sequência. **New command…** na parte de baixo abre uma caixa de uma
linha, pré-preenchida com o comando atual, para o que não estiver na lista. A
lista começa com algumas sugestões — qual agente está instalado não é algo que o
Gitty possa saber — e um comando entra nela por ter sido executado, então nada é
lembrado pela força de uma linha digitada pela metade.

Clicar com o botão direito na linha da árvore de trabalho no log de commits também
oferece **Copy Staged Diff**, para uma conversa acontecendo em outra janela.

Quando um commit ou um intervalo de commits está selecionado, este painel lista os
arquivos daquele commit; **Back to Changes** (ou <kbd>Esc</kbd>) retorna às
árvore de trabalho. Em um [instantâneo](#snapshots), ele lista a árvore inteira
naquele commit, não só o que mudou.

### Diff (superior direito) <a id="diff-top-right"></a>

Diff unificado com números de linha antigos/novos, cabeçalhos de hunk e coloração
de adição/remoção, disposto como uma lista de arquivos: cada caminho é um
cabeçalho de largura total, o cabeçalho do hunk é esmaecido — um intervalo de
linhas, não a primeira coisa a olhar — e uma renomeação aparece como
`old → new`. Sem nenhum arquivo selecionado, ele mostra tudo de uma vez: toda
mudança sem commit na árvore de trabalho, ou todo arquivo no commit selecionado.

- **Show Whole Diff** — de volta àquele diff combinado depois de escolher um
  arquivo. Ele fica no cabeçalho e acende enquanto o diff inteiro é o que você
  está vendo. A versão da árvore de trabalho cobre mudanças staged e unstaged
  juntas e coloca em linha arquivos não rastreados (até 50, depois um aviso), o
  que `git diff` sozinho deixa de fora.
- **Wrap** — quebra linhas longas em vez de rolar para o lado. Ativado por padrão.
- **Inline** — um interruptor como o **Wrap**: pressionado, uma coluna com
  marcadores `+`/`-`; solto, antigo e novo lado a lado, onde uma sequência de
  remoções é unida às adições que a seguem. Metades quebradas permanecem
  alinhadas.
- **File headings** — cada cabeçalho dobra seu arquivo: o triângulo o colapsa até
  o nome, e **Collapse All** / **Expand All** no cabeçalho faz tudo de uma vez.
  **Ctrl+clique** em um cabeçalho abre aquele arquivo em uma nova aba de
  documento; clique direito nele para **Open in a New Tab**, **Select in the File
  List**, as cópias de caminho e — na árvore de trabalho, onde o arquivo no disco
  é a versão mostrada — **Open in System App** e **Reveal in File Manager**. Uma
  renomeação abre seu novo caminho.
- **Stage / Unstage** — enquanto o diff é o trabalho de um arquivo rastreado, cada
  cabeçalho de hunk carrega um botão que coloca aquele hunk no índice ou o retira.
  Selecione linhas primeiro e o botão vira **Stage 3 lines**: uma adição não
  selecionada fica de fora do patch, uma remoção não selecionada é rebaixada a
  linha de contexto, e o cabeçalho do hunk é recalculado — a mesma divisão que o
  `git add -p` faz, de uma janela onde o arquivo inteiro está à sua frente. A
  seleção é a seleção de texto comum, então arrastar ainda copia. Uma seleção que
  abrange dois hunks dá a cada um a sua parte.
- **Unstaged / Staged** — de qual lado do índice um arquivo está sendo lido,
  mostrado uma vez que ambos os lados guardam algo. Preparar age sobre o que está
  na tela. Arquivos binários, mudanças de modo e renomeações não têm hunks para
  escolher e são preparados inteiros da lista de arquivos; os botões de hunk também
  somem enquanto **Ignore whitespace** está ligado, porque aquele diff não guarda
  cada mudança que aplicaria.
- **Clique direito** — Copy Selection, Copy Whole Diff, e os mesmos toggles.

Palavras alteradas dentro de uma linha alterada são destacadas onde isso se lê
melhor do que a linha inteira de uma vez; é o **Word highlight** em
[Configurações](#settings).

As configurações são lembradas entre execuções. As linhas renderizam em blocos de
1500 e se estendem conforme você rola, então commits grandes continuam
responsivos; diffs acima de 2 MB são truncados com um aviso.

### Visualizando arquivos <a id="viewing-files"></a>

Um diff é o que o painel mostra por padrão, mas qualquer arquivo pode ser aberto
inteiro: **clique duplo** nele na árvore, use **View File** / **Preview** no
cabeçalho, **Ctrl+clique** em um cabeçalho de arquivo no diff, ou pegue-o em
qualquer um dos menus de contexto.

O arquivo abre como seu próprio documento em uma faixa de abas ao lado do diff, e
não por cima dele, então um arquivo pode ser lido sem perder o diff em que você
estava. A aba **Diff** é sempre a primeira e um único clique na árvore ainda
navega os diffs no lugar. Cada documento lembra a revisão em que foi aberto, fecha
com seu próprio **×**, e relê um arquivo da árvore de trabalho quando o
repositório muda. Arquivos-fonte ganham números de linha e realce de sintaxe;
markdown abre [renderizado](#markdown-preview), com um toggle de volta ao
código-fonte; HTML abre [renderizado também](#html-preview); uma imagem abre como
[a figura](#images).

Qual revisão você recebe segue o painel: o arquivo no disco na árvore de trabalho,
o arquivo como estava no commit selecionado em todos os outros lugares. Abrir um
documento é uma ação, não um modo — selecionar outro arquivo ou outro commit
coloca o diff de volta — então o painel nunca fica preso mostrando arquivos quando
você queria mudanças.

#### O outline de um arquivo de código <a id="the-outline-of-a-source-file"></a>

Um arquivo de código carrega um botão **Outline**, o mesmo que um documento
renderizado tem: as classes, funções e membros do arquivo ao lado dele como uma
árvore, indentadas pelo aninhamento e coloridas pelo que cada uma declara. Clique
em uma entrada para saltar até ela — o arquivo é desenhado longe o bastante para
contê-la, por mais fundo que esteja — e a entrada até onde você rolou fica
marcada. Arraste o separador para dar mais espaço a qualquer um dos lados; a
largura é compartilhada por todos os arquivos do repositório.

Ele lê dezesseis linguagens — C, C++, C#, Go, Java, JavaScript, Lua, Perl, PHP,
Python, Ruby, Rust, shell, Swift, TypeScript e as variantes JSX das duas últimas —
e as lê reconhecendo declarações em vez de analisando: comentários e strings são
apagados primeiro, o aninhamento vem da profundidade das chaves (ou da indentação,
onde a linguagem é escrita assim), e um nome só aparece onde uma palavra-chave o
colocou. Qualquer outra coisa — formatos de dados, folhas de estilo, uma linguagem
que ele não conhece — não mostra painel algum em vez de uma lista adivinhada. O
markdown tem [um outline próprio](#markdown-preview), feito de seus títulos.

#### Instantâneos <a id="snapshots"></a>

Clique direito em um commit e escolha **Browse Snapshot** para ler o repositório
como estava naquele commit: o painel superior esquerdo lista a árvore *inteira*,
em vez dos arquivos que aquele commit tocou, e escolher qualquer arquivo o abre
naquela revisão. Um instantâneo não tem diff para mostrar, então cada arquivo lá é
um documento.

Os arquivos em um instantâneo nunca existiram no disco naquela revisão, razão pela
qual **Open in System App** entrega uma cópia temporária dele e **Reveal in File
Manager** não é oferecido. **Back to Changes** (ou <kbd>Esc</kbd>) sai.

#### Pré-visualização de Markdown <a id="markdown-preview"></a>

Selecionar um arquivo `.md` adiciona um botão **Preview** — desligado por padrão,
então um diff continua sendo um diff até você pedir o documento renderizado. Ele
renderiza o arquivo como um todo: a versão no disco na árvore de trabalho, a
versão no commit selecionado em todos os outros lugares.

Blocos de código cercados têm realce de sintaxe quando nomeiam uma linguagem, o
YAML front matter é destacado e mostrado como seu próprio bloco realçado, e níveis
de título, marcadores de lista, links e código em linha são codificados por cor
para que a estrutura se leia de relance.

- **Wrap** — o mesmo toggle do diff, ativado por padrão. Prosa sempre quebra; em
  uma pré-visualização isto decide se blocos de código cercados, tabelas largas e
  strings longas em linha também quebram, em vez de rolar para o lado.
- **Outline** — a estrutura de títulos ao lado do documento, indentada por nível,
  acompanhando o título até o qual você rolou. Clique em uma entrada para pular, e
  arraste o separador entre ela e o documento para dar mais espaço a qualquer um
  dos lados. A largura é compartilhada por todo documento no repositório — é uma
  preferência de leitura, não uma propriedade de um arquivo — e dura enquanto a
  janela, como os tamanhos dos outros painéis.
- **Source lines** — desligado por padrão, e ativado em
  [Configurações](#settings): todo título, parágrafo, item de lista, tabela,
  bloco cercado e imagem é numerado na margem esquerda com a linha em que começa
  no código-fonte. Os números são desenhados, não inseridos, então ficam fora de
  uma seleção que você copia e fora do que o <kbd>Ctrl+F</kbd> pesquisa. Uma
  imagem escrita dentro de uma frase assume a linha do seu parágrafo, não tendo
  uma própria.
- **<kbd>Ctrl+F</kbd>** — busca no documento; veja
  [Encontrando texto](#finding-text).
- **Clique direito** — Copy Selection, Copy Markdown Source, os toggles de wrap e
  outline, e Show Diff Instead.

HTML bruto dentro do markdown não é renderizado, e um link para a web abre no
navegador do sistema, e não dentro do app. Um link para outro arquivo do
repositório — `ref/readme/manual.md`, `../README.md`, `/CHANGELOG.md` — é seguido
aqui em vez disso: **Ctrl/Cmd+clique** abre aquele arquivo como seu próprio
documento ao lado do diff, na mesma revisão do documento que carrega o link, então
um README lido em um commit antigo leva aos arquivos daquele commit. Um
`#fragment` no final viaja com ele — `manual.md#the-window` abre o manual naquele
título, como faria em uma forja — e um título que este documento não tem
simplesmente o abre no topo. Passar o mouse sobre um link assim diz isso. Um clique
simples não faz nada, como antes, e um link que sobe para fora da raiz do
repositório não é um desses. Imagens escritas relativas ao documento são lidas do
repositório — na mesma revisão que o documento, então um commit antigo mostra as
capturas de tela com que foi lançado. Uma que o repositório não tem ali deixa um
placeholder tracejado com seu texto alternativo. Imagens da web não são buscadas
de forma alguma: ler o README de um estranho não deveria anunciar você para
qualquer host que ele aponte.

![Markdown preview](../../ref/gitty-0.1.5-markdown.png)

#### Pré-visualização de HTML <a id="html-preview"></a>

Um arquivo `.html`, `.htm` ou `.xhtml` ganha o mesmo botão **Preview**, e o
documento é renderizado em vez de mostrado como código-fonte — a versão no disco
na árvore de trabalho, a versão no commit selecionado em todos os outros lugares.

Ele renderiza em um frame com sandbox carregado via `srcdoc`, então a página nunca
pode navegar o app para longe de si mesmo. Suas próprias folhas de estilo se
aplicam — layout, cores, fontes são do documento. Scripts não rodam e imagens
remotas não são buscadas: o frame herda a política de segurança de conteúdo do
app, que não admite nenhum dos dois. Uma página é mostrada, não executada.
**Wrap** decide se o frame rola por conta própria ou cresce até seu conteúdo para
que a página inteira role como uma só. <kbd>Ctrl+F</kbd> e <kbd>Ctrl+Shift+C</kbd>
funcionam dentro do frame, cujas teclas nunca alcançam o resto da janela.

#### Imagens <a id="images"></a>

Um `.png`, `.jpg`, `.gif`, `.webp`, `.bmp`, `.ico`, `.avif` ou `.svg` abre como a
figura, e não como um relato de que é binário — do disco na árvore de trabalho, do
commit em todos os outros lugares. É ajustado ao painel sobre um tabuleiro, então
transparência se lê como transparência; **clique** nele para o tamanho real e role
ao redor, clique de novo para ajustar. Suas dimensões em pixels e o tamanho no
disco ficam embaixo. Imagens acima de 12 MB não são embutidas.

![Image preview](../../ref/gitty-0.1.5-image.png)

#### Blame e histórico do arquivo <a id="blame-and-file-history"></a>

Clique direito em qualquer arquivo na árvore e escolha **Blame File** ou **File
History**; ambos abrem como documentos ao lado do diff. Blame mostra uma linha por
linha de código — o commit, seu autor, sua data e a própria linha, realçado como o
visualizador de código, com um travessão onde uma linha ainda não tem commit — na
revisão que você está vendo. File History lista todo commit que tocou o arquivo,
segue renomeações, e clicar em um commit o abre; uma coluna entre a data e o autor
diz o comprimento do arquivo naquele commit, e fica vazia onde a contagem não pode
ser estabelecida — uma revisão binária, e tudo mais antigo que ela.

Clicar com o botão direito em uma linha de blame oferece **History of These
Lines**: `git log -L` sobre as linhas que a seleção cobre — ou a linha clicada, sem
seleção — que abre como seu próprio documento mostrando cada commit que as tocou
junto com o que fez com elas. Blame responde *quem por último*; isto responde *como
chegou a ser assim*. Ele rastreia o intervalo através de renomeações por conta
própria.

#### Pesquisando no repositório <a id="searching-the-repository"></a>

**Search** no cabeçalho do painel Changes abre uma caixa acima da lista de
arquivos e roda `git grep`. A seta ao lado troca esse botão para **Filter**, que
em vez disso estreita a lista de arquivos; o que você escolher continua escolhido,
e só uma das duas caixas fica aberta por vez. Os resultados são um documento agrupado por
arquivo, com números de linha à esquerda; clicar em um abre aquele arquivo naquela
linha, com a linha marcada.

A busca segue a revisão na tela: na árvore de trabalho ela lê o que está no disco,
trabalho sem commit incluso, e em um commit ou instantâneo ela lê aquela revisão —
a caixa diz qual. Acima de 2000 ocorrências ela para e diz isso, como faz um diff
grande demais. O padrão chega ao git como um único argumento, então uma expressão
regular não é despedaçada no caminho.

### Commits (inferior esquerdo) <a id="commits-bottom-left"></a>

O log da branch atual, carregado 300 por vez e estendido conforme você rola. A
primeira linha é **Changes** — as mudanças sem commit, com uma contagem de
arquivos alterados; selecioná-la traz os painéis superiores de volta a elas. Uma caixa de filtro acima do log estreita a lista — com debounce, e um ✕
para limpar — e o resultado pagina da mesma forma.

O cabeçalho mantém **Push** e **Pull**, os dois usados com frequência; todo o
resto sobre o log está a um clique atrás de **⋯** — **Graph**, **All Branches**,
**Gource** onde estiver instalado, e **Open in Browser**. Os dois interruptores
levam um ponto naquele menu enquanto estão ligados.

**Graph** desenha as faixas ao lado dos hashes: onde uma branch se
separou, onde um merge aterrissou, a qual linha um commit pertence. Ele é calculado
a partir dos pais de cada commit, em vez de analisado de `git log --graph`, cujo
ASCII é composto para um terminal. Uma faixa mantém sua cor página abaixo, e a
paleta é fixa — deliberadamente diferente do blame, cujas cores são derivadas do
SHA e significam "quem". Passadas dez faixas, o excedente compartilha a última
coluna, anelada, então um repositório com muitas cabeças não consegue empurrar os
assuntos para fora do painel. **All Branches** mostra todas as branches de uma vez
(`git log --all`), que é como duas branches podem ser vistas se relacionando uma
com a outra; o menu de branch ainda lê uma de cada vez.

O menu ao lado diz o que está sendo pesquisado:

| | |
| --- | --- |
| **Message / Author** | A mensagem do commit e o autor, sem diferenciar maiúsculas. O padrão. |
| **Content** | o `-S` do git: os commits onde o *número de ocorrências* do texto mudou — onde ele foi introduzido ou removido. Literal, então uma busca cheia de `.` e `(` significa esses caracteres. |
| **Content regex** | o `-G` do git: todo commit cujo diff corresponde à expressão, incluindo os que apenas moveram a linha. |

Os dois modos de conteúdo respondem à pergunta que o blame não pode — *qual commit
introduziu esta linha* — e leem cada diff da história para fazer isso, então a
caixa diz que está pesquisando enquanto rodam. Mudar o texto ou o modo mata a
busca em andamento; nada é emendado em uma linha de comando, então uma expressão
regular chega ao git como um argumento.

- **Clique** ou <kbd>Enter</kbd> — mostra aquele commit: seus arquivos preenchem o
  painel superior esquerdo e seu diff completo o superior direito. O subject,
  autor, data e corpo completo do commit aparecem em uma faixa acima da lista de
  arquivos; quando o corpo é longo, um toggle ▸ o dobra para que a lista de
  arquivos mantenha o espaço.
- **Ctrl+Clique** (<kbd>Cmd</kbd> no macOS), <kbd>Shift+Clique</kbd> ou
  <kbd>Space</kbd> — escolhe um segundo commit e compara os dois, o mais antigo
  primeiro.
- **↑ ↓ / j k / PgUp / PgDn / Home / End** — move o cursor.
- **Clique direito** — mostra o diff, copia o hash, o hash curto ou o subject,
  [navega pelo instantâneo](#snapshots), ou compara contra o commit atualmente
  selecionado.
- **Clique direito → Open in Browser** — renderiza este commit no navegador do
  sistema; **Copy Commit URL** copia o link. Um servidor web dentro do app serve
  todo repositório aberto como uma lista de commits navegável — o botão **Open in
  Browser** do painel de commits aterrissa lá — com os metadados, arquivos e diff
  de cada commit, e diffs por arquivo a um clique de distância.

  Ele escuta em `127.0.0.1`, e isso por si só não seria muito: o loopback mantém
  outras máquinas do lado de fora, não outras páginas no seu próprio navegador,
  qualquer uma das quais poderia buscá-lo. Então toda URL carrega um token gerado
  na inicialização e mantido em memória — `/t/<token>/…` — que os links que o Gitty
  entrega já têm. Um token errado é um 404, e não um 403; uma requisição cujo
  `Host` não é loopback é recusada (é isso que torna o rebinding de DNS inútil), e
  as páginas são servidas com `Referrer-Policy: no-referrer`, então seguir um link
  para fora de uma mensagem de commit não leva o token junto. O token é novo a cada
  lançamento, então as URLs funcionam enquanto esta sessão roda.
- Selecionar um arquivo no painel superior esquerdo estreita o diff para aquele
  arquivo; **Show Whole Diff** o alarga de volta.

![Diff against any two commits](../../ref/gitty-0.1.5-range.png)

#### Gource <a id="gource"></a>

Se [gource](https://gource.io/) está no `PATH`, o menu **⋯** do cabeçalho dos
commits ganha uma entrada **Gource**: ele reproduz o histórico do repositório
como uma animação — a árvore de diretórios crescendo, arquivos acendendo conforme
cada commit aterrissa, um autor voando entre eles para cada nome no log. O Gource
abre uma janela própria e continua rodando depois que você fecha o Gitty; a entrada
só espera o suficiente para ver que ele iniciou, e mostra o que o gource disse se
não o fez.

É iniciado com um dia de histórico por meio segundo, arquivos ociosos mantidos na
tela e lacunas longas puladas, o que é o que torna um repositório real legível em
vez de um gotejamento lento. Nada é instalado para você: onde o gource não está no
`PATH`, a entrada simplesmente não está lá.

#### Navegando por outra branch <a id="browsing-another-branch"></a>

A branch na barra de título abre um menu com cada branch local e de rastreamento
remoto, o commit mais novo primeiro, e escolher uma mostra o histórico daquela
branch. É uma olhada somente leitura: o gitty não roda `checkout`, então a árvore
de trabalho, seus diffs e os terminais ficam exatamente onde o git os deixou.
Enquanto você olha outra branch, a barra de título mostra `⎇ main › other-branch`
e o painel de commits diz qual branch está listando; **Back to \<branch\>**
retorna. Cada aba navega por conta própria.

#### Push e Pull <a id="push-and-pull"></a>

**Push** e **Pull** ficam no cabeçalho, e ambos agem sobre a branch em checkout,
qualquer que seja a branch para a qual o log aponta. **Push** conta o que não foi
enviado — **Push 3** — e acincenta quando não há nada para enviar; em uma branch
que não rastreia nada, publica a branch para `origin` e define o upstream.
**Pull** faz fast-forward a partir do upstream, e fica acinzentado quando não há
upstream para puxar. O que o git disser aparece acima do log — clique para
dispensar; falhas permanecem até você fazê-lo.

Nenhum dos dois consegue responder a um prompt: não há terminal atrás deles, então
um push que pede senha ou passphrase falha com a própria mensagem do git em vez de
travar, e um pull que não pode fazer fast-forward diz isso. Ambos são então
terminados à mão no painel do terminal, que está bem ali.

### Terminal (inferior direito) <a id="terminal-bottom-right"></a>

Um shell de login interativo real (`$SHELL`) com raiz no repositório, então
qualquer comando git pode ser rodado diretamente. <kbd>Ctrl+Shift+C</kbd> copia a
seleção do terminal — <kbd>Ctrl+C</kbd> lá é o interrupt, e continua sendo o
interrupt. O mesmo acorde copia em todos os outros painéis também, então ele não
muda de significado conforme o foco se move. Os outros painéis se atualizam
automaticamente quando o repositório muda no disco. Qual shell ele inicia, e se
inicia como shell de login, são [Configurações](#settings); ambos são lidos quando
um terminal é criado, então uma mudança tem efeito na próxima divisão.

O painel se divide em quantos shells você quiser: **Split →** coloca um novo ao
lado do terminal focado, **Split ↓** abaixo dele, e os separadores entre eles
arrastam como em qualquer outro painel. Clicar em um terminal o foca — o
contornado é onde a próxima divisão ou **Close** aterrissa. Dividir da mesma forma
duas vezes estende a linha ou coluna em vez de aninhar, então três terminais lado
a lado redimensionam uns contra os outros.

**Close** termina o shell focado; sair de um shell com `exit` fecha sua divisão
por si só. O último terminal sempre permanece: sair dele deixa o aviso na tela em
vez de um painel vazio.

## Encontrando texto <a id="finding-text"></a>

<kbd>Ctrl+F</kbd> pesquisa o que o painel à direita estiver mostrando: um diff, um
arquivo, um documento markdown renderizado, uma [pré-visualização de
HTML](#html-preview), um blame, ou o histórico de um arquivo. Com a árvore de
arquivos em foco ele faz outra coisa — filtra essa árvore, descrito em
[Changes](#changes-top-left). Toda ocorrência é
destacada com a atual apontada, <kbd>Enter</kbd> e <kbd>Shift+Enter</kbd> (ou as
setas) as percorrem e voltam ao começo em qualquer ponta, a contagem diz onde você
está, e <kbd>Esc</kbd> fecha.

A busca não diferencia maiúsculas de minúsculas e lê o texto como renderizado, não
a marcação por trás dele — então uma frase é encontrada entre os spans em negrito
e de código que o markdown deixa dentro dela, e um diff é pesquisado como as
linhas que você vê. Visões que renderizam em blocos conforme você rola (um arquivo
longo, um diff grande) renderizam o resto quando a faixa abre, então a contagem
cobre a coisa toda em vez da parte rolada até agora. Um arquivo colapsado em um
diff de múltiplos arquivos permanece colapsado e não é pesquisado.

## Configurações <a id="settings"></a>

**Settings** na barra de título, ou <kbd>Ctrl+,</kbd>. Tudo aqui se aplica a toda
aba e é lembrado entre reinicializações; **Restore Defaults** coloca tudo de
volta. O diálogo tem três abas — **Appearance**, **View** e **Session** — então
fica em uma tela conforme cresce; a tabela abaixo as lista nessa ordem.

| | |
| --- | --- |
| **Theme** | Dark ou Light. |
| **Language** | English, 简体中文, 日本語, 한국어, Français, Deutsch, Español, Русский ou Português — a interface, os menus e os diálogos mudam todos juntos sem reiniciar. |
| **Time zone** | O fuso em que toda data e hora na tela é renderizada: o da própria máquina por padrão, ou UTC, ou qualquer fuso que o sistema conheça. O git registra cada commit com o offset do autor, então um registro de data/hora é sempre uma escolha de fuso — é aqui que ela é feita. A coluna de data do log o acompanha, o que significa que a fronteira entre "hoje" e uma data se move junto. |
| **Time format** | Absolute (uma hora de relógio ou uma data) ou Relative (`28m ago`, `2h ago`). Relative contorna inteiramente a questão do fuso; a dica de hover em uma linha permanece absoluta de qualquer forma, e nomeia seu fuso. |
| **Font size** | 9 – 20, em meios pontos. Aplica-se a todo painel, o terminal incluído. |
| **Monospace font** | A família em que os painéis e o terminal são desenhados, escolhida entre as fontes monoespaçadas encontradas nesta máquina. **System default** é a pilha embutida (JetBrains Mono, Fira Code, DejaVu Sans Mono, …). |
| **Row height** | 18 – 26 pixels — a altura de linha sobre a qual toda lista é construída, a árvore de arquivos, o log e o diff. Mais apertado cabe mais na tela, mais solto se lê mais fácil. |
| **Diff layout** | Inline ou Side-by-Side, o mesmo toggle que o cabeçalho do diff carrega. |
| **Context lines** | 0 – 25 linhas inalteradas ao redor de cada hunk — o `-U` do git, cujo próprio padrão é 3. Alargue para ver no que uma mudança está inserida, estreite para caber mais de um diff grande na tela. |
| **Ignore whitespace** | Off, Amount (o `-b` do git: uma sequência de espaços mudando de comprimento não é uma mudança) ou All (`-w`: nenhuma diferença de whitespace é). Código reindentado ou requebrado se lê como inalterado em vez de uma parede de vermelho e verde. As contagens `+12 −3` da lista de arquivos seguem a mesma configuração, então ela não pode alegar linhas que o diff depois se recusa a mostrar. |
| **Word wrap** | Quebra linhas longas em vez de rolar para o lado. |
| **Word highlight** | Marca as palavras que mudaram dentro de uma linha alterada, não apenas a linha. |
| **Outline** | Mostra o outline ao lado de um documento: títulos num renderizado, classes e funções num arquivo de código. |
| **Markdown source lines** | Numera cada bloco de um documento renderizado com a linha em que começa no código-fonte. Títulos, parágrafos, itens de lista, tabelas, código cercado e imagens todos carregam uma, em uma margem descendo à esquerda. Desligado por padrão. |
| **File sorting** | Natural ou Byte order. Natural lê os dígitos em um nome como número (`W9` antes de `W10`) e coloca maiúsculas em segundo lugar; byte order é a do próprio git, onde toda maiúscula ordena antes de toda minúscula. |
| **Reopen last session** | Reabre os repositórios que estavam abertos quando o app saiu pela última vez. O repositório com que o Gitty foi iniciado ainda é a aba ativa; os que desde então foram apagados são silenciosamente descartados. |
| **Shell** | O shell que um terminal inicia, listado de `/etc/shells` mais os caminhos usuais (`COMSPEC` e PowerShell no Windows). **System default** é `$SHELL`. Um caminho que desde então desapareceu recai nele em vez de deixar um painel morto. |
| **Login shell** | Inicia-o com `-l`, para que o perfil do usuário seja carregado. Desligue-o para um shell mais rápido e silencioso — sem saída de perfil, sem verificações de login. Shells do Windows não têm tal flag e ignoram isso. |

**Shell** e **Login shell** são lidos quando um terminal é criado, então têm
efeito na próxima divisão ou na próxima aba de repositório, não nos shells já em
execução. **Word wrap**, **Diff layout** e **Outline** são os mesmos
toggles que o cabeçalho do diff carrega, então mudar um em qualquer lugar muda
ambos. **Word highlight** vive apenas aqui.

## Atalhos de teclado <a id="keyboard-shortcuts"></a>

| Tecla | Ação |
| --- | --- |
| <kbd>Enter</kbd> | Mostra o commit selecionado |
| <kbd>Space</kbd> / <kbd>Ctrl+Click</kbd> | Marca um segundo commit e compara o par |
| <kbd>Ctrl+Click</kbd> em um cabeçalho de arquivo | Abre aquele arquivo em uma nova aba de documento |
| <kbd>Ctrl+F</kbd> | Busca no diff, no arquivo, ou no que o painel estiver mostrando — ou filtra a árvore de arquivos, com esse painel em foco |
| <kbd>Ctrl+C</kbd> / <kbd>Ctrl+Shift+C</kbd> | Copia a seleção, em qualquer lugar da janela |
| <kbd>Esc</kbd> | Volta às mudanças sem commit |
| <kbd>Alt+←</kbd> / <kbd>Alt+→</kbd> | Para trás e para frente pelos lugares vistos |
| <kbd>Alt</kbd> | Mostra ou esconde a barra de menus do aplicativo (não no macOS, onde ela está sempre lá) |
| <kbd>F5</kbd> / <kbd>Ctrl+R</kbd> | Atualiza status e log |
| <kbd>Ctrl+O</kbd> | Abre outro repositório em uma nova aba |
| <kbd>Ctrl+,</kbd> | Configurações |
| <kbd>Ctrl+1</kbd> … <kbd>Ctrl+4</kbd> | Oculta ou mostra Files, Diff, Commits, Terminal |
| <kbd>Ctrl+Shift+0</kbd> | Mostra os quatro painéis de novo |
| <kbd>Ctrl+Shift+1</kbd> … <kbd>Ctrl+Shift+4</kbd> | Preenche a janela com aquele painel |
| <kbd>Ctrl+Tab</kbd> / <kbd>Ctrl+Shift+Tab</kbd> | A tela cheia passa ao painel seguinte, ou ao anterior |


## Notas de plataforma <a id="platform-notes"></a>

### Integração com o desktop Linux <a id="linux-desktop-integration"></a>

Os dois compromissos abaixo têm a mesma causa — um app Electron que é *executado*
em vez de empacotado — então ambos desapareceram no `.deb`, e ambos permanecem no
caminho do `setup.sh`, que de fato executa um Electron não empacotado.

**Classe de janela.** A entrada de desktop que o `setup.sh` grava carrega
`StartupWMClass=electron`: é isso que um Electron não empacotado reporta, qualquer
que seja o nome que a aplicação use para si mesma, e é contra isso que a lista de
janelas e o dock fazem a correspondência de uma janela para encontrar seu ícone. O
efeito colateral é que outro app Electron não empacotado na mesma sessão toma
emprestado o ícone do Gitty. O build empacotado tem seu próprio executável, então
sua entrada corresponde a `gitty` e a colisão não pode acontecer.

**Sandbox.** `run.sh` e `cli.js` definem `ELECTRON_DISABLE_SANDBOX=1`, porque
`chrome-sandbox` não consegue manter um bit setuid de propriedade do root dentro de
`node_modules`. O `.deb` não tem nada a contornar: seu `postinst` coloca o auxiliar
em 4755 em kernels sem namespaces de usuário sem privilégio, deixa-o em 0755 onde a
sandbox de namespace funciona, e instala o perfil AppArmor que o Ubuntu 24.04
pede. Então a sandbox está ligada para tudo instalado a partir do pacote.

O `.AppImage` é o mais fraco dos dois: nada nele pode carregar um bit setuid, então
depende de namespaces de usuário sem privilégio — que a política AppArmor do Ubuntu
24.04 restringe por padrão. Espere passar `--no-sandbox` lá, ou instalar um perfil
AppArmor próprio. Prefira o `.deb` onde puder.

### Bundle do app macOS <a id="macos-app-bundle"></a>

`Gitty.app` é um wrapper, não um pacote: `Contents/MacOS/Gitty` é um script de
duas linhas que executa `run.sh --fg --any`. `--fg` importa — executar até o fim
significa que o bloco do Dock fica no bundle em vez de ser órfão de um processo
que o sobrevive — e `--any` deixa um lançamento a partir do Finder, que não tem um
diretório de trabalho para se falar, recair nos repositórios abertos mais
recentemente.

O nome está certo nos três lugares em que aparece, e só um deles vem do bundle. O
Finder e o Dock leem `CFBundleName` e `CFBundleIconFile` do `Info.plist`; a barra
de menu é `app.name`, que `app.setName('Gitty')` define antes de qualquer janela
existir e `{ role: 'appMenu' }` usa como rótulo. Então, diferente do problema de
classe de janela do Linux acima, nada aqui é um compromisso — razão pela qual
empacotar não compraria nada além de assinatura, e pela qual `electron-builder.yml`
configura apenas alvos Linux.

Um bundle lançado do Finder herda o `PATH` mínimo do launchd, sem nvm e sem
Homebrew nele, e `run.sh` precisa de `node` e `npm` para reconstruir quando o
bundle está defasado. `setup.sh` os resolve no momento da instalação e os prefixa
— um prefixo, então um lançamento do terminal não é afetado. Trocar de versão do
Node depois deixa aquele caminho defasado; rode `setup.sh` de novo para
reapontá-lo.

