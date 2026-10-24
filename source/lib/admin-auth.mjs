import { AppError } from './project-service.mjs';
export function isAdminUser(user, adminId) {
  return Boolean(user?.userId && typeof adminId === 'string' && adminId.length > 0 && user.userId === adminId);
}
export function requireAdminUser(user, adminId) {
  if (!user?.userId) throw new AppError(401, 'Entre na sua conta para continuar.');
  if (!isAdminUser(user, adminId)) throw new AppError(403, 'Somente o administrador pode gerenciar os moldes.');
  return user;
}
