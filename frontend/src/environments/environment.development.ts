/**
 * `ng serve` (build development): URLs relativas (ex.: `/saved-cards`) batem no mesmo host
 * e o `proxy.conf.json` encaminha cada prefixo para o Nest em http://localhost:3000.
 */
export const environment = {
  production: false,
  apiUrl: '',
};
