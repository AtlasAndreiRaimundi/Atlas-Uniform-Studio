// Only explicit variants share the same immutable drawing atlas.
export const templateFamily = template => template?.baseTemplateId || template?.id;
export const compatibleTemplateArt = (a,b) => Boolean(a&&b&&templateFamily(a)===templateFamily(b));
