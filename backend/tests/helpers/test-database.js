export const createTestDatabase = () => {
  const rows = []

  return {
    rows,
    insert: () => ({
      values: async (value) => {
        rows.push({ ...value, id: rows.length + 1 })
      }
    }),
    select: () => ({
      from: () => ({
        orderBy: () => ({
          limit: async (count) => rows.slice(-count).reverse()
        })
      })
    })
  }
}
