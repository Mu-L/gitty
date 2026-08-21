import type { Locale } from '../../../shared/messages'

/**
 * This plugin's strings, every language in one file — the one place a plugin
 * deviates from the app's own arrangement, and worth it: a plugin is a
 * directory you can delete, which stops being true the moment its strings are
 * spread through the core tables. `Record<Locale, …>` is what names a missing
 * language the moment one is added.
 */
export interface Strings {
  /** The group heading in Settings ▸ Plugins. */
  name: string
  /** One line under it, saying what turning this on does. */
  summary: string
  /** Which analyser finds the marks. */
  analyzer: string
  /** Local word segmentation, no network and no key. */
  jieba: string
  /** A configured model, reached over the network. */
  model: string
  /** The file that says what a mark looks like. */
  rules: string
  /** The file that says how to reach the model. */
  modelAccess: string
  /** The button that opens one of those two files. */
  open: string
}

const MESSAGES: Record<Locale, Strings> = {
  en: {
    name: 'Semantic reading',
    summary: 'Mark the proper nouns and the latin words in a rendered document',
    analyzer: 'Analyser',
    jieba: 'jieba',
    model: 'Model',
    rules: 'Mark styles',
    modelAccess: 'Model access',
    open: 'Open'
  },
  zh: {
    name: '语义阅读',
    summary: '在渲染后的文档里标出专有名词和拉丁词',
    analyzer: '分析器',
    jieba: 'jieba',
    model: '模型',
    rules: '标记样式',
    modelAccess: '模型访问',
    open: '打开'
  },
  ja: {
    name: '意味的読解',
    summary: 'レンダリングされた文書の固有名詞とラテン文字の語を印づける',
    analyzer: '解析器',
    jieba: 'jieba',
    model: 'モデル',
    rules: 'マークのスタイル',
    modelAccess: 'モデルへの接続',
    open: '開く'
  },
  ko: {
    name: '의미 읽기',
    summary: '렌더링된 문서의 고유명사와 라틴 문자 단어를 표시합니다',
    analyzer: '분석기',
    jieba: 'jieba',
    model: '모델',
    rules: '표시 스타일',
    modelAccess: '모델 접속',
    open: '열기'
  },
  fr: {
    name: 'Lecture sémantique',
    summary: 'Marquer les noms propres et les mots latins d’un document rendu',
    analyzer: 'Analyseur',
    jieba: 'jieba',
    model: 'Modèle',
    rules: 'Styles des marques',
    modelAccess: 'Accès au modèle',
    open: 'Ouvrir'
  },
  de: {
    name: 'Semantisches Lesen',
    summary: 'Eigennamen und lateinische Wörter im gerenderten Dokument markieren',
    analyzer: 'Analysator',
    jieba: 'jieba',
    model: 'Modell',
    rules: 'Markierungsstile',
    modelAccess: 'Modellzugriff',
    open: 'Öffnen'
  },
  es: {
    name: 'Lectura semántica',
    summary: 'Marcar los nombres propios y las palabras latinas de un documento',
    analyzer: 'Analizador',
    jieba: 'jieba',
    model: 'Modelo',
    rules: 'Estilos de marca',
    modelAccess: 'Acceso al modelo',
    open: 'Abrir'
  },
  ru: {
    name: 'Смысловое чтение',
    summary: 'Помечать имена собственные и латинские слова в готовом документе',
    analyzer: 'Анализатор',
    jieba: 'jieba',
    model: 'Модель',
    rules: 'Стили пометок',
    modelAccess: 'Доступ к модели',
    open: 'Открыть'
  },
  pt: {
    name: 'Leitura semântica',
    summary: 'Marcar os nomes próprios e as palavras latinas de um documento',
    analyzer: 'Analisador',
    jieba: 'jieba',
    model: 'Modelo',
    rules: 'Estilos das marcas',
    modelAccess: 'Acesso ao modelo',
    open: 'Abrir'
  }
}

export function strings(locale: Locale): Strings {
  return MESSAGES[locale] ?? MESSAGES.en
}
