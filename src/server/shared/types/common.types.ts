export type ID = string | number

export type Timestamp = {
  createdAt: Date
  updatedAt: Date
}

export type Entity<T> = T & {
  id: ID
} & Timestamp

export type CreateDTO<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>

export type UpdateDTO<T> = Partial<CreateDTO<T>>

export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>

export type WithOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>
