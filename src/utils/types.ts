// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
export type Constructor = new (...args: any[]) => {};

export type Member<T> = T extends { [P in infer K extends string]: unknown } ? T[K] : never;

export type ExcludeState<T, K extends keyof T> = T & Partial<{ [P in K]: undefined; }>;

export type IncludeState<T, K extends keyof T> = T & Required<{ [P in K]: Exclude<T[P], undefined>; }>;
