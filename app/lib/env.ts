import {createContext} from 'react-router';

export type Env = {
  MOCK_SHOP?: string;
  PRIVATE_STOREFRONT_API_TOKEN?: string;
  PUBLIC_CHECKOUT_DOMAIN?: string;
  PUBLIC_STORE_DOMAIN?: string;
  PUBLIC_STOREFRONT_API_TOKEN?: string;
  PUBLIC_STOREFRONT_ID?: string;
  PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID?: string;
  PUBLIC_GA_MEASUREMENT_ID?: string;
  PUBLIC_META_PIXEL_ID?: string;
  SESSION_SECRET?: string;
  SHOP_ID?: string;
};

export const envContext = createContext<Env>();
