export type AuthUser = {
  id: string;
  email: string;
};

export type ValidatedKey = 'body' | 'query' | 'params';
