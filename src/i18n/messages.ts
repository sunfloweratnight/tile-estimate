export type Locale = 'ja' | 'en'

export const LOCALES: Locale[] = ['ja', 'en']

export const LOCALE_LABELS: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
}

type Dict = Record<string, string>

const ja: Dict = {
  'app.title': 'タイル見積',
  'app.subtitle': '壁の被覆枚数 · 開口 · 並べ方の Extra over',
  'lang.label': '言語',

  'wall.legend': '壁',
  'wall.unit': '単位',
  'wall.width': '幅（{unit}）',
  'wall.height': '高さ（{unit}）',
  'wall.hint.rect':
    '長方形の壁です（単位: {unit}）。ニッチなどがある場合は凹凸編集を有効にしてください。',
  'wall.hint.irregular':
    '凹凸モード中（単位: {unit}）。頂点をドラッグして形を変えられます。',
  'wall.startIrregular': '凹凸編集を開始',
  'wall.lShape': 'L字切り欠き',
  'wall.addVertex': '頂点を追加',
  'wall.removeVertex': '頂点を削除',
  'wall.toLShape': 'L字に変更',
  'wall.resetRect': '長方形に戻す',

  'opening.legend': '開口（窓・ドア）— {unit}',
  'opening.add': '開口を追加',
  'opening.width': '幅（{unit}）',
  'opening.height': '高さ（{unit}）',
  'opening.x': '左から（{unit}）',
  'opening.y': '下から（{unit}）',
  'opening.remove': '削除',
  'opening.window': '窓',
  'opening.door': 'ドア',
  'opening.other': 'その他',

  'tile.legend': 'タイル',
  'tile.unit': '単位',
  'tile.width': '幅（{unit}）',
  'tile.height': '高さ（{unit}）',
  'tile.kind': '種類',
  'tile.grout': '目地（{unit}）',
  'tile.groutPlaceholder': '未指定（既定 2mm）',
  'tile.pattern': '並べ方',
  'tile.unitHint':
    '壁とタイルで単位が違っても構いません。計算時にメートルへ揃えます。',

  'kind.standard': '標準',
  'kind.rectified': 'レクティファイド',
  'kind.subway': 'サブウェイ',

  'pattern.straight': '直線貼り',
  'pattern.stack': 'スタック',
  'pattern.brick': 'レンガ積み',
  'pattern.herringbone': 'ヘリンボーン',
  'pattern.basketweave': 'バスケットウィーブ',

  'tier.Std': '標準',
  'tier.R': 'レクティファイド',
  'tier.S': 'サブウェイ',
  'tier.H': 'ヘリンボーン',
  'tier.B': 'バスケットウィーブ',

  'result.title': '見積結果',
  'result.units': '壁: {wallUnit} ／ タイル: {tileUnit}（面積は m²）',
  'result.calculating': '計算中…',
  'result.empty': '壁やタイルを変えると結果が表示されます。',
  'result.requiredTiles': '必要枚数',
  'result.theoretical': '理論枚数',
  'result.effectiveArea': '有効貼付面積',
  'result.tileArea': 'タイル1枚の面積',
  'result.lossRate': 'ロス率',
  'result.extraOverTier': 'Extra over 区分',
  'result.baseLabor': '標準施工費',
  'result.extraOver': 'Extra over',
  'result.grout': '使用目地',
  'result.pattern': '並べ方',
  'result.layoutTiles': '配置枚数（参考）',
  'result.layoutTilesHint': 'プレビュー上で壁と重なるタイル数。必要枚数は面積×ロスが正です。',

  'canvas.edit': '壁エディタ（開口をドラッグ / 凹凸時は頂点もドラッグ）',
  'canvas.preview': '並べ方プレビュー（ヘリンボーンは ±45° の短辺×長辺の噛み合わせ）',
  'canvas.previewTitle': 'プレビュー · {pattern}',
  'canvas.irregular': '凹凸壁 · 頂点 {count}（{unit}）',
  'canvas.size': '{width} × {height} {unit}',

  'warn.grout_default': '目地未指定のため、既定値 {mm} mm を使用しています',
  'warn.grout_negative': '負の目地幅を 0 に補正しました',
  'warn.tile_size_invalid': 'タイルサイズは正の値にしてください',
  'warn.tile_large': 'タイルが壁に対して大きすぎる可能性があります',
  'warn.wall_size_invalid': '壁の寸法は正の値にしてください',
  'warn.opening_size_invalid': '開口「{id}」のサイズが不正です',
  'warn.opening_outside': '開口「{id}」が壁の外にはみ出しています',
  'warn.boolean_fallback':
    '開口の差し引きに失敗したため、面積の単純引きで代替しています',
  'warn.pattern_edge_cuts':
    'この寸法だと端に切り加工が入ります（余り 幅 {remW} / 高さ {remH}）。きれいに収めたい場合は壁かタイル寸法の調整を検討してください。',
  'warn.pattern_fit_awkward':
    '並べ方の繰り返し単位に対して壁寸法が中途半端です。模様が途中で切れやすくなります。',
  'warn.pattern_narrow_for_herringbone':
    '壁がヘリンボーンの最小ユニット（目安 {need}）より狭いため、模様がきれいに出にくいです。',
  'warn.pattern_advice_adjust':
    '目安: 幅をあと {addW}、高さをあと {addH} 足す（またはタイル／目地を変える）と、端の切りを減らせます。',
}

