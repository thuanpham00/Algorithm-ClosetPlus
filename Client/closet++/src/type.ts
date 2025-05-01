export type MiningResult = {
  closed_itemsets: {
    itemset: string
    support: number
  }[]
  frequent_itemsets: {
    itemset: string
    support: number
  }[]
  association_rules: {
    rule: string
    support: number
    confidence: number
    lift: number
  }[]
  fp_tree: {
    root: {
      item: string | null
      count: number
      children: {
        item: string | null
        count: number
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        children: any[] // hoặc đệ quy lại kiểu root nếu muốn strict hơn
      }[]
    }
    header_table: {
      [key: string]: {
        count: number
        path: string[]
      }[]
    }
    item_counts: {
      [key: string]: number
    }
  }
  f_list: string[]
  execution_steps: string[]
  runtime: number
}

export type TransactionType = {
  id: string
  listItem: string
}

export type ExcelData = {
  transactions: string[][]
  min_sup: number
  min_confidence: number
  min_lift: number
}
