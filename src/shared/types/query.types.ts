// import { OfferType } from '../database';

export type QueryNumber = number | `${number}`;
export type Type = string;
export type Currency = string;
export type UserId = string;

type FetchQuery = {
    page?: QueryNumber;
    limit?: QueryNumber;
};

export type FetchQueryParam<T> = {
    query: FetchQuery & T;
    userId: string;
};