const en: Dict = {
  'app.title': 'Tile estimate',
  'app.subtitle': 'Wall coverage · openings · layout extra-over',
  'lang.label': 'Language',

  'wall.legend': 'Wall',
  'wall.unit': 'Unit',
  'wall.width': 'Width ({unit})',
  'wall.height': 'Height ({unit})',
  'wall.hint.rect':
    'Rectangular wall (unit: {unit}). Enable outline edit for niches or irregular shapes.',
  'wall.hint.irregular':
    'Irregular outline mode (unit: {unit}). Drag vertices to reshape.',
  'wall.startIrregular': 'Edit outline',
  'wall.lShape': 'L-shape notch',
  'wall.addVertex': 'Add vertex',
  'wall.removeVertex': 'Remove vertex',
  'wall.toLShape': 'Convert to L-shape',
  'wall.resetRect': 'Reset to rectangle',

  'opening.legend': 'Openings (windows / doors) — {unit}',
  'opening.add': 'Add opening',
  'opening.width': 'Width ({unit})',
  'opening.height': 'Height ({unit})',
  'opening.x': 'From left ({unit})',
  'opening.y': 'From bottom ({unit})',
  'opening.remove': 'Remove',
  'opening.window': 'Window',
  'opening.door': 'Door',
  'opening.other': 'Other',

  'tile.legend': 'Tile',
  'tile.unit': 'Unit',
  'tile.width': 'Width ({unit})',
  'tile.height': 'Height ({unit})',
  'tile.kind': 'Kind',
  'tile.grout': 'Grout ({unit})',
  'tile.groutPlaceholder': 'Blank = default 2mm',
  'tile.pattern': 'Layout',
  'tile.unitHint':
    'Wall and tile units may differ; values are converted to meters for calculation.',

  'kind.standard': 'Standard',
  'kind.rectified': 'Rectified',
  'kind.subway': 'Subway',

  'pattern.straight': 'Straight',
  'pattern.stack': 'Stack',
  'pattern.brick': 'Brick',
  'pattern.herringbone': 'Herringbone',
  'pattern.basketweave': 'Basketweave',

  'tier.Std': 'Standard',
  'tier.R': 'Rectified',
  'tier.S': 'Subway',
  'tier.H': 'Herringbone',
  'tier.B': 'Basketweave',

  'result.title': 'Estimate',
  'result.units': 'Wall: {wallUnit} / Tile: {tileUnit} (area in m²)',
  'result.calculating': 'Calculating…',
  'result.empty': 'Change the wall or tile to see results.',
  'result.requiredTiles': 'Required tiles',
  'result.theoretical': 'Theoretical count',
  'result.effectiveArea': 'Effective area',
  'result.tileArea': 'Area per tile',
  'result.lossRate': 'Loss rate',
  'result.extraOverTier': 'Extra-over tier',
  'result.baseLabor': 'Base labor',
  'result.extraOver': 'Extra over',
  'result.grout': 'Grout used',
  'result.pattern': 'Layout',
  'result.layoutTiles': 'Layout tiles (reference)',
  'result.layoutTilesHint':
    'Tiles intersecting the wall in the preview. Required count still uses area × loss.',

  'canvas.edit': 'Wall editor (drag openings / vertices in outline mode)',
  'canvas.preview':
    'Layout preview (herringbone: ±45° short-edge to long-edge nesting)',
  'canvas.previewTitle': 'Preview · {pattern}',
  'canvas.irregular': 'Irregular wall · {count} vertices ({unit})',
  'canvas.size': '{width} × {height} {unit}',

  'warn.grout_default': 'Grout omitted; using default {mm} mm',
  'warn.grout_negative': 'Negative grout clamped to 0',
  'warn.tile_size_invalid': 'Tile size must be positive',
  'warn.tile_large': 'Tile may be large relative to the wall',
  'warn.wall_size_invalid': 'Wall dimensions must be positive',
  'warn.opening_size_invalid': 'Opening "{id}" has an invalid size',
  'warn.opening_outside': 'Opening "{id}" extends outside the wall',
  'warn.boolean_fallback':
    'Opening subtract failed; using gross area minus opening areas',
  'warn.pattern_edge_cuts':
    'This size needs edge cuts (remainder width {remW} / height {remH}). Adjust wall or tile size for a cleaner fit.',
  'warn.pattern_fit_awkward':
    'Wall size sits awkwardly vs the layout repeat unit; the pattern may break mid-motif.',
  'warn.pattern_narrow_for_herringbone':
    'Wall is narrower than the herringbone minimum unit (~{need}); the pattern may not read clearly.',
  'warn.pattern_advice_adjust':
    'Tip: adding about {addW} to width and {addH} to height (or changing tile/grout) can reduce edge cuts.',
}

const TABLES: Record<Locale, Dict> = { ja, en }

export type WarningId =
  | 'grout_default'
  | 'grout_negative'
  | 'tile_size_invalid'
  | 'tile_large'
  | 'wall_size_invalid'
  | 'opening_size_invalid'
  | 'opening_outside'
  | 'boolean_fallback'
  | 'pattern_edge_cuts'
  | 'pattern_fit_awkward'
  | 'pattern_narrow_for_herringbone'
  | 'pattern_advice_adjust'

export interface EstimateWarning {
  id: WarningId
  values?: Record<string, string | number>
}

export function translate(
  locale: Locale,
  key: string,
  values?: Record<string, string | number>,
): string {
  const table = TABLES[locale] ?? TABLES.ja
  let text = table[key] ?? TABLES.en[key] ?? key
  if (values) {
    for (const [k, v] of Object.entries(values)) {
      text = text.replaceAll(`{${k}}`, String(v))
    }
  }
  return text
}

export function translateWarning(
  locale: Locale,
  warning: EstimateWarning,
): string {
  return translate(locale, `warn.${warning.id}`, warning.values)
}
