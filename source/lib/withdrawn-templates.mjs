// Withdraw the unsuccessful casual-shorts options without erasing saved artwork.
// IDs stay stable even when administrators rename or reclassify a template.
export const WITHDRAWN_TEMPLATE_IDS = Object.freeze([
  'bermuda-passeio',
  'kit-passeio-prime',
  'passeio-polo',
  'passeio-polo-sem-recorte-v',
  'passeio-kit-edge-2027-mapa-v3-camiseta',
  'passeio-kit-elite-27-camiseta',
  'passeio-kit-raglan-basico-camiseta',
  'passeio-kit-normal-basico-camiseta',
  'passeio-kit-raglan-elite-camiseta',
  'passeio-kit-field-raglan-camiseta',
]);
const withdrawn = new Set(WITHDRAWN_TEMPLATE_IDS);
export const isWithdrawnTemplate = id => withdrawn.has(id);
export const WITHDRAWN_TEMPLATE_MESSAGE = 'Este molde de passeio foi retirado. Envie o novo kit em um novo arquivo GLB.';
