import { OfferType } from '../generated/prisma';

export type QueryNumber = number | `${number}`;
export type Type = OfferType;
export type Currency = string;
export type UserId = string;

type FetchQuery = {
    page: QueryNumber;
    limit: QueryNumber;
};

export type FetchQueryParam<T> = {
    query: FetchQuery & T;
    userId: string;
};
