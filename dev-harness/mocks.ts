import { FieldType, toDataFrame } from '@grafana/data';

const make = (router: string, service: string, code: string, value: number) =>
  toDataFrame({
    name: 'traefik_router_requests_total',
    fields: [
      {
        name: 'value',
        type: FieldType.number,
        values: [value],
        labels: { router, service, code },
      },
    ],
  });

export const mockSeries = [
  make('api-gateway', 'users-service', '200', 12400),
  make('api-gateway', 'users-service', '500', 120),
  make('edge-router', 'users-service', '200', 5400),
  make('edge-router', 'users-service', '404', 1200),
  make('internal-router', 'users-service', '200', 1500),
  make('internal-router', 'users-service', '401', 250),
  make('public-router', 'users-service', '200', 2200),
  make('public-router', 'users-service', '502', 40),
  make('mobile-router', 'users-service', '200', 3100),
  make('mobile-router', 'users-service', '404', 160),
  make('beta-router', 'users-service', '200', 900),
  make('beta-router', 'users-service', '500', 30),
  make('ops-router', 'users-service', '200', 700),
  make('ops-router', 'users-service', '404', 90),
  make('api-gateway', 'billing-service', '200', 8200),
  make('api-gateway', 'billing-service', '404', 340),
  make('edge-router', 'billing-service', '200', 2100),
  make('edge-router', 'billing-service', '500', 60),
  make('internal-router', 'billing-service', '200', 1800),
  make('public-router', 'billing-service', '200', 1200),
  make('mobile-router', 'billing-service', '400', 70),
  make('ops-router', 'billing-service', '200', 600),
  make('api-gateway', 'orders-service', '200', 3900),
  make('api-gateway', 'orders-service', '502', 80),
  make('edge-router', 'orders-service', '200', 2400),
  make('internal-router', 'orders-service', '200', 1700),
  make('public-router', 'orders-service', '200', 900),
  make('mobile-router', 'orders-service', '404', 110),
  make('beta-router', 'orders-service', '200', 500),
  make('ops-router', 'orders-service', '500', 25),
  make('zero-router', 'zero-service', '200', 0),
  make('zero-router', 'zero-service', '404', 0),
  make('zero-router', 'zero-service', '500', 0),
];
