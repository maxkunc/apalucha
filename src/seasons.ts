export interface Season {
  id: string
  year: number
  term: 'jaro' | 'podzim' | null
}

export const TERM_LABEL: Record<'jaro' | 'podzim', string> = { jaro: 'Jaro', podzim: 'Podzim' }

const TERM_WEIGHT: Record<'jaro' | 'podzim' | 'null', number> = { podzim: 0, jaro: 1, null: 2 }

export function seasonLabel(season: Season): string {
  return season.term ? `${TERM_LABEL[season.term]} ${season.year}` : String(season.year)
}

export function sortSeasons(seasons: Season[]): Season[] {
  return [...seasons].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year
    return TERM_WEIGHT[a.term ?? 'null'] - TERM_WEIGHT[b.term ?? 'null']
  })
}
